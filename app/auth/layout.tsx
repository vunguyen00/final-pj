import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        {children}
        <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <Link className="font-semibold text-foreground hover:underline" href="/">
            Ve trang chu
          </Link>
        </div>
      </div>
    </div>
  );
}
