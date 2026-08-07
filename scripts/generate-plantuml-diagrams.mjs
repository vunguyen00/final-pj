import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
const outputDir = path.join(rootDir, "deliverables", "uml");
const sequencePath = path.join(outputDir, "FinnCenter_Sequence_Diagrams_Toan_Website.puml");
const databasePath = path.join(outputDir, "FinnCenter_Database_ERD_Moi.puml");

const diagramHeader = (title) => [
  "hide footbox",
  "skinparam backgroundColor #FFFFFF",
  "skinparam shadowing false",
  "skinparam roundcorner 10",
  "skinparam sequenceArrowThickness 1.2",
  "skinparam sequenceGroupBorderColor #64748B",
  "skinparam sequenceGroupBackgroundColor #F8FAFC",
  "skinparam participantBorderColor #334155",
  "skinparam participantBackgroundColor #F8FAFC",
  "skinparam actorBorderColor #0F766E",
  "skinparam actorBackgroundColor #CCFBF1",
  "skinparam databaseBorderColor #166534",
  "skinparam databaseBackgroundColor #DCFCE7",
  "skinparam noteBorderColor #D97706",
  "skinparam noteBackgroundColor #FFFBEB",
  `title ${title}`,
  "autonumber",
];

const flows = [
  {
    id: "01_dang_ky_otp",
    title: "01 — Đăng ký tài khoản và xác thực OTP",
    participants: [
      ["actor", "Người dùng", "user"],
      ["boundary", "Register UI", "ui"],
      ["control", "Auth API", "api"],
      ["control", "Registration Security", "security"],
      ["database", "PostgreSQL", "db"],
      ["participant", "SMTP / Email", "mail"],
    ],
    body: [
      "user -> ui: Nhập tên, email, mật khẩu",
      "ui -> api: POST /api/auth/register",
      "api -> security: Kiểm tra dữ liệu, mật khẩu, IP và fingerprint",
      "security -> db: Kiểm tra User + giới hạn RegistrationSecurityEvent",
      "alt Email đã có tài khoản",
      "  api --> ui: 409 Email đã tồn tại",
      "else Hợp lệ",
      "  api -> db: Tạo EmailVerificationOtp chứa dữ liệu đăng ký đã băm",
      "  api -> mail: Gửi OTP 6 chữ số (hết hạn 10 phút)",
      "  api --> ui: pendingVerification + thời gian gửi lại",
      "end",
      "user -> ui: Nhập OTP",
      "ui -> api: POST /api/auth/verify-registration-otp",
      "api -> db: Kiểm tra OTP, hạn dùng và số lần thử",
      "alt OTP sai / hết hạn / quá số lần thử",
      "  api -> db: Tăng attempts hoặc vô hiệu OTP",
      "  api --> ui: 400/429",
      "else OTP hợp lệ",
      "  api -> db: Transaction: tạo User ACTIVE + dùng OTP",
      "  api -> db: Tạo TrustedDevice + Session duy nhất",
      "  api --> ui: Cookie auth_token + trusted_device; redirect theo role",
      "end",
      "note over security,db: Có thể gửi lại OTP qua /api/auth/resend-registration-otp;\nrate limit theo email, IP và thiết bị.",
    ],
  },
  {
    id: "02_dang_nhap_thiet_bi",
    title: "02 — Đăng nhập, xác nhận thiết bị lạ và đăng xuất",
    participants: [
      ["actor", "Người dùng", "user"],
      ["boundary", "Login / Confirm Device UI", "ui"],
      ["control", "Auth API", "api"],
      ["control", "Auth Service", "auth"],
      ["database", "PostgreSQL", "db"],
      ["participant", "SMTP / Email", "mail"],
    ],
    body: [
      "user -> ui: Nhập email + mật khẩu",
      "ui -> api: POST /api/auth/login",
      "api -> auth: Rate limit + xác minh scrypt + trạng thái tài khoản",
      "auth -> db: Đọc User và TrustedDevice từ cookie đã băm",
      "alt Sai mật khẩu / chưa xác thực / bị khóa",
      "  api --> ui: 401/403/429",
      "else Thiết bị đã tin cậy",
      "  auth -> db: Xóa Session cũ; tạo Session mới",
      "  auth -> db: Cập nhật lastUsedAt của TrustedDevice",
      "  api --> ui: Cookie auth_token; redirect theo role",
      "else Thiết bị lạ",
      "  auth -> db: Tạo LoginDeviceChallenge, vô hiệu challenge cũ",
      "  auth -> mail: Gửi liên kết xác nhận thiết bị",
      "  api --> ui: requiresDeviceConfirmation = true",
      "  user -> ui: Mở liên kết email",
      "  ui -> api: POST /api/auth/confirm-device",
      "  api -> db: Dùng challenge; tạo TrustedDevice + Session duy nhất",
      "  api --> ui: Cookie đăng nhập + thiết bị tin cậy",
      "end",
      "user -> ui: Đăng xuất",
      "ui -> api: POST /api/auth/logout",
      "api -> db: Thu hồi Session hiện tại",
      "api --> ui: Xóa auth_token; giữ trusted_device",
      "note over auth,db: authenticate() đối chiếu chữ ký cookie, sessionId, authVersion, role và trạng thái tài khoản.",
    ],
  },
  {
    id: "03_khoi_phuc_loi_moi_ho_so",
    title: "03 — Quên mật khẩu, lời mời giảng viên và hồ sơ cá nhân",
    participants: [
      ["actor", "Người dùng / Admin", "user"],
      ["boundary", "Account UI", "ui"],
      ["control", "Auth / Profile API", "api"],
      ["database", "PostgreSQL", "db"],
      ["participant", "SMTP / Email", "mail"],
    ],
    body: [
      "group Quên mật khẩu",
      "  user -> ui: Yêu cầu OTP đặt lại mật khẩu",
      "  ui -> api: POST /api/auth/forgot-password/request-otp",
      "  api -> db: Tạo PasswordResetOtp nếu email hợp lệ",
      "  api -> mail: Gửi OTP (không tiết lộ email tồn tại)",
      "  user -> ui: Gửi OTP + mật khẩu mới",
      "  ui -> api: POST /api/auth/forgot-password/reset",
      "  api -> db: Transaction: đổi password, tăng authVersion, dùng OTP, xóa Session",
      "end",
      "group Admin mời giảng viên",
      "  user -> api: POST /api/admin/invitations",
      "  api -> db: Tạo UserInvitation với tokenHash + languageId",
      "  api -> mail: Gửi liên kết nhận lời mời",
      "  user -> ui: Mở /auth/accept-invitation và đặt mật khẩu",
      "  ui -> api: POST /api/auth/invitations",
      "  api -> db: Transaction: claim invitation, tạo User TEACHER + TeacherApplication APPROVED",
      "  api -> db: Tạo Session + TrustedDevice",
      "end",
      "group Hồ sơ và ngôn ngữ học",
      "  user -> ui: Sửa tên, điện thoại, ngôn ngữ hoặc mật khẩu",
      "  ui -> api: PATCH /api/profile hoặc /api/profile/password",
      "  api -> db: Cập nhật User / LearningLanguage; đổi mật khẩu thì thu hồi Session",
      "end",
    ],
  },
  {
    id: "04_marketplace_thanh_toan_khoa_hoc",
    title: "04 — Marketplace, đăng ký và thanh toán khóa học qua VNPay",
    participants: [
      ["actor", "Khách / Học viên", "student"],
      ["boundary", "Course UI", "ui"],
      ["control", "Course / Enroll API", "api"],
      ["database", "PostgreSQL", "db"],
      ["participant", "VNPay", "vnpay"],
      ["control", "Payment Callback", "callback"],
    ],
    body: [
      "student -> ui: Tìm kiếm, lọc, xem chi tiết khóa học/giảng viên",
      "ui -> api: GET /api/courses + GET /api/courses/{id}/access",
      "api -> db: Đọc Course, Module, Lesson, Test, Feedback, Enrollment",
      "api --> ui: Nội dung công khai + quyền xem/mua/học thử",
      "student -> ui: Chọn đăng ký",
      "ui -> api: POST /api/courses/{id}/enroll",
      "api -> db: Kiểm tra Course ACTIVE, trùng Enrollment và quyền sở hữu",
      "alt Khóa miễn phí hoặc giảng viên sở hữu",
      "  api -> db: Tạo Enrollment ACTIVE ngay",
      "  api --> ui: Đăng ký thành công",
      "else Khóa trả phí",
      "  api -> db: Tạo Order + OrderItem + Payment(PENDING, COURSE)",
      "  api --> ui: URL VNPay đã ký",
      "  ui -> vnpay: Chuyển hướng thanh toán",
      "  vnpay -> callback: Return URL và/hoặc IPN",
      "  callback -> callback: Xác minh chữ ký, txnRef, amount, response status",
      "  callback -> db: Claim PENDING -> PROCESSING (idempotent)",
      "  callback -> db: Payment=PAID + Enrollment ACTIVE + chia 70/30 doanh thu",
      "  callback --> ui: Kết quả thanh toán / khóa học",
      "end",
      "note over callback,db: IPN/return lặp không tạo Enrollment hoặc doanh thu lần hai.",
    ],
  },
  {
    id: "05_hoc_bai_tien_do",
    title: "05 — Học bài, heartbeat video và cổng mở khóa",
    participants: [
      ["actor", "Học viên", "student"],
      ["boundary", "Learning UI", "ui"],
      ["control", "Lesson API", "api"],
      ["control", "Learning Gate", "gate"],
      ["database", "PostgreSQL", "db"],
      ["participant", "Video Player", "video"],
    ],
    body: [
      "student -> ui: Mở khóa học / chọn bài học",
      "ui -> api: POST /api/learning/lessons/{lessonId}/start",
      "api -> db: Kiểm tra Enrollment ACTIVE hoặc teacher owner/admin",
      "api -> gate: Kiểm tra module/lesson đã được mở theo thứ tự",
      "api -> db: Ghi thời điểm bắt đầu + VideoWatchProgress",
      "alt Bài học có video",
      "  ui -> video: Phát video, chặn tua vượt tiến độ hợp lệ",
      "  loop Định kỳ khi video đang phát",
      "    video -> api: POST heartbeat(currentTime, duration, sequence)",
      "    api -> db: Cập nhật watchedSeconds/maxPosition; ghi seekViolation",
      "  end",
      "else Bài học văn bản",
      "  ui -> ui: Đếm thời gian học tối thiểu 3 phút",
      "end",
      "student -> ui: Đánh dấu hoàn thành",
      "ui -> api: POST /api/learning/lessons/{lessonId}/complete",
      "api -> db: Xác minh thời gian hoặc ≥90% video + heartbeat mới + không tua",
      "api -> db: Ghi marker Feedback + LearningActivity idempotent",
      "api -> gate: Tính tiến độ, module/test kế tiếp",
      "gate -> db: Đọc lesson hoàn thành + TestAttempt đã đạt",
      "api --> ui: Tiến độ mới và tài nguyên kế tiếp",
    ],
  },
  {
    id: "06_bai_test_cham_ai",
    title: "06 — Làm bài test, chấm tự động/AI và xem kết quả",
    participants: [
      ["actor", "Học viên", "student"],
      ["boundary", "Student Test UI", "ui"],
      ["control", "Student Test API", "api"],
      ["control", "Rules + Attempt Token", "rules"],
      ["control", "AI Evaluation", "ai"],
      ["participant", "Ollama", "ollama"],
      ["database", "PostgreSQL", "db"],
    ],
    body: [
      "student -> ui: Mở bài COURSE hoặc PUBLIC_PRACTICE",
      "ui -> api: GET /api/student/tests/{testId}",
      "api -> rules: Kiểm tra readiness=100 điểm, Enrollment, learning gate, accessStatus",
      "api -> db: Đọc Test + Question + Answer + lịch sử attempt",
      "api --> ui: Đề thi, attemptToken đã ký, hạn nộp",
      "student -> ui: Trả lời, ghi âm và nộp/tự động nộp",
      "ui -> api: POST /api/student/tests/{testId}/submit",
      "api -> rules: Xác minh token, thời gian, quyền và payload",
      "api -> api: Chấm MULTIPLE_CHOICE/TRUE_FALSE/FILL_IN_BLANK",
      "opt Có ESSAY/SPEAKING",
      "  api -> ai: Chuẩn hóa rubric theo ngôn ngữ/chế độ",
      "  ai -> ollama: Chấm điểm và tùy chọn nhận xét chi tiết",
      "  ollama --> ai: Điểm + criteria + lỗi + gợi ý",
      "  ai --> api: Kết quả đã hiệu chỉnh/normalize",
      "end",
      "api -> db: Transaction: TestAttempt snapshot + AiAssessment nếu có",
      "api -> db: PointTransaction nếu mua feedback + LearningActivity",
      "api --> ui: Điểm, đạt/không đạt, attemptId, hành động kế tiếp",
      "ui -> api: GET attempt/result/history",
      "api -> db: Đọc snapshot kết quả an toàn cho học viên",
      "api --> ui: Chi tiết từng câu và nhận xét được phép hiển thị",
    ],
  },
  {
    id: "07_writing_ai",
    title: "07 — Luyện Writing với AI",
    participants: [
      ["actor", "Học viên / Giảng viên", "user"],
      ["boundary", "Writing AI UI", "ui"],
      ["control", "Writing API", "api"],
      ["control", "AI Points", "points"],
      ["participant", "Ollama", "ollama"],
      ["database", "PostgreSQL", "db"],
    ],
    body: [
      "user -> ui: Chọn ngôn ngữ, task và chủ đề",
      "ui -> api: POST /api/ai/writing-prompt",
      "api -> ollama: Sinh đề Task 1/Task 2 và dữ liệu biểu đồ nếu cần",
      "ollama --> api: Đề AI hoặc dùng fallback khi lỗi",
      "api --> ui: Hiển thị đề",
      "user -> ui: Viết bài; chọn chỉ chấm điểm hoặc feedback chi tiết",
      "ui -> api: POST /api/ai/essay-evaluation",
      "opt Feedback chi tiết và không phải ADMIN",
      "  api -> points: Kiểm tra/claim chi phí 3 điểm AI",
      "end",
      "api -> ollama: Chấm IELTS Writing hoặc rubric đa ngôn ngữ",
      "ollama --> api: Overall + criteria + feedback",
      "api -> db: Tạo AiAssessment + LearningActivity",
      "opt Có trừ điểm",
      "  api -> db: Tạo PointTransaction với sourceKey idempotent",
      "end",
      "api --> ui: Kết quả theo đúng ngôn ngữ bài luyện",
    ],
  },
  {
    id: "08_speaking_ai",
    title: "08 — Luyện Speaking, thu âm và chấm AI",
    participants: [
      ["actor", "Học viên / Giảng viên", "user"],
      ["boundary", "Speaking AI UI", "ui"],
      ["participant", "MediaRecorder + Worker", "media"],
      ["control", "Speaking API", "api"],
      ["participant", "Ollama", "ollama"],
      ["collections", "Local Upload Storage", "storage"],
      ["database", "PostgreSQL", "db"],
    ],
    body: [
      "user -> ui: Chọn ngôn ngữ/task/topic",
      "ui -> api: POST /api/ai/speaking-evaluation/topic",
      "api -> ollama: Sinh đề nói theo cấu hình admin",
      "api --> ui: Đề + thời lượng 30–900 giây",
      "user -> ui: Cho phép microphone và bắt đầu nói",
      "ui -> media: getUserMedia + MediaRecorder",
      "media --> ui: Audio blob",
      "ui -> media: Worker nhận diện/chuyển thành transcript phía client",
      "media --> ui: Transcript",
      "ui -> api: multipart audio + transcript + prompt + feedback mode",
      "api -> storage: Kiểm tra và lưu public/uploads/speaking/*.webm",
      "api -> ollama: Chấm Speaking theo rubric ngôn ngữ",
      "ollama --> api: Điểm + criteria + feedback",
      "api -> db: AiAssessment + LearningActivity + PointTransaction(7 điểm nếu cần)",
      "api --> ui: Kết quả chi tiết + assessmentId",
      "note over media,api: Phần phát âm là ước lượng nếu chỉ dùng transcript; file hiện lưu local.",
    ],
  },
  {
    id: "09_mua_su_dung_diem_ai",
    title: "09 — Mua và sử dụng điểm AI qua VNPay",
    participants: [
      ["actor", "Học viên / Giảng viên", "user"],
      ["boundary", "AI Points UI", "ui"],
      ["control", "Points API", "api"],
      ["database", "PostgreSQL", "db"],
      ["participant", "VNPay", "vnpay"],
      ["control", "Points Callback", "callback"],
    ],
    body: [
      "user -> ui: Chọn số điểm cần mua",
      "ui -> api: POST /api/ai/points/buy",
      "api -> db: Tạo Order + Payment(PENDING, AI_POINTS, pointAmount)",
      "api --> ui: URL VNPay + txnRef",
      "ui -> vnpay: Thanh toán",
      "vnpay -> callback: Return/IPN",
      "callback -> callback: Xác minh chữ ký, số tiền, purpose, txnRef",
      "callback -> db: Claim Payment idempotent",
      "callback -> db: Payment=PAID + PointTransaction(PURCHASE, balanceAfter)",
      "callback --> ui: Chuyển về trang nguồn nội bộ an toàn",
      "user -> api: Yêu cầu feedback AI chi tiết",
      "api -> db: Tổng hợp balance từ PointTransaction",
      "alt Đủ điểm hoặc ADMIN",
      "  api -> db: Tạo giao dịch SPEND với sourceKey duy nhất",
      "  api --> user: Cho phép kết quả chi tiết",
      "else Không đủ điểm",
      "  api --> user: 402/409 và gợi ý mua thêm",
      "end",
      "note over api,db: Hệ thống không còn ví VND; chỉ còn sổ cái điểm AI.",
    ],
  },
  {
    id: "10_tuyen_dung_giang_vien",
    title: "10 — Đợt tuyển, nộp hồ sơ và thi giảng viên trực tiếp",
    participants: [
      ["actor", "Admin", "admin"],
      ["boundary", "Recruitment UI", "ui"],
      ["control", "Recruitment API", "api"],
      ["actor", "Ứng viên", "applicant"],
      ["actor", "Giám khảo", "grader"],
      ["database", "PostgreSQL", "db"],
      ["participant", "SMTP / Notification", "notify"],
    ],
    body: [
      "admin -> ui: Tạo đợt tuyển, thời gian và địa điểm",
      "ui -> api: POST /api/admin/recruitment-rounds",
      "api -> db: Tạo RecruitmentRound(DRAFT)",
      "admin -> api: PATCH OPEN",
      "api -> db: Đóng round cũ; mở round mới; cập nhật SystemSetting",
      "applicant -> ui: Chọn ngôn ngữ/địa điểm, tải 1–3 chứng chỉ",
      "ui -> api: POST /api/teacher-applications (multipart)",
      "api -> db: Tạo TeacherApplication(PENDING) + Certificate + Log",
      "admin -> api: PATCH INVITE_TO_EXAM hoặc REJECT",
      "api -> db: Kiểm tra chứng chỉ còn hạn; cập nhật trạng thái + Notification",
      "api -> notify: Gửi địa điểm/thời gian thi hoặc lý do từ chối",
      "admin -> api: EXPORT_GRADING_LINK",
      "api -> db: Lưu gradingTokenHash mới",
      "api --> grader: URL chấm thi chứa token một lần phát hành",
      "grader -> api: GET/POST /api/recruitment-grading/{token}",
      "api -> db: Upsert TeacherExamResult: check-in, completed, điểm 4 kỹ năng",
      "api -> db: TeacherApplication = PASSED hoặc REJECTED + Log",
      "admin -> api: CONVERT_TO_TEACHER cho ứng viên đủ điểm",
      "api -> db: Transaction: User.role=TEACHER, authVersion++, xóa Session, Notification",
      "api -> notify: Gửi kết quả/chuyển quyền qua email",
      "note over applicant,grader: Bài thi diễn ra trực tiếp trên giấy; website chỉ quản lý đợt tuyển, hồ sơ, điểm danh và kết quả.",
    ],
  },
  {
    id: "11_giang_vien_quan_ly_noi_dung",
    title: "11 — Giảng viên quản lý khóa học, bài học và bài kiểm tra",
    participants: [
      ["actor", "Giảng viên", "teacher"],
      ["boundary", "Teacher Workspace", "ui"],
      ["control", "Teacher APIs", "api"],
      ["control", "Readiness / Approval", "rules"],
      ["collections", "Upload Storage", "storage"],
      ["database", "PostgreSQL", "db"],
      ["actor", "Admin", "admin"],
    ],
    body: [
      "teacher -> ui: Tạo/sửa/xóa khóa học",
      "ui -> api: POST/PATCH/DELETE /api/teacher/courses/**",
      "api -> rules: Kiểm tra role, ownership, ngôn ngữ được duyệt, auto approval",
      "api -> db: Ghi Course ACTIVE/PENDING_APPROVAL/PENDING_DELETE/LOCKED",
      "teacher -> ui: Upload thumbnail, video, audio câu hỏi, tài liệu đề",
      "ui -> storage: Gửi file qua các upload API",
      "storage --> ui: URL file đã kiểm tra MIME/kích thước",
      "teacher -> api: CRUD Module và Lesson theo thứ tự",
      "api -> db: Ghi Module/Lesson; khóa xóa nếu ảnh hưởng dữ liệu học",
      "teacher -> api: CRUD Test, Question, Answer",
      "api -> rules: Course có module; một course test; tổng điểm không vượt 100",
      "api -> db: Ghi Test/Question/Answer và target course/module/lesson",
      "api --> ui: Readiness chỉ true khi có câu hỏi và tổng điểm = 100",
      "admin -> api: Duyệt/từ chối/khóa/mở khóa Course",
      "api -> db: Cập nhật Course + Notification cho giảng viên",
      "teacher -> api: GET /api/teacher/students và báo cáo doanh thu",
      "api -> db: Tổng hợp Enrollment, TestAttempt, chứng nhận và OrderItem",
      "api --> ui: Danh sách học viên + doanh thu theo khóa",
    ],
  },
  {
    id: "12_hoan_tien_bao_cao",
    title: "12 — Hoàn tiền khóa học và báo cáo nội dung",
    participants: [
      ["actor", "Học viên", "student"],
      ["boundary", "My Courses / Course UI", "ui"],
      ["control", "Refund / Report API", "api"],
      ["database", "PostgreSQL", "db"],
      ["actor", "Admin", "admin"],
      ["control", "Notification Service", "notify"],
    ],
    body: [
      "student -> ui: Gửi yêu cầu hoàn tiền kèm lý do",
      "ui -> api: POST /api/course-refunds",
      "api -> db: Kiểm tra khóa trả phí, ≤7 ngày, tiến độ ≤50%, chưa yêu cầu",
      "api -> db: Tạo CourseRefundRequest(PENDING)",
      "api -> db: Enrollment.accessStatus=REFUND_PENDING",
      "api -> notify: Thông báo admin",
      "admin -> api: PATCH /api/admin/course-refunds/{refundId}",
      "alt APPROVED",
      "  api -> db: Ghi hoàn tiền ngoài hệ thống; hủy quyền học và dữ liệu liên quan",
      "else REJECTED",
      "  api -> db: Enrollment.accessStatus=ACTIVE",
      "end",
      "api -> notify: Thông báo kết quả cho học viên",
      "student -> ui: Báo cáo khóa học hoặc bài học",
      "ui -> api: POST /api/course-reports",
      "api -> db: Tạo CourseReport(PENDING) + thông báo tất cả admin",
      "admin -> api: PATCH /api/course-reports/{reportId}",
      "api -> db: Cập nhật IN_REVIEW/RESOLVED/REJECTED, response, respondedBy",
      "api --> ui: Trạng thái xử lý mới",
    ],
  },
  {
    id: "13_doanh_thu_rut_tien_khieu_nai",
    title: "13 — Tài khoản ngân hàng, rút doanh thu và khiếu nại",
    participants: [
      ["actor", "Giảng viên", "teacher"],
      ["boundary", "Revenue UI", "ui"],
      ["control", "Bank / Withdrawal API", "api"],
      ["database", "PostgreSQL", "db"],
      ["participant", "SMTP / Email", "mail"],
      ["actor", "Admin", "admin"],
    ],
    body: [
      "teacher -> ui: Nhập/thay đổi tài khoản ngân hàng",
      "ui -> api: POST /api/teacher/bank-account/request-otp",
      "api -> db: Tạo TeacherBankAccountChangeOtp(payload đã chụp)",
      "api -> mail: Gửi OTP xác minh thay đổi",
      "teacher -> api: POST /verify-otp",
      "api -> db: Upsert TeacherBankAccount VERIFIED + ChangeLog; dùng OTP",
      "teacher -> ui: Tạo yêu cầu rút doanh thu",
      "ui -> api: POST /api/teacher/revenue-withdrawals",
      "api -> db: Tính doanh thu 70% đã trả - khoản đã/đang rút",
      "api -> db: Tạo Withdrawal(PENDING) với snapshot tài khoản ngân hàng",
      "admin -> api: APPROVE / PAID / COMPLETED / REJECT",
      "api -> db: Cập nhật status, processedBy, transactionCode",
      "api --> teacher: Notification kết quả",
      "opt Đã đánh dấu trả nhưng có vấn đề",
      "  teacher -> api: POST /withdrawals/{id}/complaints + ảnh bằng chứng",
      "  api -> db: Tạo Complaint(OPEN)",
      "  admin -> api: RESOLVE hoặc REJECT complaint",
      "  api -> db: Lưu adminNote + resolvedAt",
      "end",
      "note over admin,db: Chuyển khoản là thao tác ngân hàng thủ công; hệ thống lưu workflow và bằng chứng.",
    ],
  },
  {
    id: "14_hoan_tat_chung_nhan_review",
    title: "14 — Hoàn tất khóa học, chứng nhận và đánh giá",
    participants: [
      ["actor", "Học viên", "student"],
      ["boundary", "Result / Course UI", "ui"],
      ["control", "Progress / Review API", "api"],
      ["database", "PostgreSQL", "db"],
      ["participant", "SMTP / Certificate", "mail"],
    ],
    body: [
      "student -> ui: Xem kết quả TestAttempt đã đạt",
      "ui -> api: GET /api/student/tests/{id}/attempts/{attemptId}",
      "api -> db: Đối chiếu toàn bộ lesson/test gate của Course",
      "alt Đủ điều kiện hoàn tất",
      "  api -> db: Ghi marker hoàn tất + LearningActivity idempotent",
      "  api -> mail: Tạo/gửi email chứng nhận",
      "  api --> ui: completed=true + mở form đánh giá",
      "else Chưa đủ",
      "  api --> ui: Hành động học/test kế tiếp",
      "end",
      "student -> ui: Chọn 1–5 sao và nhập bình luận",
      "ui -> api: POST /api/courses/{id}/reviews",
      "api -> db: Kiểm tra đã đạt course test",
      "api -> db: Upsert Feedback review (tối đa một review/user/course)",
      "api --> ui: Rating trung bình + danh sách review mới",
    ],
  },
  {
    id: "15_ket_qua_dashboard_xep_hang",
    title: "15 — Dashboard học viên, kết quả và bảng xếp hạng",
    participants: [
      ["actor", "Học viên", "student"],
      ["boundary", "Student UI", "ui"],
      ["control", "Server Pages / Result APIs", "api"],
      ["database", "PostgreSQL", "db"],
    ],
    body: [
      "student -> ui: Mở dashboard / khóa của tôi / kết quả / top students",
      "ui -> api: Render server page hoặc GET /api/student/results/**",
      "api -> db: Đọc Enrollment + Course + lesson markers",
      "api -> db: Đọc TestAttempt + AiAssessment + LearningActivity",
      "api -> db: Tổng hợp PointTransaction và trạng thái refund",
      "api -> api: Tính tiến độ, streak 7 ngày, xu hướng điểm, xếp hạng",
      "api --> ui: Khóa đang học/hoàn tất, bài gần đây, AI points, charts",
      "student -> ui: Lọc theo loại/khoảng thời gian hoặc mở chi tiết",
      "ui -> api: GET /api/student/results/{resultId} hoặc test history",
      "api -> db: Đọc snapshot bài làm + feedback + sample answer",
      "api --> ui: Chi tiết kết quả đã chuẩn hóa theo phần trăm/chứng chỉ tham chiếu",
    ],
  },
  {
    id: "16_thong_bao",
    title: "16 — Thông báo người dùng và thông báo doanh thu",
    participants: [
      ["actor", "Người dùng", "user"],
      ["boundary", "Header / Revenue UI", "ui"],
      ["control", "Notifications API", "api"],
      ["database", "PostgreSQL", "db"],
    ],
    body: [
      "user -> ui: Đăng nhập / mở trang",
      "ui -> api: GET /api/notifications",
      "api -> db: Đọc Notification chưa đọc theo userId",
      "api --> ui: Toast/header notifications",
      "user -> ui: Đọc/đóng thông báo",
      "ui -> api: PATCH /api/notifications",
      "api -> db: Cập nhật readAt",
      "opt Giảng viên xem lịch sử doanh thu",
      "  ui -> api: GET /api/teacher/revenue-notifications?page=...",
      "  api -> db: Phân trang Notification liên quan thanh toán/rút tiền",
      "  api --> ui: Lịch sử thông báo doanh thu",
      "end",
      "note over api,db: Notification được tạo bởi duyệt hồ sơ, course, refund, report, withdrawal và payment.",
    ],
  },
  {
    id: "17_quan_tri_analytics",
    title: "17 — Quản trị người dùng, nội dung, cấu hình và analytics",
    participants: [
      ["actor", "Admin", "admin"],
      ["boundary", "Admin Dashboard", "ui"],
      ["control", "Admin APIs", "api"],
      ["control", "Analytics Service", "analytics"],
      ["database", "PostgreSQL", "db"],
      ["participant", "Notification / SMTP", "notify"],
    ],
    body: [
      "admin -> ui: Chọn khoảng thời gian/bộ lọc analytics",
      "ui -> api: GET /api/admin/analytics",
      "api -> analytics: Tổng hợp KPI và bảng xếp hạng",
      "analytics -> db: User, Course, Enrollment, OrderItem, Payment",
      "analytics -> db: TestAttempt, AiAssessment, PointTransaction, LearningActivity",
      "analytics -> db: EmailLog, refund, report, withdrawal, anti-cheat",
      "analytics --> api: Dataset dashboard",
      "api --> ui: Biểu đồ và bảng quản trị",
      "admin -> ui: Khóa/mở user, đổi role, quản lý tests/course/config",
      "ui -> api: PATCH/POST các /api/admin/**",
      "api -> db: requireRole(ADMIN) + cập nhật transaction",
      "api -> notify: Gửi thông báo/email khi nghiệp vụ yêu cầu",
      "api --> ui: Trạng thái mới + dữ liệu đã làm mới",
      "note over api,db: SystemSetting chứa recruitment, auto course approval và cấu hình Speaking.",
    ],
  },
  {
    id: "18_public_health",
    title: "18 — Trang công khai và health check",
    participants: [
      ["actor", "Khách / Monitor", "guest"],
      ["boundary", "Public Pages", "ui"],
      ["control", "Next.js Server Components / APIs", "app"],
      ["database", "PostgreSQL", "db"],
    ],
    body: [
      "guest -> ui: Mở trang chủ, about, teachers, courses, top-students",
      "ui -> app: Render trang / gọi API công khai",
      "app -> db: Chỉ đọc dữ liệu ACTIVE và thống kê đã lọc",
      "db --> app: Course/Teacher/Language/Feedback/Enrollment aggregates",
      "app --> ui: HTML/React response",
      "guest -> app: GET /api/languages",
      "app -> db: Đọc LearningLanguage isActive=true",
      "app --> guest: Danh mục ngôn ngữ",
      "guest -> app: GET /api/health",
      "app -> db: Kiểm tra kết nối SELECT 1",
      "alt CSDL sẵn sàng",
      "  app --> guest: 200 app=ok, database=ok",
      "else Lỗi kết nối",
      "  app --> guest: 503 degraded/error",
      "end",
    ],
  },
];

function renderParticipant([type, label, alias]) {
  const color = type === "actor" ? "#CCFBF1" : type === "database" ? "#DCFCE7" : type === "boundary" ? "#DBEAFE" : type === "collections" ? "#FEF3C7" : "#F3E8FF";
  return `${type} "${label}" as ${alias} ${color}`;
}

function renderSequenceFile() {
  const preface = [
    "' FinnCenter — UML sequence diagrams toàn website",
    `' Sinh tự động từ mã nguồn ngày ${new Date().toISOString().slice(0, 10)}`,
    `' Phạm vi: ${flows.length} luồng nghiệp vụ chính, Next.js API, PostgreSQL, VNPay, SMTP và Ollama`,
    "",
  ];
  const diagrams = flows.map((flow) => [
    `@startuml ${flow.id}`,
    ...diagramHeader(flow.title),
    ...flow.participants.map(renderParticipant),
    "",
    ...flow.body,
    "@enduml",
  ].join("\n"));
  return `${preface.join("\n")}${diagrams.join("\n\n")}\n`;
}

const scalarTypes = new Set(["String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", "Json", "Bytes"]);

const domains = [
  { id: "auth", name: "Tài khoản, bảo mật và ngôn ngữ", models: ["User", "Session", "TrustedDevice", "LoginDeviceChallenge", "UserInvitation", "PasswordResetOtp", "EmailVerificationOtp", "RegistrationSecurityEvent", "LearningLanguage"] },
  { id: "learning", name: "Khóa học và tiến độ học tập", models: ["Course", "Module", "Lesson", "VideoWatchProgress", "Enrollment", "Feedback", "LearningActivity"] },
  { id: "tests_ai", name: "Bài kiểm tra, AI và điểm AI", models: ["Test", "Question", "Answer", "TestAttempt", "CheatingLog", "AiAssessment", "PointTransaction", "SystemSetting"] },
  { id: "teacher", name: "Tuyển dụng và hồ sơ giảng viên", models: ["TeacherApplication", "RecruitmentRound", "TeacherExamResult", "TeacherEntranceQuestionInstance", "TeacherCertificate", "TeacherApplicationLog", "AntiCheatLog", "SuspiciousEvent"] },
  { id: "commerce", name: "Thanh toán, hoàn tiền và doanh thu", models: ["Order", "OrderItem", "CourseRefundRequest", "CourseReport", "TeacherBankAccount", "TeacherBankAccountChangeOtp", "TeacherBankAccountChangeLog", "TeacherRevenueWithdrawal", "TeacherRevenueWithdrawalComplaint", "Payment"] },
  { id: "communication", name: "Thông báo và thư điện tử", models: ["Notification", "EmailLog"] },
];

function parseList(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseSchema(schema) {
  const enums = new Map();
  for (const match of schema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const values = match[2].split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("//") && !line.startsWith("@@")).map((line) => line.split(/\s+/)[0]);
    enums.set(match[1], values);
  }

  const rawModels = [];
  for (const match of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) rawModels.push({ name: match[1], body: match[2] });
  const modelNames = new Set(rawModels.map((model) => model.name));
  const models = rawModels.map((raw) => {
    const fields = [];
    const relations = [];
    const constraints = [];
    for (const sourceLine of raw.body.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("@@")) {
        constraints.push(line);
        continue;
      }
      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z_]\w*)(\[\]|\?)?\s*(.*)$/);
      if (!fieldMatch) continue;
      const [, name, type, modifier = "", attributes = ""] = fieldMatch;
      if (modelNames.has(type)) {
        const relation = attributes.match(/@relation\([\s\S]*?fields:\s*\[([^\]]+)\][\s\S]*?references:\s*\[([^\]]+)\]/);
        if (relation) {
          relations.push({
            fieldName: name,
            targetModel: type,
            sourceFields: parseList(relation[1]),
            targetFields: parseList(relation[2]),
            optional: modifier === "?",
          });
        }
        continue;
      }
      if (!scalarTypes.has(type) && !enums.has(type)) continue;
      fields.push({
        name,
        type,
        optional: modifier === "?",
        primary: /(^|\s)@id(\s|$)/.test(attributes),
        unique: /(^|\s)@unique(\s|$)/.test(attributes),
        foreign: false,
      });
    }
    const compositePrimary = constraints.find((item) => item.startsWith("@@id"));
    if (compositePrimary) {
      const match = compositePrimary.match(/\[([^\]]+)\]/);
      for (const name of match ? parseList(match[1]) : []) {
        const field = fields.find((candidate) => candidate.name === name);
        if (field) field.primary = true;
      }
    }
    for (const relation of relations) {
      for (const name of relation.sourceFields) {
        const field = fields.find((candidate) => candidate.name === name);
        if (field) field.foreign = true;
      }
    }
    return { name: raw.name, fields, relations, constraints };
  });
  return { enums, models };
}

function umlAlias(name) {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function entityLines(model, detailed = true, external = false) {
  const alias = umlAlias(model.name);
  if (external) return [`entity "${model.name}" as ${alias} <<external>>`];
  if (!detailed) return [`entity "${model.name}" as ${alias}`];
  const lines = [`entity "${model.name}" as ${alias} {`];
  const primary = model.fields.filter((field) => field.primary);
  const others = model.fields.filter((field) => !field.primary);
  const renderField = (field) => {
    const marks = [field.primary ? "PK" : null, field.foreign ? "FK" : null, field.unique ? "UQ" : null].filter(Boolean);
    const nullable = field.optional ? "?" : "";
    return `  ${field.primary ? "*" : ""}${field.name} : ${field.type}${nullable}${marks.length ? ` <<${marks.join(",") }>>` : ""}`;
  };
  lines.push(...primary.map(renderField));
  if (primary.length && others.length) lines.push("  --");
  lines.push(...others.map(renderField));
  lines.push("}");
  return lines;
}

function isUniqueRelation(model, relation) {
  if (relation.sourceFields.length === 1) {
    const field = model.fields.find((candidate) => candidate.name === relation.sourceFields[0]);
    if (field?.unique || field?.primary) return true;
  }
  return model.constraints.some((constraint) => {
    if (!constraint.startsWith("@@unique") && !constraint.startsWith("@@id")) return false;
    const match = constraint.match(/\[([^\]]+)\]/);
    const fields = match ? parseList(match[1]) : [];
    return fields.length === relation.sourceFields.length && fields.every((field) => relation.sourceFields.includes(field));
  });
}

function relationLine(sourceModel, relation) {
  const targetCardinality = relation.optional ? "o|" : "||";
  const sourceCardinality = isUniqueRelation(sourceModel, relation) ? "o|" : "o{";
  const label = relation.sourceFields.map((field, index) => `${field}→${relation.targetFields[index] ?? relation.targetFields[0] ?? "id"}`).join(", ");
  return `${umlAlias(relation.targetModel)} ${targetCardinality}--${sourceCardinality} ${umlAlias(sourceModel.name)} : "${label}"`;
}

function erdSkin(title) {
  return [
    "hide methods",
    "skinparam backgroundColor #FFFFFF",
    "skinparam shadowing false",
    "skinparam linetype ortho",
    "skinparam packageStyle rectangle",
    "skinparam entityBorderColor #334155",
    "skinparam entityBackgroundColor #F8FAFC",
    "skinparam entityFontColor #0F172A",
    "skinparam ArrowColor #64748B",
    "skinparam packageBorderColor #94A3B8",
    "skinparam packageBackgroundColor #FFFFFF",
    `title ${title}`,
    "left to right direction",
  ];
}

function renderOverview(parsed) {
  const lines = ["@startuml 00_tong_quan", ...erdSkin(`FinnCenter — Tổng quan ${parsed.models.length} bảng`), ""];
  const modelMap = new Map(parsed.models.map((model) => [model.name, model]));
  for (const domain of domains) {
    lines.push(`package "${domain.name}" {`);
    for (const name of domain.models) lines.push(...entityLines(modelMap.get(name), false).map((line) => `  ${line}`));
    lines.push("}", "");
  }
  for (const model of parsed.models) for (const relation of model.relations) lines.push(relationLine(model, relation));
  lines.push("", "legend right", "  ||= bắt buộc một; o|=không hoặc một; o{=không hoặc nhiều", "endlegend", "@enduml");
  return lines.join("\n");
}

function renderDomain(parsed, domain, index) {
  const included = new Set(domain.models);
  const modelMap = new Map(parsed.models.map((model) => [model.name, model]));
  const relevantRelations = parsed.models.flatMap((model) => model.relations.map((relation) => ({ model, relation }))).filter(({ model, relation }) => included.has(model.name) || included.has(relation.targetModel));
  const externals = new Set();
  for (const { model, relation } of relevantRelations) {
    if (!included.has(model.name)) externals.add(model.name);
    if (!included.has(relation.targetModel)) externals.add(relation.targetModel);
  }
  const lines = [`@startuml ${String(index).padStart(2, "0")}_${domain.id}`, ...erdSkin(`${String(index).padStart(2, "0")} — ${domain.name}`), ""];
  lines.push(`package "${domain.name}" {`);
  for (const name of domain.models) lines.push(...entityLines(modelMap.get(name), true).map((line) => `  ${line}`));
  lines.push("}", "");
  if (externals.size) {
    lines.push("package \"Bảng liên quan ở miền khác\" #FFF7ED {");
    for (const name of [...externals].sort()) lines.push(...entityLines(modelMap.get(name), false, true).map((line) => `  ${line}`));
    lines.push("}", "");
  }
  for (const { model, relation } of relevantRelations) lines.push(relationLine(model, relation));
  lines.push("", "legend right", "  PK=khóa chính; FK=khóa ngoại; UQ=duy nhất; dấu ?=cho phép NULL", "endlegend", "@enduml");
  return lines.join("\n");
}

function renderEnums(parsed) {
  const lines = [`@startuml ${String(domains.length + 1).padStart(2, "0")}_enums`, ...erdSkin(`${String(domains.length + 1).padStart(2, "0")} — Danh mục ${parsed.enums.size} enum Prisma`), ""];
  lines.push("package \"Prisma enums\" {");
  for (const [name, values] of parsed.enums) {
    lines.push(`  enum ${name} {`);
    for (const value of values) lines.push(`    ${value}`);
    lines.push("  }");
  }
  lines.push("}", "@enduml");
  return lines.join("\n");
}

function renderDatabaseFile(parsed) {
  const assigned = new Set(domains.flatMap((domain) => domain.models));
  const actual = new Set(parsed.models.map((model) => model.name));
  const missing = [...actual].filter((name) => !assigned.has(name));
  const unknown = [...assigned].filter((name) => !actual.has(name));
  if (missing.length || unknown.length) throw new Error(`Database domain coverage mismatch. Missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}`);
  const diagrams = [renderOverview(parsed), ...domains.map((domain, index) => renderDomain(parsed, domain, index + 1)), renderEnums(parsed)];
  const comments = [
    "' FinnCenter — database ERD mới, sinh trực tiếp từ prisma/schema.prisma",
    `' Sinh ngày ${new Date().toISOString().slice(0, 10)}; ${parsed.models.length} model; ${parsed.enums.size} enum`,
    "' Mỗi khối @startuml là một diagram độc lập: tổng quan, 6 miền chi tiết và enum.",
    "",
  ];
  return `${comments.join("\n")}${diagrams.join("\n\n")}\n`;
}

const schema = await readFile(schemaPath, "utf8");
const parsed = parseSchema(schema);
const sequenceFile = renderSequenceFile();
const databaseFile = renderDatabaseFile(parsed);

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(sequencePath, sequenceFile, "utf8"),
  writeFile(databasePath, databaseFile, "utf8"),
]);

console.log(JSON.stringify({
  sequencePath,
  sequenceDiagrams: flows.length,
  databasePath,
  databaseDiagrams: domains.length + 2,
  databaseModels: parsed.models.length,
  databaseEnums: parsed.enums.size,
}, null, 2));
