import { LogoutButton } from "@/app/components/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function TeacherPage() {
  const user = await requireRole("TEACHER");

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-900">Giao dien Teacher</h1>
          <LogoutButton />
        </div>
        <p className="mt-3 text-amber-800">
          Xin chao <strong>{user.username}</strong> ({user.email}).
        </p>
        <p className="mt-2 text-sm text-amber-700">
          Day la thu muc rieng `app/teacher` chi danh cho role TEACHER.
        </p>
      </div>
    </div>
  );
}
