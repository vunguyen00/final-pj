import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import {
  formatTeacherExamLocation,
  getTeacherExamLocations,
  getTeacherRecruitmentSetting,
  setTeacherRecruitmentSetting,
  type TeacherRecruitmentSetting,
} from "@/lib/teacher-onboarding";

type CreateRecruitmentRoundBody = Partial<TeacherRecruitmentSetting> & {
  notifyUsers?: boolean;
};

function parseRequiredDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getTeacherRecruitmentSetting());
}

export async function PUT() {
  return NextResponse.json(
    { error: "Không được cập nhật đè lên đợt tuyển hiện tại. Hãy tạo một đợt tuyển mới." },
    { status: 405, headers: { Allow: "GET, POST" } },
  );
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateRecruitmentRoundBody | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const title = String(body.title ?? "").trim().slice(0, 160);
  const description = String(body.description ?? "").trim().slice(0, 3000);
  const registrationOpensAt = parseRequiredDate(body.registrationOpensAt);
  const registrationClosesAt = parseRequiredDate(body.registrationClosesAt);
  const examStartsAt = parseRequiredDate(body.examStartsAt);
  const examEndsAt = parseRequiredDate(body.examEndsAt);
  const locationIds = Array.isArray(body.locationIds)
    ? body.locationIds.filter((value): value is string => typeof value === "string")
    : [];
  const savedLocations = await getTeacherExamLocations();
  const selectedLocations = savedLocations.filter((location) => locationIds.includes(location.id));

  if (!title || selectedLocations.length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên đợt tuyển và chọn ít nhất một địa điểm thi đã lưu." },
      { status: 400 },
    );
  }
  if (!registrationOpensAt || !registrationClosesAt || !examStartsAt || !examEndsAt) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ thời gian mở/đóng đăng ký và bắt đầu/kết thúc kỳ thi." },
      { status: 400 },
    );
  }
  if (registrationOpensAt >= registrationClosesAt || examStartsAt >= examEndsAt) {
    return NextResponse.json(
      { error: "Thời gian bắt đầu phải trước thời gian kết thúc." },
      { status: 400 },
    );
  }
  if (registrationClosesAt > examStartsAt) {
    return NextResponse.json(
      { error: "Thời gian đóng đăng ký phải trước hoặc bằng thời gian bắt đầu thi." },
      { status: 400 },
    );
  }

  const round = await prisma.$transaction(async (tx) => {
    await tx.recruitmentRound.updateMany({
      where: { status: "OPEN" },
      data: { status: "CLOSED" },
    });
    return tx.recruitmentRound.create({
      data: {
        name: title,
        description,
        status: "OPEN",
        registrationOpensAt,
        registrationClosesAt,
        examStartsAt,
        examEndsAt,
        locations: selectedLocations,
        createdById: admin.id,
      },
      select: { id: true, name: true, status: true },
    });
  });

  const setting: TeacherRecruitmentSetting = {
    enabled: true,
    activeRoundId: round.id,
    title,
    description,
    location: selectedLocations.map(formatTeacherExamLocation).join(" | "),
    locationIds: selectedLocations.map((location) => location.id),
    locations: selectedLocations,
    registrationOpensAt: registrationOpensAt.toISOString(),
    registrationClosesAt: registrationClosesAt.toISOString(),
    examStartsAt: examStartsAt.toISOString(),
    examEndsAt: examEndsAt.toISOString(),
  };
  await setTeacherRecruitmentSetting(setting);

  let notified = 0;
  if (body.notifyUsers) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VNPAY_BASE_URL || new URL(request.url).origin;
    const registrationUrl = `${baseUrl.replace(/\/$/, "")}/teacher-registration`;
    const users = await prisma.user.findMany({
      where: { role: "STUDENT", isBanned: false, accountStatus: "ACTIVE" },
      select: { id: true, email: true },
    });
    const schedule = [
      `Mở đăng ký: ${registrationOpensAt.toLocaleString("vi-VN")}`,
      `Đóng đăng ký: ${registrationClosesAt.toLocaleString("vi-VN")}`,
      `Bắt đầu thi: ${examStartsAt.toLocaleString("vi-VN")}`,
      `Kết thúc thi: ${examEndsAt.toLocaleString("vi-VN")}`,
    ].join("\n");
    const locationsText = selectedLocations
      .map((location, index) => `${index + 1}. ${formatTeacherExamLocation(location)}`)
      .join("\n");
    const text = [
      title,
      "",
      description,
      "",
      schedule,
      "",
      "Địa điểm thi:",
      locationsText,
      "",
      "Đăng ký và theo dõi hồ sơ tại:",
      registrationUrl,
    ].join("\n");

    const results = await Promise.all(users.map(async (user) => {
      await prisma.notification.create({ data: { userId: user.id, title, body: text } });
      try {
        await sendBasicEmail(
          user.email,
          title,
          text,
          { actionUrl: registrationUrl, actionLabel: "Đăng ký làm giảng viên" },
        );
        await prisma.emailLog.create({
          data: { userId: user.id, to: user.email, subject: title, status: "SENT", sentAt: new Date() },
        });
        return true;
      } catch (error) {
        await prisma.emailLog.create({
          data: {
            userId: user.id,
            to: user.email,
            subject: title,
            status: "FAILED",
            error: error instanceof Error ? error.message : String(error),
          },
        });
        return false;
      }
    }));
    notified = results.filter(Boolean).length;
  }

  return NextResponse.json({ ...setting, round, notified }, { status: 201 });
}
