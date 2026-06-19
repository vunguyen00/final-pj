import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/auth/login/LoginForm";
import { ROLE_HOME, getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(ROLE_HOME[user.role]);
  }

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">Chào mừng trở lại</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Đăng nhập</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Tiếp tục hành trình học tập của bạn tại FinnCenter.
      </p>
      <div className="mt-5">
        <LoginForm />
      </div>
      <p className="mt-4 text-right text-sm">
        <Link className="font-bold text-blue-700 hover:text-blue-800 hover:underline" href="/auth/forgot-password">
          Quên mật khẩu?
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link className="font-bold text-blue-700 hover:underline" href="/auth/register">
          Đăng ký ngay
        </Link>
      </p>
    </>
  );
}
