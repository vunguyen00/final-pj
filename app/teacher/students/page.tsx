import { requireRole } from "@/lib/auth";
import { getStudentsManagementData } from "@/lib/teacher-students";
import StudentsManagement from "./StudentsManagement";

export default async function StudentsPage() {
  const viewer = await requireRole("TEACHER", "ADMIN");
  const initialData = await getStudentsManagementData(viewer);

  return <StudentsManagement initialData={initialData} />;
}
