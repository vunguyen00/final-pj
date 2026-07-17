import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function TeacherRegistrationLayout({ children }: { children: ReactNode }) {
  await requireRole("STUDENT", "TEACHER");
  return children;
}
