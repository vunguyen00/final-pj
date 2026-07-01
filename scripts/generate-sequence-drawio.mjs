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
  return `<mxCell id="${id}" value="${esc(value)}" style="${style(styleValue)}" ${attrs} parent="1">${geometry}</mxCell>`;
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
  return `<diagram id="${esc(diagram.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" name="${esc(diagram.name)}">
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

  rows.push(vertex(nextId(), diagram.title, "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=20;fontStyle=1", 40, 20, 760, 30));

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
