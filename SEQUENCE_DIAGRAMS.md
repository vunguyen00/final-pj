# Sơ đồ sequence FinnCenter

Tài liệu này tổng hợp các sơ đồ sequence cho những luồng nghiệp vụ chính của FinnCenter. Các sơ đồ được xuất thành hình SVG trong `public/sequence-diagrams/` và dùng tiếng Việt có dấu.

## Danh Sách Hình Vẽ

| Mã | Luồng | File hình |
| --- | --- | --- |
| UC01 | Đăng ký tài khoản | [sequence-uc01-register.svg](public/sequence-diagrams/sequence-uc01-register.svg) |
| UC02 | Đăng nhập, đăng xuất và lấy user hiện tại | [sequence-uc02-auth-session.svg](public/sequence-diagrams/sequence-uc02-auth-session.svg) |
| UC03 | Quên mật khẩu bằng OTP | [sequence-uc03-forgot-password.svg](public/sequence-diagrams/sequence-uc03-forgot-password.svg) |
| UC04 | Hồ sơ cá nhân và đổi mật khẩu | [sequence-uc04-profile.svg](public/sequence-diagrams/sequence-uc04-profile.svg) |
| UC05 | Ngôn ngữ học | [sequence-uc05-languages.svg](public/sequence-diagrams/sequence-uc05-languages.svg) |
| UC06 | Xem khóa học, chi tiết và quyền truy cập | [sequence-uc06-course-browse.svg](public/sequence-diagrams/sequence-uc06-course-browse.svg) |
| UC07 | Nạp ví bằng VNPAY | [sequence-uc07-wallet-vnpay.svg](public/sequence-diagrams/sequence-uc07-wallet-vnpay.svg) |
| UC08 | Mua hoặc đăng ký khóa học bằng ví | [sequence-uc08-course-enroll.svg](public/sequence-diagrams/sequence-uc08-course-enroll.svg) |
| UC09 | Học bài và ghi tiến độ | [sequence-uc09-learning-progress.svg](public/sequence-diagrams/sequence-uc09-learning-progress.svg) |
| UC10 | Làm test và xem kết quả | [sequence-uc10-student-test-result.svg](public/sequence-diagrams/sequence-uc10-student-test-result.svg) |
| UC11 | Đánh giá khóa học | [sequence-uc11-course-review.svg](public/sequence-diagrams/sequence-uc11-course-review.svg) |
| UC12 | Writing AI và tạo đề writing | [sequence-uc12-writing-ai.svg](public/sequence-diagrams/sequence-uc12-writing-ai.svg) |
| UC13 | Speaking AI | [sequence-uc13-speaking-ai.svg](public/sequence-diagrams/sequence-uc13-speaking-ai.svg) |
| UC14 | Mua và sử dụng hạt đậu AI | [sequence-uc14-ai-points.svg](public/sequence-diagrams/sequence-uc14-ai-points.svg) |
| UC15 | Đăng ký trở thành giáo viên | [sequence-uc15-teacher-application.svg](public/sequence-diagrams/sequence-uc15-teacher-application.svg) |
| UC16 | Admin duyệt hồ sơ giáo viên | [sequence-uc16-admin-review-teacher.svg](public/sequence-diagrams/sequence-uc16-admin-review-teacher.svg) |
| UC17 | Giáo viên quản lý khóa học, module, lesson | [sequence-uc17-teacher-course-crud.svg](public/sequence-diagrams/sequence-uc17-teacher-course-crud.svg) |
| UC18 | Giáo viên quản lý test và câu hỏi | [sequence-uc18-teacher-test-crud.svg](public/sequence-diagrams/sequence-uc18-teacher-test-crud.svg) |
| UC19 | Giáo viên xem học viên và rút doanh thu | [sequence-uc19-teacher-revenue.svg](public/sequence-diagrams/sequence-uc19-teacher-revenue.svg) |
| UC20 | Admin dashboard, setting, user và course approval | [sequence-uc20-admin-management.svg](public/sequence-diagrams/sequence-uc20-admin-management.svg) |
| UC21 | Admin xử lý rút doanh thu | [sequence-uc21-admin-withdrawal.svg](public/sequence-diagrams/sequence-uc21-admin-withdrawal.svg) |
| UC22 | Health check và route public phụ trợ | [sequence-uc22-health-public.svg](public/sequence-diagrams/sequence-uc22-health-public.svg) |

Nếu cần tạo lại toàn bộ hình SVG sau khi chỉnh nội dung, chạy:

```bash
node scripts/generate-sequence-svgs.mjs
```

## UC01 - Đăng Ký Tài Khoản

![UC01 - Đăng ký tài khoản](public/sequence-diagrams/sequence-uc01-register.svg)

Endpoint chính: `POST /api/auth/register`.

## UC02 - Đăng Nhập, Đăng Xuất Và Lấy User Hiện Tại

![UC02 - Đăng nhập, đăng xuất và lấy user hiện tại](public/sequence-diagrams/sequence-uc02-auth-session.svg)

Endpoint chính: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

## UC03 - Quên Mật Khẩu Bằng OTP

![UC03 - Quên mật khẩu bằng OTP](public/sequence-diagrams/sequence-uc03-forgot-password.svg)

Endpoint chính: `POST /api/auth/forgot-password/request-otp`, `POST /api/auth/forgot-password/reset`.

## UC04 - Hồ Sơ Cá Nhân Và Đổi Mật Khẩu

![UC04 - Hồ sơ cá nhân và đổi mật khẩu](public/sequence-diagrams/sequence-uc04-profile.svg)

Endpoint chính: `PATCH /api/profile`, `POST /api/profile/password`.

## UC05 - Ngôn Ngữ Học

![UC05 - Ngôn ngữ học](public/sequence-diagrams/sequence-uc05-languages.svg)

Endpoint chính: `GET /api/languages`, `POST /api/languages`.

## UC06 - Xem Khóa Học, Chi Tiết Và Quyền Truy Cập

![UC06 - Xem khóa học, chi tiết và quyền truy cập](public/sequence-diagrams/sequence-uc06-course-browse.svg)

Endpoint chính: `GET /api/courses`, `GET /api/courses/[id]/access`.

## UC07 - Nạp Ví Bằng VNPAY

![UC07 - Nạp ví bằng VNPAY](public/sequence-diagrams/sequence-uc07-wallet-vnpay.svg)

Endpoint chính: `GET /api/wallet`, `POST /api/wallet/top-up`, `GET /api/wallet/vnpay-ipn`, `GET /api/wallet/vnpay-return`.

## UC08 - Mua Hoặc Đăng Ký Khóa Học Bằng Ví

![UC08 - Mua hoặc đăng ký khóa học bằng ví](public/sequence-diagrams/sequence-uc08-course-enroll.svg)

Endpoint chính: `POST /api/courses/[id]/enroll`.

## UC09 - Học Bài Và Ghi Tiến Độ

![UC09 - Học bài và ghi tiến độ](public/sequence-diagrams/sequence-uc09-learning-progress.svg)

Endpoint chính: `POST /api/learning/lessons/[lessonId]/start`, `POST /api/learning/lessons/[lessonId]/complete`.

## UC10 - Làm Test Và Xem Kết Quả

![UC10 - Làm test và xem kết quả](public/sequence-diagrams/sequence-uc10-student-test-result.svg)

Endpoint chính: `GET /api/student/tests`, `GET /api/student/tests/[testId]`, `POST /api/student/tests/[testId]/submit`, `GET /api/student/results`.

## UC11 - Đánh Giá Khóa Học

![UC11 - Đánh giá khóa học](public/sequence-diagrams/sequence-uc11-course-review.svg)

Endpoint chính: `GET /api/courses/[id]/reviews`, `POST /api/courses/[id]/reviews`.

## UC12 - Writing AI Và Tạo Đề Writing

![UC12 - Writing AI và tạo đề writing](public/sequence-diagrams/sequence-uc12-writing-ai.svg)

Endpoint chính: `POST /api/ai/writing-prompt`, `POST /api/ai/essay-evaluation`, `GET /api/ai/essay-evaluation`.

## UC13 - Speaking AI

![UC13 - Speaking AI](public/sequence-diagrams/sequence-uc13-speaking-ai.svg)

Endpoint chính: `GET /api/ai/speaking-evaluation/config`, `POST /api/ai/speaking-evaluation/topic`, `POST /api/ai/speaking-evaluation`.

## UC14 - Mua Và Sử Dụng Hạt Đậu AI

![UC14 - Mua và sử dụng hạt đậu AI](public/sequence-diagrams/sequence-uc14-ai-points.svg)

Endpoint chính: `GET /api/ai/points`, `POST /api/ai/points/buy`, `POST /api/ai/points/spend`.

## UC15 - Đăng Ký Trở Thành Giáo Viên

![UC15 - Đăng ký trở thành giáo viên](public/sequence-diagrams/sequence-uc15-teacher-application.svg)

Endpoint chính: `GET /api/teacher-applications`, `POST /api/teacher-applications`, `PATCH /api/teacher-applications/[applicationId]/autosave`, `POST /api/teacher-applications/[applicationId]/anti-cheat`, `POST /api/teacher-applications/[applicationId]/submit-test`.

## UC16 - Admin Duyệt Hồ Sơ Giáo Viên

![UC16 - Admin duyệt hồ sơ giáo viên](public/sequence-diagrams/sequence-uc16-admin-review-teacher.svg)

Endpoint chính: `GET /api/admin/teacher-applications`, `PUT /api/admin/teacher-applications/[applicationId]/review`.

## UC17 - Giáo Viên Quản Lý Khóa Học, Module, Lesson

![UC17 - Giáo viên quản lý khóa học, module, lesson](public/sequence-diagrams/sequence-uc17-teacher-course-crud.svg)

Endpoint chính: `GET/POST /api/teacher/courses`, `GET/PUT/PATCH/DELETE /api/teacher/courses/[courseId]`, các API module/lesson/upload.

## UC18 - Giáo Viên Quản Lý Test Và Câu Hỏi

![UC18 - Giáo viên quản lý test và câu hỏi](public/sequence-diagrams/sequence-uc18-teacher-test-crud.svg)

Endpoint chính: `GET/POST /api/teacher/tests`, `GET/PUT/DELETE /api/teacher/tests/[testId]`, các API question/audio/material.

## UC19 - Giáo Viên Xem Học Viên Và Rút Doanh Thu

![UC19 - Giáo viên xem học viên và rút doanh thu](public/sequence-diagrams/sequence-uc19-teacher-revenue.svg)

Endpoint chính: `GET /api/teacher/students`, `POST /api/teacher/revenue-withdrawals`.

## UC20 - Admin Dashboard, Setting, User Và Course Approval

![UC20 - Admin dashboard, setting, user và course approval](public/sequence-diagrams/sequence-uc20-admin-management.svg)

Endpoint chính: `GET /api/admin/analytics`, `GET/PUT /api/admin/teacher-entrance`, `GET/PUT /api/admin/course-approval`, `GET/PUT /api/admin/speaking-config`, `PATCH /api/admin/users/[userId]`, course review/toggle APIs.

## UC21 - Admin Xử Lý Rút Doanh Thu

![UC21 - Admin xử lý rút doanh thu](public/sequence-diagrams/sequence-uc21-admin-withdrawal.svg)

Endpoint chính: `PATCH /api/admin/revenue-withdrawals/[withdrawalId]`.

## UC22 - Health Check Và Route Public Phụ Trợ

![UC22 - Health check và route public phụ trợ](public/sequence-diagrams/sequence-uc22-health-public.svg)

Endpoint chính: `GET /api/health` và các page public/phụ trợ.

## Ghi Chú Đọc Sơ Đồ

- Mũi tên liền thể hiện request hoặc hành động chính.
- Mũi tên nét đứt thể hiện response hoặc kết quả trả về.
- Thanh vàng thể hiện nhánh điều kiện, trường hợp thay thế hoặc đoạn nghiệp vụ đặc biệt.
- Mỗi sơ đồ tập trung vào luồng chính, không liệt kê toàn bộ validate nhỏ trong code để hình không bị rối.
