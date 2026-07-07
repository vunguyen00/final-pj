import Header from "@/app/components/Header";
import { Manrope, Space_Grotesk } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header showOnAdmin />
      <div className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-[1440px] [font-family:var(--font-manrope)]">
          {children}
        </div>
      </div>
    </>
  );
}
