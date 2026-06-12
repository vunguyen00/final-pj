import { requireRole } from "@/lib/auth";
import StudentsManagement from "./StudentsManagement";

export default async function StudentsPage() {
  await requireRole("TEACHER", "ADMIN");

  return <StudentsManagement />;
}
