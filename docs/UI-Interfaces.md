# UI Interfaces & Design Summary

Tài liệu này tóm tắt các giao diện (layouts, pages, shells, components) và cách chúng được thiết kế trong project.

## Mục lục
- Layouts & Shells
- Public pages
- Auth
- Student area
- Teacher area
- Admin area
- Profile / Account
- Reusable components
- Design patterns & CSS
- API surface & data fetching

## Layouts & Shells
- `app/layout.tsx` — Root layout: import `globals.css`, đặt `Header` toàn cục, cấu hình HTML lang, dùng Tailwind.
- `app/auth/layout.tsx` — Auth layout: card-centered container cho login/register/forgot.
- `app/admin/layout.tsx` — Admin area layout (admin-specific shell).

## Public pages
- `app/page.tsx` — Homepage / Marketplace layout.
- `app/courses/page.tsx` — Danh sách khóa học.
- `app/courses/[id]/page.tsx` — Chi tiết khóa học.
- `app/teachers/page.tsx` — Danh sách giảng viên.
- `app/teachers/[id]/page.tsx` — Trang giảng viên.
- `app/top-students/page.tsx` — Bảng xếp hạng.
- `app/about/page.tsx` — Giới thiệu.

## Auth
- `app/auth/login/page.tsx` — Form đăng nhập (được render trong Auth layout).
- `app/auth/register/page.tsx` — Form đăng ký.
- `app/auth/forgot-password/page.tsx` — Lấy lại mật khẩu.
- Note: Một biến thể `app/forgot-password/page.tsx` tồn tại trong workspace.

## Student area
- `app/student/page.tsx` — Student dashboard.
- `app/my-learning/page.tsx` — Theo dõi learning progress.
- `app/my-courses/page.tsx` — Các khóa đã mua/đăng ký.
- Tests & flow:
  - `app/student/tests/page.tsx` — Danh sách test.
  - `app/student/tests/[testId]/page.tsx` — Thực hiện test.
  - `app/student/tests/history/page.tsx` — Lịch sử.
  - `app/student/tests/[testId]/result/[attemptId]/page.tsx` — Kết quả attempt.
  - `app/student/results/page.tsx` và `app/student/results/[resultId]/page.tsx` — Kết quả tổng quan và chi tiết.
- AI features:
  - `app/student/speaking-ai/page.tsx`
  - `app/student/writing-ai/page.tsx`
- Other flows: `app/student/hoc-bai`, `app/student/lam-bai`, `app/student/rewards`, `app/student/wallet`.

## Teacher area
- `app/teacher/page.tsx` — Teacher dashboard.
- `app/teacher/courses/page.tsx` — Danh sách khóa của giảng viên.
- `app/teacher/courses/[courseId]/page.tsx` — Chi tiết khóa (modules, tests).
- `app/teacher/courses/[courseId]/modules/[moduleId]/page.tsx` — Module detail.
- Teacher tests scaffold under `app/teacher/tests`.
- `app/teacher-registration/page.tsx` — Đăng ký giảng viên (public flow).

## Admin area
- `app/admin/AdminShell.tsx` — Tabbed shell (users / tests / analytics).
- `app/admin/AdminDashboard.tsx` — Quản lý người dùng, languages, applications, course approvals; nhiều card và bảng.
- `app/admin/AdminTestsManagement.tsx` — Quản lý tests (admin).
- `app/admin/AnalyticsDashboard.tsx` — Thống kê hệ thống.

## Profile / Account
- `app/profile/page.tsx` — Profile view.
- `app/profile/ProfileSettings.tsx` — Cài đặt tài khoản.

## Reusable components
- `app/components/Header.tsx` — Sticky header, responsive nav (desktop + mobile), điều chỉnh theo `usePathname()` và `useUser()`.
- `app/components/header/AuthButtons.tsx` — Hiện login/register hoặc `ProfileMenu` khi đã đăng nhập.
- `app/components/header/ProfileMenu.tsx` — User menu (avatar, links, logout).
- `app/components/header/LoadingSkeleton.tsx` — Skeleton cho trạng thái loading.
- `app/components/header/useUser.ts` — Hook client để fetch `/api/auth/me`.
- `app/components/LogoutButton.tsx` — Nút logout.
- `app/components/learningMarketplace.ts` & `app/components/index.ts` — Các component tái sử dụng khác.

## Design patterns & CSS
- Tailwind CSS dùng rộng rãi: palette chính `slate`, `blue`, `emerald`, `amber`, `red`.
- Card-based UI: `rounded-*`, `border`, `bg-white` cho các section/dashboard.
- Responsive: breakpoint `md`, `lg`; mobile-first with hamburger nav in `Header`.
- Client components: explicit `"use client"` cho stateful components; server components used for pages where possible.
- Feedback/UX: local state messages, simple toasts, and fixed overlay modals for certificates/view details.

## API surface & data fetching
- Frontend gọi REST endpoints dưới `/api/*` (examples seen in admin pages):
  - `/api/auth/me` — lấy user hiện tại.
  - `/api/admin/*` — settings, users, teacher-applications, analytics.
  - `/api/languages` — thêm ngôn ngữ.
  - `/api/teacher/*` — course review, teacher endpoints.
- Data fetching patterns: client-side `fetch()` in `useEffect` or event handlers for interactive admin/student flows.

## How to use this document
- File location: `docs/UI-Interfaces.md` trong thư mục project.
- Nếu muốn xuất sang PDF hoặc bản tóm tắt khác, tôi có thể chuyển Markdown này sang PDF hoặc tạo CSV/Excel chứa đường dẫn và mô tả ngắn cho từng file.

---
Tôi có thể mở rộng mỗi phần với: cây component chi tiết, danh sách API endpoints từng trang gọi, hoặc sơ đồ điều hướng (Mermaid). Bạn muốn tôi làm tiếp phần nào?
