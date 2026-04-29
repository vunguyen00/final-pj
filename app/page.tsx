"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

type Course = {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  price: number;
  category: string | null;
  duration: string | null;
  lessons: number;
  instructor: {
    username: string;
  };
  _count: {
    enrollments: number;
  };
};

// Mock data for top students
const mockTopStudents = [
  { id: "1", name: "Nguyễn Minh Hoàng", avatar: "NH", points: 9850, streak: 45 },
  { id: "2", name: "Trần Lan Anh", avatar: "TA", points: 9200, streak: 38 },
  { id: "3", name: "Lê Đức Phong", avatar: "LP", points: 8900, streak: 32 },
  { id: "4", name: "Vũ Thảo My", avatar: "VM", points: 8650, streak: 28 },
  { id: "5", name: "Hoàng Gia Huy", avatar: "HG", points: 8400, streak: 25 },
];

const skills = [
  {
    name: "Speaking",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    color: "bg-orange-100 text-orange-600",
    bgColor: "bg-orange-500",
    description: "Luyện phát âm và giao tiếp",
  },
  {
    name: "Writing",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
    color: "bg-blue-100 text-blue-600",
    bgColor: "bg-blue-500",
    description: "Luyện viết các dạng bài",
  },
  {
    name: "Reading",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    color: "bg-green-100 text-green-600",
    bgColor: "bg-green-500",
    description: "Đọc hiểu và tốc độ",
  },
  {
    name: "Listening",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ),
    color: "bg-purple-100 text-purple-600",
    bgColor: "bg-purple-500",
    description: "Luyện nghe và nghe chính tả",
  },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data?.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Fetch courses
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) {
          setCourses(data.courses);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-purple-500 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Học Tiếng Anh <span className="text-blue-400">Hiệu Quả</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300">
              Nền tảng học tiếng Anh trực tuyến với phương pháp cá nhân hóa,
              giúp bạn cải thiện kỹ năng nhanh chóng
            </p>
            
            {/* Skills Grid */}
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {skills.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/practice/${skill.name.toLowerCase()}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:scale-105"
                >
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${skill.color}`}>
                    {skill.icon}
                  </div>
                  <h3 className="font-semibold">{skill.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{skill.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Khóa học nổi bật</h2>
              <p className="mt-1 text-slate-600">Những khóa học được đánh giá cao nhất</p>
            </div>
            <Link
              href="/courses"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Xem tất cả →
            </Link>
          </div>
          
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                  )}
                  {course.category && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                      {course.category}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600">
                    {course.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{course.instructor.username}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-500">
                        {course._count.enrollments} học viên
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {course.price.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Courses */}
      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Khóa học gợi ý cho bạn</h2>
              <p className="mt-1 text-slate-600">Dựa trên sở thích và mục tiêu học của bạn</p>
            </div>
          </div>
          
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                  )}
                  {course.category && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                      {course.category}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600">
                    {course.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{course.instructor.username}</p>
                  <div className="mt-3">
                    <span className="text-sm font-semibold text-blue-600">
                      {course.price.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top Students */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Học viên xuất sắc</h2>
              <p className="mt-1 text-slate-600">Những học viên có thành tích cao nhất</p>
            </div>
            <Link
              href="/top-students"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Xem tất cả →
            </Link>
          </div>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {mockTopStudents.map((student, index) => (
              <Link
                key={student.id}
                href={`/students/${student.id}`}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
                  {student.avatar}
                  {index === 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs">
                      👑
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-medium text-slate-900 group-hover:text-blue-600">
                    {student.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{student.points.toLocaleString()} điểm</span>
                    <span>🔥 {student.streak} ngày</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Progress (for logged in users) */}
      {!loading && user && (
        <section className="bg-slate-100 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Tiến trình học của bạn</h2>
                <p className="mt-1 text-slate-600">Theo dõi quá trình học tiếng Anh của bạn</p>
              </div>
              <Link
                href="/my-learning"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Xem chi tiết →
              </Link>
            </div>
            
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {/* Completed Courses */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-green-600">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">3</p>
                    <p className="text-sm text-slate-600">Khóa học đã hoàn thành</p>
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">2</p>
                    <p className="text-sm text-slate-600">Khóa học đang học</p>
                  </div>
                </div>
              </div>

              {/* Total Points */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-purple-600">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">1,250</p>
                    <p className="text-sm text-slate-600">Tổng điểm tích lũy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-3xl font-bold">Sẵn sàng để bắt đầu học?</h2>
          <p className="mt-4 text-slate-300">
            Đăng ký ngay hôm nay để nhận ưu đãi học phí lên đến 30%
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Đăng ký ngay
            </Link>
            <Link
              href="/courses"
              className="rounded-lg border border-slate-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Khám phá khóa học
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">LearnHub</span>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Nền tảng học tiếng Anh trực tuyến hàng đầu Việt Nam
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Liên kết nhanh</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li><Link href="/courses" className="hover:text-blue-600">Khóa học</Link></li>
                <li><Link href="/teachers" className="hover:text-blue-600">Giảng viên</Link></li>
                <li><Link href="/about" className="hover:text-blue-600">Về chúng tôi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Hỗ trợ</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li><Link href="/help" className="hover:text-blue-600">Trợ giúp</Link></li>
                <li><Link href="/contact" className="hover:text-blue-600">Liên hệ</Link></li>
                <li><Link href="/faq" className="hover:text-blue-600">Câu hỏi thường gặp</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Liên hệ</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Email: contact@learnhub.com</li>
                <li>Hotline: 1900 xxxx</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-600">
            © 2026 LearnHub. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}