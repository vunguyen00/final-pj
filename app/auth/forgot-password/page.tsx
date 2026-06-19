import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/app/auth/forgot-password/ForgotPasswordForm";
import { ROLE_HOME, getCurrentUser } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(ROLE_HOME[user.role]);
  }

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">Khôi phục tài khoản</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Quên mật khẩu</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Nhập email đã đăng ký. Chúng tôi sẽ hướng dẫn bạn tạo mật khẩu mới.</p>
      <div className="mt-5">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link className="font-semibold text-foreground hover:underline" href="/auth/register">
          Đăng ký ngay
        </Link>
      </p>
    </>
  );
}
