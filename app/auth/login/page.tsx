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
      <h1 className="text-2xl font-bold text-slate-900">Dang nhap</h1>
      <p className="mt-1 text-sm text-slate-600">
        Sau khi dang nhap, he thong se tu dong dieu huong theo role cua tai khoan.
      </p>
      <div className="mt-5">
        <LoginForm />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Quen mat khau?{" "}
        <Link className="font-semibold text-slate-900 hover:underline" href="/auth/forgot-password">
          Dat lai bang OTP
        </Link>
      </p>
      <p className="mt-4 text-sm text-slate-600">
        Chua co tai khoan?{" "}
        <Link className="font-semibold text-slate-900 hover:underline" href="/auth/register">
          Dang ky ngay
        </Link>
      </p>
    </>
  );
}
