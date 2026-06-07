"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerGroups = [
  {
    title: "Courses",
    links: [
      { label: "English", href: "/courses" },
      { label: "Japanese", href: "/courses" },
      { label: "Korean", href: "/courses" },
      { label: "Chinese", href: "/courses" },
      { label: "Exam Prep", href: "/courses" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Podcasts", href: "#" },
      { label: "Free Lessons", href: "#" },
      { label: "Language Tests", href: "/student/tests" },
      { label: "Study Guides", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Teachers", href: "/teachers" },
      { label: "Top Students", href: "/top-students" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Community", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
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
              Your gateway to fluency. Expert-led language courses designed to help you achieve your language goals faster and more effectively.
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
          <p>© 2026 LearnHub. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span>Made in Vietnam</span>
            <span className="text-slate-500">EN VI JA KO ZH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
