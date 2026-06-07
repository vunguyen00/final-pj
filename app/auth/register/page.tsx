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
      <h1 className="text-2xl font-semibold text-foreground">Dang ky</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tai khoan dang ky moi se mac dinh role STUDENT.</p>
      <div className="mt-5">
        <RegisterForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Da co tai khoan?{" "}
        <Link className="font-semibold text-foreground hover:underline" href="/auth/login">
          Dang nhap
        </Link>
      </p>
    </>
  );
}
