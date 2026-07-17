import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function TeacherTestLayout({ children }: { children: ReactNode }) {
  await requireRole("TEACHER", "ADMIN");
  return children;
}
