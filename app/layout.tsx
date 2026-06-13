import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "LearnHub - Nền tảng học ngoại ngữ",
  description:
    "Nền tảng học tiếng Anh, tiếng Trung, tiếng Nhật, tiếng Hàn, luyện thi chứng chỉ, học từ vựng và làm đề thi thử.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className={`${inter.variable} ${playfair.variable} min-h-full bg-background text-foreground`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
