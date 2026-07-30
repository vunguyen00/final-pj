import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const docsDir = path.join(projectRoot, "docs");
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const sequenceOutput = path.join(docsDir, "finncenter-sequence-diagrams.drawio");
const databaseOutput = path.join(docsDir, "finncenter-database-erd.drawio");

const COLORS = {
  blue: { fill: "#dae8fc", stroke: "#6c8ebf", text: "#1f3b5b" },
  green: { fill: "#d5e8d4", stroke: "#82b366", text: "#274e13" },
  orange: { fill: "#ffe6cc", stroke: "#d79b00", text: "#7f4e00" },
  purple: { fill: "#e1d5e7", stroke: "#9673a6", text: "#4c2f5e" },
  red: { fill: "#f8cecc", stroke: "#b85450", text: "#7d2623" },
  yellow: { fill: "#fff2cc", stroke: "#d6b656", text: "#604c00" },
  teal: { fill: "#d5e8e6", stroke: "#0e8088", text: "#0b555b" },
  gray: { fill: "#f5f5f5", stroke: "#666666", text: "#333333" },
};

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stableId(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function vertex({ id, value, x, y, width, height, style, parent = "1" }) {
  return `<mxCell id="${xmlEscape(id)}" value="${xmlEscape(value)}" style="${xmlEscape(style)}" vertex="1" parent="${xmlEscape(parent)}"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/></mxCell>`;
}

function edge({
  id,
  value = "",
  source,
  target,
  style,
  parent = "1",
  points = [],
}) {
  const pointXml = points.length
    ? `<Array as="points">${points
        .map((point) => `<mxPoint x="${point.x}" y="${point.y}"/>`)
        .join("")}</Array>`
    : "";
  return `<mxCell id="${xmlEscape(id)}" value="${xmlEscape(value)}" style="${xmlEscape(style)}" edge="1" parent="${xmlEscape(parent)}" source="${xmlEscape(source)}" target="${xmlEscape(target)}"><mxGeometry relative="1" as="geometry">${pointXml}</mxGeometry></mxCell>`;
}

function graphPage(name, id, cells, width = 1800, height = 1200) {
  return `<diagram id="${xmlEscape(id)}" name="${xmlEscape(name)}"><mxGraphModel dx="${width}" dy="${height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram>`;
}

function mxFile(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device" compressed="false">\n${pages.join("\n")}\n</mxfile>\n`;
}

const SEQUENCE_FLOWS = [
  {
    name: "00 - Mục lục",
    description:
      "Bản đồ các luồng nghiệp vụ đầu cuối của FinnCenter. Mỗi ô tương ứng với một trang sơ đồ tuần tự trong tệp.",
    index: true,
  },
  {
    name: "01 - Đăng ký và xác thực thư điện tử",
    participants: [
      ["user", "Người dùng", "actor"],
      ["ui", "Register UI", "ui"],
      ["api", "Auth API", "api"],
      ["db", "PostgreSQL", "db"],
      ["mail", "SMTP / Email", "external"],
    ],
    messages: [
      ["user", "ui", "Nhập họ tên, email, mật khẩu"],
      ["ui", "api", "POST /api/auth/register"],
      ["api", "api", "Kiểm tra dữ liệu + độ mạnh mật khẩu", "self"],
      ["api", "db", "Tìm người dùng (User) theo thư điện tử"],
      ["api", "db", "Tạo/cập nhật User = PENDING_VERIFICATION"],
      ["api", "db", "Tạo EmailVerificationOtp + sự kiện bảo mật"],
      ["api", "mail", "Gửi OTP 6 số"],
      ["api", "ui", "Yêu cầu OTP + thời gian hết hạn", "return"],
      ["user", "ui", "Nhập OTP"],
      ["ui", "api", "POST /api/auth/verify-registration-otp"],
      ["api", "db", "Kiểm tra OTP, số lần thử, IP và thiết bị"],
      ["api", "db", "User = ACTIVE; đánh dấu OTP đã sử dụng"],
      ["api", "api", "Ký auth_token theo vai trò và authVersion", "self"],
      ["api", "ui", "Đặt cookie + chuyển hướng theo vai trò", "return"],
    ],
    notes: [
      [3, 5, 5, "TRƯỜNG HỢP: thư điện tử đã ACTIVE → trả 409; chưa hết thời gian chờ hoặc vượt giới hạn OTP → trả 429"],
      [10, 4, 5, "TRƯỜNG HỢP: OTP sai/hết hạn → tăng số lần thử hoặc yêu cầu gửi lại"],
    ],
  },
  {
    name: "02 - Đăng nhập và đặt lại mật khẩu",
    participants: [
      ["user", "Người dùng", "actor"],
      ["ui", "Auth UI", "ui"],
      ["api", "Auth API", "api"],
      ["auth", "Rate limit / Auth", "service"],
      ["db", "PostgreSQL", "db"],
      ["mail", "SMTP / Email", "external"],
    ],
    messages: [
      ["user", "ui", "Nhập email + mật khẩu"],
      ["ui", "api", "POST /api/auth/login"],
      ["api", "auth", "Giới hạn tần suất theo IP và thư điện tử"],
      ["api", "db", "Đọc người dùng (User)"],
      ["api", "auth", "Xác minh mật khẩu scrypt + trạng thái tài khoản"],
      ["api", "ui", "Đặt auth_token; chuyển hướng theo vai trò", "return"],
      ["user", "ui", "Chọn Quên mật khẩu"],
      ["ui", "api", "POST /forgot-password/request-otp"],
      ["api", "db", "Tạo PasswordResetOtp"],
      ["api", "mail", "Gửi OTP đặt lại mật khẩu"],
      ["user", "ui", "Nhập OTP + mật khẩu mới"],
      ["ui", "api", "POST /forgot-password/reset"],
      ["api", "db", "Giao dịch CSDL: đổi mật khẩu, tăng authVersion"],
      ["api", "db", "Đánh dấu OTP đã dùng + xóa phiên (Session) cũ"],
      ["api", "ui", "Đặt lại thành công", "return"],
    ],
    notes: [
      [4, 3, 5, "TRƯỜNG HỢP: sai thông tin / bị khóa / chưa xác thực → 401/403"],
      [12, 3, 5, "Mọi mã xác thực cũ mất hiệu lực do authVersion tăng"],
    ],
  },
  {
    name: "03 - Khám phá và mua khóa học",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Course UI", "ui"],
      ["api", "Course / Enroll API", "api"],
      ["db", "PostgreSQL", "db"],
      ["vnpay", "VNPay", "external"],
      ["callback", "Payment Callback", "api"],
    ],
    messages: [
      ["student", "ui", "Xem danh sách / chi tiết khóa học"],
      ["ui", "api", "GET /api/courses + quyền truy cập"],
      ["api", "db", "Đọc khóa học, giảng viên, chương học và đánh giá"],
      ["student", "ui", "Chọn đăng ký / mua"],
      ["ui", "api", "POST /api/courses/{id}/enroll"],
      ["api", "db", "Kiểm tra Course, Enrollment và quyền truy cập"],
      ["api", "db", "Tạo đơn hàng (Order) + thanh toán (Payment: PENDING)"],
      ["api", "ui", "Trả đường dẫn thanh toán đã ký", "return"],
      ["ui", "vnpay", "Chuyển sang cổng thanh toán"],
      ["vnpay", "callback", "Phản hồi/IPN + mã giao dịch"],
      ["callback", "callback", "Xác minh chữ ký, số tiền và trạng thái", "self"],
      ["callback", "db", "Giành quyền xử lý PENDING → PROCESSING"],
      ["callback", "db", "Payment = PAID; thêm/cập nhật OrderItem + Enrollment"],
      ["callback", "db", "Lưu phần chia doanh thu quản trị viên/giảng viên"],
      ["callback", "ui", "Chuyển về khóa học với kết quả thành công", "return"],
    ],
    notes: [
      [6, 2, 4, "TRƯỜNG HỢP: khóa miễn phí hoặc người mua là giảng viên sở hữu → tạo Enrollment ngay"],
      [11, 4, 6, "Chống xử lý lặp: phản hồi lặp trả ALREADY_PAID, không ghi doanh thu hai lần"],
    ],
  },
  {
    name: "04 - Học bài, nhịp video và điều kiện mở khóa",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Learning UI", "ui"],
      ["api", "Lesson API", "api"],
      ["gate", "Learning Gate", "service"],
      ["db", "PostgreSQL", "db"],
      ["video", "Video Player", "external"],
    ],
    messages: [
      ["student", "ui", "Mở chương học / bài học"],
      ["ui", "api", "POST /lessons/{id}/start"],
      ["api", "db", "Kiểm tra ghi danh ACTIVE / chủ sở hữu / quản trị viên"],
      ["api", "gate", "Kiểm tra chương học đã được mở"],
      ["api", "db", "Ghi nhận bắt đầu bài học + VideoWatchProgress"],
      ["ui", "video", "Phát video"],
      ["video", "api", "Gửi vị trí + thời lượng định kỳ"],
      ["api", "db", "So sánh thời gian đã trôi qua, phát hiện tua/nhảy"],
      ["api", "db", "Cập nhật VideoWatchProgress"],
      ["student", "ui", "Hoàn thành bài"],
      ["ui", "api", "POST /lessons/{id}/complete"],
      ["api", "db", "Xác minh 3 phút đọc hoặc video liên tục"],
      ["api", "db", "Đánh dấu hoàn thành bài + LearningActivity"],
      ["api", "gate", "Tính trạng thái chương/khóa và hành động kế tiếp"],
      ["gate", "db", "Đọc bài đã hoàn thành + TestAttempt đã đạt"],
      ["api", "ui", "Mở bài học/bài kiểm tra kế tiếp hoặc hoàn tất", "return"],
    ],
    notes: [
      [6, 2, 6, "Video: nhịp theo dõi phải mới, đã xem ≥90%, tới cuối và không vi phạm tua"],
      [13, 3, 5, "Chương tiếp theo chỉ mở khi bài học và bài kiểm tra chương trước đã hoàn thành"],
    ],
  },
  {
    name: "05 - Làm bài kiểm tra và chấm bằng AI",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Test UI", "ui"],
      ["api", "Student Test API", "api"],
      ["rules", "Rules / Attempt Token", "service"],
      ["ai", "AI Evaluation", "service"],
      ["ollama", "Ollama", "external"],
      ["db", "PostgreSQL", "db"],
    ],
    messages: [
      ["student", "ui", "Mở bài kiểm tra"],
      ["ui", "api", "GET /api/student/tests/{testId}"],
      ["api", "rules", "Kiểm tra quyền mở, mức sẵn sàng và số lượt làm"],
      ["api", "db", "Đọc bài kiểm tra + câu hỏi + đáp án"],
      ["api", "ui", "Đề + mã lượt làm + hạn nộp", "return"],
      ["student", "ui", "Trả lời / ghi âm / tự động nộp"],
      ["ui", "api", "POST /tests/{id}/submit"],
      ["api", "rules", "Xác minh mã lượt làm + thời gian + quyền"],
      ["api", "ai", "Gửi câu tự luận/bài nói cần chấm"],
      ["ai", "ollama", "Gửi đề bài và tiêu chí chấm đa ngôn ngữ"],
      ["ollama", "ai", "Trả điểm + nhận xét theo tiêu chí", "return"],
      ["ai", "api", "Chuẩn hóa / hiệu chỉnh / chỉ chấm điểm", "return"],
      ["api", "api", "Chấm câu khách quan + tổng điểm 100", "self"],
      ["api", "db", "Giao dịch CSDL: tạo TestAttempt + kết quả JSON"],
      ["api", "db", "Ghi PointTransaction nếu mua nhận xét"],
      ["api", "db", "Ghi LearningActivity + cập nhật điều kiện khóa học"],
      ["api", "ui", "Mã lượt làm, điểm, đạt/không đạt, hành động kế tiếp", "return"],
    ],
    notes: [
      [8, 4, 6, "Nhận xét AI chi tiết dùng tiêu chí theo ngôn ngữ; chế độ chỉ chấm điểm sẽ bỏ phần nhận xét"],
      [13, 3, 7, "TestAttempt lưu ảnh chụp dữ liệu câu hỏi, đáp án, điểm từng câu và nhận xét AI"],
    ],
  },
  {
    name: "06 - Luyện viết với AI",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Writing AI UI", "ui"],
      ["api", "Essay / Prompt API", "api"],
      ["points", "AI Points", "service"],
      ["ollama", "Ollama", "external"],
      ["db", "PostgreSQL", "db"],
    ],
    messages: [
      ["student", "ui", "Chọn ngôn ngữ, dạng bài và chủ đề"],
      ["ui", "api", "POST /api/ai/writing-prompt"],
      ["api", "ollama", "Tạo đề + dữ liệu biểu đồ (nếu dạng 1)"],
      ["ollama", "api", "Trả đề bài / phương án dự phòng", "return"],
      ["api", "ui", "Hiển thị đề", "return"],
      ["student", "ui", "Viết bài; chọn Chấm điểm hoặc Nhận xét AI"],
      ["ui", "api", "POST /api/ai/essay-evaluation"],
      ["api", "points", "Kiểm tra/giành quyền trừ điểm nếu cần nhận xét"],
      ["api", "ollama", "Chấm IELTS hoặc theo tiêu chí ngôn ngữ"],
      ["ollama", "api", "Điểm + chi tiết tiêu chí", "return"],
      ["api", "db", "Tạo AiAssessment"],
      ["api", "db", "Ghi PointTransaction + LearningActivity"],
      ["api", "ui", "Kết quả đánh giá ngôn ngữ / kết quả IELTS", "return"],
    ],
    notes: [
      [7, 3, 5, "Quản trị viên được miễn phí; học viên/giảng viên dùng điểm AI cho nhận xét chi tiết"],
      [8, 2, 5, "Nhận xét, lỗi, hướng cải thiện và bài mẫu dùng cùng ngôn ngữ với bài luyện"],
    ],
  },
  {
    name: "07 - Luyện nói với AI",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Speaking AI UI", "ui"],
      ["media", "MediaRecorder + Worker", "external"],
      ["api", "Speaking API", "api"],
      ["points", "AI Points", "service"],
      ["ollama", "Ollama", "external"],
      ["fs", "Local Upload Storage", "external"],
      ["db", "PostgreSQL", "db"],
    ],
    messages: [
      ["student", "ui", "Chọn ngôn ngữ/dạng bài/chủ đề"],
      ["ui", "api", "POST /speaking-evaluation/topic"],
      ["api", "ollama", "Tạo đề bài luyện nói"],
      ["api", "ui", "Đề bài + cấu hình thời lượng", "return"],
      ["student", "ui", "Bắt đầu nói"],
      ["ui", "media", "getUserMedia + MediaRecorder"],
      ["media", "ui", "Khối dữ liệu âm thanh khi kết thúc", "return"],
      ["ui", "media", "Luồng nền chuyển âm thanh → bản chép lời"],
      ["media", "ui", "Bản chép lời", "return"],
      ["ui", "api", "Dữ liệu nhiều phần: âm thanh + bản chép lời + đề bài"],
      ["api", "points", "Kiểm tra/giành quyền trừ điểm nhận xét"],
      ["api", "fs", "Lưu public/uploads/speaking/*.webm"],
      ["api", "ollama", "Chấm bài nói theo tiêu chí"],
      ["ollama", "api", "Điểm + nhận xét", "return"],
      ["api", "db", "Tạo AiAssessment + giao dịch/hoạt động"],
      ["api", "ui", "Kết quả chi tiết + mã đánh giá", "return"],
    ],
    notes: [
      [7, 2, 3, "Bản chép lời chạy phía máy khách; phát âm chỉ là ước lượng nếu không phân tích âm học"],
      [11, 4, 7, "Âm thanh hiện lưu cục bộ; khi triển khai nhiều máy chủ nên dùng kho lưu trữ đối tượng"],
    ],
  },
  {
    name: "08 - Mua điểm AI qua VNPay",
    participants: [
      ["user", "Student / Teacher", "actor"],
      ["ui", "AI Points UI", "ui"],
      ["api", "Points Buy API", "api"],
      ["db", "PostgreSQL", "db"],
      ["vnpay", "VNPay", "external"],
      ["callback", "Points Callback", "api"],
    ],
    messages: [
      ["user", "ui", "Chọn số lượng điểm AI"],
      ["ui", "api", "POST /api/ai/points/buy"],
      ["api", "db", "Tạo Order + Payment(AI_POINTS, PENDING)"],
      ["api", "ui", "Đường dẫn thanh toán + mã tham chiếu", "return"],
      ["ui", "vnpay", "Chuyển hướng thanh toán"],
      ["vnpay", "callback", "Phản hồi/IPN"],
      ["callback", "callback", "Xác minh chữ ký + số tiền + mục đích", "self"],
      ["callback", "db", "Giành quyền xử lý Payment PENDING → PROCESSING"],
      ["callback", "db", "Payment=PAID + PointTransaction(PURCHASE)"],
      ["callback", "db", "Tính balanceAfter, chống cộng trùng bằng sourceKey"],
      ["callback", "ui", "Chuyển về trang nguồn an toàn", "return"],
    ],
    notes: [
      [6, 3, 6, "Đường dẫn quay lại chỉ cho phép đường dẫn nội bộ trong danh sách an toàn"],
      [8, 3, 5, "Giao dịch và phản hồi thanh toán đều chống xử lý lặp"],
    ],
  },
  {
    name: "09 - Nạp ví tương thích cũ",
    participants: [
      ["user", "Người dùng", "actor"],
      ["ui", "Wallet UI", "ui"],
      ["api", "Wallet API", "api"],
      ["db", "PostgreSQL", "db"],
      ["vnpay", "VNPay", "external"],
      ["callback", "Wallet Callback", "api"],
    ],
    messages: [
      ["user", "ui", "Nhập số tiền nạp"],
      ["ui", "api", "POST /api/wallet/top-up"],
      ["api", "db", "Tạo Payment(PENDING)"],
      ["api", "ui", "Đường dẫn VNPay đã ký", "return"],
      ["ui", "vnpay", "Chuyển hướng"],
      ["vnpay", "callback", "Phản hồi/IPN"],
      ["callback", "callback", "Xác minh chữ ký và số tiền", "self"],
      ["callback", "db", "Giành quyền xử lý thanh toán; cập nhật số dư Wallet"],
      ["callback", "db", "Payment = PAID; lưu phản hồi gốc"],
      ["callback", "ui", "Chuyển về /student/wallet", "return"],
    ],
    notes: [
      [1, 2, 4, "Đây là luồng tương thích ví VND còn tồn tại trong lược đồ/API"],
    ],
  },
  {
    name: "10 - Đăng ký giảng viên và thi đầu vào",
    participants: [
      ["applicant", "Ứng viên", "actor"],
      ["ui", "Teacher Registration UI", "ui"],
      ["api", "Teacher Application API", "api"],
      ["exam", "Sequential Exam Service", "service"],
      ["media", "Recorder / Worker", "external"],
      ["ai", "AI Grading", "service"],
      ["db", "PostgreSQL", "db"],
    ],
    messages: [
      ["applicant", "ui", "Chọn ngôn ngữ + tải chứng chỉ"],
      ["ui", "api", "POST /api/teacher-applications"],
      ["api", "db", "Tạo TeacherApplication + chứng chỉ + nhật ký"],
      ["api", "exam", "Khởi tạo các bản câu hỏi tuần tự"],
      ["exam", "db", "Chụp dữ liệu TeacherEntranceQuestionInstance"],
      ["ui", "api", "POST /session/current hoặc mở câu hỏi"],
      ["api", "exam", "Khóa/mở đúng câu hiện tại + hạn trả lời"],
      ["exam", "ui", "Bản câu hỏi + mã chuyển câu", "return"],
      ["applicant", "ui", "Trả lời; tự động lưu; gửi nhịp giám sát"],
      ["ui", "api", "Tự động lưu + sự kiện chống gian lận"],
      ["api", "db", "Phiên bản câu trả lời + AntiCheatLog/SuspiciousEvent"],
      ["ui", "media", "Ghi âm câu nói"],
      ["media", "api", "Tải âm thanh lên + hoàn tất xử lý"],
      ["api", "ai", "Chép lời/chấm câu viết và câu nói"],
      ["ai", "db", "Lưu bản chép lời/kết quả chấm"],
      ["ui", "api", "POST /submit-test"],
      ["api", "db", "Tạo TestAttempt; trạng thái SUBMITTED/FAILED_CHEATING"],
      ["api", "ui", "Kết quả nộp + trạng thái hồ sơ", "return"],
    ],
    notes: [
      [5, 2, 6, "Mỗi câu chỉ mở theo thứ tự; mã chuyển câu có hạn và được băm"],
      [9, 2, 7, "Rời trang, mất tiêu điểm, nhịp giám sát bất thường được ghi và đếm theo mã sự cố"],
    ],
  },
  {
    name: "11 - Quản trị viên duyệt hồ sơ giảng viên",
    participants: [
      ["admin", "Admin", "actor"],
      ["ui", "Admin UI", "ui"],
      ["api", "Admin Teacher API", "api"],
      ["db", "PostgreSQL", "db"],
      ["notify", "Notification Service", "service"],
      ["mail", "SMTP / Email", "external"],
    ],
    messages: [
      ["admin", "ui", "Mở hồ sơ, bài thi, chứng chỉ và dữ liệu chống gian lận"],
      ["ui", "api", "GET /admin/teacher-applications/{id}/attempt"],
      ["api", "db", "Đọc hồ sơ + kết quả bài thi + nhật ký"],
      ["api", "ui", "Chi tiết hồ sơ", "return"],
      ["admin", "ui", "Phê duyệt hoặc từ chối + lý do"],
      ["ui", "api", "POST /review"],
      ["api", "db", "Giao dịch CSDL: khóa trạng thái hồ sơ"],
      ["api", "db", "APPROVED: User.role = TEACHER"],
      ["api", "db", "Tạo TeacherApplicationLog"],
      ["api", "notify", "Tạo Notification"],
      ["notify", "mail", "Gửi email kết quả"],
      ["api", "ui", "Trạng thái mới", "return"],
    ],
    notes: [
      [6, 2, 4, "Chỉ trạng thái hợp lệ mới được xét duyệt; thao tác lặp không đổi kết quả"],
    ],
  },
  {
    name: "12 - Giảng viên quản lý khóa học và bài kiểm tra",
    participants: [
      ["teacher", "Giảng viên", "actor"],
      ["ui", "Teacher UI", "ui"],
      ["api", "Teacher Course/Test API", "api"],
      ["storage", "Local Upload Storage", "external"],
      ["rules", "Readiness / Approval", "service"],
      ["db", "PostgreSQL", "db"],
      ["admin", "Admin Approval", "actor"],
    ],
    messages: [
      ["teacher", "ui", "Tạo/sửa khóa học"],
      ["ui", "api", "POST/PATCH /api/teacher/courses"],
      ["api", "rules", "Kiểm tra ngôn ngữ được duyệt + chế độ tự động phê duyệt"],
      ["api", "db", "Tạo/cập nhật Course; trạng thái ACTIVE/PENDING_APPROVAL"],
      ["teacher", "ui", "Tạo chương học và bài học"],
      ["ui", "api", "POST chương học / bài học"],
      ["ui", "storage", "Tải ảnh đại diện, video, âm thanh và tài liệu"],
      ["api", "db", "Lưu Module/Lesson và đường dẫn tệp"],
      ["teacher", "ui", "Tạo bài kiểm tra khóa/chương/bài học"],
      ["ui", "api", "POST /api/teacher/tests + câu hỏi"],
      ["api", "rules", "Kiểm tra đích, chế độ, tổng điểm ≤100"],
      ["api", "db", "Lưu Test, Question và Answer"],
      ["api", "rules", "Mức sẵn sàng: tổng điểm = 100 và có câu hỏi"],
      ["admin", "api", "Duyệt/từ chối/khóa khóa học"],
      ["api", "db", "Cập nhật trạng thái Course + thông báo"],
    ],
    notes: [
      [2, 3, 6, "Khi tắt tự động phê duyệt, nội dung do giảng viên sửa quay lại PENDING_APPROVAL"],
      [8, 2, 6, "Bài kiểm tra có thể gắn khóa, chương hoặc bài học; quản trị viên quản lý bài công khai/đầu vào"],
    ],
  },
  {
    name: "13 - Hoàn tiền và báo cáo nội dung",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Course UI", "ui"],
      ["api", "Refund / Report API", "api"],
      ["db", "PostgreSQL", "db"],
      ["admin", "Admin", "actor"],
      ["notify", "Notification / Email", "service"],
    ],
    messages: [
      ["student", "ui", "Gửi yêu cầu hoàn tiền"],
      ["ui", "api", "POST /api/course-refunds"],
      ["api", "db", "Kiểm tra Payment/OrderItem/Enrollment"],
      ["api", "db", "Tạo CourseRefundRequest(PENDING)"],
      ["api", "db", "Enrollment.accessStatus = REFUND_PENDING"],
      ["api", "notify", "Thông báo quản trị viên"],
      ["admin", "api", "PATCH /admin/course-refunds/{id}"],
      ["api", "db", "APPROVE: xóa dữ liệu học tập/ghi danh"],
      ["api", "db", "REJECT: Enrollment = ACTIVE"],
      ["api", "notify", "Thông báo kết quả cho học viên"],
      ["student", "ui", "Báo cáo khóa học / bài học"],
      ["ui", "api", "POST /api/course-reports"],
      ["api", "db", "Tạo CourseReport + thông báo toàn bộ quản trị viên"],
      ["admin", "api", "PATCH báo cáo: xử lý / bỏ qua"],
      ["api", "db", "Lưu phản hồi, trạng thái và người phản hồi"],
    ],
    notes: [
      [2, 2, 5, "Trong lúc PENDING, quyền học bị tạm khóa"],
      [7, 3, 5, "Hoàn tiền thật được xử lý ngoài hệ thống; CSDL ghi quy trình và nhật ký kiểm toán"],
    ],
  },
  {
    name: "14 - Rút doanh thu và khiếu nại",
    participants: [
      ["teacher", "Giảng viên", "actor"],
      ["ui", "Revenue UI", "ui"],
      ["api", "Withdrawal API", "api"],
      ["bank", "Bank Account / OTP", "service"],
      ["db", "PostgreSQL", "db"],
      ["admin", "Admin", "actor"],
      ["notify", "Notification", "service"],
    ],
    messages: [
      ["teacher", "ui", "Khai báo/thay đổi tài khoản ngân hàng"],
      ["ui", "bank", "Yêu cầu OTP → xác minh OTP"],
      ["bank", "db", "Cập nhật TeacherBankAccount + nhật ký thay đổi"],
      ["teacher", "ui", "Tạo yêu cầu rút doanh thu"],
      ["ui", "api", "POST /teacher/revenue-withdrawals"],
      ["api", "db", "Tính doanh thu khả dụng, chụp dữ liệu tài khoản ngân hàng"],
      ["api", "db", "Tạo TeacherRevenueWithdrawal(PENDING)"],
      ["api", "notify", "Thông báo quản trị viên"],
      ["admin", "api", "PHÊ DUYỆT / ĐÁNH DẤU ĐÃ TRẢ / TỪ CHỐI"],
      ["api", "db", "Cập nhật trạng thái, người xử lý và bằng chứng/tham chiếu"],
      ["api", "notify", "Thông báo giảng viên"],
      ["teacher", "ui", "Nếu có vấn đề: gửi khiếu nại + bằng chứng"],
      ["ui", "api", "POST /withdrawals/{id}/complaints"],
      ["api", "db", "Tạo khiếu nại OPEN"],
      ["admin", "api", "Giải quyết / từ chối khiếu nại"],
      ["api", "db", "Lưu cách giải quyết + người giải quyết"],
    ],
    notes: [
      [5, 2, 5, "Doanh thu khả dụng = teacherRevenue đã thanh toán - khoản đã/đang rút"],
      [8, 4, 6, "Chuyển khoản ngân hàng hiện là thao tác thủ công ngoài hệ thống"],
    ],
  },
  {
    name: "15 - Hoàn tất khóa, chứng nhận và đánh giá",
    participants: [
      ["student", "Học viên", "actor"],
      ["ui", "Result UI", "ui"],
      ["api", "Result / Review API", "api"],
      ["progress", "Progress Service", "service"],
      ["db", "PostgreSQL", "db"],
      ["mail", "SMTP / Certificate", "external"],
    ],
    messages: [
      ["student", "ui", "Xem kết quả bài kiểm tra đã đạt"],
      ["ui", "api", "GET result/{attemptId}"],
      ["api", "progress", "Tính điều kiện hoàn thành + trạng thái khóa học"],
      ["progress", "db", "Đọc dấu mốc bài học + TestAttempt"],
      ["api", "ui", "Kết quả chi tiết + hành động kế tiếp", "return"],
      ["progress", "db", "Đánh dấu hoàn thành khóa + LearningActivity"],
      ["progress", "mail", "Tạo/gửi chứng nhận nếu đủ điều kiện"],
      ["student", "ui", "Đánh giá 1–5 sao + bình luận"],
      ["ui", "api", "POST /courses/{id}/reviews"],
      ["api", "db", "Kiểm tra đã đạt bài kiểm tra khóa học"],
      ["api", "db", "Thêm/cập nhật Feedback (đánh giá)"],
      ["api", "ui", "Đã lưu đánh giá", "return"],
    ],
    notes: [
      [2, 3, 5, "Khóa học chỉ hoàn tất khi toàn bộ điều kiện chương và bài kiểm tra cuối khóa đã đạt"],
    ],
  },
  {
    name: "16 - Quản trị hệ thống và phân tích dữ liệu",
    participants: [
      ["admin", "Admin", "actor"],
      ["ui", "Admin Dashboard", "ui"],
      ["api", "Admin APIs", "api"],
      ["analytics", "Analytics Service", "service"],
      ["db", "PostgreSQL", "db"],
      ["notify", "Notification / SMTP", "service"],
    ],
    messages: [
      ["admin", "ui", "Chọn khoảng thời gian / bộ lọc"],
      ["ui", "api", "GET /api/admin/analytics"],
      ["api", "analytics", "Tổng hợp chỉ số chính và bảng xếp hạng"],
      ["analytics", "db", "Tổng hợp người dùng, khóa học, doanh thu, bài kiểm tra và AI"],
      ["analytics", "db", "Tổng hợp học tập, thư điện tử và chống gian lận"],
      ["analytics", "api", "Trả tập dữ liệu bảng điều khiển", "return"],
      ["api", "ui", "Hiển thị dữ liệu phân tích", "return"],
      ["admin", "ui", "Quản lý người dùng/khóa học/bài kiểm tra/cấu hình"],
      ["ui", "api", "PATCH tài nguyên quản trị"],
      ["api", "db", "Kiểm tra vai trò + cập nhật trong giao dịch"],
      ["api", "notify", "Tạo thông báo/thư điện tử nếu cần"],
      ["api", "ui", "Trạng thái mới", "return"],
    ],
    notes: [
      [7, 2, 5, "Bao gồm khóa người dùng, duyệt khóa học, quản lý bài kiểm tra, cấu hình luyện nói và đăng ký giảng viên"],
    ],
  },
  {
    name: "17 - Hồ sơ, thông báo và kiểm tra hệ thống",
    participants: [
      ["user", "Người dùng / Monitor", "actor"],
      ["ui", "App UI", "ui"],
      ["profile", "Profile API", "api"],
      ["notify", "Notifications API", "api"],
      ["health", "Health API", "api"],
      ["db", "PostgreSQL", "db"],
    ],
    messages: [
      ["user", "ui", "Cập nhật hồ sơ / ngôn ngữ học"],
      ["ui", "profile", "PATCH /api/profile"],
      ["profile", "db", "Cập nhật User + LearningLanguage"],
      ["profile", "ui", "Hồ sơ mới", "return"],
      ["user", "ui", "Đổi mật khẩu"],
      ["ui", "profile", "PATCH /api/profile/password"],
      ["profile", "db", "Xác minh; băm mật khẩu; tăng authVersion"],
      ["profile", "db", "Xóa phiên (Session) cũ"],
      ["ui", "notify", "GET/PATCH /api/notifications"],
      ["notify", "db", "Đọc hoặc đánh dấu đã đọc"],
      ["notify", "ui", "Danh sách thông báo", "return"],
      ["user", "health", "GET /api/health"],
      ["health", "db", "SELECT 1 / kiểm tra kết nối"],
      ["health", "user", "Trạng thái ứng dụng + cơ sở dữ liệu", "return"],
    ],
    notes: [
      [5, 2, 4, "Đổi mật khẩu thu hồi mã xác thực cũ bằng authVersion"],
    ],
  },
];

function participantStyle(type) {
  if (type === "actor") {
    return "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;align=center;fontSize=13;fontStyle=1;";
  }
  const palette =
    type === "db"
      ? COLORS.green
      : type === "external"
        ? COLORS.orange
        : type === "api"
          ? COLORS.blue
          : type === "service"
            ? COLORS.purple
            : COLORS.teal;
  const shape = type === "db" ? "shape=cylinder3;boundedLbl=1;backgroundOutline=1;" : "rounded=1;";
  return `${shape}whiteSpace=wrap;html=1;fillColor=${palette.fill};strokeColor=${palette.stroke};fontColor=${palette.text};fontSize=13;fontStyle=1;`;
}

const VI_SEQUENCE_LABELS = {
  "FINNCENTER — SEQUENCE DIAGRAM TOÀN DỰ ÁN":
    "FINNCENTER — SƠ ĐỒ TUẦN TỰ TOÀN DỰ ÁN",
  "Bản đồ các luồng nghiệp vụ end-to-end của FinnCenter. Mỗi ô tương ứng với một trang sequence diagram trong file.":
    "Bản đồ các luồng nghiệp vụ đầu cuối của FinnCenter. Mỗi ô tương ứng với một trang sơ đồ tuần tự trong tệp.",
  "04 - Học bài, video heartbeat và learning gate":
    "04 - Học bài, nhịp video và điều kiện mở khóa",
  "06 - Luyện Writing với AI": "06 - Luyện viết với AI",
  "07 - Luyện Speaking với AI": "07 - Luyện nói với AI",
  "11 - Admin duyệt hồ sơ giảng viên":
    "11 - Quản trị viên duyệt hồ sơ giảng viên",
  "16 - Quản trị hệ thống và analytics":
    "16 - Quản trị hệ thống và phân tích dữ liệu",
  "17 - Hồ sơ, thông báo và health check":
    "17 - Hồ sơ, thông báo và kiểm tra hệ thống",
  "Register UI": "Giao diện đăng ký",
  "Auth API": "API xác thực",
  PostgreSQL: "Cơ sở dữ liệu PostgreSQL",
  "SMTP / Email": "SMTP / Thư điện tử",
  "Auth UI": "Giao diện xác thực",
  "Rate limit / Auth": "Giới hạn tần suất / Xác thực",
  "Course UI": "Giao diện khóa học",
  "Course / Enroll API": "API khóa học / ghi danh",
  "Payment Callback": "Xử lý phản hồi thanh toán",
  "Learning UI": "Giao diện học tập",
  "Lesson API": "API bài học",
  "Learning Gate": "Điều kiện mở khóa học tập",
  "Video Player": "Trình phát video",
  "Test UI": "Giao diện bài kiểm tra",
  "Student Test API": "API bài kiểm tra học viên",
  "Rules / Attempt Token": "Quy tắc / Mã lượt làm bài",
  "AI Evaluation": "Dịch vụ chấm điểm AI",
  "Writing AI UI": "Giao diện luyện viết AI",
  "Essay / Prompt API": "API bài viết / đề bài",
  "AI Points": "Dịch vụ điểm AI",
  "Speaking AI UI": "Giao diện luyện nói AI",
  "MediaRecorder + Worker": "Trình ghi âm + luồng xử lý nền",
  "Speaking API": "API luyện nói",
  "Local Upload Storage": "Kho tệp tải lên cục bộ",
  "Student / Teacher": "Học viên / Giảng viên",
  "AI Points UI": "Giao diện điểm AI",
  "Points Buy API": "API mua điểm AI",
  "Points Callback": "Xử lý phản hồi mua điểm",
  "Wallet UI": "Giao diện ví",
  "Wallet API": "API ví",
  "Wallet Callback": "Xử lý phản hồi nạp ví",
  "Teacher Registration UI": "Giao diện đăng ký giảng viên",
  "Teacher Application API": "API hồ sơ giảng viên",
  "Sequential Exam Service": "Dịch vụ thi tuần tự",
  "Recorder / Worker": "Trình ghi âm / Luồng xử lý nền",
  "AI Grading": "Dịch vụ chấm điểm AI",
  Admin: "Quản trị viên",
  "Admin UI": "Giao diện quản trị",
  "Admin Teacher API": "API quản trị giảng viên",
  "Notification Service": "Dịch vụ thông báo",
  "Teacher UI": "Giao diện giảng viên",
  "Teacher Course/Test API": "API khóa học / bài kiểm tra",
  "Readiness / Approval": "Kiểm tra sẵn sàng / Phê duyệt",
  "Admin Approval": "Phê duyệt của quản trị viên",
  "Refund / Report API": "API hoàn tiền / báo cáo",
  "Notification / Email": "Thông báo / Thư điện tử",
  "Revenue UI": "Giao diện doanh thu",
  "Withdrawal API": "API rút doanh thu",
  "Bank Account / OTP": "Tài khoản ngân hàng / OTP",
  Notification: "Dịch vụ thông báo",
  "Result UI": "Giao diện kết quả",
  "Result / Review API": "API kết quả / đánh giá",
  "Progress Service": "Dịch vụ tiến độ học tập",
  "SMTP / Certificate": "SMTP / Chứng nhận",
  "Admin Dashboard": "Bảng điều khiển quản trị",
  "Admin APIs": "Các API quản trị",
  "Analytics Service": "Dịch vụ phân tích dữ liệu",
  "Notification / SMTP": "Thông báo / SMTP",
  "Người dùng / Monitor": "Người dùng / Hệ thống giám sát",
  "App UI": "Giao diện ứng dụng",
  "Profile API": "API hồ sơ",
  "Notifications API": "API thông báo",
  "Health API": "API kiểm tra hệ thống",
};

const VI_SEQUENCE_REPLACEMENTS = [
  ["ALT:", "TRƯỜNG HỢP:"],
  ["Create/Update", "Tạo/cập nhật"],
  ["Create", "Tạo"],
  ["Update", "Cập nhật"],
  ["Transaction:", "Giao dịch cơ sở dữ liệu:"],
  ["Transaction ", "Giao dịch cơ sở dữ liệu "],
  ["Verify ", "Xác minh "],
  ["Claim ", "Giành quyền xử lý "],
  ["callback", "phản hồi"],
  ["Idempotent", "Chống xử lý lặp"],
  ["score-only", "chỉ chấm điểm"],
  ["Score-only", "Chỉ chấm điểm"],
  ["fallback", "phương án dự phòng"],
  ["status", "trạng thái"],
  ["split doanh thu", "phần chia doanh thu"],
  ["Question instance", "Bản câu hỏi"],
  ["Readiness:", "Mức độ sẵn sàng:"],
  ["learning state", "dữ liệu học tập"],
  ["course gate", "điều kiện hoàn thành khóa học"],
  ["Dashboard datasets", "Tập dữ liệu bảng điều khiển"],
  ["Render analytics", "Hiển thị dữ liệu phân tích"],
  ["App + DB status", "Trạng thái ứng dụng + cơ sở dữ liệu"],
];

function vietnameseSequenceText(value) {
  const direct = VI_SEQUENCE_LABELS[value];
  if (direct) return direct;
  let localized = String(value);
  for (const [source, target] of VI_SEQUENCE_REPLACEMENTS) {
    localized = localized.replaceAll(source, target);
  }
  return localized;
}

function renderSequenceIndex(flow) {
  const cells = [];
  cells.push(
    vertex({
      id: "seq-index-title",
      value: `<b>${vietnameseSequenceText("FINNCENTER — SEQUENCE DIAGRAM TOÀN DỰ ÁN")}</b>`,
      x: 40,
      y: 30,
      width: 1640,
      height: 50,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#1e3a8a;strokeColor=#1e3a8a;fontColor=#ffffff;fontSize=22;fontStyle=1;",
    }),
  );
  cells.push(
    vertex({
      id: "seq-index-desc",
      value: vietnameseSequenceText(flow.description),
      x: 120,
      y: 95,
      width: 1480,
      height: 45,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#93c5fd;fontColor=#1e3a8a;fontSize=13;",
    }),
  );
  const items = SEQUENCE_FLOWS.filter((item) => !item.index);
  items.forEach((item, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const number = String(index + 1).padStart(2, "0");
    cells.push(
      vertex({
        id: `seq-index-${number}`,
        value: `<b>${vietnameseSequenceText(item.name)}</b><br/><font color="#64748b">Trang ${index + 2} trong tệp</font>`,
        x: 90 + column * 540,
        y: 180 + row * 115,
        width: 480,
        height: 76,
        style:
          "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#94a3b8;fontColor=#0f172a;fontSize=14;shadow=1;spacing=10;",
      }),
    );
  });
  return graphPage(flow.name, "seq-index", cells, 1760, 1050);
}

function renderSequenceFlow(flow, flowIndex) {
  const cells = [];
  const localizedFlowName = vietnameseSequenceText(flow.name);
  const participantGap = Math.max(185, Math.floor(1560 / flow.participants.length));
  const startX = 70;
  const headerY = 95;
  const lineStartY = 165;
  const messageStartY = 205;
  const messageGap = 46;
  const noteByMessage = new Map();
  for (const [messageIndex, fromIndex, toIndex, text] of flow.notes || []) {
    const entries = noteByMessage.get(messageIndex) || [];
    entries.push({ fromIndex, toIndex, text });
    noteByMessage.set(messageIndex, entries);
  }
  let extraNotes = 0;
  for (const notes of noteByMessage.values()) extraNotes += notes.length;
  const bottomY = messageStartY + flow.messages.length * messageGap + extraNotes * 62 + 100;

  cells.push(
    vertex({
      id: `seq-${flowIndex}-title`,
      value: `<b>${localizedFlowName}</b>`,
      x: 40,
      y: 25,
      width: Math.max(1640, startX + participantGap * flow.participants.length),
      height: 46,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#1e3a8a;strokeColor=#1e3a8a;fontColor=#ffffff;fontSize=20;fontStyle=1;",
    }),
  );

  const participantPositions = new Map();
  flow.participants.forEach(([id, name, type], index) => {
    const centerX = startX + index * participantGap + participantGap / 2;
    const width = type === "actor" ? 70 : 150;
    const height = type === "actor" ? 70 : 54;
    const headerId = `seq-${flowIndex}-participant-${id}`;
    participantPositions.set(id, { centerX, headerId });
    cells.push(
      vertex({
        id: headerId,
        value: vietnameseSequenceText(name),
        x: centerX - width / 2,
        y: headerY,
        width,
        height,
        style: participantStyle(type),
      }),
    );
    const topPointId = `seq-${flowIndex}-life-${id}-top`;
    const bottomPointId = `seq-${flowIndex}-life-${id}-bottom`;
    cells.push(
      vertex({
        id: topPointId,
        value: "",
        x: centerX,
        y: lineStartY,
        width: 1,
        height: 1,
        style: "opacity=0;fillOpacity=0;strokeOpacity=0;",
      }),
      vertex({
        id: bottomPointId,
        value: "",
        x: centerX,
        y: bottomY,
        width: 1,
        height: 1,
        style: "opacity=0;fillOpacity=0;strokeOpacity=0;",
      }),
      edge({
        id: `seq-${flowIndex}-lifeline-${id}`,
        source: topPointId,
        target: bottomPointId,
        style:
          "endArrow=none;dashed=1;dashPattern=6 6;strokeColor=#94a3b8;strokeWidth=1;html=1;",
      }),
    );
  });

  let currentY = messageStartY;
  flow.messages.forEach(([from, to, label, kind], messageIndex) => {
    const fromPosition = participantPositions.get(from);
    const toPosition = participantPositions.get(to);
    if (!fromPosition || !toPosition) {
      throw new Error(`Unknown participant in ${flow.name}: ${from} -> ${to}`);
    }

    if (kind === "self" || from === to) {
      cells.push(
        vertex({
          id: `seq-${flowIndex}-self-${messageIndex}`,
          value: `<b>${messageIndex + 1}.</b> ${vietnameseSequenceText(label)}`,
          x: fromPosition.centerX + 12,
          y: currentY - 15,
          width: Math.min(310, participantGap + 100),
          height: 34,
          style:
            "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;fontColor=#334155;fontSize=12;align=left;spacingLeft=8;",
        }),
      );
    } else {
      const sourceId = `seq-${flowIndex}-message-${messageIndex}-source`;
      const targetId = `seq-${flowIndex}-message-${messageIndex}-target`;
      cells.push(
        vertex({
          id: sourceId,
          value: "",
          x: fromPosition.centerX,
          y: currentY,
          width: 1,
          height: 1,
          style: "opacity=0;fillOpacity=0;strokeOpacity=0;",
        }),
        vertex({
          id: targetId,
          value: "",
          x: toPosition.centerX,
          y: currentY,
          width: 1,
          height: 1,
          style: "opacity=0;fillOpacity=0;strokeOpacity=0;",
        }),
        edge({
          id: `seq-${flowIndex}-message-${messageIndex}`,
          value: `<b>${messageIndex + 1}.</b> ${vietnameseSequenceText(label)}`,
          source: sourceId,
          target: targetId,
          style:
            kind === "return"
              ? "endArrow=open;endFill=0;dashed=1;dashPattern=4 4;strokeColor=#475569;fontColor=#334155;fontSize=12;html=1;labelBackgroundColor=#ffffff;"
              : "endArrow=block;endFill=1;strokeColor=#2563eb;fontColor=#1e3a8a;fontSize=12;html=1;labelBackgroundColor=#ffffff;",
        }),
      );
    }
    currentY += messageGap;

    for (const note of noteByMessage.get(messageIndex + 1) || []) {
      const leftParticipant = flow.participants[Math.max(0, note.fromIndex - 1)]?.[0];
      const rightParticipant = flow.participants[Math.max(0, note.toIndex - 1)]?.[0];
      const leftX = participantPositions.get(leftParticipant)?.centerX ?? startX;
      const rightX = participantPositions.get(rightParticipant)?.centerX ?? leftX + 500;
      cells.push(
        vertex({
          id: `seq-${flowIndex}-note-${messageIndex}-${currentY}`,
          value: vietnameseSequenceText(note.text),
          x: Math.min(leftX, rightX) - 50,
          y: currentY - 12,
          width: Math.abs(rightX - leftX) + 100,
          height: 44,
          style:
            "shape=note;whiteSpace=wrap;html=1;fillColor=#fff7d6;strokeColor=#d6b656;fontColor=#604c00;fontSize=11;spacing=8;",
        }),
      );
      currentY += 62;
    }
  });

  return graphPage(
    localizedFlowName,
    `seq-${String(flowIndex).padStart(2, "0")}-${stableId(localizedFlowName)}`,
    cells,
    Math.max(1760, startX + participantGap * flow.participants.length + 60),
    Math.max(900, bottomY + 50),
  );
}

function generateSequenceFile() {
  return mxFile(
    SEQUENCE_FLOWS.map((flow, index) =>
      flow.index ? renderSequenceIndex(flow) : renderSequenceFlow(flow, index),
    ),
  );
}

function parsePrismaSchema(schema) {
  const enums = new Map();
  for (const match of schema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const values = match[2]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//"))
      .map((line) => line.split(/\s+/)[0]);
    enums.set(match[1], values);
  }

  const rawModels = [];
  for (const match of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    rawModels.push({ name: match[1], body: match[2] });
  }
  const modelNames = new Set(rawModels.map((model) => model.name));

  const models = rawModels.map((rawModel) => {
    const fields = [];
    const relations = [];
    const indexes = [];
    const lines = rawModel.body.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("@@")) {
        indexes.push(line);
        continue;
      }
      const tokens = line.split(/\s+/);
      if (tokens.length < 2) continue;
      const name = tokens[0];
      const rawType = tokens[1];
      const baseType = rawType.replace(/[?[\]]/g, "");
      const attributes = line.slice(line.indexOf(rawType) + rawType.length).trim();

      if (modelNames.has(baseType)) {
        const fieldMatch = attributes.match(/fields:\s*\[([^\]]+)\]/);
        const referenceMatch = attributes.match(/references:\s*\[([^\]]+)\]/);
        if (fieldMatch) {
          const sourceFields = fieldMatch[1].split(",").map((item) => item.trim());
          const targetFields = referenceMatch
            ? referenceMatch[1].split(",").map((item) => item.trim())
            : ["id"];
          relations.push({
            fieldName: name,
            targetModel: baseType,
            sourceFields,
            targetFields,
            optional: rawType.endsWith("?"),
            onDelete: attributes.match(/onDelete:\s*(\w+)/)?.[1] || "",
          });
        }
        continue;
      }

      fields.push({
        name,
        type: rawType,
        baseType,
        isEnum: enums.has(baseType),
        isPrimary: /(^|\s)@id(\s|$)/.test(attributes),
        isUnique: /(^|\s)@unique(\s|$)/.test(attributes),
        defaultValue: attributes.match(/@default\(([^)]*(?:\)[^)]*)?)\)/)?.[1] || "",
        attributes,
      });
    }

    const foreignKeys = new Map();
    for (const relation of relations) {
      relation.sourceFields.forEach((fieldName, index) => {
        foreignKeys.set(fieldName, {
          model: relation.targetModel,
          field: relation.targetFields[index] || relation.targetFields[0] || "id",
          optional: relation.optional,
          onDelete: relation.onDelete,
        });
      });
    }
    fields.forEach((field) => {
      field.foreignKey = foreignKeys.get(field.name) || null;
    });

    return {
      name: rawModel.name,
      fields,
      relations,
      indexes,
    };
  });

  return { models, enums };
}

const VI_MODEL_LABELS = {
  User: "Người dùng",
  Session: "Phiên đăng nhập",
  PasswordResetOtp: "Mã OTP đặt lại mật khẩu",
  EmailVerificationOtp: "Mã OTP xác thực thư điện tử",
  RegistrationSecurityEvent: "Sự kiện bảo mật đăng ký",
  Course: "Khóa học",
  Module: "Chương học",
  Lesson: "Bài học",
  VideoWatchProgress: "Tiến độ xem video",
  Enrollment: "Ghi danh khóa học",
  Test: "Bài kiểm tra",
  Question: "Câu hỏi",
  Answer: "Đáp án",
  TestAttempt: "Lượt làm bài kiểm tra",
  AiAssessment: "Kết quả đánh giá AI",
  PointTransaction: "Giao dịch điểm AI",
  LearningActivity: "Hoạt động học tập",
  CheatingLog: "Nhật ký gian lận",
  LearningLanguage: "Ngôn ngữ học tập",
  SystemSetting: "Cấu hình hệ thống",
  TeacherApplication: "Hồ sơ đăng ký giảng viên",
  TeacherEntranceQuestionInstance: "Câu hỏi thi đầu vào giảng viên",
  TeacherCertificate: "Chứng chỉ giảng viên",
  TeacherApplicationLog: "Nhật ký hồ sơ giảng viên",
  AntiCheatLog: "Nhật ký chống gian lận",
  SuspiciousEvent: "Sự kiện đáng ngờ",
  Notification: "Thông báo",
  EmailLog: "Nhật ký thư điện tử",
  Feedback: "Phản hồi khóa học và tiến độ",
  Order: "Đơn hàng",
  OrderItem: "Chi tiết đơn hàng",
  CourseRefundRequest: "Yêu cầu hoàn tiền khóa học",
  CourseReport: "Báo cáo nội dung khóa học",
  TeacherBankAccount: "Tài khoản ngân hàng giảng viên",
  TeacherBankAccountChangeOtp: "OTP đổi tài khoản ngân hàng",
  TeacherBankAccountChangeLog: "Nhật ký đổi tài khoản ngân hàng",
  TeacherRevenueWithdrawal: "Yêu cầu rút doanh thu giảng viên",
  TeacherRevenueWithdrawalComplaint: "Khiếu nại rút doanh thu",
  Wallet: "Ví tiền",
  Payment: "Thanh toán",
};

const VI_FIELD_LABELS = {
  id: "Mã định danh",
  key: "Khóa cấu hình",
  value: "Giá trị",
  username: "Tên hiển thị",
  email: "Địa chỉ thư điện tử",
  password: "Mật khẩu đã băm",
  role: "Vai trò",
  phoneNumber: "Số điện thoại",
  isBanned: "Đang bị khóa",
  accountStatus: "Trạng thái tài khoản",
  emailVerifiedAt: "Thời điểm xác thực thư điện tử",
  authVersion: "Phiên bản xác thực",
  learningLanguageId: "Mã ngôn ngữ học",
  tokenHash: "Mã băm của token",
  codeHash: "Mã băm OTP",
  expiresAt: "Thời điểm hết hạn",
  consumedAt: "Thời điểm đã sử dụng",
  attempts: "Số lần thử",
  resendAvailableAt: "Thời điểm được gửi lại",
  requestIp: "Địa chỉ IP yêu cầu",
  deviceFingerprint: "Dấu vân tay thiết bị",
  eventType: "Loại sự kiện",
  detail: "Chi tiết",
  name: "Tên",
  description: "Mô tả",
  thumbnail: "Ảnh đại diện",
  category: "Danh mục",
  level: "Trình độ",
  duration: "Thời lượng",
  lessons: "Số bài học",
  status: "Trạng thái",
  deleteRequestedFromStatus: "Trạng thái trước khi yêu cầu xóa",
  price: "Giá",
  languageId: "Mã ngôn ngữ",
  instructorId: "Mã giảng viên",
  courseId: "Mã khóa học",
  order: "Thứ tự",
  moduleId: "Mã chương học",
  title: "Tiêu đề",
  content: "Nội dung",
  videoUrl: "Đường dẫn video",
  userId: "Mã người dùng",
  lessonId: "Mã bài học",
  lastPositionSeconds: "Vị trí xem gần nhất (giây)",
  durationSeconds: "Thời lượng (giây)",
  lastHeartbeatAt: "Thời điểm nhịp tim gần nhất",
  startedAt: "Thời điểm bắt đầu",
  completedAt: "Thời điểm hoàn thành",
  seekViolation: "Vi phạm tua video",
  accessStatus: "Trạng thái quyền truy cập",
  kind: "Loại bài kiểm tra",
  assessmentMode: "Chế độ đánh giá",
  maxScore: "Điểm tối đa",
  passingScore: "Điểm đạt",
  maxAttempts: "Số lượt làm tối đa",
  timeLimit: "Giới hạn thời gian",
  shuffleQuestions: "Trộn câu hỏi",
  materialTitle: "Tiêu đề tài liệu",
  materialContent: "Nội dung tài liệu",
  materialUrl: "Đường dẫn tài liệu",
  materialType: "Loại tài liệu",
  materialData: "Dữ liệu tài liệu",
  testId: "Mã bài kiểm tra",
  type: "Loại",
  audioUrl: "Đường dẫn âm thanh",
  score: "Điểm",
  explanation: "Giải thích",
  hint: "Gợi ý",
  preparationTimeSeconds: "Thời gian chuẩn bị (giây)",
  answerTimeSeconds: "Thời gian trả lời (giây)",
  questionId: "Mã câu hỏi",
  isCorrect: "Là đáp án đúng",
  feedback: "Phản hồi",
  attemptNo: "Số thứ tự lượt làm",
  answers: "Các câu trả lời",
  results: "Kết quả chi tiết",
  submittedAt: "Thời điểm nộp",
  isPassed: "Đã đạt",
  taskType: "Loại nhiệm vụ",
  prompt: "Đề bài",
  submissionText: "Nội dung bài nộp",
  bandSystem: "Hệ thống thang điểm",
  bandLevel: "Cấp độ theo thang điểm",
  bandScore: "Điểm theo thang",
  criteria: "Các tiêu chí",
  mistakes: "Các lỗi",
  improvements: "Hướng cải thiện",
  sampleAnswer: "Bài mẫu",
  amount: "Số lượng / số tiền",
  balanceAfter: "Số dư sau giao dịch",
  sourceKey: "Khóa nguồn chống trùng",
  metadata: "Siêu dữ liệu",
  activityType: "Loại hoạt động",
  activityDate: "Ngày hoạt động",
  attemptId: "Mã lượt làm bài",
  severity: "Mức độ nghiêm trọng",
  code: "Mã ngôn ngữ",
  isActive: "Đang hoạt động",
  entranceTestId: "Mã bài thi đầu vào",
  entranceAttemptId: "Mã lượt thi đầu vào",
  answerState: "Trạng thái câu trả lời",
  reviewedAt: "Thời điểm xét duyệt",
  reviewedById: "Mã người xét duyệt",
  rejectionReason: "Lý do từ chối",
  violationCount: "Số lần vi phạm",
  failureReason: "Lý do thất bại",
  antiCheatAcknowledgedAt: "Thời điểm xác nhận chống gian lận",
  proctorSessionId: "Mã phiên giám sát",
  proctorHeartbeatAt: "Thời điểm nhịp giám sát",
  proctorHeartbeatSequence: "Số thứ tự nhịp giám sát",
  questionRevealState: "Trạng thái mở câu hỏi",
  currentQuestionInstanceId: "Mã câu hỏi hiện tại",
  sequentialCompletedAt: "Thời điểm hoàn tất tuần tự",
  entrancePassingScore: "Điểm đạt đầu vào",
  entranceMaxScore: "Điểm tối đa đầu vào",
  entranceTimeLimit: "Giới hạn thời gian đầu vào",
  applicationId: "Mã hồ sơ",
  sourceQuestionId: "Mã câu hỏi nguồn",
  sequence: "Thứ tự câu hỏi",
  answerOptions: "Các lựa chọn trả lời",
  scoringData: "Dữ liệu chấm điểm",
  revealedAt: "Thời điểm mở câu hỏi",
  answerStartsAt: "Thời điểm bắt đầu trả lời",
  deadlineAt: "Hạn trả lời",
  answerRevision: "Phiên bản câu trả lời",
  finalAnswer: "Câu trả lời cuối",
  finalizedAt: "Thời điểm chốt câu trả lời",
  transitionTokenHash: "Mã băm token chuyển câu",
  transitionTokenExpiresAt: "Hạn token chuyển câu",
  speakingAudioUrl: "Đường dẫn âm thanh bài nói",
  speakingAudioHash: "Mã băm âm thanh bài nói",
  speakingAudioMime: "Định dạng MIME âm thanh",
  speakingAudioBytes: "Kích thước âm thanh (byte)",
  speakingMediaStatus: "Trạng thái tệp bài nói",
  speakingTranscript: "Bản chép lời bài nói",
  speakingProcessingTokenHash: "Mã băm token xử lý bài nói",
  speakingProcessingTokenExpiresAt: "Hạn token xử lý bài nói",
  speakingProcessingError: "Lỗi xử lý bài nói",
  speakingProcessingAttempts: "Số lần xử lý bài nói",
  contentHash: "Mã băm nội dung",
  fileName: "Tên tệp",
  fileUrl: "Đường dẫn tệp",
  fileType: "Loại tệp",
  fileSize: "Kích thước tệp",
  expiryDate: "Ngày hết hạn",
  message: "Nội dung thông báo",
  actorId: "Mã người thực hiện",
  testAttemptId: "Mã lượt làm bài",
  confidence: "Độ tin cậy",
  counted: "Đã tính vi phạm",
  clientTimestamp: "Thời điểm phía máy khách",
  serverTimestamp: "Thời điểm phía máy chủ",
  incidentId: "Mã sự cố",
  count: "Số lượng",
  totalDurationSeconds: "Tổng thời lượng (giây)",
  body: "Nội dung",
  readAt: "Thời điểm đã đọc",
  to: "Địa chỉ nhận",
  subject: "Tiêu đề thư",
  error: "Lỗi",
  sentAt: "Thời điểm gửi",
  orderId: "Mã đơn hàng",
  orderItemId: "Mã chi tiết đơn hàng",
  adminRevenue: "Doanh thu quản trị viên",
  teacherRevenue: "Doanh thu giảng viên",
  revenueSplit: "Tỷ lệ chia doanh thu",
  studentId: "Mã học viên",
  reason: "Lý do",
  adminNote: "Ghi chú quản trị viên",
  processedAt: "Thời điểm xử lý",
  refundMethod: "Phương thức hoàn tiền",
  reporterId: "Mã người báo cáo",
  truthfulConfirmed: "Đã xác nhận báo cáo trung thực",
  response: "Phản hồi xử lý",
  respondedById: "Mã người phản hồi",
  teacherId: "Mã giảng viên",
  bankName: "Tên ngân hàng",
  accountNumber: "Số tài khoản",
  accountName: "Tên chủ tài khoản",
  branch: "Chi nhánh",
  verificationStatus: "Trạng thái xác minh",
  payload: "Dữ liệu yêu cầu",
  previousBankName: "Tên ngân hàng trước",
  previousAccountNumberMasked: "Số tài khoản trước đã che",
  previousAccountName: "Tên chủ tài khoản trước",
  previousBranch: "Chi nhánh trước",
  nextBankName: "Tên ngân hàng mới",
  nextAccountNumberMasked: "Số tài khoản mới đã che",
  nextAccountName: "Tên chủ tài khoản mới",
  nextBranch: "Chi nhánh mới",
  bankBranch: "Chi nhánh ngân hàng",
  bankVerificationStatus: "Trạng thái xác minh ngân hàng",
  note: "Ghi chú",
  transferTransactionCode: "Mã giao dịch chuyển khoản",
  processedById: "Mã người xử lý",
  withdrawalId: "Mã yêu cầu rút tiền",
  reportedAmount: "Số tiền được báo cáo",
  evidenceImageUrl: "Đường dẫn ảnh bằng chứng",
  evidenceImageName: "Tên ảnh bằng chứng",
  resolvedAt: "Thời điểm giải quyết",
  balance: "Số dư ví",
  purpose: "Mục đích thanh toán",
  pointAmount: "Số điểm AI",
  provider: "Nhà cung cấp thanh toán",
  txnRef: "Mã tham chiếu giao dịch",
  orderInfo: "Thông tin đơn hàng",
  bankCode: "Mã ngân hàng",
  transactionNo: "Số giao dịch",
  responseCode: "Mã phản hồi",
  transactionStatus: "Trạng thái giao dịch",
  payDate: "Ngày thanh toán",
  rawResponse: "Phản hồi gốc",
  createdAt: "Thời điểm tạo",
  updatedAt: "Thời điểm cập nhật",
};

const VI_ENUM_LABELS = {
  Role: "Vai trò người dùng",
  UserAccountStatus: "Trạng thái tài khoản",
  CourseStatus: "Trạng thái khóa học",
  EnrollmentAccessStatus: "Trạng thái quyền ghi danh",
  TestKind: "Loại bài kiểm tra",
  TestAssessmentMode: "Chế độ đánh giá bài kiểm tra",
  QuestionType: "Loại câu hỏi",
  TeacherQuestionInstanceStatus: "Trạng thái câu hỏi thi đầu vào",
  TeacherSpeakingMediaStatus: "Trạng thái tệp bài nói",
  TeacherApplicationStatus: "Trạng thái hồ sơ giảng viên",
  CourseRefundRequestStatus: "Trạng thái yêu cầu hoàn tiền",
  CourseReportCategory: "Danh mục báo cáo khóa học",
  CourseReportStatus: "Trạng thái báo cáo khóa học",
  TeacherRevenueWithdrawalStatus: "Trạng thái rút doanh thu",
  TeacherBankAccountVerificationStatus: "Trạng thái xác minh tài khoản ngân hàng",
  TeacherRevenueWithdrawalComplaintReason: "Lý do khiếu nại rút doanh thu",
  TeacherRevenueWithdrawalComplaintStatus: "Trạng thái khiếu nại rút doanh thu",
};

const VI_ENUM_VALUE_LABELS = {
  STUDENT: "Học viên",
  TEACHER: "Giảng viên",
  ADMIN: "Quản trị viên",
  PENDING_VERIFICATION: "Chờ xác thực",
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  PENDING_APPROVAL: "Chờ phê duyệt",
  PENDING_DELETE: "Chờ xóa",
  REJECTED: "Đã từ chối",
  REFUND_PENDING: "Đang chờ hoàn tiền",
  COURSE: "Bài kiểm tra khóa học",
  PUBLIC_PRACTICE: "Bài luyện tập công khai",
  TEACHER_ENTRANCE: "Bài thi đầu vào giảng viên",
  STANDARD: "Chấm điểm tiêu chuẩn",
  WRITING: "Kỹ năng viết",
  SPEAKING: "Kỹ năng nói",
  MULTIPLE_CHOICE: "Trắc nghiệm",
  FILL_IN_BLANK: "Điền vào chỗ trống",
  ESSAY: "Tự luận",
  TRUE_FALSE: "Đúng / sai",
  REVEALED: "Đã mở",
  ANSWERING: "Đang trả lời",
  FINALIZING: "Đang chốt",
  FINALIZED: "Đã chốt",
  SKIPPED: "Đã bỏ qua",
  EXPIRED: "Đã hết hạn",
  NONE: "Chưa có",
  UPLOADED: "Đã tải lên",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
  FAILED: "Thất bại",
  DRAFT: "Bản nháp",
  SUBMITTED: "Đã nộp",
  UNDER_REVIEW: "Đang xét duyệt",
  APPROVED: "Đã phê duyệt",
  FAILED_CHEATING: "Thất bại do gian lận",
  PENDING: "Đang chờ",
  INACCURATE_CONTENT: "Nội dung không chính xác",
  BROKEN_RESOURCE: "Tài nguyên bị lỗi",
  ACCESS_PROBLEM: "Lỗi truy cập",
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  QUALITY_MISMATCH: "Chất lượng không đúng mô tả",
  INSTRUCTOR_PROBLEM: "Vấn đề với giảng viên",
  OTHER: "Khác",
  IN_REVIEW: "Đang xem xét",
  RESOLVED: "Đã giải quyết",
  PAID: "Đã thanh toán",
  COMPLETED: "Đã hoàn tất",
  UNVERIFIED: "Chưa xác minh",
  VERIFIED: "Đã xác minh",
  NOT_RECEIVED: "Chưa nhận được tiền",
  WRONG_AMOUNT: "Sai số tiền",
  OPEN: "Đang mở",
};

const ERD_DOMAINS = [
  {
    id: "auth",
    name: "Tài khoản, bảo mật và ngôn ngữ",
    color: "blue",
    models: [
      "User",
      "Session",
      "PasswordResetOtp",
      "EmailVerificationOtp",
      "RegistrationSecurityEvent",
      "LearningLanguage",
    ],
  },
  {
    id: "learning",
    name: "Khóa học và tiến độ học tập",
    color: "green",
    models: [
      "Course",
      "Module",
      "Lesson",
      "VideoWatchProgress",
      "Enrollment",
      "Feedback",
      "LearningActivity",
    ],
  },
  {
    id: "tests-ai",
    name: "Bài kiểm tra, AI và điểm AI",
    color: "purple",
    models: [
      "Test",
      "Question",
      "Answer",
      "TestAttempt",
      "CheatingLog",
      "AiAssessment",
      "PointTransaction",
      "SystemSetting",
    ],
  },
  {
    id: "teacher",
    name: "Đăng ký giảng viên và chống gian lận",
    color: "orange",
    models: [
      "TeacherApplication",
      "TeacherEntranceQuestionInstance",
      "TeacherCertificate",
      "TeacherApplicationLog",
      "AntiCheatLog",
      "SuspiciousEvent",
    ],
  },
  {
    id: "commerce",
    name: "Thanh toán, hoàn tiền và doanh thu",
    color: "red",
    models: [
      "Wallet",
      "Payment",
      "Order",
      "OrderItem",
      "CourseRefundRequest",
      "CourseReport",
      "TeacherBankAccount",
      "TeacherBankAccountChangeOtp",
      "TeacherBankAccountChangeLog",
      "TeacherRevenueWithdrawal",
      "TeacherRevenueWithdrawalComplaint",
    ],
  },
  {
    id: "communication",
    name: "Thông báo và thư điện tử",
    color: "teal",
    models: ["Notification", "EmailLog"],
  },
];

function domainForModel(modelName) {
  return ERD_DOMAINS.find((domain) => domain.models.includes(modelName));
}

function tableLabel(model) {
  const modelLabel = VI_MODEL_LABELS[model.name] || model.name;
  const lines = [`<b>${model.name} — ${modelLabel}</b>`, "──────────────"];
  for (const field of model.fields) {
    const markers = [];
    if (field.isPrimary) markers.push("PK");
    if (field.foreignKey) markers.push("FK");
    if (field.isUnique) markers.push("UQ");
    const markerText = markers.length ? `<b>[${markers.join(",")}]</b> ` : "";
    const enumText = field.isEnum ? " «kiểu liệt kê»" : "";
    const foreignText = field.foreignKey
      ? ` → ${field.foreignKey.model}.${field.foreignKey.field}`
      : "";
    const defaultText = field.defaultValue ? ` = ${field.defaultValue}` : "";
    const updatedText = field.attributes.includes("@updatedAt")
      ? " · tự động cập nhật"
      : "";
    const fieldLabel = VI_FIELD_LABELS[field.name] || "Trường dữ liệu";
    lines.push(
      `${markerText}${field.name}: ${field.type}${enumText}${foreignText}${defaultText}${updatedText}<br/><font color="#64748b">↳ ${fieldLabel}</font>`,
    );
  }
  if (model.indexes.length) {
    lines.push("──────────────");
    for (const index of model.indexes) {
      const label = index.startsWith("@@unique")
        ? "Ràng buộc duy nhất"
        : index.startsWith("@@index")
          ? "Chỉ mục"
          : "Ràng buộc";
      lines.push(`${index} · ${label}`);
    }
  }
  return lines.join("<br/>");
}

function tableHeight(model) {
  return Math.max(110, 42 + model.fields.length * 34 + model.indexes.length * 18 + 24);
}

function renderDetailedErdPage(domain, modelMap, pageIndex) {
  const models = domain.models.map((name) => modelMap.get(name)).filter(Boolean);
  const cells = [];
  const palette = COLORS[domain.color];
  const pageWidth = 1780;
  const columns = models.length >= 9 ? 3 : models.length >= 5 ? 3 : 2;
  const cardWidth = columns === 2 ? 700 : 515;
  const gapX = 45;
  const startX = 60;
  const startY = 120;
  const columnHeights = Array(columns).fill(startY);
  const positions = new Map();

  cells.push(
    vertex({
      id: `erd-${domain.id}-title`,
      value: `<b>SƠ ĐỒ QUAN HỆ — ${domain.name}</b>`,
      x: 40,
      y: 25,
      width: 1680,
      height: 50,
      style: `rounded=1;whiteSpace=wrap;html=1;fillColor=${palette.stroke};strokeColor=${palette.stroke};fontColor=#ffffff;fontSize=21;fontStyle=1;`,
    }),
    vertex({
      id: `erd-${domain.id}-legend`,
      value:
        "<b>Chú thích:</b> [PK] khóa chính · [FK] khóa ngoại · [UQ] giá trị duy nhất · nét đứt = quan hệ cho phép rỗng · các trường quan hệ ảo của Prisma không phải cột cơ sở dữ liệu nên không hiển thị.",
      x: 80,
      y: 82,
      width: 1600,
      height: 32,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#cbd5e1;fontColor=#475569;fontSize=11;",
    }),
  );

  models.forEach((model, index) => {
    const column = index % columns;
    const x = startX + column * (cardWidth + gapX);
    const y = columnHeights[column];
    const height = tableHeight(model);
    const id = `erd-${domain.id}-table-${model.name}`;
    positions.set(model.name, { id, x, y, width: cardWidth, height });
    cells.push(
      vertex({
        id,
        value: tableLabel(model),
        x,
        y,
        width: cardWidth,
        height,
        style: `rounded=0;whiteSpace=wrap;html=1;fillColor=${palette.fill};strokeColor=${palette.stroke};fontColor=${palette.text};fontSize=11;align=left;verticalAlign=top;spacing=8;shadow=1;`,
      }),
    );
    columnHeights[column] += height + 55;
  });

  let edgeIndex = 0;
  for (const model of models) {
    for (const relation of model.relations) {
      if (!positions.has(relation.targetModel)) continue;
      const sourcePosition = positions.get(model.name);
      const targetPosition = positions.get(relation.targetModel);
      const relationLabel = relation.sourceFields
        .map(
          (field, index) =>
            `${field} → ${relation.targetFields[index] || relation.targetFields[0] || "id"}`,
        )
        .join(", ");
      cells.push(
        edge({
          id: `erd-${domain.id}-relation-${edgeIndex++}`,
          value: relationLabel,
          source: sourcePosition.id,
          target: targetPosition.id,
          style: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=ERone;endFill=0;startArrow=${relation.optional ? "ERzeroToMany" : "ERmany"};startFill=0;dashed=${relation.optional ? "1" : "0"};strokeColor=${palette.stroke};fontColor=${palette.text};fontSize=10;labelBackgroundColor=#ffffff;`,
        }),
      );
    }
  }

  const maxHeight = Math.max(...columnHeights) + 40;
  const externalRelations = models.flatMap((model) =>
    model.relations
      .filter((relation) => !domain.models.includes(relation.targetModel))
      .map(
        (relation) =>
          `${model.name}.${relation.sourceFields.join("+")} → ${relation.targetModel}.${relation.targetFields.join("+")}`,
      ),
  );
  if (externalRelations.length) {
    cells.push(
      vertex({
      id: `erd-${domain.id}-external`,
        value: `<b>Quan hệ khóa ngoại sang miền nghiệp vụ khác</b><br/>${externalRelations.join("<br/>")}`,
        x: 80,
        y: maxHeight,
        width: 1600,
        height: 45 + externalRelations.length * 17,
        style:
          "shape=note;whiteSpace=wrap;html=1;fillColor=#fff7d6;strokeColor=#d6b656;fontColor=#604c00;fontSize=10;align=left;verticalAlign=top;spacing=8;",
      }),
    );
  }

  return graphPage(
    `${String(pageIndex).padStart(2, "0")} - ${domain.name}`,
    `erd-${domain.id}`,
    cells,
    pageWidth,
    Math.max(1100, maxHeight + 120 + externalRelations.length * 17),
  );
}

function renderErdOverview(models) {
  const cells = [];
  const modelPositions = new Map();
  const containerWidth = 820;
  const containerGap = 50;
  const containerX = [45, 45 + containerWidth + containerGap];
  const columnY = [120, 120];

  cells.push(
    vertex({
      id: "erd-overview-title",
      value:
        "<b>FINNCENTER — SƠ ĐỒ QUAN HỆ CƠ SỞ DỮ LIỆU TỔNG QUAN (40 BẢNG)</b>",
      x: 40,
      y: 25,
      width: 1690,
      height: 52,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#0f172a;fontColor=#ffffff;fontSize=22;fontStyle=1;",
    }),
    vertex({
      id: "erd-overview-note",
      value:
        "Mỗi màu là một miền nghiệp vụ. Các trang tiếp theo hiển thị đầy đủ cột, khóa chính, khóa ngoại, ràng buộc duy nhất và chỉ mục của từng bảng.",
      x: 170,
      y: 84,
      width: 1430,
      height: 30,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#cbd5e1;fontColor=#475569;fontSize=11;",
    }),
  );

  ERD_DOMAINS.forEach((domain, domainIndex) => {
    const column = domainIndex % 2;
    const x = containerX[column];
    const y = columnY[column];
    const palette = COLORS[domain.color];
    const rows = Math.ceil(domain.models.length / 4);
    const height = 75 + rows * 68;
    const containerId = `erd-overview-domain-${domain.id}`;
    cells.push(
      vertex({
        id: containerId,
        value: `<b>${domain.name}</b>`,
        x,
        y,
        width: containerWidth,
        height,
        style: `swimlane;horizontal=1;startSize=34;rounded=1;whiteSpace=wrap;html=1;fillColor=${palette.fill};swimlaneFillColor=#ffffff;strokeColor=${palette.stroke};fontColor=${palette.text};fontStyle=1;fontSize=13;`,
      }),
    );
    domain.models.forEach((modelName, index) => {
      const itemX = x + 18 + (index % 4) * 198;
      const itemY = y + 45 + Math.floor(index / 4) * 68;
      const modelId = `erd-overview-model-${modelName}`;
      modelPositions.set(modelName, { id: modelId });
      const model = models.find((candidate) => candidate.name === modelName);
      const modelLabel = VI_MODEL_LABELS[modelName] || modelName;
      const keyFields = model
        ? model.fields
            .filter((field) => field.isPrimary || field.foreignKey)
            .slice(0, 2)
            .map((field) => field.name)
            .join(", ")
        : "";
      cells.push(
        vertex({
          id: modelId,
          value: `<b>${modelName}</b><br/>${modelLabel}${keyFields ? `<br/><font color="#64748b">${keyFields}</font>` : ""}`,
          x: itemX,
          y: itemY,
          width: 184,
          height: 48,
          style: `rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=${palette.stroke};fontColor=${palette.text};fontSize=11;shadow=1;`,
        }),
      );
    });
    columnY[column] += height + 38;
  });

  let relationIndex = 0;
  for (const model of models) {
    for (const relation of model.relations) {
      const source = modelPositions.get(model.name);
      const target = modelPositions.get(relation.targetModel);
      if (!source || !target) continue;
      cells.push(
        edge({
          id: `erd-overview-relation-${relationIndex++}`,
          source: source.id,
          target: target.id,
          style:
            "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=ERone;endFill=0;startArrow=ERmany;startFill=0;strokeColor=#64748b;strokeWidth=1;opacity=45;",
        }),
      );
    }
  }

  return graphPage(
    "00 - Tổng quan 40 bảng",
    "erd-overview",
    cells,
    1780,
    Math.max(...columnY) + 80,
  );
}

function renderEnumPage(enums) {
  const cells = [];
  cells.push(
    vertex({
      id: "erd-enum-title",
      value: "<b>DANH MỤC KIỂU LIỆT KÊ PRISMA</b>",
      x: 40,
      y: 25,
      width: 1680,
      height: 50,
      style:
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#334155;strokeColor=#334155;fontColor=#ffffff;fontSize=21;fontStyle=1;",
    }),
  );
  const entries = [...enums.entries()];
  const columns = 4;
  const width = 380;
  const columnHeights = Array(columns).fill(100);
  entries.forEach(([name, values], index) => {
    const column = index % columns;
    const height = 54 + values.length * 19;
    cells.push(
      vertex({
        id: `erd-enum-${name}`,
        value: `<b>«kiểu liệt kê» ${name}</b><br/>${VI_ENUM_LABELS[name] || "Kiểu liệt kê"}<br/>────────────<br/>${values
          .map(
            (value) =>
              `${value}<br/><font color="#64748b">↳ ${VI_ENUM_VALUE_LABELS[value] || "Giá trị hệ thống"}</font>`,
          )
          .join("<br/>")}`,
        x: 60 + column * 420,
        y: columnHeights[column],
        width,
        height: height + values.length * 17,
        style:
          "rounded=0;whiteSpace=wrap;html=1;fillColor=#f1f5f9;strokeColor=#64748b;fontColor=#1e293b;fontSize=12;align=left;verticalAlign=top;spacing=8;shadow=1;",
      }),
    );
    columnHeights[column] += height + values.length * 17 + 35;
  });
  return graphPage(
    "07 - Danh mục kiểu liệt kê",
    "erd-enums",
    cells,
    1780,
    Math.max(...columnHeights) + 50,
  );
}

function validateCoverage(parsed) {
  const assignedModels = new Set(ERD_DOMAINS.flatMap((domain) => domain.models));
  const schemaModels = new Set(parsed.models.map((model) => model.name));
  const missing = [...schemaModels].filter((name) => !assignedModels.has(name));
  const unknown = [...assignedModels].filter((name) => !schemaModels.has(name));
  if (missing.length || unknown.length) {
    throw new Error(
      `ERD domain coverage mismatch. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
    );
  }

  const untranslatedModels = parsed.models
    .map((model) => model.name)
    .filter((name) => !VI_MODEL_LABELS[name]);
  const untranslatedFields = [
    ...new Set(
      parsed.models.flatMap((model) =>
        model.fields
          .map((field) => field.name)
          .filter((name) => !VI_FIELD_LABELS[name]),
      ),
    ),
  ];
  const untranslatedEnums = [...parsed.enums.keys()].filter(
    (name) => !VI_ENUM_LABELS[name],
  );
  const untranslatedEnumValues = [
    ...new Set(
      [...parsed.enums.values()]
        .flat()
        .filter((value) => !VI_ENUM_VALUE_LABELS[value]),
    ),
  ];

  if (
    untranslatedModels.length ||
    untranslatedFields.length ||
    untranslatedEnums.length ||
    untranslatedEnumValues.length
  ) {
    throw new Error(
      [
        "Thiếu bản dịch tiếng Việt cho sơ đồ cơ sở dữ liệu.",
        `Bảng: ${untranslatedModels.join(", ") || "không có"}.`,
        `Cột: ${untranslatedFields.join(", ") || "không có"}.`,
        `Kiểu liệt kê: ${untranslatedEnums.join(", ") || "không có"}.`,
        `Giá trị kiểu liệt kê: ${untranslatedEnumValues.join(", ") || "không có"}.`,
      ].join(" "),
    );
  }
}

function generateDatabaseFile(parsed) {
  validateCoverage(parsed);
  const modelMap = new Map(parsed.models.map((model) => [model.name, model]));
  const pages = [renderErdOverview(parsed.models)];
  ERD_DOMAINS.forEach((domain, index) => {
    pages.push(renderDetailedErdPage(domain, modelMap, index + 1));
  });
  pages.push(renderEnumPage(parsed.enums));
  return mxFile(pages);
}

const schema = await readFile(schemaPath, "utf8");
const parsed = parsePrismaSchema(schema);
const sequenceFile = generateSequenceFile();
const databaseFile = generateDatabaseFile(parsed);

await mkdir(docsDir, { recursive: true });
await Promise.all([
  writeFile(sequenceOutput, sequenceFile, "utf8"),
  writeFile(databaseOutput, databaseFile, "utf8"),
]);

console.log(
  JSON.stringify(
    {
      sequenceOutput,
      sequencePages: SEQUENCE_FLOWS.length,
      databaseOutput,
      databasePages: ERD_DOMAINS.length + 2,
      databaseModels: parsed.models.length,
      databaseEnums: parsed.enums.size,
    },
    null,
    2,
  ),
);
