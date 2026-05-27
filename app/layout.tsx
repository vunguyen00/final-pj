import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "LearnHub - Multi-language learning marketplace",
  description:
    "Marketplace and LMS for English, Chinese, Japanese, Korean, certification prep, vocabulary, and mock tests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">
        <Header />
        {children}
      </body>
    </html>
  );
}
