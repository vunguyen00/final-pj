import StudentTakeTestClient from "./StudentTakeTestClient";
import {
  getStudentTestPayload,
  type StudentTestPayload,
} from "@/lib/student-test-data";

type StudentTakeTestPageProps = {
  params: Promise<{ testId: string }>;
};

export default async function StudentTakeTestPage({
  params,
}: StudentTakeTestPageProps) {
  const { testId } = await params;
  let initialData: StudentTestPayload | null = null;
  let initialError: string | null = null;

  try {
    const result = await getStudentTestPayload(testId);
    initialData = result.ok ? result.data : null;
    initialError = result.ok ? null : result.error;
  } catch (error) {
    console.error("Error fetching test:", error);
    initialError = "Failed to fetch test";
  }

  return (
    <StudentTakeTestClient
      testId={testId}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
