import { writeFileSync } from "node:fs";
import path from "node:path";

const outFile = path.join(process.cwd(), "finncenter-sequence-diagrams.drawio");

const diagrams = [
  {
    name: "UC01 Register",
    title: "UC01 - Dang ky tai khoan",
    participants: ["Guest", "Register UI", "API /auth/register", "lib/auth", "Database"],
    steps: [
      ["Guest", "Register UI", "Nhap username, email, password"],
      ["Register UI", "API /auth/register", "POST /api/auth/register"],
      ["API /auth/register", "lib/auth", "Validate password + hash password"],
      ["API /auth/register", "Database", "Kiem tra email da ton tai"],
      ["Database", "API /auth/register", "User/null", "return"],
      ["API /auth/register", "Register UI", "409 neu email da ton tai", "return"],
      ["API /auth/register", "Database", "Tao User role STUDENT"],
      ["API /auth/register", "lib/auth", "createAuthToken + setAuthCookie"],
      ["API /auth/register", "Register UI", "OK + redirectTo", "return"],
    ],
  },
  {
    name: "UC02 Login Session",
    title: "UC02 - Dang nhap, dang xuat va lay user hien tai",
    participants: ["User", "Login/Header UI", "Auth APIs", "lib/auth", "Database"],
    steps: [
      ["User", "Login/Header UI", "Nhap email va password"],
      ["Login/Header UI", "Auth APIs", "POST /api/auth/login"],
      ["Auth APIs", "Database", "findUnique User theo email"],
      ["Database", "Auth APIs", "User/null", "return"],
      ["Auth APIs", "lib/auth", "verifyPassword(password, user.password)"],
      ["Auth APIs", "Login/Header UI", "401/403 neu sai hoac bi khoa", "return"],
      ["Auth APIs", "lib/auth", "createAuthToken + setAuthCookie"],
      ["Auth APIs", "Login/Header UI", "OK + redirectTo", "return"],
      ["Login/Header UI", "Auth APIs", "GET /api/auth/me"],
      ["Auth APIs", "lib/auth", "authenticate tu cookie"],
      ["lib/auth", "Database", "findUnique User theo token.sub"],
      ["Auth APIs", "Login/Header UI", "user hoac null", "return"],
      ["User", "Login/Header UI", "Bam dang xuat"],
      ["Login/Header UI", "Auth APIs", "POST /api/auth/logout"],
      ["Auth APIs", "lib/auth", "clearAuthCookie"],
      ["Auth APIs", "Login/Header UI", "OK", "return"],
    ],
  },
  {
    name: "UC03 Forgot Password",
    title: "UC03 - Quen mat khau bang OTP",
    participants: ["User", "Forgot UI", "OTP APIs", "lib/auth", "Email service", "Database"],
    steps: [
      ["User", "Forgot UI", "Nhap email can reset"],
      ["Forgot UI", "OTP APIs", "POST request-otp"],
      ["OTP APIs", "Database", "Tim User theo email"],
      ["OTP APIs", "Forgot UI", "Tra generic OK neu khong tim thay/admin", "return"],
      ["OTP APIs", "lib/auth", "Hash OTP"],
      ["OTP APIs", "Database", "Tao PasswordResetOtp"],
      ["OTP APIs", "Email service", "Gui email OTP"],
      ["User", "Forgot UI", "Nhap OTP + password moi"],
      ["Forgot UI", "OTP APIs", "POST reset"],
      ["OTP APIs", "Database", "Lay OTP active moi nhat"],
      ["OTP APIs", "lib/auth", "Verify OTP + validate password"],
      ["OTP APIs", "Database", "Transaction doi password + consume OTP"],
      ["OTP APIs", "Forgot UI", "OK", "return"],
    ],
  },
  {
    name: "UC04 Profile",
    title: "UC04 - Ho so ca nhan va doi mat khau",
    participants: ["User", "Profile UI", "Profile APIs", "lib/auth", "Database"],
    steps: [
      ["User", "Profile UI", "Sua ho so hoac doi password"],
      ["Profile UI", "Profile APIs", "PATCH /api/profile hoac POST /api/profile/password"],
      ["Profile APIs", "lib/auth", "requireUser"],
      ["Profile APIs", "Database", "Validate language/password hien tai"],
      ["Profile APIs", "Profile UI", "400/401 neu khong hop le", "return"],
      ["Profile APIs", "Database", "Update User"],
      ["Profile APIs", "Profile UI", "Thong tin moi", "return"],
    ],
  },
  {
    name: "UC05 Languages",
    title: "UC05 - Ngon ngu hoc",
    participants: ["User/Admin", "Language UI", "API /languages", "Database"],
    steps: [
      ["User/Admin", "Language UI", "Mo danh sach ngon ngu"],
      ["Language UI", "API /languages", "GET /api/languages"],
      ["API /languages", "Database", "Query LearningLanguage active"],
      ["API /languages", "Language UI", "Danh sach ngon ngu", "return"],
      ["User/Admin", "Language UI", "Tao ngon ngu neu co quyen"],
      ["Language UI", "API /languages", "POST name/code"],
      ["API /languages", "Database", "Create LearningLanguage"],
      ["API /languages", "Language UI", "Ngon ngu vua tao", "return"],
    ],
  },
  {
    name: "UC06 Course Browse",
    title: "UC06 - Xem khoa hoc, chi tiet va quyen truy cap",
    participants: ["User", "Course pages", "Course APIs", "Database"],
    steps: [
      ["User", "Course pages", "Xem trang chu/khoa hoc/giao vien"],
      ["Course pages", "Course APIs", "GET /api/courses"],
      ["Course APIs", "Database", "Query Course ACTIVE + instructor + enrollment count"],
      ["Course APIs", "Database", "Neu login, query Enrollment cua user"],
      ["Course APIs", "Course pages", "courses + enrolledCourseIds", "return"],
      ["User", "Course pages", "Mo chi tiet khoa hoc"],
      ["Course pages", "Course APIs", "GET /api/courses/{id}/access"],
      ["Course APIs", "Database", "Kiem tra instructorId va Enrollment"],
      ["Course APIs", "Course pages", "canAccess + reason", "return"],
    ],
  },
  {
    name: "UC07 Wallet VNPAY",
    title: "UC07 - Nap vi bang VNPAY",
    participants: ["User", "Wallet UI", "Wallet APIs", "Database", "VNPAY", "Ngan hang"],
    steps: [
      ["User", "Wallet UI", "Nhap so tien nap"],
      ["Wallet UI", "Wallet APIs", "POST /api/wallet/top-up"],
      ["Wallet APIs", "Database", "Tao Order + Payment(PENDING) + Wallet neu chua co"],
      ["Database", "Wallet APIs", "order/payment pending", "return"],
      ["Wallet APIs", "Wallet APIs", "Ky tham so VNPAY"],
      ["Wallet APIs", "Wallet UI", "{ ok, paymentUrl, txnRef }", "return"],
      ["Wallet UI", "VNPAY", "Redirect sang paymentUrl"],
      ["User", "VNPAY", "Nhap thong tin thanh toan / OTP"],
      ["VNPAY", "Ngan hang", "Gui yeu cau xac thuc/thanh toan"],
      ["Ngan hang", "VNPAY", "Ket qua giao dich", "return"],
      ["VNPAY", "Wallet APIs", "IPN callback /api/wallet/vnpay-ipn"],
      ["Wallet APIs", "Database", "Tim Payment theo txnRef"],
      ["Database", "Wallet APIs", "Payment status + amount", "return"],
      ["Wallet APIs", "Wallet APIs", "Verify chu ky, so tien, responseCode/status"],
      ["Wallet APIs", "Database", "Thanh cong: Payment SUCCESS + Wallet.balance += amount"],
      ["Wallet APIs", "Database", "That bai: Payment FAILED, khong cong vi"],
      ["Wallet APIs", "VNPAY", "{ RspCode: 00, Message: Confirm Success }", "return"],
      ["VNPAY", "Wallet APIs", "Return URL /api/wallet/vnpay-return"],
      ["Wallet APIs", "Wallet UI", "Redirect /wallet?payment=success|failed|pending", "return"],
    ],
  },
  {
    name: "UC08 Course Enroll",
    title: "UC08 - Mua hoac dang ky khoa hoc bang vi",
    participants: ["User", "Enroll UI", "Enroll API", "lib/wallet", "lib/revenue", "Database"],
    steps: [
      ["User", "Enroll UI", "Bam dang ky/mua khoa hoc"],
      ["Enroll UI", "Enroll API", "POST /api/courses/{id}/enroll"],
      ["Enroll API", "Database", "Lay Course + Enrollment hien co"],
      ["Enroll API", "Database", "Tao Enrollment mien phi neu la instructor"],
      ["Enroll API", "Enroll UI", "alreadyEnrolled/enrolled", "return"],
      ["Enroll API", "lib/wallet", "getUserBalance"],
      ["lib/wallet", "Database", "Doc so du vi"],
      ["Enroll API", "Enroll UI", "400 requiresTopUp neu thieu tien", "return"],
      ["Enroll API", "lib/revenue", "calculateCourseRevenueSplit"],
      ["Enroll API", "Database", "Transaction tru vi + Order + OrderItem + Enrollment"],
      ["Enroll API", "Enroll UI", "enrolled + balance moi", "return"],
    ],
  },
  {
    name: "UC09 Learning Progress",
    title: "UC09 - Hoc bai va ghi tien do",
    participants: ["Student", "Learning UI", "Learning APIs", "learning-progress", "ai-points", "Database"],
    steps: [
      ["Student", "Learning UI", "Mo bai hoc"],
      ["Learning UI", "Learning APIs", "POST lesson/start"],
      ["Learning APIs", "Database", "Kiem tra Lesson, Course, Enrollment"],
      ["Learning APIs", "learning-progress", "ensureLessonStart"],
      ["learning-progress", "Database", "Tao Feedback LESSON_START neu chua co"],
      ["Learning APIs", "Learning UI", "OK", "return"],
      ["Student", "Learning UI", "Hoan thanh bai hoc"],
      ["Learning UI", "Learning APIs", "POST lesson/complete"],
      ["Learning APIs", "Database", "Kiem tra access/video/thoi gian hoc"],
      ["Learning APIs", "learning-progress", "markLessonCompleted"],
      ["learning-progress", "Database", "Tao Feedback PROGRESS"],
      ["Learning APIs", "ai-points", "recordLearningActivity(LESSON)"],
      ["ai-points", "Database", "Ghi LearningActivity"],
      ["Learning APIs", "Learning UI", "OK", "return"],
    ],
  },
  {
    name: "UC10 Student Test",
    title: "UC10 - Lam test va xem ket qua",
    participants: ["Student", "Student Tests UI", "Test APIs", "Ollama AI", "learning-progress", "Email service", "Database"],
    steps: [
      ["Student", "Student Tests UI", "Xem danh sach test"],
      ["Student Tests UI", "Test APIs", "GET /api/student/tests"],
      ["Test APIs", "Database", "Lay Enrollment, Course, Test, Attempt"],
      ["Test APIs", "learning-progress", "getCourseProgressPercent"],
      ["Test APIs", "Student Tests UI", "tests + canAttempt", "return"],
      ["Student", "Student Tests UI", "Nop bai test"],
      ["Student Tests UI", "Test APIs", "POST /api/student/tests/{testId}/submit"],
      ["Test APIs", "Database", "Lay Test + Question + Answer + Course"],
      ["Test APIs", "learning-progress", "Kiem tra progress 100%"],
      ["Test APIs", "Ollama AI", "Cham essay/speaking neu co"],
      ["Ollama AI", "Test APIs", "Diem + feedback", "return"],
      ["Test APIs", "Database", "Tao TestAttempt + LearningActivity"],
      ["Test APIs", "learning-progress", "markCourseCompleted neu dat"],
      ["Test APIs", "Email service", "Gui chung chi neu chua gui"],
      ["Test APIs", "Student Tests UI", "score + attemptId", "return"],
    ],
  },
  {
    name: "UC11 Course Review",
    title: "UC11 - Danh gia khoa hoc",
    participants: ["Student", "Review UI", "Reviews API", "course-reviews", "Database"],
    steps: [
      ["Student", "Review UI", "Mo phan danh gia khoa hoc"],
      ["Review UI", "Reviews API", "GET /api/courses/{id}/reviews"],
      ["Reviews API", "course-reviews", "getCourseReviews + canReviewCourse"],
      ["course-reviews", "Database", "Query Feedback va TestAttempt"],
      ["Reviews API", "Review UI", "reviews + myReview + canReview", "return"],
      ["Student", "Review UI", "Gui rating/comment"],
      ["Review UI", "Reviews API", "POST /api/courses/{id}/reviews"],
      ["Reviews API", "course-reviews", "canReviewCourse"],
      ["Reviews API", "Review UI", "403 neu chua du dieu kien", "return"],
      ["Reviews API", "course-reviews", "upsertCourseReview"],
      ["course-reviews", "Database", "Create/Update Feedback"],
      ["Reviews API", "Review UI", "reviews moi", "return"],
    ],
  },
  {
    name: "UC12 Writing AI",
    title: "UC12 - Writing AI va tao de writing",
    participants: ["User", "Writing AI UI", "Writing APIs", "Ollama AI", "ai-points", "Database"],
    steps: [
      ["User", "Writing AI UI", "Tao de writing"],
      ["Writing AI UI", "Writing APIs", "POST /api/ai/writing-prompt"],
      ["Writing APIs", "Ollama AI", "Health check + generate prompt"],
      ["Writing APIs", "Writing AI UI", "Prompt AI hoac fallback", "return"],
      ["User", "Writing AI UI", "Nop bai viet"],
      ["Writing AI UI", "Writing APIs", "POST /api/ai/essay-evaluation"],
      ["Writing APIs", "Database", "Kiem tra user/course access"],
      ["Writing APIs", "ai-points", "Kiem tra hat dau neu can feedback chi tiet"],
      ["Writing APIs", "Ollama AI", "Cham IELTS/language-specific writing"],
      ["Ollama AI", "Writing APIs", "Evaluation", "return"],
      ["Writing APIs", "Database", "Tao AiAssessment WRITING"],
      ["Writing APIs", "ai-points", "spendAiPoints neu can"],
      ["Writing APIs", "Writing AI UI", "feedback + assessmentId + points", "return"],
    ],
  },
  {
    name: "UC13 Speaking AI",
    title: "UC13 - Speaking AI",
    participants: ["User", "Speaking AI UI", "Speaking APIs", "Ollama AI", "File storage", "ai-points", "Database"],
    steps: [
      ["Speaking AI UI", "Speaking APIs", "GET /api/ai/speaking-evaluation/config"],
      ["Speaking APIs", "Database", "Lay SystemSetting speaking"],
      ["Speaking APIs", "Speaking AI UI", "config", "return"],
      ["User", "Speaking AI UI", "Tao topic va thu am"],
      ["Speaking AI UI", "Speaking APIs", "POST topic"],
      ["Speaking APIs", "Ollama AI", "Generate topic"],
      ["Speaking APIs", "Speaking AI UI", "topic", "return"],
      ["User", "Speaking AI UI", "Nop transcript + audio"],
      ["Speaking AI UI", "Speaking APIs", "POST /api/ai/speaking-evaluation"],
      ["Speaking APIs", "Database", "Kiem tra user/course access"],
      ["Speaking APIs", "ai-points", "Kiem tra hat dau neu can"],
      ["Speaking APIs", "Ollama AI", "Cham speaking"],
      ["Speaking APIs", "File storage", "Luu audio file neu co"],
      ["Speaking APIs", "Database", "Tao AiAssessment SPEAKING"],
      ["Speaking APIs", "ai-points", "spendAiPoints neu can"],
      ["Speaking APIs", "Speaking AI UI", "feedback + assessmentId + audioUrl", "return"],
    ],
  },
  {
    name: "UC14 AI Points",
    title: "UC14 - Mua va su dung hat dau AI",
    participants: ["User", "Wallet/AI UI", "AI Points APIs", "lib/wallet", "ai-points", "Database"],
    steps: [
      ["Wallet/AI UI", "AI Points APIs", "GET /api/ai/points"],
      ["AI Points APIs", "ai-points", "getAiPointsSummary"],
      ["ai-points", "Database", "Query PointTransaction + AiAssessment + LearningActivity"],
      ["AI Points APIs", "Wallet/AI UI", "earned/spent/available/history", "return"],
      ["User", "Wallet/AI UI", "Mua hat dau"],
      ["Wallet/AI UI", "AI Points APIs", "POST /api/ai/points/buy"],
      ["AI Points APIs", "Database", "Bat dau transaction"],
      ["AI Points APIs", "lib/wallet", "debitWalletForPurchase"],
      ["lib/wallet", "Database", "Tru so du vi"],
      ["AI Points APIs", "ai-points", "record AI_POINTS_PURCHASE"],
      ["ai-points", "Database", "Tao PointTransaction"],
      ["AI Points APIs", "Wallet/AI UI", "points + walletBalance", "return"],
    ],
  },
  {
    name: "UC15 Teacher Application",
    title: "UC15 - Dang ky tro thanh giao vien",
    participants: ["Student", "Teacher Registration UI", "Application APIs", "File storage", "Ollama AI", "Email service", "Database"],
    steps: [
      ["Student", "Teacher Registration UI", "Mo trang dang ky giao vien"],
      ["Teacher Registration UI", "Application APIs", "GET /api/teacher-applications"],
      ["Application APIs", "Database", "Lay setting, languages, applications"],
      ["Application APIs", "Teacher Registration UI", "form data", "return"],
      ["Student", "Teacher Registration UI", "Upload chung chi + chon ngon ngu"],
      ["Teacher Registration UI", "Application APIs", "POST /api/teacher-applications"],
      ["Application APIs", "Database", "Kiem tra setting/language"],
      ["Application APIs", "File storage", "Luu file certificate"],
      ["Application APIs", "Database", "Tao TeacherApplication + certificates"],
      ["Application APIs", "Email service", "Gui email da nhan ho so"],
      ["Application APIs", "Teacher Registration UI", "application + entranceTest neu co", "return"],
      ["Teacher Registration UI", "Application APIs", "Autosave answer / anti-cheat"],
      ["Application APIs", "Database", "Luu answerState/AntiCheatLog/SuspiciousEvent"],
      ["Student", "Teacher Registration UI", "Nop bai dau vao"],
      ["Teacher Registration UI", "Application APIs", "POST submit-test"],
      ["Application APIs", "Ollama AI", "Cham essay/speaking neu co"],
      ["Application APIs", "Database", "Tao TestAttempt + update UNDER_REVIEW"],
      ["Application APIs", "Email service", "Gui thong bao review"],
      ["Application APIs", "Teacher Registration UI", "score + underReview", "return"],
    ],
  },
  {
    name: "UC16 Admin Review Teacher",
    title: "UC16 - Admin duyet ho so giao vien",
    participants: ["Admin", "Admin UI", "Teacher App APIs", "Email service", "Database"],
    steps: [
      ["Admin", "Admin UI", "Mo danh sach ho so"],
      ["Admin UI", "Teacher App APIs", "GET /api/admin/teacher-applications"],
      ["Teacher App APIs", "Database", "Query applications + user + certificates + attempts"],
      ["Teacher App APIs", "Admin UI", "applications", "return"],
      ["Admin", "Admin UI", "Approve hoac Reject"],
      ["Admin UI", "Teacher App APIs", "PUT review"],
      ["Teacher App APIs", "Database", "Transaction update application"],
      ["Teacher App APIs", "Database", "Approve: Update User.role = TEACHER"],
      ["Teacher App APIs", "Database", "Reject: Luu rejectionReason"],
      ["Teacher App APIs", "Database", "Tao Notification + ApplicationLog"],
      ["Teacher App APIs", "Email service", "Gui email ket qua"],
      ["Teacher App APIs", "Admin UI", "OK + status moi", "return"],
    ],
  },
  {
    name: "UC17 Teacher Course CRUD",
    title: "UC17 - Giao vien quan ly khoa hoc, module, lesson",
    participants: ["Teacher", "Teacher Course UI", "Course APIs", "File storage", "Database"],
    steps: [
      ["Teacher", "Teacher Course UI", "Tao hoac sua khoa hoc"],
      ["Teacher Course UI", "Course APIs", "POST/PUT course"],
      ["Course APIs", "Database", "Kiem tra role, ownership, application, auto approval"],
      ["Course APIs", "Database", "Create/Update Course"],
      ["Course APIs", "Teacher Course UI", "course + requiresApproval", "return"],
      ["Teacher", "Teacher Course UI", "Them module/lesson"],
      ["Teacher Course UI", "Course APIs", "POST modules/lessons"],
      ["Course APIs", "Database", "Kiem tra owner/admin"],
      ["Course APIs", "Database", "Create Module/Lesson + increment lessons"],
      ["Course APIs", "Teacher Course UI", "module/lesson", "return"],
      ["Teacher", "Teacher Course UI", "Upload video/thumbnail"],
      ["Teacher Course UI", "Course APIs", "POST upload API"],
      ["Course APIs", "File storage", "Ghi file vao public"],
      ["Course APIs", "Teacher Course UI", "file URL", "return"],
      ["Teacher", "Teacher Course UI", "Xoa/khoa khoa hoc"],
      ["Teacher Course UI", "Course APIs", "DELETE/PATCH course"],
      ["Course APIs", "Database", "Neu co hoc vien thi LOCKED, neu chua co thi xoa vat ly"],
      ["Course APIs", "Teacher Course UI", "Ket qua", "return"],
    ],
  },
  {
    name: "UC18 Teacher Test CRUD",
    title: "UC18 - Giao vien quan ly test va cau hoi",
    participants: ["Teacher", "Teacher Tests UI", "Test APIs", "File storage", "Database"],
    steps: [
      ["Teacher", "Teacher Tests UI", "Tao test"],
      ["Teacher Tests UI", "Test APIs", "POST /api/teacher/tests"],
      ["Test APIs", "Database", "Kiem tra role, course owner, language, module count"],
      ["Test APIs", "Database", "Create Test"],
      ["Test APIs", "Teacher Tests UI", "test", "return"],
      ["Teacher", "Teacher Tests UI", "Them hoac sua cau hoi"],
      ["Teacher Tests UI", "Test APIs", "POST/PUT questions"],
      ["Test APIs", "Database", "Kiem tra owner/admin va tong diem"],
      ["Test APIs", "Database", "Create/Update Question + Answer"],
      ["Test APIs", "Teacher Tests UI", "question", "return"],
      ["Teacher", "Teacher Tests UI", "Upload audio/tai lieu de"],
      ["Teacher Tests UI", "Test APIs", "POST question-audio-upload/test-material-upload"],
      ["Test APIs", "File storage", "Luu file"],
      ["Test APIs", "Teacher Tests UI", "URL/material metadata", "return"],
    ],
  },
  {
    name: "UC19 Teacher Revenue",
    title: "UC19 - Giao vien xem hoc vien va rut doanh thu",
    participants: ["Teacher", "Students/Revenue UI", "Teacher APIs", "teacher-revenue", "Database"],
    steps: [
      ["Teacher", "Students/Revenue UI", "Xem hoc vien"],
      ["Students/Revenue UI", "Teacher APIs", "GET /api/teacher/students"],
      ["Teacher APIs", "Database", "Query enrollments, users, payments/orderItems/points"],
      ["Teacher APIs", "Students/Revenue UI", "students management data", "return"],
      ["Teacher", "Students/Revenue UI", "Gui yeu cau rut doanh thu"],
      ["Students/Revenue UI", "Teacher APIs", "POST /api/teacher/revenue-withdrawals"],
      ["Teacher APIs", "Database", "Transaction aggregate earned/reserved"],
      ["Teacher APIs", "teacher-revenue", "calculateAvailableTeacherRevenue"],
      ["Teacher APIs", "Students/Revenue UI", "400 neu vuot so du kha dung", "return"],
      ["Teacher APIs", "Database", "Create TeacherRevenueWithdrawal PENDING"],
      ["Teacher APIs", "Students/Revenue UI", "withdrawal + available", "return"],
    ],
  },
  {
    name: "UC20 Admin Management",
    title: "UC20 - Admin dashboard, setting, user va course approval",
    participants: ["Admin", "Admin UI", "Admin APIs", "Email service", "Database"],
    steps: [
      ["Admin", "Admin UI", "Mo dashboard"],
      ["Admin UI", "Admin APIs", "GET /api/admin/analytics"],
      ["Admin APIs", "Database", "Aggregate users/courses/tests/revenue/AI/anti-cheat"],
      ["Admin APIs", "Admin UI", "dashboard data", "return"],
      ["Admin", "Admin UI", "Doi setting he thong"],
      ["Admin UI", "Admin APIs", "PUT teacher-entrance/course-approval/speaking-config"],
      ["Admin APIs", "Database", "Upsert SystemSetting"],
      ["Admin APIs", "Database", "Neu mo teacher entrance: query Students + tao Notification"],
      ["Admin APIs", "Email service", "Gui email thong bao"],
      ["Admin APIs", "Admin UI", "setting moi", "return"],
      ["Admin", "Admin UI", "Khoa user/course hoac duyet course"],
      ["Admin UI", "Admin APIs", "PATCH user/course"],
      ["Admin APIs", "Database", "Update User/Course + Notification neu can"],
      ["Admin APIs", "Admin UI", "Ket qua", "return"],
    ],
  },
  {
    name: "UC21 Admin Withdrawal",
    title: "UC21 - Admin xu ly rut doanh thu",
    participants: ["Admin", "Withdrawal UI", "Withdrawal API", "Database"],
    steps: [
      ["Admin", "Withdrawal UI", "Approve, Pay hoac Reject request"],
      ["Withdrawal UI", "Withdrawal API", "PATCH /api/admin/revenue-withdrawals/{id}"],
      ["Withdrawal API", "Database", "Lay withdrawal hien tai"],
      ["Withdrawal API", "Withdrawal UI", "409 neu trang thai khong hop le", "return"],
      ["Withdrawal API", "Database", "Transaction update status, processedAt, note"],
      ["Withdrawal API", "Database", "Tao Notification cho giao vien"],
      ["Withdrawal API", "Withdrawal UI", "withdrawal moi", "return"],
    ],
  },
  {
    name: "UC22 Health Public",
    title: "UC22 - Health check va route public phu tro",
    participants: ["User", "Public pages", "API /health", "Database"],
    steps: [
      ["User", "Public pages", "Mo trang public/phu tro"],
      ["Public pages", "Database", "Server components query du lieu neu can"],
      ["Public pages", "User", "Render page", "return"],
      ["User", "API /health", "GET /api/health"],
      ["API /health", "Database", "SELECT 1"],
      ["API /health", "User", "status healthy/unhealthy", "return"],
    ],
  },
];

const FRIENDLY_TEXT = new Map([
  ["UC01 Register", "Đăng ký tài khoản"],
  ["UC02 Login Session", "Đăng nhập và phiên làm việc"],
  ["UC03 Forgot Password", "Quên mật khẩu bằng mã xác nhận"],
  ["UC04 Profile", "Hồ sơ cá nhân"],
  ["UC05 Languages", "Ngôn ngữ học"],
  ["UC06 Course Browse", "Xem khóa học"],
  ["UC07 Wallet VNPAY", "Nạp ví qua VNPAY"],
  ["UC08 Course Enroll", "Đăng ký khóa học"],
  ["UC09 Learning Progress", "Học bài và tiến độ"],
  ["UC10 Student Test", "Làm bài kiểm tra"],
  ["UC11 Course Review", "Đánh giá khóa học"],
  ["UC12 Writing AI", "Luyện viết với AI"],
  ["UC13 Speaking AI", "Luyện nói với AI"],
  ["UC14 AI Points", "Hạt đậu AI"],
  ["UC15 Teacher Application", "Đăng ký làm giáo viên"],
  ["UC16 Admin Review Teacher", "Quản trị duyệt giáo viên"],
  ["UC17 Teacher Course CRUD", "Giáo viên quản lý khóa học"],
  ["UC18 Teacher Test CRUD", "Giáo viên quản lý bài kiểm tra"],
  ["UC19 Teacher Revenue", "Doanh thu giáo viên"],
  ["UC20 Admin Management", "Quản trị hệ thống"],
  ["UC21 Admin Withdrawal", "Quản trị xử lý rút tiền"],
  ["UC22 Health Public", "Trang công khai và kiểm tra hệ thống"],

  ["UC01 - Dang ky tai khoan", "UC01 - Đăng ký tài khoản"],
  ["UC02 - Dang nhap, dang xuat va lay user hien tai", "UC02 - Đăng nhập, đăng xuất và nhận diện người dùng"],
  ["UC03 - Quen mat khau bang OTP", "UC03 - Quên mật khẩu bằng mã xác nhận"],
  ["UC04 - Ho so ca nhan va doi mat khau", "UC04 - Hồ sơ cá nhân và đổi mật khẩu"],
  ["UC05 - Ngon ngu hoc", "UC05 - Quản lý ngôn ngữ học"],
  ["UC06 - Xem khoa hoc, chi tiet va quyen truy cap", "UC06 - Xem khóa học, chi tiết và quyền truy cập"],
  ["UC07 - Nap vi bang VNPAY", "UC07 - Nạp ví bằng VNPAY"],
  ["UC08 - Mua hoac dang ky khoa hoc bang vi", "UC08 - Mua hoặc đăng ký khóa học bằng ví"],
  ["UC09 - Hoc bai va ghi tien do", "UC09 - Học bài và ghi nhận tiến độ"],
  ["UC10 - Lam test va xem ket qua", "UC10 - Làm bài kiểm tra và xem kết quả"],
  ["UC11 - Danh gia khoa hoc", "UC11 - Đánh giá khóa học"],
  ["UC12 - Writing AI va tao de writing", "UC12 - Luyện viết với AI và tạo đề viết"],
  ["UC13 - Speaking AI", "UC13 - Luyện nói với AI"],
  ["UC14 - Mua va su dung hat dau AI", "UC14 - Mua và sử dụng hạt đậu AI"],
  ["UC15 - Dang ky tro thanh giao vien", "UC15 - Đăng ký trở thành giáo viên"],
  ["UC16 - Admin duyet ho so giao vien", "UC16 - Quản trị viên duyệt hồ sơ giáo viên"],
  ["UC17 - Giao vien quan ly khoa hoc, module, lesson", "UC17 - Giáo viên quản lý khóa học, chương và bài học"],
  ["UC18 - Giao vien quan ly test va cau hoi", "UC18 - Giáo viên quản lý bài kiểm tra và câu hỏi"],
  ["UC19 - Giao vien xem hoc vien va rut doanh thu", "UC19 - Giáo viên xem học viên và yêu cầu rút doanh thu"],
  ["UC20 - Admin dashboard, setting, user va course approval", "UC20 - Quản trị dashboard, cài đặt, người dùng và duyệt khóa học"],
  ["UC21 - Admin xu ly rut doanh thu", "UC21 - Quản trị viên xử lý yêu cầu rút doanh thu"],
  ["UC22 - Health check va route public phu tro", "UC22 - Trang công khai và kiểm tra tình trạng hệ thống"],

  ["Guest", "Khách"],
  ["User", "Người dùng"],
  ["User/Admin", "Người dùng / Quản trị viên"],
  ["Student", "Học viên"],
  ["Teacher", "Giáo viên"],
  ["Admin", "Quản trị viên"],
  ["Register UI", "Màn hình đăng ký"],
  ["Login/Header UI", "Màn hình đăng nhập / thanh đầu trang"],
  ["Forgot UI", "Màn hình quên mật khẩu"],
  ["Profile UI", "Màn hình hồ sơ"],
  ["Language UI", "Màn hình ngôn ngữ"],
  ["Course pages", "Trang khóa học"],
  ["Wallet UI", "Màn hình ví"],
  ["Enroll UI", "Màn hình đăng ký khóa học"],
  ["Learning UI", "Màn hình học bài"],
  ["Student Tests UI", "Màn hình làm bài kiểm tra"],
  ["Review UI", "Màn hình đánh giá"],
  ["Writing AI UI", "Màn hình luyện viết"],
  ["Speaking AI UI", "Màn hình luyện nói"],
  ["Wallet/AI UI", "Màn hình ví / AI"],
  ["Teacher Registration UI", "Màn hình đăng ký giáo viên"],
  ["Admin UI", "Màn hình quản trị"],
  ["Teacher Course UI", "Màn hình quản lý khóa học"],
  ["Teacher Tests UI", "Màn hình quản lý bài kiểm tra"],
  ["Students/Revenue UI", "Màn hình học viên / doanh thu"],
  ["Withdrawal UI", "Màn hình rút tiền"],
  ["Public pages", "Các trang công khai"],
  ["API /auth/register", "Bộ xử lý đăng ký"],
  ["Auth APIs", "Bộ xử lý đăng nhập"],
  ["OTP APIs", "Bộ xử lý mã xác nhận"],
  ["Profile APIs", "Bộ xử lý hồ sơ"],
  ["API /languages", "Bộ xử lý ngôn ngữ"],
  ["Course APIs", "Bộ xử lý khóa học"],
  ["Wallet APIs", "Bộ xử lý ví"],
  ["Enroll API", "Bộ xử lý đăng ký khóa học"],
  ["Learning APIs", "Bộ xử lý học bài"],
  ["Test APIs", "Bộ xử lý bài kiểm tra"],
  ["Reviews API", "Bộ xử lý đánh giá"],
  ["Writing APIs", "Bộ xử lý luyện viết"],
  ["Speaking APIs", "Bộ xử lý luyện nói"],
  ["AI Points APIs", "Bộ xử lý hạt đậu AI"],
  ["Application APIs", "Bộ xử lý hồ sơ giáo viên"],
  ["Teacher App APIs", "Bộ xử lý duyệt giáo viên"],
  ["Teacher APIs", "Bộ xử lý dành cho giáo viên"],
  ["Admin APIs", "Bộ xử lý quản trị"],
  ["Withdrawal API", "Bộ xử lý rút tiền"],
  ["API /health", "Bộ kiểm tra tình trạng hệ thống"],
  ["lib/auth", "Bộ xử lý bảo mật tài khoản"],
  ["lib/wallet", "Bộ xử lý ví"],
  ["lib/revenue", "Bộ tính chia doanh thu"],
  ["learning-progress", "Bộ ghi nhận tiến độ học"],
  ["ai-points", "Bộ quản lý hạt đậu AI"],
  ["course-reviews", "Bộ xử lý đánh giá khóa học"],
  ["teacher-revenue", "Bộ tính doanh thu giáo viên"],
  ["Database", "Cơ sở dữ liệu"],
  ["Email service", "Dịch vụ gửi email"],
  ["Ollama AI", "AI chấm bài"],
  ["File storage", "Kho lưu tệp"],
  ["Ngan hang", "Ngân hàng"],

  ["Nhap username, email, password", "Người dùng nhập tên, email và mật khẩu"],
  ["POST /api/auth/register", "Gửi thông tin đăng ký cho hệ thống"],
  ["Validate password + hash password", "Kiểm tra độ mạnh mật khẩu và mã hóa mật khẩu"],
  ["Kiem tra email da ton tai", "Kiểm tra email đã được dùng hay chưa"],
  ["User/null", "Phản hồi: có tài khoản hoặc không có tài khoản"],
  ["409 neu email da ton tai", "Phản hồi: báo email đã được dùng"],
  ["Tao User role STUDENT", "Tạo tài khoản học viên mới"],
  ["createAuthToken + setAuthCookie", "Tạo phiên đăng nhập an toàn"],
  ["OK + redirectTo", "Phản hồi: đăng ký thành công và chuyển trang"],

  ["Nhap email va password", "Người dùng nhập email và mật khẩu"],
  ["POST /api/auth/login", "Gửi thông tin đăng nhập cho hệ thống"],
  ["findUnique User theo email", "Tìm tài khoản theo email"],
  ["verifyPassword(password, user.password)", "So sánh mật khẩu người dùng nhập với mật khẩu đã lưu"],
  ["401/403 neu sai hoac bi khoa", "Phản hồi: báo sai thông tin hoặc tài khoản bị khóa"],
  ["GET /api/auth/me", "Hỏi hệ thống người nào đang đăng nhập"],
  ["authenticate tu cookie", "Kiểm tra phiên đăng nhập trong trình duyệt"],
  ["findUnique User theo token.sub", "Tìm thông tin người dùng từ phiên đăng nhập"],
  ["user hoac null", "Phản hồi: thông tin người dùng hoặc chưa đăng nhập"],
  ["Bam dang xuat", "Người dùng bấm đăng xuất"],
  ["POST /api/auth/logout", "Gửi yêu cầu đăng xuất"],
  ["clearAuthCookie", "Xóa phiên đăng nhập trong trình duyệt"],
  ["OK", "Phản hồi: thành công"],

  ["Nhap email can reset", "Người dùng nhập email cần đặt lại mật khẩu"],
  ["POST request-otp", "Gửi yêu cầu nhận mã xác nhận"],
  ["Tim User theo email", "Tìm tài khoản theo email"],
  ["Tra generic OK neu khong tim thay/admin", "Phản hồi chung để không lộ email có tồn tại hay không"],
  ["Hash OTP", "Mã hóa mã xác nhận"],
  ["Tao PasswordResetOtp", "Lưu mã xác nhận có thời hạn"],
  ["Gui email OTP", "Gửi mã xác nhận qua email"],
  ["Nhap OTP + password moi", "Người dùng nhập mã xác nhận và mật khẩu mới"],
  ["POST reset", "Gửi yêu cầu đổi mật khẩu"],
  ["Lay OTP active moi nhat", "Lấy mã xác nhận còn hiệu lực mới nhất"],
  ["Verify OTP + validate password", "Kiểm tra mã xác nhận và mật khẩu mới"],
  ["Transaction doi password + consume OTP", "Đổi mật khẩu và đánh dấu mã đã dùng"],

  ["Sua ho so hoac doi password", "Người dùng sửa hồ sơ hoặc đổi mật khẩu"],
  ["PATCH /api/profile hoac POST /api/profile/password", "Gửi yêu cầu cập nhật hồ sơ hoặc đổi mật khẩu"],
  ["requireUser", "Kiểm tra người dùng đã đăng nhập"],
  ["Validate language/password hien tai", "Kiểm tra ngôn ngữ học hoặc mật khẩu hiện tại"],
  ["400/401 neu khong hop le", "Phản hồi: báo thông tin không hợp lệ"],
  ["Update User", "Cập nhật thông tin tài khoản"],
  ["Thong tin moi", "Phản hồi: thông tin mới"],

  ["Mo danh sach ngon ngu", "Mở danh sách ngôn ngữ học"],
  ["GET /api/languages", "Yêu cầu danh sách ngôn ngữ"],
  ["Query LearningLanguage active", "Lấy các ngôn ngữ đang được sử dụng"],
  ["Danh sach ngon ngu", "Phản hồi: danh sách ngôn ngữ"],
  ["Tao ngon ngu neu co quyen", "Tạo ngôn ngữ mới nếu có quyền"],
  ["POST name/code", "Gửi tên và mã ngôn ngữ"],
  ["Create LearningLanguage", "Lưu ngôn ngữ mới"],
  ["Ngon ngu vua tao", "Phản hồi: ngôn ngữ vừa tạo"],

  ["Xem trang chu/khoa hoc/giao vien", "Người dùng xem trang chủ, khóa học hoặc giáo viên"],
  ["GET /api/courses", "Yêu cầu danh sách khóa học"],
  ["Query Course ACTIVE + instructor + enrollment count", "Lấy khóa học đang mở, giáo viên và số học viên"],
  ["Neu login, query Enrollment cua user", "Nếu đã đăng nhập, kiểm tra các khóa đã đăng ký"],
  ["courses + enrolledCourseIds", "Phản hồi: danh sách khóa học và khóa đã đăng ký"],
  ["Mo chi tiet khoa hoc", "Mở chi tiết khóa học"],
  ["GET /api/courses/{id}/access", "Hỏi hệ thống người dùng có được học khóa này không"],
  ["Kiem tra instructorId va Enrollment", "Kiểm tra chủ khóa học và trạng thái đăng ký"],
  ["canAccess + reason", "Phản hồi: có được truy cập hay không và lý do"],

  ["Nhap so tien nap", "Người dùng nhập số tiền muốn nạp"],
  ["POST /api/wallet/top-up", "Gửi yêu cầu nạp tiền"],
  ["Tao Order + Payment(PENDING) + Wallet neu chua co", "Tạo giao dịch chờ thanh toán và ví nếu chưa có"],
  ["order/payment pending", "Phản hồi: giao dịch đang chờ thanh toán"],
  ["Ky tham so VNPAY", "Chuẩn bị và ký thông tin gửi sang VNPAY"],
  ["{ ok, paymentUrl, txnRef }", "Phản hồi: đường dẫn thanh toán và mã giao dịch"],
  ["Redirect sang paymentUrl", "Chuyển người dùng sang trang thanh toán VNPAY"],
  ["Nhap thong tin thanh toan / OTP", "Người dùng nhập thông tin thanh toán và mã xác nhận"],
  ["Gui yeu cau xac thuc/thanh toan", "Gửi yêu cầu xác thực và thanh toán"],
  ["Ket qua giao dich", "Phản hồi: kết quả giao dịch"],
  ["IPN callback /api/wallet/vnpay-ipn", "VNPAY gửi kết quả giao dịch về hệ thống"],
  ["Tim Payment theo txnRef", "Tìm giao dịch theo mã giao dịch"],
  ["Payment status + amount", "Phản hồi: trạng thái và số tiền giao dịch"],
  ["Verify chu ky, so tien, responseCode/status", "Kiểm tra chữ ký, số tiền và trạng thái VNPAY trả về"],
  ["Thanh cong: Payment SUCCESS + Wallet.balance += amount", "Nếu thành công: đánh dấu giao dịch thành công và cộng tiền vào ví"],
  ["That bai: Payment FAILED, khong cong vi", "Nếu thất bại: đánh dấu giao dịch thất bại và không cộng tiền"],
  ["{ RspCode: 00, Message: Confirm Success }", "Phản hồi cho VNPAY: hệ thống đã ghi nhận kết quả"],
  ["Return URL /api/wallet/vnpay-return", "VNPAY đưa người dùng quay lại hệ thống"],
  ["Redirect /wallet?payment=success|failed|pending", "Chuyển về trang ví và hiển thị thành công, thất bại hoặc đang chờ"],

  ["Bam dang ky/mua khoa hoc", "Người dùng bấm đăng ký hoặc mua khóa học"],
  ["POST /api/courses/{id}/enroll", "Gửi yêu cầu đăng ký khóa học"],
  ["Lay Course + Enrollment hien co", "Lấy thông tin khóa học và kiểm tra đã đăng ký chưa"],
  ["Tao Enrollment mien phi neu la instructor", "Nếu là giáo viên của khóa học thì đăng ký miễn phí"],
  ["alreadyEnrolled/enrolled", "Phản hồi: đã đăng ký hoặc vừa đăng ký xong"],
  ["getUserBalance", "Lấy số dư ví"],
  ["Doc so du vi", "Đọc số dư trong ví"],
  ["400 requiresTopUp neu thieu tien", "Phản hồi: báo số dư không đủ và cần nạp thêm"],
  ["calculateCourseRevenueSplit", "Tính phần doanh thu của hệ thống và giáo viên"],
  ["Transaction tru vi + Order + OrderItem + Enrollment", "Trong một giao dịch: trừ ví, tạo đơn hàng và ghi nhận đăng ký"],
  ["enrolled + balance moi", "Phản hồi: đăng ký thành công và số dư còn lại"],

  ["Mo bai hoc", "Học viên mở bài học"],
  ["POST lesson/start", "Ghi nhận bắt đầu học"],
  ["Kiem tra Lesson, Course, Enrollment", "Kiểm tra bài học, khóa học và quyền học"],
  ["ensureLessonStart", "Đảm bảo đã ghi nhận lượt bắt đầu học"],
  ["Tao Feedback LESSON_START neu chua co", "Lưu mốc bắt đầu học nếu chưa có"],
  ["Hoan thanh bai hoc", "Học viên hoàn thành bài học"],
  ["POST lesson/complete", "Ghi nhận hoàn thành bài học"],
  ["Kiem tra access/video/thoi gian hoc", "Kiểm tra quyền học, video và thời gian học"],
  ["markLessonCompleted", "Đánh dấu bài học đã hoàn thành"],
  ["Tao Feedback PROGRESS", "Lưu tiến độ học tập"],
  ["recordLearningActivity(LESSON)", "Ghi nhận hoạt động học bài"],
  ["Ghi LearningActivity", "Lưu hoạt động học tập"],

  ["Xem danh sach test", "Học viên xem danh sách bài kiểm tra"],
  ["GET /api/student/tests", "Yêu cầu danh sách bài kiểm tra"],
  ["Lay Enrollment, Course, Test, Attempt", "Lấy khóa đã học, khóa học, bài kiểm tra và lần làm trước"],
  ["getCourseProgressPercent", "Tính phần trăm tiến độ khóa học"],
  ["tests + canAttempt", "Phản hồi: bài kiểm tra và quyền được làm"],
  ["Nop bai test", "Học viên nộp bài kiểm tra"],
  ["POST /api/student/tests/{testId}/submit", "Gửi bài làm để chấm điểm"],
  ["Lay Test + Question + Answer + Course", "Lấy đề, câu hỏi, đáp án và khóa học"],
  ["Kiem tra progress 100%", "Kiểm tra đã học đủ điều kiện để làm bài"],
  ["Cham essay/speaking neu co", "Nhờ AI chấm phần viết hoặc nói nếu có"],
  ["Diem + feedback", "Phản hồi: điểm và nhận xét"],
  ["Tao TestAttempt + LearningActivity", "Lưu lần làm bài và hoạt động học tập"],
  ["markCourseCompleted neu dat", "Đánh dấu hoàn thành khóa học nếu đạt"],
  ["Gui chung chi neu chua gui", "Gửi chứng chỉ qua email nếu chưa gửi"],
  ["score + attemptId", "Phản hồi: điểm và mã kết quả bài làm"],

  ["Mo phan danh gia khoa hoc", "Học viên mở phần đánh giá khóa học"],
  ["GET /api/courses/{id}/reviews", "Yêu cầu danh sách đánh giá"],
  ["getCourseReviews + canReviewCourse", "Lấy đánh giá và kiểm tra học viên có được đánh giá không"],
  ["Query Feedback va TestAttempt", "Tìm đánh giá và kết quả học tập liên quan"],
  ["reviews + myReview + canReview", "Phản hồi: đánh giá, đánh giá của tôi và quyền đánh giá"],
  ["Gui rating/comment", "Học viên gửi số sao và bình luận"],
  ["POST /api/courses/{id}/reviews", "Gửi đánh giá khóa học"],
  ["canReviewCourse", "Kiểm tra điều kiện đánh giá"],
  ["403 neu chua du dieu kien", "Phản hồi: chưa đủ điều kiện đánh giá"],
  ["upsertCourseReview", "Tạo mới hoặc cập nhật đánh giá"],
  ["Create/Update Feedback", "Lưu đánh giá"],
  ["reviews moi", "Phản hồi: danh sách đánh giá mới"],

  ["Tao de writing", "Người dùng tạo đề luyện viết"],
  ["POST /api/ai/writing-prompt", "Gửi yêu cầu tạo đề viết"],
  ["Health check + generate prompt", "Kiểm tra AI và tạo đề"],
  ["Prompt AI hoac fallback", "Phản hồi: đề do AI tạo hoặc đề dự phòng"],
  ["Nop bai viet", "Người dùng nộp bài viết"],
  ["POST /api/ai/essay-evaluation", "Gửi bài viết để chấm"],
  ["Kiem tra user/course access", "Kiểm tra người dùng có quyền dùng tính năng không"],
  ["Kiem tra hat dau neu can feedback chi tiet", "Kiểm tra hạt đậu AI nếu cần nhận xét chi tiết"],
  ["Cham IELTS/language-specific writing", "AI chấm bài viết theo tiêu chí phù hợp"],
  ["Evaluation", "Phản hồi: kết quả chấm"],
  ["Tao AiAssessment WRITING", "Lưu kết quả luyện viết"],
  ["spendAiPoints neu can", "Trừ hạt đậu AI nếu dùng nhận xét chi tiết"],
  ["feedback + assessmentId + points", "Phản hồi: nhận xét, mã kết quả và số hạt còn lại"],

  ["GET /api/ai/speaking-evaluation/config", "Lấy cài đặt luyện nói"],
  ["Lay SystemSetting speaking", "Lấy cấu hình luyện nói từ hệ thống"],
  ["config", "Phản hồi: cấu hình luyện nói"],
  ["Tao topic va thu am", "Người dùng tạo chủ đề và thu âm"],
  ["POST topic", "Gửi yêu cầu tạo chủ đề nói"],
  ["Generate topic", "AI tạo chủ đề nói"],
  ["topic", "Phản hồi: chủ đề nói"],
  ["Nop transcript + audio", "Người dùng nộp nội dung nói và file ghi âm"],
  ["POST /api/ai/speaking-evaluation", "Gửi bài nói để chấm"],
  ["Cham speaking", "AI chấm bài nói"],
  ["Luu audio file neu co", "Lưu file ghi âm nếu có"],
  ["Tao AiAssessment SPEAKING", "Lưu kết quả luyện nói"],
  ["feedback + assessmentId + audioUrl", "Phản hồi: nhận xét, mã kết quả và đường dẫn ghi âm"],

  ["GET /api/ai/points", "Yêu cầu xem hạt đậu AI"],
  ["getAiPointsSummary", "Tính tổng hạt đã có, đã dùng và còn lại"],
  ["Query PointTransaction + AiAssessment + LearningActivity", "Lấy lịch sử hạt đậu, bài luyện AI và hoạt động học"],
  ["earned/spent/available/history", "Phản hồi: hạt đã nhận, đã dùng, còn lại và lịch sử"],
  ["Mua hat dau", "Người dùng mua hạt đậu AI"],
  ["POST /api/ai/points/buy", "Gửi yêu cầu mua hạt đậu AI"],
  ["Bat dau transaction", "Bắt đầu xử lý giao dịch an toàn"],
  ["debitWalletForPurchase", "Trừ tiền trong ví"],
  ["Tru so du vi", "Cập nhật số dư ví sau khi trừ tiền"],
  ["record AI_POINTS_PURCHASE", "Ghi nhận giao dịch mua hạt đậu"],
  ["Tao PointTransaction", "Lưu lịch sử hạt đậu"],
  ["points + walletBalance", "Phản hồi: số hạt mới và số dư ví"],

  ["Mo trang dang ky giao vien", "Học viên mở trang đăng ký giáo viên"],
  ["GET /api/teacher-applications", "Yêu cầu dữ liệu form đăng ký giáo viên"],
  ["Lay setting, languages, applications", "Lấy cấu hình, ngôn ngữ và hồ sơ hiện có"],
  ["form data", "Phản hồi: dữ liệu để hiển thị form"],
  ["Upload chung chi + chon ngon ngu", "Người dùng tải chứng chỉ và chọn ngôn ngữ dạy"],
  ["POST /api/teacher-applications", "Gửi hồ sơ đăng ký giáo viên"],
  ["Kiem tra setting/language", "Kiểm tra hệ thống có mở đăng ký và ngôn ngữ hợp lệ"],
  ["Luu file certificate", "Lưu tệp chứng chỉ"],
  ["Tao TeacherApplication + certificates", "Lưu hồ sơ giáo viên và chứng chỉ"],
  ["Gui email da nhan ho so", "Gửi email xác nhận đã nhận hồ sơ"],
  ["application + entranceTest neu co", "Phản hồi: hồ sơ và bài kiểm tra đầu vào nếu có"],
  ["Autosave answer / anti-cheat", "Tự lưu bài làm và ghi nhận dấu hiệu gian lận"],
  ["Luu answerState/AntiCheatLog/SuspiciousEvent", "Lưu bài làm tạm và nhật ký chống gian lận"],
  ["Nop bai dau vao", "Người dùng nộp bài đầu vào"],
  ["POST submit-test", "Gửi bài đầu vào để chấm"],
  ["Tao TestAttempt + update UNDER_REVIEW", "Lưu kết quả bài đầu vào và chuyển hồ sơ sang chờ duyệt"],
  ["Gui thong bao review", "Gửi thông báo hồ sơ chờ duyệt"],
  ["score + underReview", "Phản hồi: điểm và trạng thái chờ duyệt"],

  ["Mo danh sach ho so", "Quản trị viên mở danh sách hồ sơ"],
  ["GET /api/admin/teacher-applications", "Yêu cầu danh sách hồ sơ giáo viên"],
  ["Query applications + user + certificates + attempts", "Lấy hồ sơ, tài khoản, chứng chỉ và bài làm"],
  ["applications", "Phản hồi: danh sách hồ sơ"],
  ["Approve hoac Reject", "Quản trị viên duyệt hoặc từ chối"],
  ["PUT review", "Gửi quyết định duyệt hồ sơ"],
  ["Transaction update application", "Cập nhật hồ sơ trong giao dịch an toàn"],
  ["Approve: Update User.role = TEACHER", "Nếu duyệt: chuyển tài khoản thành giáo viên"],
  ["Reject: Luu rejectionReason", "Nếu từ chối: lưu lý do"],
  ["Tao Notification + ApplicationLog", "Tạo thông báo và nhật ký xử lý"],
  ["Gui email ket qua", "Gửi email thông báo kết quả"],
  ["OK + status moi", "Phản hồi: xử lý thành công và trạng thái mới"],

  ["Tao hoac sua khoa hoc", "Giáo viên tạo hoặc sửa khóa học"],
  ["POST/PUT course", "Gửi thông tin khóa học"],
  ["Kiem tra role, ownership, application, auto approval", "Kiểm tra quyền giáo viên, quyền sở hữu và chế độ duyệt"],
  ["Create/Update Course", "Tạo mới hoặc cập nhật khóa học"],
  ["course + requiresApproval", "Phản hồi: thông tin khóa học và có cần chờ duyệt không"],
  ["Them module/lesson", "Giáo viên thêm chương hoặc bài học"],
  ["POST modules/lessons", "Gửi thông tin chương hoặc bài học"],
  ["Kiem tra owner/admin", "Kiểm tra quyền sở hữu hoặc quyền quản trị"],
  ["Create Module/Lesson + increment lessons", "Lưu chương hoặc bài học và cập nhật số bài"],
  ["module/lesson", "Phản hồi: chương hoặc bài học vừa tạo"],
  ["Upload video/thumbnail", "Giáo viên tải video hoặc ảnh khóa học"],
  ["POST upload API", "Gửi tệp lên hệ thống"],
  ["Ghi file vao public", "Lưu tệp vào kho công khai"],
  ["file URL", "Phản hồi: đường dẫn tệp"],
  ["Xoa/khoa khoa hoc", "Giáo viên xóa hoặc khóa khóa học"],
  ["DELETE/PATCH course", "Gửi yêu cầu xóa hoặc khóa khóa học"],
  ["Neu co hoc vien thi LOCKED, neu chua co thi xoa vat ly", "Nếu đã có học viên thì khóa khóa học, nếu chưa có thì xóa hẳn"],
  ["Ket qua", "Phản hồi: kết quả xử lý"],

  ["Tao test", "Giáo viên tạo bài kiểm tra"],
  ["POST /api/teacher/tests", "Gửi thông tin bài kiểm tra"],
  ["Kiem tra role, course owner, language, module count", "Kiểm tra quyền giáo viên, chủ khóa học, ngôn ngữ và số chương"],
  ["Create Test", "Lưu bài kiểm tra"],
  ["test", "Phản hồi: bài kiểm tra vừa tạo"],
  ["Them hoac sua cau hoi", "Giáo viên thêm hoặc sửa câu hỏi"],
  ["POST/PUT questions", "Gửi thông tin câu hỏi"],
  ["Kiem tra owner/admin va tong diem", "Kiểm tra quyền và tổng điểm bài kiểm tra"],
  ["Create/Update Question + Answer", "Lưu câu hỏi và đáp án"],
  ["question", "Phản hồi: câu hỏi vừa lưu"],
  ["Upload audio/tai lieu de", "Giáo viên tải âm thanh hoặc tài liệu đề"],
  ["POST question-audio-upload/test-material-upload", "Gửi tệp âm thanh hoặc tài liệu"],
  ["Luu file", "Lưu tệp"],
  ["URL/material metadata", "Phản hồi: đường dẫn và thông tin tài liệu"],

  ["Xem hoc vien", "Giáo viên xem học viên"],
  ["GET /api/teacher/students", "Yêu cầu danh sách học viên"],
  ["Query enrollments, users, payments/orderItems/points", "Lấy thông tin đăng ký, tài khoản, thanh toán và hạt đậu AI"],
  ["students management data", "Phản hồi: dữ liệu quản lý học viên"],
  ["Gui yeu cau rut doanh thu", "Giáo viên gửi yêu cầu rút doanh thu"],
  ["POST /api/teacher/revenue-withdrawals", "Gửi thông tin yêu cầu rút tiền"],
  ["Transaction aggregate earned/reserved", "Tính doanh thu đã có và khoản đang chờ xử lý"],
  ["calculateAvailableTeacherRevenue", "Tính số tiền giáo viên có thể rút"],
  ["400 neu vuot so du kha dung", "Phản hồi: báo số tiền rút vượt mức có thể rút"],
  ["Create TeacherRevenueWithdrawal PENDING", "Lưu yêu cầu rút tiền đang chờ xử lý"],
  ["withdrawal + available", "Phản hồi: yêu cầu rút tiền và số tiền còn có thể rút"],

  ["Mo dashboard", "Quản trị viên mở dashboard"],
  ["GET /api/admin/analytics", "Yêu cầu dữ liệu thống kê"],
  ["Aggregate users/courses/tests/revenue/AI/anti-cheat", "Tổng hợp người dùng, khóa học, bài kiểm tra, doanh thu, AI và chống gian lận"],
  ["dashboard data", "Phản hồi: dữ liệu dashboard"],
  ["Doi setting he thong", "Quản trị viên đổi cài đặt hệ thống"],
  ["PUT teacher-entrance/course-approval/speaking-config", "Gửi thay đổi cài đặt"],
  ["Upsert SystemSetting", "Lưu hoặc cập nhật cài đặt"],
  ["Neu mo teacher entrance: query Students + tao Notification", "Nếu mở đăng ký giáo viên: tìm học viên và tạo thông báo"],
  ["Gui email thong bao", "Gửi email thông báo"],
  ["setting moi", "Phản hồi: cài đặt mới"],
  ["Khoa user/course hoac duyet course", "Quản trị viên khóa tài khoản, khóa khóa học hoặc duyệt khóa học"],
  ["PATCH user/course", "Gửi yêu cầu cập nhật người dùng hoặc khóa học"],
  ["Update User/Course + Notification neu can", "Cập nhật người dùng hoặc khóa học và tạo thông báo nếu cần"],

  ["Approve, Pay hoac Reject request", "Quản trị viên duyệt, xác nhận đã thanh toán hoặc từ chối yêu cầu"],
  ["PATCH /api/admin/revenue-withdrawals/{id}", "Gửi quyết định xử lý yêu cầu rút tiền"],
  ["Lay withdrawal hien tai", "Lấy yêu cầu rút tiền hiện tại"],
  ["409 neu trang thai khong hop le", "Phản hồi: yêu cầu đã được xử lý hoặc không còn phù hợp"],
  ["Transaction update status, processedAt, note", "Cập nhật trạng thái, thời điểm xử lý và ghi chú"],
  ["Tao Notification cho giao vien", "Tạo thông báo cho giáo viên"],
  ["withdrawal moi", "Phản hồi: yêu cầu rút tiền sau khi cập nhật"],

  ["Mo trang public/phu tro", "Người dùng mở trang công khai hoặc trang phụ trợ"],
  ["Server components query du lieu neu can", "Trang lấy dữ liệu cần hiển thị nếu có"],
  ["Render page", "Phản hồi: hiển thị trang cho người dùng"],
  ["GET /api/health", "Yêu cầu kiểm tra hệ thống còn hoạt động không"],
  ["SELECT 1", "Thử kết nối cơ sở dữ liệu"],
  ["status healthy/unhealthy", "Phản hồi: hệ thống hoạt động bình thường hoặc có lỗi"],
]);

function friendlyText(value) {
  const text = String(value);
  const mapped = FRIENDLY_TEXT.get(text);
  if (mapped) return mapped;

  return text
    .replace(/\bAPI\b/g, "Bộ xử lý")
    .replace(/\bDatabase\b/g, "Cơ sở dữ liệu")
    .replace(/\bUser\b/g, "Người dùng")
    .replace(/\bAdmin\b/g, "Quản trị viên")
    .replace(/\bTeacher\b/g, "Giáo viên")
    .replace(/\bStudent\b/g, "Học viên")
    .replace(/\bOK\b/g, "Phản hồi: thành công")
    .replace(/\bnull\b/g, "không có dữ liệu");
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function style(value) {
  return esc(value).replace(/\n/g, "&#xa;");
}

function idFactory(prefix) {
  let index = 2;
  return () => `${prefix}-${index++}`;
}

function cell(id, value, styleValue, attrs = "", geometry = "") {
  return `<mxCell id="${id}" value="${esc(friendlyText(value))}" style="${style(styleValue)}" ${attrs} parent="1">${geometry}</mxCell>`;
}

function vertex(id, value, styleValue, x, y, w, h) {
  return cell(
    id,
    value,
    styleValue,
    `vertex="1"`,
    `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />`,
  );
}

function edge(id, value, styleValue, x1, y1, x2, y2, points = "") {
  return cell(
    id,
    value,
    styleValue,
    `edge="1"`,
    `<mxGeometry width="50" height="50" relative="1" as="geometry"><mxPoint x="${x1}" y="${y1}" as="sourcePoint" />${points}<mxPoint x="${x2}" y="${y2}" as="targetPoint" /></mxGeometry>`,
  );
}

function wrapPage(diagram, xml) {
  const pageHeight = Math.max(900, 210 + diagram.steps.length * 50);
  return `<diagram id="${esc(diagram.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" name="${esc(friendlyText(diagram.name))}">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1280" pageHeight="${pageHeight}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${xml}
      </root>
    </mxGraphModel>
  </diagram>`;
}

function renderDiagram(diagram, pageIndex) {
  const nextId = idFactory(`p${pageIndex}`);
  const count = diagram.participants.length;
  const startX = 70;
  const endX = 1210;
  const gap = count > 1 ? (endX - startX) / (count - 1) : 0;
  const xs = new Map(diagram.participants.map((participant, index) => [participant, Math.round(startX + index * gap)]));
  const pageHeight = Math.max(900, 210 + diagram.steps.length * 50);
  const rows = [];

  rows.push(vertex(nextId(), friendlyText(diagram.title), "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=20;fontStyle=1", 40, 20, 760, 30));

  for (const participant of diagram.participants) {
    const x = xs.get(participant);
    rows.push(vertex(nextId(), participant, "rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fillColor=#ffffff;strokeColor=#000000;", x - 65, 65, 130, 56));
    rows.push(edge(nextId(), "", "endArrow=none;html=1;rounded=0;dashed=1;strokeColor=#000000;", x, 130, x, pageHeight - 40));
  }

  diagram.steps.forEach((step, index) => {
    const [from, to, label, kind] = step;
    const y = 170 + index * 50;
    const x1 = xs.get(from);
    const x2 = xs.get(to);
    const dashed = kind === "return";
    const baseStyle = dashed
      ? "endArrow=open;html=1;rounded=0;dashed=1;strokeWidth=1;strokeColor=#555555;"
      : "endArrow=block;html=1;rounded=0;strokeWidth=1;strokeColor=#111111;";

    if (x1 === undefined || x2 === undefined) {
      rows.push(vertex(nextId(), label, "shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#fff2cc;strokeColor=#d6b656;", 40, y - 18, 520, 36));
      return;
    }

    if (x1 === x2) {
      const loopX = Math.min(x1 + 95, 1230);
      const points = `<Array as="points"><mxPoint x="${loopX}" y="${y}" /><mxPoint x="${loopX}" y="${y + 30}" /></Array>`;
      rows.push(edge(nextId(), label, baseStyle, x1, y, x1 + 2, y + 30, points));
      return;
    }

    rows.push(edge(nextId(), label, baseStyle, x1, y, x2, y));
  });

  return wrapPage(diagram, rows.join("\n"));
}

const pages = diagrams.map((diagram, index) => renderDiagram(diagram, index + 1)).join("\n");
const mxfile = `<mxfile host="app.diagrams.net" modified="2026-07-01T00:00:00.000Z" agent="Codex" version="24.7.17" type="device">
  ${pages}
</mxfile>
`;

writeFileSync(outFile, mxfile, "utf8");
console.log(`Generated ${diagrams.length} draw.io sequence diagrams: ${outFile}`);
