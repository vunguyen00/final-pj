import { requireRole } from "@/lib/auth";
import { getStudentResults } from "@/lib/student-results";
import ResultsClient from "./ResultsClient";

export default async function StudentResultsPage() {
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
  const results = await getStudentResults(user, "all");

  return <ResultsClient initialResults={results} />;
}
