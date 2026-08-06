import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherRecruitmentSetting, setTeacherRecruitmentSetting } from "@/lib/teacher-onboarding";
import { hashRecruitmentGradingToken, parseRoundLocations } from "@/lib/teacher-recruitment-rounds";

type RoundAction = "OPEN" | "CLOSE" | "ARCHIVE" | "EXPORT_GRADING_LINK" | "UPDATE_TIMES";

function parseRoundTimes(body: Record<string, unknown>) {
  return {
    registrationOpensAt: new Date(String(body.registrationOpensAt ?? "")),
    registrationClosesAt: new Date(String(body.registrationClosesAt ?? "")),
    examStartsAt: new Date(String(body.examStartsAt ?? "")),
    examEndsAt: new Date(String(body.examEndsAt ?? "")),
  };
}

function validateRoundTimes(times: ReturnType<typeof parseRoundTimes>) {
  if (Object.values(times).some((date) => Number.isNaN(date.getTime()))) {
    return "Vui lòng nhập đầy đủ thời gian hợp lệ.";
  }
  if (times.registrationOpensAt >= times.registrationClosesAt || times.examStartsAt >= times.examEndsAt) {
    return "Thời gian bắt đầu phải trước thời gian kết thúc.";
  }
  if (times.registrationClosesAt > times.examStartsAt) {
    return "Thời gian đóng đăng ký phải trước hoặc bằng thời gian bắt đầu thi.";
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roundId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action as RoundAction : "";
  const round = await prisma.recruitmentRound.findUnique({ where: { id: roundId } });
  if (!round) return NextResponse.json({ error: "Không tìm thấy đợt tuyển." }, { status: 404 });

  if (action === "UPDATE_TIMES") {
    if (round.status === "ARCHIVED") {
      return NextResponse.json({ error: "Không thể chỉnh sửa đợt tuyển đã lưu trữ." }, { status: 409 });
    }
    const times = parseRoundTimes(body ?? {});
    const validationError = validateRoundTimes(times);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    await prisma.recruitmentRound.update({
      where: { id: round.id },
      data: times,
    });

    const current = await getTeacherRecruitmentSetting();
    if (current.activeRoundId === round.id) {
      await setTeacherRecruitmentSetting({
        ...current,
        registrationOpensAt: times.registrationOpensAt.toISOString(),
        registrationClosesAt: times.registrationClosesAt.toISOString(),
        examStartsAt: times.examStartsAt.toISOString(),
        examEndsAt: times.examEndsAt.toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      times: Object.fromEntries(
        Object.entries(times).map(([key, value]) => [key, value.toISOString()]),
      ),
    });
  }

  if (action === "EXPORT_GRADING_LINK") {
    if (round.status === "DRAFT" || round.status === "ARCHIVED") {
      return NextResponse.json({ error: "Hãy mở đợt tuyển trước khi xuất link chấm thi." }, { status: 409 });
    }
    const rawToken = randomBytes(32).toString("hex");
    await prisma.recruitmentRound.update({
      where: { id: round.id },
      data: { gradingTokenHash: hashRecruitmentGradingToken(rawToken), gradingTokenIssuedAt: new Date() },
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VNPAY_BASE_URL || new URL(request.url).origin;
    return NextResponse.json({ gradingUrl: `${baseUrl.replace(/\/$/, "")}/recruitment-grading/${rawToken}` });
  }

  if (action === "OPEN") {
    const locations = parseRoundLocations(round.locations);
    if (locations.length === 0) return NextResponse.json({ error: "Đợt tuyển chưa có địa điểm thi." }, { status: 400 });
    await prisma.$transaction([
      prisma.recruitmentRound.updateMany({ where: { status: "OPEN", id: { not: round.id } }, data: { status: "CLOSED" } }),
      prisma.recruitmentRound.update({ where: { id: round.id }, data: { status: "OPEN" } }),
    ]);
    const current = await getTeacherRecruitmentSetting();
    await setTeacherRecruitmentSetting({
      ...current,
      enabled: true,
      activeRoundId: round.id,
      title: round.name,
      description: round.description,
      location: locations.map((location) => `${location.name}: ${location.address}${location.note ? ` (${location.note})` : ""}`).join(" | "),
      locationIds: locations.map((location) => location.id),
      locations,
      registrationOpensAt: round.registrationOpensAt.toISOString(),
      registrationClosesAt: round.registrationClosesAt.toISOString(),
      examStartsAt: round.examStartsAt.toISOString(),
      examEndsAt: round.examEndsAt.toISOString(),
    });
    return NextResponse.json({ ok: true, status: "OPEN" });
  }

  if (action === "CLOSE" || action === "ARCHIVE") {
    const status = action === "CLOSE" ? "CLOSED" : "ARCHIVED";
    await prisma.recruitmentRound.update({ where: { id: round.id }, data: { status } });
    const current = await getTeacherRecruitmentSetting();
    if (current.activeRoundId === round.id) {
      await setTeacherRecruitmentSetting({ ...current, enabled: false, activeRoundId: null });
    }
    return NextResponse.json({ ok: true, status });
  }

  return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
}
