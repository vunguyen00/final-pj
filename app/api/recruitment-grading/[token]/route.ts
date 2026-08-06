import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTeacherExamAverage, getExamSkillLabels, TEACHER_EXAM_PASSING_AVERAGE } from "@/lib/teacher-exam-skills";
import { getRecruitmentRoundForGrading, parseRoundLocations } from "@/lib/teacher-recruitment-rounds";

function serializeGradingRound(round: NonNullable<Awaited<ReturnType<typeof getRecruitmentRoundForGrading>>>) {
  return {
    id: round.id,
    name: round.name,
    status: round.status,
    examStartsAt: round.examStartsAt.toISOString(),
    examEndsAt: round.examEndsAt.toISOString(),
    locations: parseRoundLocations(round.locations),
    applications: round.applications.map((application) => ({
      id: application.id,
      status: application.status,
      user: application.user,
      language: application.language,
      examLocationName: application.examLocationName,
      examLocationAddress: application.examLocationAddress,
      certificates: application.certificates,
      skillLabels: getExamSkillLabels(application.language.code),
      examResult: application.examResult ? {
        checkedIn: application.examResult.checkedIn,
        completed: application.examResult.completed,
        writingScore: application.examResult.writingScore,
        speakingScore: application.examResult.speakingScore,
        listeningScore: application.examResult.listeningScore,
        readingScore: application.examResult.readingScore,
        failed: application.examResult.failed,
        submittedAt: application.examResult.submittedAt?.toISOString() ?? null,
      } : null,
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const round = await getRecruitmentRoundForGrading(token);
  if (!round) return NextResponse.json({ error: "Link chấm thi không hợp lệ hoặc đã được thay thế." }, { status: 404 });
  return NextResponse.json({ round: serializeGradingRound(round) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const round = await getRecruitmentRoundForGrading(token);
  if (!round) return NextResponse.json({ error: "Link chấm thi không hợp lệ hoặc đã được thay thế." }, { status: 404 });
  if (round.status === "ARCHIVED") return NextResponse.json({ error: "Đợt tuyển đã được lưu trữ và không thể sửa." }, { status: 409 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const submittedItems = Array.isArray(body?.results) ? body.results : body ? [body] : [];
  if (submittedItems.length === 0) return NextResponse.json({ error: "Chưa có kết quả nào để nộp." }, { status: 400 });
  if (submittedItems.length > 200) return NextResponse.json({ error: "Mỗi lần chỉ được nộp tối đa 200 kết quả." }, { status: 400 });

  const scoreKeys = ["writingScore", "speakingScore", "listeningScore", "readingScore"] as const;
  const applicationIds = new Set<string>();
  const validatedItems: {
    applicationId: string;
    checkedIn: boolean;
    completed: boolean;
    failed: boolean;
    averageScore: number | null;
    scores: Record<typeof scoreKeys[number], number | null>;
    status: "REJECTED" | "PASSED" | "CHECKED_IN" | "INVITED_TO_EXAM";
  }[] = [];

  for (const rawItem of submittedItems) {
    if (!rawItem || typeof rawItem !== "object") return NextResponse.json({ error: "Dữ liệu kết quả không hợp lệ." }, { status: 400 });
    const item = rawItem as Record<string, unknown>;
    const applicationId = typeof item.applicationId === "string" ? item.applicationId : "";
    if (!applicationId || applicationIds.has(applicationId)) return NextResponse.json({ error: "Danh sách kết quả có ứng viên trùng lặp hoặc thiếu mã hồ sơ." }, { status: 400 });
    applicationIds.add(applicationId);

    const application = round.applications.find((candidate) => candidate.id === applicationId);
    if (!application) return NextResponse.json({ error: "Ứng viên không thuộc đợt tuyển này." }, { status: 404 });
    if ((["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING"] as string[]).includes(application.status)) {
      return NextResponse.json({ error: `${application.user.username}: hồ sơ chưa được Admin mời tham gia kỳ thi.` }, { status: 409 });
    }
    if (application.status === "REJECTED" && !application.examResult) {
      return NextResponse.json({ error: `${application.user.username}: hồ sơ đã bị Admin từ chối trước kỳ thi.` }, { status: 409 });
    }
    if (application.status === "CONVERTED_TO_TEACHER") {
      return NextResponse.json({ error: `${application.user.username}: ứng viên đã được chuyển thành giảng viên.` }, { status: 409 });
    }

    const checkedIn = item.checkedIn === true;
    const completed = item.completed === true;
    const manuallyFailed = item.failed === true;
    const scores = Object.fromEntries(scoreKeys.map((key) => [key, item[key] === "" || item[key] === null || item[key] === undefined ? null : Number(item[key])])) as Record<typeof scoreKeys[number], number | null>;
    const hasAnyScore = Object.values(scores).some((score) => score !== null);
    if (!checkedIn && (completed || manuallyFailed || hasAnyScore)) {
      return NextResponse.json({ error: `${application.user.username}: phải điểm danh trước khi hoàn thành hoặc nhập kết quả thi.` }, { status: 400 });
    }
    if (!completed && (manuallyFailed || hasAnyScore)) {
      return NextResponse.json({ error: `${application.user.username}: phải đánh dấu hoàn thành bài thi trước khi nhập điểm hoặc kết quả trượt.` }, { status: 400 });
    }
    if (Object.values(scores).some((score) => score !== null && (!Number.isFinite(score) || score < 0 || score > 100))) {
      return NextResponse.json({ error: `${application.user.username}: điểm từng kỹ năng phải nằm trong khoảng 0–100.` }, { status: 400 });
    }
    if (completed && !manuallyFailed && Object.values(scores).some((score) => score === null)) {
      return NextResponse.json({ error: `${application.user.username}: vui lòng nhập đủ điểm bốn kỹ năng trước khi nộp kết quả đạt.` }, { status: 400 });
    }

    const averageScore = calculateTeacherExamAverage(scores);
    const failed = manuallyFailed || Boolean(completed && averageScore !== null && averageScore < TEACHER_EXAM_PASSING_AVERAGE);
    const status = failed ? "REJECTED" : completed ? "PASSED" : checkedIn ? "CHECKED_IN" : "INVITED_TO_EXAM";
    validatedItems.push({ applicationId, checkedIn, completed, failed, averageScore, scores, status });
  }

  const now = new Date();
  await prisma.$transaction(validatedItems.flatMap((item) => [
    prisma.teacherExamResult.upsert({
      where: { applicationId: item.applicationId },
      update: { checkedIn: item.checkedIn, completed: item.completed, failed: item.failed, ...item.scores, submittedAt: now },
      create: { applicationId: item.applicationId, checkedIn: item.checkedIn, completed: item.completed, failed: item.failed, ...item.scores, submittedAt: now },
    }),
    prisma.teacherApplication.update({
      where: { id: item.applicationId },
      data: { status: item.status, rejectionReason: item.failed ? `Không đạt mức điểm trung bình ${TEACHER_EXAM_PASSING_AVERAGE}/100 của kỳ thi trực tiếp.` : null },
    }),
    prisma.teacherApplicationLog.create({
      data: {
        applicationId: item.applicationId,
        status: item.status,
        message: item.failed ? `Người chấm đã nộp kết quả: ứng viên không đạt mức trung bình ${TEACHER_EXAM_PASSING_AVERAGE}/100.` : item.completed ? `Người chấm đã nộp kết quả: ứng viên đạt trung bình ${item.averageScore}/100.` : "Người chấm đã cập nhật trạng thái tham gia thi.",
      },
    }),
  ]));
  return NextResponse.json({
    ok: true,
    results: validatedItems.map((item) => ({ applicationId: item.applicationId, status: item.status, failed: item.failed, averageScore: item.averageScore, submittedAt: now.toISOString() })),
  });
}
