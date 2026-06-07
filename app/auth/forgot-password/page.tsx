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
      <h1 className="text-2xl font-semibold text-foreground">Quen mat khau</h1>
      <p className="mt-1 text-sm text-muted-foreground">Nhap email de nhan OTP va dat lai mat khau.</p>
      <div className="mt-5">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Chua co tai khoan?{" "}
        <Link className="font-semibold text-foreground hover:underline" href="/auth/register">
          Dang ky ngay
        </Link>
      </p>
    </>
  );
}
