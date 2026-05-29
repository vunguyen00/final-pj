import Header from "@/app/components/Header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header showOnAdmin />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </div>
    </>
  );
}
