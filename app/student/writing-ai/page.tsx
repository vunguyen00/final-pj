import { requireRole } from "@/lib/auth";
import WritingAiClient from "./WritingAiClient";

export default async function WritingAiPage() {
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN");

  return <WritingAiClient userRole={user.role} />;
}
