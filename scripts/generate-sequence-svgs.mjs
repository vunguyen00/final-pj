import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "sequence-diagrams");
mkdirSync(outDir, { recursive: true });

const palette = {
  bg: "#f8fafc",
  text: "#0f172a",
  muted: "#475569",
  line: "#334155",
  returnLine: "#64748b",
  groupFill: "#fef9c3",
  groupStroke: "#ca8a04",
};

const participantStyles = {
  actor: { fill: "#e0f2fe", stroke: "#0284c7" },
  ui: { fill: "#ecfdf5", stroke: "#059669" },
  api: { fill: "#eff6ff", stroke: "#2563eb" },
  service: { fill: "#f5f3ff", stroke: "#7c3aed" },
  db: { fill: "#fff7ed", stroke: "#ea580c" },
  external: { fill: "#fef2f2", stroke: "#dc2626" },
  fs: { fill: "#f1f5f9", stroke: "#475569" },
};

function participant(id, label, type = "service") {
  return { id, label, type };
}

function message(from, to, text, options = {}) {
  return { kind: "message", from, to, text, ...options };
}

function group(label) {
  return { kind: "group", label };
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value, maxChars = 22) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function textBlock(text, x, y, options = {}) {
  const {
    maxChars = 18,
    lineHeight = 16,
    size = 13,
    weight = 700,
    fill = palette.text,
    anchor = "middle",
  } = options;
  const lines = wrapText(text, maxChars);
  const start = y - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" y="${start + index * lineHeight}">${esc(line)}</tspan>`)
    .join("");
  return `<text font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${tspans}</text>`;
}

function title(text, width) {
  return `<text x="${width / 2}" y="50" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="${palette.text}" text-anchor="middle">${esc(text)}</text>`;
}

function participantBox(item, x) {
  const style = participantStyles[item.type] ?? participantStyles.service;
  return `
    <g id="${esc(item.id)}">
      <rect x="${x - 76}" y="76" width="152" height="58" rx="12" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2.4"/>
      ${textBlock(item.label, x, 108, { maxChars: 16, size: 13, weight: 800 })}
    </g>`;
}

function messageLabel(text, x, y, maxWidth) {
  const maxChars = Math.max(16, Math.floor(maxWidth / 8.5));
  const lines = wrapText(text, maxChars);
  const width = Math.min(maxWidth, Math.max(120, Math.max(...lines.map((line) => line.length)) * 7.5 + 24));
  const height = lines.length * 15 + 12;
  const top = y - height - 7;
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" y="${top + 18 + index * 15}">${esc(line)}</tspan>`)
    .join("");

  return `
    <rect x="${x - width / 2}" y="${top}" width="${width}" height="${height}" rx="8" fill="${palette.bg}" stroke="#e2e8f0"/>
    <text font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="${palette.text}" text-anchor="middle">${tspans}</text>`;
}

function renderMessage(item, y, xById) {
  const fromX = xById.get(item.from);
  const toX = xById.get(item.to);
  if (fromX == null || toX == null) return "";

  const dashed = item.return === true;
  const color = dashed ? palette.returnLine : palette.line;
  const dash = dashed ? `stroke-dasharray="7 7"` : "";

  if (fromX === toX) {
    return `
      <g>
        <path d="M ${fromX} ${y} C ${fromX + 76} ${y}, ${fromX + 76} ${y + 34}, ${fromX + 8} ${y + 34}" fill="none" stroke="${color}" stroke-width="2.1" ${dash} marker-end="url(#arrow)"/>
        ${messageLabel(item.text, fromX + 82, y + 24, 210)}
      </g>`;
  }

  const startX = fromX < toX ? fromX + 8 : fromX - 8;
  const endX = fromX < toX ? toX - 8 : toX + 8;
  const labelX = (fromX + toX) / 2;
  const labelWidth = Math.max(170, Math.abs(toX - fromX) - 20);

  return `
    <g>
      <line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${color}" stroke-width="2.1" ${dash} marker-end="url(#arrow)"/>
      ${messageLabel(item.text, labelX, y, labelWidth)}
    </g>`;
}

function renderGroup(item, y, width) {
  return `
    <g>
      <rect x="34" y="${y - 26}" width="${width - 68}" height="46" rx="12" fill="${palette.groupFill}" fill-opacity="0.72" stroke="${palette.groupStroke}" stroke-width="1.6"/>
      <text x="54" y="${y + 3}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="800" fill="#854d0e">${esc(item.label)}</text>
    </g>`;
}

function renderDiagram(diagram) {
  const padding = 92;
  const minGap = 170;
  const rowHeight = 64;
  const rowStart = 190;
  const width = Math.max(1100, padding * 2 + (diagram.participants.length - 1) * minGap);
  const height = rowStart + diagram.steps.length * rowHeight + 86;
  const usableWidth = width - padding * 2;
  const gap = diagram.participants.length > 1 ? usableWidth / (diagram.participants.length - 1) : 0;
  const xById = new Map();

  diagram.participants.forEach((item, index) => {
    xById.set(item.id, padding + index * gap);
  });

  const lifelines = diagram.participants
    .map((item) => {
      const x = xById.get(item.id);
      return `<line x1="${x}" y1="134" x2="${x}" y2="${height - 50}" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="8 8"/>`;
    })
    .join("\n");

  const boxes = diagram.participants
    .map((item) => participantBox(item, xById.get(item.id)))
    .join("\n");

  const rows = diagram.steps
    .map((item, index) => {
      const y = rowStart + index * rowHeight;
      if (item.kind === "group") return renderGroup(item, y, width);
      return renderMessage(item, y, xById);
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(diagram.title)}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.line}"/>
    </marker>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${palette.bg}"/>
  ${title(diagram.title, width)}
  ${lifelines}
  ${rows}
  ${boxes}
</svg>`;
}

const diagrams = [
  {
    file: "sequence-uc01-register.svg",
    title: "UC01 - Đăng ký tài khoản",
    participants: [
      participant("Guest", "Khách", "actor"),
      participant("UI", "Register UI", "ui"),
      participant("API", "API đăng ký", "api"),
      participant("Auth", "lib/auth", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Guest", "UI", "Nhập username, email, mật khẩu"),
      message("UI", "API", "POST /api/auth/register"),
      message("API", "Auth", "Validate password và hash mật khẩu"),
      message("API", "DB", "Kiểm tra email đã tồn tại"),
      group("Email đã tồn tại"),
      message("API", "UI", "Trả 409: email đã tồn tại", { return: true }),
      group("Dữ liệu hợp lệ"),
      message("API", "DB", "Tạo User role STUDENT"),
      message("API", "Auth", "Tạo token và set auth cookie"),
      message("API", "UI", "OK + redirect theo role", { return: true }),
    ],
  },
  {
    file: "sequence-uc02-auth-session.svg",
    title: "UC02 - Đăng nhập, đăng xuất và lấy user hiện tại",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Login/Header UI", "ui"),
      participant("API", "Auth APIs", "api"),
      participant("Auth", "lib/auth", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Nhập email và mật khẩu"),
      message("UI", "API", "POST /api/auth/login"),
      message("API", "DB", "Tìm User theo email"),
      message("API", "Auth", "verifyPassword()"),
      group("Sai thông tin hoặc tài khoản bị khóa"),
      message("API", "UI", "401/403", { return: true }),
      group("Đăng nhập hợp lệ"),
      message("API", "Auth", "createAuthToken() + setAuthCookie()"),
      message("API", "UI", "OK + redirect", { return: true }),
      message("UI", "API", "GET /api/auth/me"),
      message("API", "Auth", "authenticate() từ cookie"),
      message("Auth", "DB", "Tìm User theo token.sub"),
      message("API", "UI", "user hoặc null", { return: true }),
      message("User", "UI", "Bấm đăng xuất"),
      message("UI", "API", "POST /api/auth/logout"),
      message("API", "Auth", "clearAuthCookie()"),
      message("API", "UI", "OK", { return: true }),
    ],
  },
  {
    file: "sequence-uc03-forgot-password.svg",
    title: "UC03 - Quên mật khẩu bằng OTP",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Forgot UI", "ui"),
      participant("API", "OTP APIs", "api"),
      participant("Auth", "lib/auth", "service"),
      participant("Mail", "Email service", "external"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Nhập email cần reset"),
      message("UI", "API", "POST request-otp"),
      message("API", "DB", "Tìm User theo email"),
      group("Không tìm thấy hoặc là admin"),
      message("API", "UI", "Trả generic OK để tránh lộ tài khoản", { return: true }),
      group("User hợp lệ"),
      message("API", "Auth", "Hash mã OTP"),
      message("API", "DB", "Tạo PasswordResetOtp"),
      message("API", "Mail", "Gửi email OTP"),
      message("User", "UI", "Nhập OTP và mật khẩu mới"),
      message("UI", "API", "POST reset"),
      message("API", "DB", "Lấy OTP active mới nhất"),
      message("API", "Auth", "Verify OTP + validate password"),
      group("OTP đúng"),
      message("API", "DB", "Transaction đổi mật khẩu và consume OTP"),
      message("API", "UI", "OK", { return: true }),
    ],
  },
  {
    file: "sequence-uc04-profile.svg",
    title: "UC04 - Hồ sơ cá nhân và đổi mật khẩu",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Profile UI", "ui"),
      participant("API", "Profile APIs", "api"),
      participant("Auth", "lib/auth", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Sửa hồ sơ hoặc đổi mật khẩu"),
      message("UI", "API", "PATCH /api/profile hoặc POST /api/profile/password"),
      message("API", "Auth", "requireUser()"),
      message("API", "DB", "Validate language hoặc mật khẩu hiện tại"),
      group("Dữ liệu không hợp lệ"),
      message("API", "UI", "400/401", { return: true }),
      group("Dữ liệu hợp lệ"),
      message("API", "DB", "Update User"),
      message("API", "UI", "Thông tin mới", { return: true }),
    ],
  },
  {
    file: "sequence-uc05-languages.svg",
    title: "UC05 - Ngôn ngữ học",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Language UI", "ui"),
      participant("API", "/api/languages", "api"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Mở danh sách ngôn ngữ"),
      message("UI", "API", "GET /api/languages"),
      message("API", "DB", "Query LearningLanguage active"),
      message("API", "UI", "Danh sách ngôn ngữ", { return: true }),
      message("User", "UI", "Tạo ngôn ngữ mới nếu có quyền"),
      message("UI", "API", "POST name/code"),
      message("API", "DB", "Create LearningLanguage"),
      message("API", "UI", "Ngôn ngữ vừa tạo", { return: true }),
    ],
  },
  {
    file: "sequence-uc06-course-browse.svg",
    title: "UC06 - Xem khóa học, chi tiết và quyền truy cập",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Course pages", "ui"),
      participant("API", "Course APIs", "api"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Xem trang chủ, khóa học, giáo viên"),
      message("UI", "API", "GET /api/courses"),
      message("API", "DB", "Query Course ACTIVE + instructor + enrollment count"),
      message("API", "DB", "Nếu đã đăng nhập, query Enrollment của user"),
      message("API", "UI", "courses + enrolledCourseIds", { return: true }),
      message("User", "UI", "Mở chi tiết khóa học"),
      message("UI", "API", "GET /api/courses/{id}/access"),
      message("API", "DB", "Kiểm tra instructorId và Enrollment"),
      message("API", "UI", "canAccess + reason", { return: true }),
    ],
  },
  {
    file: "sequence-uc07-wallet-vnpay.svg",
    title: "UC07 - Nạp ví bằng VNPAY",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Wallet UI", "ui"),
      participant("API", "Wallet APIs", "api"),
      participant("VNPAY", "VNPAY", "external"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Nhập số tiền nạp"),
      message("UI", "API", "POST /api/wallet/top-up"),
      message("API", "DB", "Tạo Order + Payment PENDING + Wallet nếu chưa có"),
      message("API", "API", "Ký tham số VNPAY"),
      message("API", "UI", "paymentUrl + txnRef", { return: true }),
      message("UI", "VNPAY", "Redirect sang cổng thanh toán"),
      message("VNPAY", "API", "GET /api/wallet/vnpay-ipn"),
      message("API", "API", "Verify secure hash và số tiền"),
      group("Thanh toán thành công"),
      message("API", "DB", "Payment SUCCESS + tăng Wallet.balance"),
      message("API", "VNPAY", "RspCode 00", { return: true }),
      message("VNPAY", "UI", "Return URL"),
      message("UI", "API", "GET /api/wallet"),
      message("API", "DB", "Lấy balance + transactions + AI points"),
      message("API", "UI", "wallet data", { return: true }),
    ],
  },
  {
    file: "sequence-uc08-course-enroll.svg",
    title: "UC08 - Mua hoặc đăng ký khóa học bằng ví",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Enroll UI", "ui"),
      participant("API", "Enroll API", "api"),
      participant("Wallet", "lib/wallet", "service"),
      participant("Revenue", "lib/revenue", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Bấm đăng ký/mua khóa học"),
      message("UI", "API", "POST /api/courses/{id}/enroll"),
      message("API", "DB", "Lấy Course + Enrollment hiện có"),
      group("Đã enroll hoặc là instructor"),
      message("API", "DB", "Tạo Enrollment miễn phí nếu cần"),
      message("API", "UI", "alreadyEnrolled/enrolled", { return: true }),
      group("Cần thanh toán"),
      message("API", "Wallet", "getUserBalance()"),
      message("Wallet", "DB", "Đọc số dư ví"),
      message("API", "UI", "requiresTopUp nếu thiếu tiền", { return: true }),
      message("API", "Revenue", "calculateCourseRevenueSplit()"),
      message("API", "DB", "Transaction trừ ví, tạo Order/OrderItem/Enrollment"),
      message("API", "UI", "enrolled + balance mới", { return: true }),
    ],
  },
  {
    file: "sequence-uc09-learning-progress.svg",
    title: "UC09 - Học bài và ghi tiến độ",
    participants: [
      participant("Student", "Học viên", "actor"),
      participant("UI", "Learning UI", "ui"),
      participant("API", "Learning APIs", "api"),
      participant("Progress", "learning-progress", "service"),
      participant("Activity", "ai-points", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Student", "UI", "Mở bài học"),
      message("UI", "API", "POST lesson/start"),
      message("API", "DB", "Kiểm tra Lesson, Course, Enrollment"),
      message("API", "Progress", "ensureLessonStart()"),
      message("Progress", "DB", "Tạo Feedback LESSON_START nếu chưa có"),
      message("API", "UI", "OK", { return: true }),
      message("Student", "UI", "Hoàn thành bài học"),
      message("UI", "API", "POST lesson/complete"),
      message("API", "DB", "Kiểm tra access, video hoặc thời gian học"),
      message("API", "Progress", "markLessonCompleted()"),
      message("Progress", "DB", "Tạo Feedback PROGRESS"),
      message("API", "Activity", "recordLearningActivity(LESSON)"),
      message("Activity", "DB", "Ghi LearningActivity"),
      message("API", "UI", "OK", { return: true }),
    ],
  },
  {
    file: "sequence-uc10-student-test-result.svg",
    title: "UC10 - Làm test và xem kết quả",
    participants: [
      participant("Student", "Học viên", "actor"),
      participant("UI", "Student Tests UI", "ui"),
      participant("API", "Test APIs", "api"),
      participant("AI", "Ollama AI", "external"),
      participant("Progress", "learning-progress", "service"),
      participant("Mail", "Email service", "external"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Student", "UI", "Xem danh sách test"),
      message("UI", "API", "GET /api/student/tests"),
      message("API", "DB", "Lấy Enrollment, Course, Test, Attempt"),
      message("API", "Progress", "getCourseProgressPercent()"),
      message("API", "UI", "tests + canAttempt", { return: true }),
      message("Student", "UI", "Nộp bài test"),
      message("UI", "API", "POST /api/student/tests/{testId}/submit"),
      message("API", "DB", "Lấy Test + Question + Answer + Course"),
      message("API", "Progress", "Kiểm tra progress 100%"),
      message("API", "AI", "Chấm essay/speaking nếu có"),
      message("AI", "API", "Điểm + feedback", { return: true }),
      message("API", "DB", "Tạo TestAttempt + LearningActivity"),
      group("Đạt course test"),
      message("API", "Progress", "markCourseCompleted()"),
      message("API", "Mail", "Gửi chứng chỉ nếu chưa gửi"),
      message("API", "UI", "score + attemptId", { return: true }),
    ],
  },
  {
    file: "sequence-uc11-course-review.svg",
    title: "UC11 - Đánh giá khóa học",
    participants: [
      participant("Student", "Học viên", "actor"),
      participant("UI", "Review UI", "ui"),
      participant("API", "Reviews API", "api"),
      participant("Reviews", "course-reviews", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Student", "UI", "Mở phần đánh giá khóa học"),
      message("UI", "API", "GET /api/courses/{id}/reviews"),
      message("API", "Reviews", "getCourseReviews(), canReviewCourse()"),
      message("Reviews", "DB", "Query Feedback và TestAttempt"),
      message("API", "UI", "reviews + myReview + canReview", { return: true }),
      message("Student", "UI", "Gửi rating/comment"),
      message("UI", "API", "POST /api/courses/{id}/reviews"),
      message("API", "Reviews", "canReviewCourse()"),
      group("Chưa đủ điều kiện"),
      message("API", "UI", "403", { return: true }),
      group("Đủ điều kiện"),
      message("API", "Reviews", "upsertCourseReview()"),
      message("Reviews", "DB", "Create/Update Feedback"),
      message("API", "UI", "reviews mới", { return: true }),
    ],
  },
  {
    file: "sequence-uc12-writing-ai.svg",
    title: "UC12 - Writing AI và tạo đề writing",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Writing AI UI", "ui"),
      participant("API", "Writing APIs", "api"),
      participant("AI", "Ollama AI", "external"),
      participant("Points", "ai-points", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Tạo đề writing"),
      message("UI", "API", "POST /api/ai/writing-prompt"),
      message("API", "AI", "Health check + chat generate prompt"),
      group("AI lỗi"),
      message("API", "UI", "Fallback prompt", { return: true }),
      group("AI hoạt động"),
      message("API", "UI", "Prompt + chart", { return: true }),
      message("User", "UI", "Nộp bài viết"),
      message("UI", "API", "POST /api/ai/essay-evaluation"),
      message("API", "DB", "Kiểm tra user/course access"),
      message("API", "Points", "Kiểm tra hạt đậu nếu cần feedback chi tiết"),
      message("API", "AI", "Chấm IELTS hoặc language-specific writing"),
      message("AI", "API", "Evaluation", { return: true }),
      message("API", "DB", "Tạo AiAssessment WRITING"),
      message("API", "Points", "spendAiPoints nếu cần"),
      message("API", "UI", "feedback + assessmentId + points", { return: true }),
    ],
  },
  {
    file: "sequence-uc13-speaking-ai.svg",
    title: "UC13 - Speaking AI",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Speaking AI UI", "ui"),
      participant("API", "Speaking APIs", "api"),
      participant("AI", "Ollama AI", "external"),
      participant("FS", "uploads/speaking", "fs"),
      participant("Points", "ai-points", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("UI", "API", "GET /api/ai/speaking-evaluation/config"),
      message("API", "DB", "Lấy SystemSetting speaking"),
      message("API", "UI", "config", { return: true }),
      message("User", "UI", "Tạo topic và thu âm"),
      message("UI", "API", "POST topic"),
      message("API", "AI", "Generate topic"),
      message("API", "UI", "topic", { return: true }),
      message("User", "UI", "Nộp transcript + audio"),
      message("UI", "API", "POST /api/ai/speaking-evaluation"),
      message("API", "DB", "Kiểm tra user/course access"),
      message("API", "Points", "Kiểm tra hạt đậu nếu cần"),
      message("API", "AI", "Chấm speaking"),
      message("API", "FS", "Lưu audio file nếu có"),
      message("API", "DB", "Tạo AiAssessment SPEAKING"),
      message("API", "Points", "spendAiPoints nếu cần"),
      message("API", "UI", "feedback + assessmentId + audioUrl", { return: true }),
    ],
  },
  {
    file: "sequence-uc14-ai-points.svg",
    title: "UC14 - Mua và sử dụng hạt đậu AI",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Wallet/AI UI", "ui"),
      participant("API", "AI Points APIs", "api"),
      participant("Wallet", "lib/wallet", "service"),
      participant("Points", "ai-points", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("UI", "API", "GET /api/ai/points"),
      message("API", "Points", "getAiPointsSummary()"),
      message("Points", "DB", "Query PointTransaction + AiAssessment + LearningActivity"),
      message("API", "UI", "earned/spent/available/history", { return: true }),
      message("User", "UI", "Mua hạt đậu"),
      message("UI", "API", "POST /api/ai/points/buy"),
      message("API", "DB", "Bắt đầu transaction"),
      message("API", "Wallet", "debitWalletForPurchase()"),
      message("Wallet", "DB", "Trừ số dư ví"),
      message("API", "Points", "record AI_POINTS_PURCHASE"),
      message("Points", "DB", "Tạo PointTransaction"),
      message("API", "UI", "points + walletBalance", { return: true }),
    ],
  },
  {
    file: "sequence-uc15-teacher-application.svg",
    title: "UC15 - Đăng ký trở thành giáo viên",
    participants: [
      participant("Student", "Học viên", "actor"),
      participant("UI", "Teacher Registration UI", "ui"),
      participant("API", "Application APIs", "api"),
      participant("FS", "public/certificates", "fs"),
      participant("AI", "Ollama AI", "external"),
      participant("Mail", "Email service", "external"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Student", "UI", "Mở trang đăng ký giáo viên"),
      message("UI", "API", "GET /api/teacher-applications"),
      message("API", "DB", "Lấy setting, languages, applications"),
      message("API", "UI", "form data", { return: true }),
      message("Student", "UI", "Upload chứng chỉ + chọn ngôn ngữ"),
      message("UI", "API", "POST /api/teacher-applications"),
      message("API", "DB", "Kiểm tra setting/language"),
      message("API", "FS", "Lưu file certificate"),
      message("API", "DB", "Tạo TeacherApplication + certificates"),
      message("API", "Mail", "Gửi email đã nhận hồ sơ"),
      message("API", "UI", "application + entranceTest nếu có", { return: true }),
      group("Trong khi làm bài đầu vào"),
      message("UI", "API", "Autosave answer hoặc gửi anti-cheat"),
      message("API", "DB", "Lưu answerState/AntiCheatLog/SuspiciousEvent"),
      message("Student", "UI", "Nộp bài đầu vào"),
      message("UI", "API", "POST submit-test"),
      message("API", "AI", "Chấm essay/speaking nếu có"),
      message("API", "DB", "Tạo TestAttempt + update UNDER_REVIEW"),
      message("API", "Mail", "Gửi thông báo review"),
      message("API", "UI", "score + underReview", { return: true }),
    ],
  },
  {
    file: "sequence-uc16-admin-review-teacher.svg",
    title: "UC16 - Admin duyệt hồ sơ giáo viên",
    participants: [
      participant("Admin", "Admin", "actor"),
      participant("UI", "Admin UI", "ui"),
      participant("API", "Teacher App APIs", "api"),
      participant("Mail", "Email service", "external"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Admin", "UI", "Mở danh sách hồ sơ"),
      message("UI", "API", "GET /api/admin/teacher-applications"),
      message("API", "DB", "Query applications + user + certificates + attempts"),
      message("API", "UI", "applications", { return: true }),
      message("Admin", "UI", "Approve hoặc Reject"),
      message("UI", "API", "PUT review"),
      message("API", "DB", "Transaction update application"),
      group("Approve"),
      message("API", "DB", "Update User.role = TEACHER"),
      group("Reject"),
      message("API", "DB", "Lưu rejectionReason"),
      message("API", "DB", "Tạo Notification + ApplicationLog"),
      message("API", "Mail", "Gửi email kết quả"),
      message("API", "UI", "OK + status mới", { return: true }),
    ],
  },
  {
    file: "sequence-uc17-teacher-course-crud.svg",
    title: "UC17 - Giáo viên quản lý khóa học, module, lesson",
    participants: [
      participant("Teacher", "Giáo viên", "actor"),
      participant("UI", "Teacher Course UI", "ui"),
      participant("API", "Course APIs", "api"),
      participant("FS", "public uploads", "fs"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Teacher", "UI", "Tạo hoặc sửa khóa học"),
      message("UI", "API", "POST/PUT course"),
      message("API", "DB", "Kiểm tra role, ownership, application, auto approval"),
      message("API", "DB", "Create/Update Course"),
      message("API", "UI", "course + requiresApproval", { return: true }),
      message("Teacher", "UI", "Thêm module/lesson"),
      message("UI", "API", "POST modules/lessons"),
      message("API", "DB", "Kiểm tra owner/admin"),
      message("API", "DB", "Create Module/Lesson và increment lessons"),
      message("API", "UI", "module/lesson", { return: true }),
      message("Teacher", "UI", "Upload video/thumbnail"),
      message("UI", "API", "POST upload API"),
      message("API", "FS", "Ghi file vào public"),
      message("API", "UI", "file URL", { return: true }),
      message("Teacher", "UI", "Xóa khóa học"),
      message("UI", "API", "DELETE course"),
      message("API", "DB", "Nếu có học viên thì LOCKED, nếu chưa có thì xóa vật lý"),
      message("API", "UI", "Kết quả", { return: true }),
    ],
  },
  {
    file: "sequence-uc18-teacher-test-crud.svg",
    title: "UC18 - Giáo viên quản lý test và câu hỏi",
    participants: [
      participant("Teacher", "Giáo viên", "actor"),
      participant("UI", "Teacher Tests UI", "ui"),
      participant("API", "Test APIs", "api"),
      participant("FS", "public uploads", "fs"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Teacher", "UI", "Tạo test"),
      message("UI", "API", "POST /api/teacher/tests"),
      message("API", "DB", "Kiểm tra role, course owner, language, module count"),
      message("API", "DB", "Create Test"),
      message("API", "UI", "test", { return: true }),
      message("Teacher", "UI", "Thêm hoặc sửa câu hỏi"),
      message("UI", "API", "POST/PUT questions"),
      message("API", "DB", "Kiểm tra owner/admin và tổng điểm"),
      message("API", "DB", "Create/Update Question + Answer"),
      message("API", "UI", "question", { return: true }),
      message("Teacher", "UI", "Upload audio hoặc tài liệu đề"),
      message("UI", "API", "POST question-audio-upload/test-material-upload"),
      message("API", "FS", "Lưu file"),
      message("API", "UI", "URL/material metadata", { return: true }),
    ],
  },
  {
    file: "sequence-uc19-teacher-revenue.svg",
    title: "UC19 - Giáo viên xem học viên và rút doanh thu",
    participants: [
      participant("Teacher", "Giáo viên", "actor"),
      participant("UI", "Students/Revenue UI", "ui"),
      participant("API", "Teacher APIs", "api"),
      participant("Revenue", "teacher-revenue", "service"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Teacher", "UI", "Xem học viên"),
      message("UI", "API", "GET /api/teacher/students"),
      message("API", "DB", "Query enrollments, users, payments/orderItems/points"),
      message("API", "UI", "students management data", { return: true }),
      message("Teacher", "UI", "Gửi yêu cầu rút doanh thu"),
      message("UI", "API", "POST /api/teacher/revenue-withdrawals"),
      message("API", "DB", "Transaction aggregate earned/reserved"),
      message("API", "Revenue", "calculateAvailableTeacherRevenue()"),
      group("Vượt số dư khả dụng"),
      message("API", "UI", "400", { return: true }),
      group("Hợp lệ"),
      message("API", "DB", "Create TeacherRevenueWithdrawal PENDING"),
      message("API", "UI", "withdrawal + available", { return: true }),
    ],
  },
  {
    file: "sequence-uc20-admin-management.svg",
    title: "UC20 - Admin dashboard, setting, user và course approval",
    participants: [
      participant("Admin", "Admin", "actor"),
      participant("UI", "Admin UI", "ui"),
      participant("API", "Admin APIs", "api"),
      participant("Mail", "Email service", "external"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Admin", "UI", "Mở dashboard"),
      message("UI", "API", "GET /api/admin/analytics"),
      message("API", "DB", "Aggregate users/courses/tests/revenue/AI/anti-cheat"),
      message("API", "UI", "dashboard data", { return: true }),
      message("Admin", "UI", "Đổi setting hệ thống"),
      message("UI", "API", "PUT teacher-entrance/course-approval/speaking-config"),
      message("API", "DB", "Upsert SystemSetting"),
      group("Mở teacher entrance"),
      message("API", "DB", "Query Students + tạo Notification"),
      message("API", "Mail", "Gửi email thông báo"),
      message("API", "UI", "setting mới", { return: true }),
      message("Admin", "UI", "Khóa user/course hoặc duyệt course"),
      message("UI", "API", "PATCH user/course"),
      message("API", "DB", "Update User/Course + Notification nếu cần"),
      message("API", "UI", "Kết quả", { return: true }),
    ],
  },
  {
    file: "sequence-uc21-admin-withdrawal.svg",
    title: "UC21 - Admin xử lý rút doanh thu",
    participants: [
      participant("Admin", "Admin", "actor"),
      participant("UI", "Withdrawal UI", "ui"),
      participant("API", "Withdrawal API", "api"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("Admin", "UI", "Approve, Pay hoặc Reject request"),
      message("UI", "API", "PATCH /api/admin/revenue-withdrawals/{id}"),
      message("API", "DB", "Lấy withdrawal hiện tại"),
      group("Trạng thái không hợp lệ"),
      message("API", "UI", "409", { return: true }),
      group("Trạng thái hợp lệ"),
      message("API", "DB", "Transaction update status, processedAt, note"),
      message("API", "DB", "Tạo Notification cho giáo viên"),
      message("API", "UI", "withdrawal mới", { return: true }),
    ],
  },
  {
    file: "sequence-uc22-health-public.svg",
    title: "UC22 - Health check và route public phụ trợ",
    participants: [
      participant("User", "Người dùng", "actor"),
      participant("UI", "Public pages", "ui"),
      participant("API", "/api/health", "api"),
      participant("DB", "PostgreSQL", "db"),
    ],
    steps: [
      message("User", "UI", "Mở trang public/phụ trợ"),
      message("UI", "DB", "Server components query dữ liệu nếu cần"),
      message("UI", "User", "Render page", { return: true }),
      message("User", "API", "GET /api/health"),
      message("API", "DB", "SELECT 1"),
      message("API", "User", "status healthy/unhealthy", { return: true }),
    ],
  },
];

for (const diagram of diagrams) {
  writeFileSync(path.join(outDir, diagram.file), renderDiagram(diagram), "utf8");
}

console.log(`Generated ${diagrams.length} sequence SVG diagrams in ${outDir}`);
