import EditTestClient, { type EditableTest } from "./EditTestClient";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveLanguages } from "@/lib/teacher-onboarding";

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return (
      <EditTestClient
        initialTest={null}
        initialLanguages={[]}
        initialError="Bạn không có quyền truy cập trang này."
      />
    );
  }

  const [test, languages] = await Promise.all([
    prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        name: true,
        description: true,
        assessmentMode: true,
        passingScore: true,
        timeLimit: true,
        shuffleQuestions: true,
        language: {
          select: { id: true, name: true, code: true },
        },
        course: {
          select: {
            id: true,
            name: true,
            instructorId: true,
            language: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    }),
    getActiveLanguages(),
  ]);

  if (!test) {
    return (
      <EditTestClient
        initialTest={null}
        initialLanguages={languages}
        initialError="Không tìm thấy đề test."
      />
    );
  }

  if (user.role !== "ADMIN" && test.course?.instructorId !== user.id) {
    return (
      <EditTestClient
        initialTest={null}
        initialLanguages={languages}
        initialError="Bạn không có quyền chỉnh sửa đề test này."
      />
    );
  }

  const editableTest: EditableTest = {
    ...test,
    course: test.course
      ? {
          id: test.course.id,
          name: test.course.name,
          language: test.course.language,
        }
      : null,
  };

  return (
    <EditTestClient
      initialTest={editableTest}
      initialLanguages={languages}
      initialError=""
    />
  );
}
