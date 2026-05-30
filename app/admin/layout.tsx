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
      <div className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0%,_#f8fafc_42%,_#ecfeff_100%)] p-4 md:p-6`}>
        <div className="mx-auto max-w-[1500px] [font-family:var(--font-manrope)]">
          {children}
        </div>
      </div>
    </>
  );
}
