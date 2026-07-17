import { prisma } from "@/lib/prisma";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

export async function getCourseReadiness(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      languageId: true,
      modules: { select: { lessons: { select: { id: true } } } },
      tests: {
        where: { kind: "COURSE" },
        select: { questions: { select: { score: true } } },
      },
    },
  });

  const errors: string[] = [];
  if (!course) return { ready: false, errors: ["Không tìm thấy khóa học."] };
  if (!course.languageId) errors.push("Khóa học chưa có ngôn ngữ.");
  if (!course.modules.length) errors.push("Khóa học cần ít nhất một chương.");
  if (!course.modules.some((module) => module.lessons.length > 0)) {
    errors.push("Khóa học cần ít nhất một bài học.");
  }
  if (!course.tests.length) {
    errors.push("Khóa học cần một bài kiểm tra cuối khóa.");
  } else if (
    course.tests.some(
      (test) => !isTestReady(test.questions.reduce((sum, question) => sum + question.score, 0)),
    )
  ) {
    errors.push(`Tổng điểm câu hỏi của bài kiểm tra phải bằng ${FIXED_TEST_MAX_SCORE}.`);
  }

  return { ready: errors.length === 0, errors };
}
