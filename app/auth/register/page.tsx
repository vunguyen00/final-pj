import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/app/auth/register/RegisterForm";
import { ROLE_HOME, getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(ROLE_HOME[user.role]);
  }

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">Bắt đầu miễn phí</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Tạo tài khoản</h1>
      <p className="mt-2 text-sm text-slate-500">Chỉ mất một phút để bắt đầu học tập tại FinnCenter.</p>
      <div className="mt-5">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link className="font-bold text-blue-700 hover:underline" href="/auth/login">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
