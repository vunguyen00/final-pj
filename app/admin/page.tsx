import { LogoutButton } from "@/app/components/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");

  return (
    <div className="min-h-screen bg-rose-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-rose-900">Giao dien Admin</h1>
          <LogoutButton />
        </div>
        <p className="mt-3 text-rose-800">
          Xin chao <strong>{user.username}</strong> ({user.email}).
        </p>
        <p className="mt-2 text-sm text-rose-700">
          Day la thu muc rieng `app/admin` chi danh cho role ADMIN.
        </p>
      </div>
    </div>
  );
}
