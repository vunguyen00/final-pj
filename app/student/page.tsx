import Link from "next/link";
import { LogoutButton } from "@/app/components/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function StudentPage() {
  const user = await requireRole("STUDENT");

  return (
    <div className="min-h-screen bg-emerald-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-900">Giao dien Student</h1>
          <LogoutButton />
        </div>
        <p className="mt-3 text-emerald-800">
          Xin chao <strong>{user.username}</strong> ({user.email}).
        </p>
        <p className="mt-2 text-sm text-emerald-700">
          Day la thu muc rieng `app/student` chi danh cho role STUDENT.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/student/hoc-bai"
            className="rounded-lg border border-emerald-300 px-4 py-2 font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Hoc bai
          </Link>
          <Link
            href="/student/tests"
            className="rounded-lg border border-emerald-300 px-4 py-2 font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Lam bai test
          </Link>
        </div>
      </div>
    </div>
  );
}
