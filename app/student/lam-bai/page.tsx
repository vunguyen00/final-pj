import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function StudentLamBaiPage() {
  const user = await requireRole("STUDENT");

  return (
    <div className="min-h-screen bg-violet-50 p-6">
      <main className="mx-auto mt-10 max-w-2xl rounded-3xl border border-violet-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-violet-900">Chuc nang Lam bai</h1>
        <p className="mt-3 text-violet-800">
          Xin chao <strong>{user.username}</strong>. Ban da dang nhap nen co the lam bai.
        </p>
        <p className="mt-2 text-sm text-violet-700">
          Trang nay nam trong thu muc student va chi cho role STUDENT.
        </p>
        <Link
          href="/student"
          className="mt-6 inline-block rounded-lg border border-violet-300 px-4 py-2 font-semibold text-violet-900 hover:bg-violet-100"
        >
          Ve giao dien student
        </Link>
      </main>
    </div>
  );
}
