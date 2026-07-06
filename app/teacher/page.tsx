import Link from "next/link";
import { LogoutButton } from "@/app/components/LogoutButton";
import { requireRole } from "@/lib/auth";
import { Section, SectionHeader } from "@/components/base/section";

export default async function TeacherPage() {
  const user = await requireRole("TEACHER");

  return (
    <main className="min-h-screen bg-background">
      <Section padding="md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionHeader title="Tổng quan giảng viên" subtitle="Không gian quản lý dành cho giảng viên." className="mb-0" />
            <LogoutButton />
          </div>
          <p className="mt-4 text-muted-foreground">
            Xin chào <strong>{user.username}</strong> ({user.email}).
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/teacher/courses" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Quản lý khóa học
            </Link>
            <Link href="/teacher/tests" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
              Xem doanh thu
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
