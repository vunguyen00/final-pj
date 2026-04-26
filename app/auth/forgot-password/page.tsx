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
      <h1 className="text-2xl font-bold text-slate-900">Quen mat khau</h1>
      <p className="mt-1 text-sm text-slate-600">
        Nhap email de nhan OTP va dat lai mat khau.
      </p>
      <div className="mt-5">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Chua co tai khoan?{" "}
        <Link className="font-semibold text-slate-900 hover:underline" href="/auth/register">
          Dang ky ngay
        </Link>
      </p>
    </>
  );
}
