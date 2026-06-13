"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerGroups = [
  {
    title: "Khóa học",
    links: [
      { label: "Tiếng Anh", href: "/courses" },
      { label: "Tiếng Nhật", href: "/courses" },
      { label: "Tiếng Hàn", href: "/courses" },
      { label: "Tiếng Trung", href: "/courses" },
      { label: "Luyện thi", href: "/courses" },
    ],
  },
  {
    title: "Tài nguyên",
    links: [
      { label: "Bài viết", href: "#" },
      { label: "Podcast", href: "#" },
      { label: "Bài học miễn phí", href: "#" },
      { label: "Bài kiểm tra ngôn ngữ", href: "/student/tests" },
      { label: "Hướng dẫn học tập", href: "#" },
    ],
  },
  {
    title: "LearnHub",
    links: [
      { label: "Về chúng tôi", href: "/about" },
      { label: "Giảng viên", href: "/teachers" },
      { label: "Học viên xuất sắc", href: "/top-students" },
      { label: "Liên hệ", href: "#" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm trợ giúp", href: "#" },
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Cộng đồng", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản dịch vụ", href: "#" },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: "#" },
  { label: "X", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "YouTube", href: "#" },
];

export default function Footer() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="mt-16 bg-[#04162f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="mb-5 inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e8cf1] text-sm font-bold text-white">LH</span>
              <span className="text-3xl font-semibold tracking-tight">LearnHub</span>
            </Link>
            <p className="text-base leading-8 text-slate-300">
              Nền tảng học ngoại ngữ cùng giảng viên giàu kinh nghiệm, giúp bạn đạt mục tiêu nhanh chóng và hiệu quả hơn.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
              {socialLinks.map((item) => (
                <Link key={item.label} href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-5 text-lg font-semibold">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-base text-slate-300 transition hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-800 pt-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 LearnHub. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-5">
            <span>Phát triển tại Việt Nam</span>
            <span className="text-slate-500">EN VI JA KO ZH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
