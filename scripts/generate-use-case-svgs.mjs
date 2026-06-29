import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "use-case-diagrams");
mkdirSync(outDir, { recursive: true });

const palette = {
  bg: "#f8fafc",
  panel: "#ffffff",
  border: "#2563eb",
  actor: "#0f172a",
  usecase: "#eff6ff",
  usecaseStroke: "#1d4ed8",
  flow: "#ecfdf5",
  flowStroke: "#059669",
  external: "#fff7ed",
  externalStroke: "#ea580c",
  text: "#0f172a",
  muted: "#475569",
  line: "#334155",
  dependency: "#7c3aed",
};

const VI_TEXT = new Map([
  ["Use-case tong quan FinnCenter", "Sơ đồ use-case tổng quan FinnCenter"],
  ["Use-case role Guest", "Sơ đồ use-case vai trò Khách"],
  ["Use-case role Student", "Sơ đồ use-case vai trò Học viên"],
  ["Use-case role Teacher", "Sơ đồ use-case vai trò Giáo viên"],
  ["Use-case role Admin", "Sơ đồ use-case vai trò Quản trị viên"],
  ["Luong quan trong: Mua khoa hoc, hoc bai, lam test", "Luồng quan trọng: Mua khóa học, học bài, làm test"],
  ["Luong quan trong: AI Writing/Speaking va hat dau", "Luồng quan trọng: AI Writing/Speaking và hạt đậu"],
  ["Luong quan trong: Dang ky giao vien", "Luồng quan trọng: Đăng ký giáo viên"],
  ["Luong quan trong: Doanh thu va rut tien giao vien", "Luồng quan trọng: Doanh thu và rút tiền giáo viên"],
  ["FinnCenter Teacher", "FinnCenter Giáo viên"],
  ["FinnCenter Admin", "FinnCenter Quản trị"],
  ["Guest", "Khách"],
  ["Student", "Học viên"],
  ["Teacher", "Giáo viên"],
  ["Admin", "Quản trị viên"],
  ["Student/Teacher", "Học viên/Giáo viên"],
  ["Email service", "Dịch vụ email"],
  ["Xem trang public, khoa hoc, giao vien", "Xem trang public, khóa học, giáo viên"],
  ["Dang ky, dang nhap, quen mat khau", "Đăng ký, đăng nhập, quên mật khẩu"],
  ["Quan ly ho so ca nhan", "Quản lý hồ sơ cá nhân"],
  ["Tim kiem, loc, xem chi tiet khoa hoc", "Tìm kiếm, lọc, xem chi tiết khóa học"],
  ["Nap vi, xem giao dich, mua hat dau", "Nạp ví, xem giao dịch, mua hạt đậu"],
  ["Mua/dang ky khoa hoc", "Mua/đăng ký khóa học"],
  ["Hoc bai va theo doi tien do", "Học bài và theo dõi tiến độ"],
  ["Lam test, xem lich su va ket qua", "Làm test, xem lịch sử và kết quả"],
  ["Luyen Writing/Speaking voi AI", "Luyện Writing/Speaking với AI"],
  ["Danh gia khoa hoc", "Đánh giá khóa học"],
  ["Dang ky tro thanh giao vien", "Đăng ký trở thành giáo viên"],
  ["Quan ly khoa hoc, module, lesson", "Quản lý khóa học, module, lesson"],
  ["Quan ly test, cau hoi, tai lieu", "Quản lý test, câu hỏi, tài liệu"],
  ["Quan ly hoc vien", "Quản lý học viên"],
  ["Xem doanh thu va yeu cau rut tien", "Xem doanh thu và yêu cầu rút tiền"],
  ["Xem dashboard analytics", "Xem dashboard analytics"],
  ["Quan ly user va role", "Quản lý user và role"],
  ["Duyet giao vien va khoa hoc", "Duyệt giáo viên và khóa học"],
  ["Cau hinh he thong", "Cấu hình hệ thống"],
  ["Xu ly rut doanh thu giao vien", "Xử lý rút doanh thu giáo viên"],
  ["Xem trang chu", "Xem trang chủ"],
  ["Xem/loc danh sach khoa hoc", "Xem/lọc danh sách khóa học"],
  ["Xem chi tiet khoa hoc", "Xem chi tiết khóa học"],
  ["Xem giao vien", "Xem giáo viên"],
  ["Xem trang gioi thieu", "Xem trang giới thiệu"],
  ["Dang ky tai khoan", "Đăng ký tài khoản"],
  ["Dang nhap", "Đăng nhập"],
  ["Quen mat khau bang OTP", "Quên mật khẩu bằng OTP"],
  ["Cap nhat ho so, doi mat khau", "Cập nhật hồ sơ, đổi mật khẩu"],
  ["Nap vi va xem giao dich", "Nạp ví và xem giao dịch"],
  ["Mua hat dau AI", "Mua hạt đậu AI"],
  ["Tim khoa hoc", "Tìm khóa học"],
  ["Hoc module/lesson", "Học module/lesson"],
  ["Theo doi tien do", "Theo dõi tiến độ"],
  ["Lam bai test", "Làm bài test"],
  ["Xem ket qua hoc tap", "Xem kết quả học tập"],
  ["Nhan chung chi qua email", "Nhận chứng chỉ qua email"],
  ["Luyen Writing AI", "Luyện Writing AI"],
  ["Luyen Speaking AI", "Luyện Speaking AI"],
  ["Dang ky lam giao vien", "Đăng ký làm giáo viên"],
  ["Tao khoa hoc", "Tạo khóa học"],
  ["Sua/khoa/xoa khoa hoc", "Sửa/khóa/xóa khóa học"],
  ["Upload thumbnail", "Upload thumbnail"],
  ["Quan ly module", "Quản lý module"],
  ["Quan ly lesson", "Quản lý lesson"],
  ["Upload video bai hoc", "Upload video bài học"],
  ["Tao bai test khoa hoc", "Tạo bài test khóa học"],
  ["Quan ly cau hoi va dap an", "Quản lý câu hỏi và đáp án"],
  ["Upload audio cau hoi", "Upload audio câu hỏi"],
  ["Upload tai lieu test", "Upload tài liệu test"],
  ["Preview/lam thu test", "Preview/làm thử test"],
  ["Xem va quan ly hoc vien", "Xem và quản lý học viên"],
  ["Xem doanh thu", "Xem doanh thu"],
  ["Gui yeu cau rut doanh thu", "Gửi yêu cầu rút doanh thu"],
  ["Quan ly user, role, ban/unban", "Quản lý user, role, ban/unban"],
  ["Quan ly ngon ngu hoc", "Quản lý ngôn ngữ học"],
  ["Bat/tat dang ky giao vien", "Bật/tắt đăng ký giáo viên"],
  ["Duyet/tu choi ho so giao vien", "Duyệt/từ chối hồ sơ giáo viên"],
  ["Bat/tat auto approval khoa hoc", "Bật/tắt auto approval khóa học"],
  ["Duyet/tu choi/khoa/mo khoa hoc", "Duyệt/từ chối/khóa/mở khóa học"],
  ["Tao public practice/teacher entrance test", "Tạo public practice/teacher entrance test"],
  ["Cau hinh Speaking AI", "Cấu hình Speaking AI"],
  ["Xu ly rut doanh thu", "Xử lý rút doanh thu"],
  ["Theo doi email/notification", "Theo dõi email/notification"],
  ["Xem anti-cheat", "Xem anti-cheat"],
  ["Kiem tra health/database", "Kiểm tra health/database"],
  ["1. Tim va xem khoa hoc", "1. Tìm và xem khóa học"],
  ["2. Kiem tra so du vi", "2. Kiểm tra số dư ví"],
  ["3. Mua/dang ky khoa hoc", "3. Mua/đăng ký khóa học"],
  ["4. Hoc lesson", "4. Học lesson"],
  ["Nap vi neu thieu tien", "Nạp ví nếu thiếu tiền"],
  ["5. Hoan thanh lesson", "5. Hoàn thành lesson"],
  ["6. Mo test khi tien do 100%", "6. Mở test khi tiến độ 100%"],
  ["7. Nop bai test", "7. Nộp bài test"],
  ["8. Luu ket qua", "8. Lưu kết quả"],
  ["Gui chung chi neu dat", "Gửi chứng chỉ nếu đạt"],
  ["Mua hat dau bang vi", "Mua hạt đậu bằng ví"],
  ["Tao de Writing/Speaking", "Tạo đề Writing/Speaking"],
  ["Cham diem mien phi", "Chấm điểm miễn phí"],
  ["Kiem tra hat dau", "Kiểm tra hạt đậu"],
  ["Nhan xet AI chi tiet", "Nhận xét AI chi tiết"],
  ["Luu AiAssessment", "Lưu AiAssessment"],
  ["Admin bat dang ky giao vien", "Admin bật đăng ký giáo viên"],
  ["Ung vien chon ngon ngu", "Ứng viên chọn ngôn ngữ"],
  ["Upload 1-3 chung chi", "Upload 1-3 chứng chỉ"],
  ["Tao ho so", "Tạo hồ sơ"],
  ["Lam bai test dau vao neu co", "Làm bài test đầu vào nếu có"],
  ["Autosave bai lam", "Autosave bài làm"],
  ["Ghi anti-cheat", "Ghi anti-cheat"],
  ["Nop ho so/bai test", "Nộp hồ sơ/bài test"],
  ["Admin review ho so", "Admin review hồ sơ"],
  ["Approve: chuyen role TEACHER", "Approve: chuyển role TEACHER"],
  ["Reject: luu ly do", "Reject: lưu lý do"],
  ["Hoc vien nap vi", "Học viên nạp ví"],
  ["Hoc vien mua khoa hoc", "Học viên mua khóa học"],
  ["Chia doanh thu 70/30", "Chia doanh thu 70/30"],
  ["Giao vien xem doanh thu kha dung", "Giáo viên xem doanh thu khả dụng"],
  ["Tao yeu cau rut tien", "Tạo yêu cầu rút tiền"],
  ["Admin duyet yeu cau", "Admin duyệt yêu cầu"],
  ["Xac nhan da thanh toan", "Xác nhận đã thanh toán"],
  ["Tu choi kem ly do", "Từ chối kèm lý do"],
  ["nap tien", "nạp tiền"],
  ["tao/cham", "tạo/chấm"],
  ["AI test", "AI test"],
  ["chung chi", "chứng chỉ"],
  ["thong bao", "thông báo"],
  ["gui OTP", "gửi OTP"],
  ["tru vi", "trừ ví"],
  ["kiem tra vi", "kiểm tra ví"],
  ["cap nhat", "cập nhật"],
  ["AI cau hoi", "AI câu hỏi"],
  ["cham bai", "chấm bài"],
  ["cham noi", "chấm nói"],
  ["gui mail", "gửi mail"],
  ["cho duyet", "chờ duyệt"],
  ["include", "bao gồm"],
  ["optional", "tùy chọn"],
  ["dua tren", "dựa trên"],
  ["ket qua", "kết quả"],
  ["notify", "thông báo"],
  ["AI mode", "chế độ AI"],
  ["thieu so du", "thiếu số dư"],
  ["thanh toan", "thanh toán"],
  ["neu dat", "nếu đạt"],
  ["generate", "tạo đề"],
  ["score only", "chỉ chấm điểm"],
  ["feedback", "nhận xét"],
  ["tru hat dau", "trừ hạt đậu"],
  ["co test", "có test"],
]);

function viText(value) {
  return VI_TEXT.get(String(value)) ?? String(value);
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value, maxChars = 20) {
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
    maxChars = 20,
    lineHeight = 18,
    size = 14,
    weight = 600,
    fill = palette.text,
    anchor = "middle",
  } = options;
  const lines = wrapText(viText(text), maxChars);
  const start = y - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" y="${start + index * lineHeight}">${esc(line)}</tspan>`)
    .join("");
  return `<text font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${tspans}</text>`;
}

function title(text, width) {
  return `<text x="${width / 2}" y="54" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="${palette.text}" text-anchor="middle">${esc(viText(text))}</text>`;
}

function boundary({ x, y, w, h, label }) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${palette.panel}" stroke="${palette.border}" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${w}" height="48" rx="24" fill="#dbeafe" stroke="none"/>
    <text x="${x + w / 2}" y="${y + 32}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#1e3a8a" text-anchor="middle">${esc(viText(label))}</text>`;
}

function actor({ id, label, x, y, external = false }) {
  const stroke = external ? palette.externalStroke : palette.actor;
  const fill = external ? palette.external : "#e2e8f0";
  return `
    <g id="${esc(id)}">
      <circle cx="${x}" cy="${y - 58}" r="22" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      <line x1="${x}" y1="${y - 36}" x2="${x}" y2="${y + 24}" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
      <line x1="${x - 42}" y1="${y - 10}" x2="${x + 42}" y2="${y - 10}" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
      <line x1="${x}" y1="${y + 24}" x2="${x - 34}" y2="${y + 78}" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
      <line x1="${x}" y1="${y + 24}" x2="${x + 34}" y2="${y + 78}" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
      ${textBlock(label, x, y + 118, { maxChars: 16, size: 16, weight: 800 })}
    </g>`;
}

function useCase({ id, label, x, y, w = 220, h = 86, fill = palette.usecase, stroke = palette.usecaseStroke }) {
  return `
    <g id="${esc(id)}">
      <ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
      ${textBlock(label, x, y, { maxChars: Math.max(14, Math.floor(w / 11)), size: 14, weight: 700 })}
    </g>`;
}

function flowBox({ id, label, x, y, w = 210, h = 82, fill = palette.flow, stroke = palette.flowStroke }) {
  return `
    <g id="${esc(id)}">
      <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
      ${textBlock(label, x, y, { maxChars: Math.max(14, Math.floor(w / 11)), size: 14, weight: 700 })}
    </g>`;
}

function line(from, to, options = {}) {
  const { dashed = false, label = "", color = dashed ? palette.dependency : palette.line, arrow = dashed } = options;
  const dash = dashed ? `stroke-dasharray="8 8"` : "";
  const marker = arrow ? `marker-end="url(#arrow)"` : "";
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const labelSvg = label
    ? `<rect x="${mx - 74}" y="${my - 18}" width="148" height="24" rx="12" fill="${palette.bg}" opacity="0.92"/>
       ${textBlock(label, mx, my, { maxChars: 18, size: 12, weight: 700, fill: color })}`
    : "";
  return `<g>
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="2.2" ${dash} ${marker}/>
    ${labelSvg}
  </g>`;
}

function svgShell({ width, height, titleText, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(viText(titleText))}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.dependency}"/>
    </marker>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${palette.bg}"/>
  ${title(titleText, width)}
  ${body}
</svg>`;
}

function diagram({ file, titleText, width, height, system, actors = [], externals = [], useCases = [], links = [] }) {
  const nodes = new Map();
  for (const item of actors) nodes.set(item.id, item);
  for (const item of externals) nodes.set(item.id, item);
  for (const item of useCases) nodes.set(item.id, item);

  const body = [
    boundary(system),
    ...links.map((linkItem) => {
      const from = nodes.get(linkItem.from);
      const to = nodes.get(linkItem.to);
      if (!from || !to) return "";
      return line(from, to, linkItem);
    }),
    ...useCases.map((item) => useCase(item)),
    ...actors.map((item) => actor(item)),
    ...externals.map((item) => actor({ ...item, external: true })),
  ].join("\n");

  writeFileSync(path.join(outDir, file), svgShell({ width, height, titleText, body }), "utf8");
}

function flowDiagram({ file, titleText, width, height, system, actors = [], externals = [], boxes = [], links = [] }) {
  const nodes = new Map();
  for (const item of actors) nodes.set(item.id, item);
  for (const item of externals) nodes.set(item.id, item);
  for (const item of boxes) nodes.set(item.id, item);

  const body = [
    boundary(system),
    ...links.map((linkItem) => {
      const from = nodes.get(linkItem.from);
      const to = nodes.get(linkItem.to);
      if (!from || !to) return "";
      return line(from, to, { arrow: true, ...linkItem });
    }),
    ...boxes.map((item) => flowBox(item)),
    ...actors.map((item) => actor(item)),
    ...externals.map((item) => actor({ ...item, external: true })),
  ].join("\n");

  writeFileSync(path.join(outDir, file), svgShell({ width, height, titleText, body }), "utf8");
}

diagram({
  file: "use-case-overview.svg",
  titleText: "Use-case tong quan FinnCenter",
  width: 1800,
  height: 1280,
  system: { x: 300, y: 110, w: 1200, h: 1060, label: "FinnCenter" },
  actors: [
    { id: "Guest", label: "Guest", x: 120, y: 210 },
    { id: "Student", label: "Student", x: 120, y: 450 },
    { id: "Teacher", label: "Teacher", x: 120, y: 730 },
    { id: "Admin", label: "Admin", x: 120, y: 1010 },
  ],
  externals: [
    { id: "VNPAY", label: "VNPAY", x: 1660, y: 360 },
    { id: "AI", label: "Ollama AI", x: 1660, y: 660 },
    { id: "Mail", label: "Email service", x: 1660, y: 960 },
  ],
  useCases: [
    { id: "UC_Public", label: "Xem trang public, khoa hoc, giao vien", x: 520, y: 210 },
    { id: "UC_Auth", label: "Dang ky, dang nhap, quen mat khau", x: 820, y: 210 },
    { id: "UC_Profile", label: "Quan ly ho so ca nhan", x: 1120, y: 210 },
    { id: "UC_CourseMarket", label: "Tim kiem, loc, xem chi tiet khoa hoc", x: 520, y: 350 },
    { id: "UC_Wallet", label: "Nap vi, xem giao dich, mua hat dau", x: 820, y: 350 },
    { id: "UC_Enroll", label: "Mua/dang ky khoa hoc", x: 1120, y: 350 },
    { id: "UC_Learn", label: "Hoc bai va theo doi tien do", x: 520, y: 490 },
    { id: "UC_Test", label: "Lam test, xem lich su va ket qua", x: 820, y: 490 },
    { id: "UC_AI", label: "Luyen Writing/Speaking voi AI", x: 1120, y: 490 },
    { id: "UC_Review", label: "Danh gia khoa hoc", x: 520, y: 630 },
    { id: "UC_TeacherApply", label: "Dang ky tro thanh giao vien", x: 820, y: 630 },
    { id: "UC_TeacherCourse", label: "Quan ly khoa hoc, module, lesson", x: 1120, y: 630 },
    { id: "UC_TeacherTest", label: "Quan ly test, cau hoi, tai lieu", x: 520, y: 770 },
    { id: "UC_TeacherStudent", label: "Quan ly hoc vien", x: 820, y: 770 },
    { id: "UC_TeacherRevenue", label: "Xem doanh thu va yeu cau rut tien", x: 1120, y: 770 },
    { id: "UC_AdminDashboard", label: "Xem dashboard analytics", x: 520, y: 910 },
    { id: "UC_AdminUser", label: "Quan ly user va role", x: 820, y: 910 },
    { id: "UC_AdminReview", label: "Duyet giao vien va khoa hoc", x: 1120, y: 910 },
    { id: "UC_AdminSettings", label: "Cau hinh he thong", x: 650, y: 1050 },
    { id: "UC_AdminWithdraw", label: "Xu ly rut doanh thu giao vien", x: 1000, y: 1050 },
  ],
  links: [
    { from: "Guest", to: "UC_Public" },
    { from: "Guest", to: "UC_Auth" },
    { from: "Guest", to: "UC_CourseMarket" },
    { from: "Student", to: "UC_Profile" },
    { from: "Student", to: "UC_Wallet" },
    { from: "Student", to: "UC_Enroll" },
    { from: "Student", to: "UC_Learn" },
    { from: "Student", to: "UC_Test" },
    { from: "Student", to: "UC_AI" },
    { from: "Student", to: "UC_Review" },
    { from: "Student", to: "UC_TeacherApply" },
    { from: "Teacher", to: "UC_AI" },
    { from: "Teacher", to: "UC_TeacherCourse" },
    { from: "Teacher", to: "UC_TeacherTest" },
    { from: "Teacher", to: "UC_TeacherStudent" },
    { from: "Teacher", to: "UC_TeacherRevenue" },
    { from: "Admin", to: "UC_AdminDashboard" },
    { from: "Admin", to: "UC_AdminUser" },
    { from: "Admin", to: "UC_AdminReview" },
    { from: "Admin", to: "UC_AdminSettings" },
    { from: "Admin", to: "UC_AdminWithdraw" },
    { from: "UC_Wallet", to: "VNPAY", dashed: true, label: "nap tien" },
    { from: "UC_AI", to: "AI", dashed: true, label: "tao/cham" },
    { from: "UC_Test", to: "AI", dashed: true, label: "AI test" },
    { from: "UC_Auth", to: "Mail", dashed: true, label: "OTP" },
    { from: "UC_Test", to: "Mail", dashed: true, label: "chung chi" },
    { from: "UC_AdminSettings", to: "Mail", dashed: true, label: "thong bao" },
  ],
});

diagram({
  file: "use-case-guest.svg",
  titleText: "Use-case role Guest",
  width: 1400,
  height: 880,
  system: { x: 300, y: 110, w: 800, h: 630, label: "FinnCenter" },
  actors: [{ id: "Guest", label: "Guest", x: 120, y: 420 }],
  externals: [{ id: "Mail", label: "Email service", x: 1260, y: 570 }],
  useCases: [
    { id: "Home", label: "Xem trang chu", x: 520, y: 210 },
    { id: "Courses", label: "Xem/loc danh sach khoa hoc", x: 840, y: 210 },
    { id: "CourseDetail", label: "Xem chi tiet khoa hoc", x: 520, y: 340 },
    { id: "Teachers", label: "Xem giao vien", x: 840, y: 340 },
    { id: "About", label: "Xem trang gioi thieu", x: 520, y: 470 },
    { id: "Register", label: "Dang ky tai khoan", x: 840, y: 470 },
    { id: "Login", label: "Dang nhap", x: 520, y: 600 },
    { id: "Forgot", label: "Quen mat khau bang OTP", x: 840, y: 600 },
  ],
  links: [
    ...["Home", "Courses", "CourseDetail", "Teachers", "About", "Register", "Login", "Forgot"].map((to) => ({ from: "Guest", to })),
    { from: "Forgot", to: "Mail", dashed: true, label: "gui OTP" },
  ],
});

diagram({
  file: "use-case-student.svg",
  titleText: "Use-case role Student",
  width: 1600,
  height: 1060,
  system: { x: 290, y: 110, w: 980, h: 820, label: "FinnCenter" },
  actors: [{ id: "Student", label: "Student", x: 120, y: 520 }],
  externals: [
    { id: "VNPAY", label: "VNPAY", x: 1460, y: 270 },
    { id: "AI", label: "Ollama AI", x: 1460, y: 560 },
    { id: "Mail", label: "Email service", x: 1460, y: 820 },
  ],
  useCases: [
    { id: "Profile", label: "Cap nhat ho so, doi mat khau", x: 500, y: 210 },
    { id: "Wallet", label: "Nap vi va xem giao dich", x: 810, y: 210 },
    { id: "Beans", label: "Mua hat dau AI", x: 1120, y: 210 },
    { id: "Browse", label: "Tim khoa hoc", x: 500, y: 350 },
    { id: "Enroll", label: "Mua/dang ky khoa hoc", x: 810, y: 350 },
    { id: "Learn", label: "Hoc module/lesson", x: 1120, y: 350 },
    { id: "Progress", label: "Theo doi tien do", x: 500, y: 490 },
    { id: "TakeTest", label: "Lam bai test", x: 810, y: 490 },
    { id: "ViewResult", label: "Xem ket qua hoc tap", x: 1120, y: 490 },
    { id: "Cert", label: "Nhan chung chi qua email", x: 500, y: 630 },
    { id: "Review", label: "Danh gia khoa hoc", x: 810, y: 630 },
    { id: "Writing", label: "Luyen Writing AI", x: 1120, y: 630 },
    { id: "Speaking", label: "Luyen Speaking AI", x: 650, y: 770 },
    { id: "ApplyTeacher", label: "Dang ky lam giao vien", x: 980, y: 770 },
  ],
  links: [
    ...["Profile", "Wallet", "Beans", "Browse", "Enroll", "Learn", "Progress", "TakeTest", "ViewResult", "Cert", "Review", "Writing", "Speaking", "ApplyTeacher"].map((to) => ({ from: "Student", to })),
    { from: "Wallet", to: "VNPAY", dashed: true, label: "nap tien" },
    { from: "Beans", to: "Wallet", dashed: true, label: "tru vi" },
    { from: "Enroll", to: "Wallet", dashed: true, label: "kiem tra vi" },
    { from: "Learn", to: "Progress", dashed: true, label: "cap nhat" },
    { from: "TakeTest", to: "Progress", dashed: true, label: "100%" },
    { from: "TakeTest", to: "AI", dashed: true, label: "AI cau hoi" },
    { from: "Writing", to: "AI", dashed: true, label: "cham bai" },
    { from: "Speaking", to: "AI", dashed: true, label: "cham noi" },
    { from: "Cert", to: "Mail", dashed: true, label: "gui mail" },
  ],
});

diagram({
  file: "use-case-teacher.svg",
  titleText: "Use-case role Teacher",
  width: 1600,
  height: 1060,
  system: { x: 290, y: 110, w: 980, h: 820, label: "FinnCenter Teacher" },
  actors: [{ id: "Teacher", label: "Teacher", x: 120, y: 520 }],
  externals: [{ id: "AI", label: "Ollama AI", x: 1460, y: 600 }],
  useCases: [
    { id: "Profile", label: "Quan ly ho so ca nhan", x: 500, y: 210 },
    { id: "CreateCourse", label: "Tao khoa hoc", x: 810, y: 210 },
    { id: "EditCourse", label: "Sua/khoa/xoa khoa hoc", x: 1120, y: 210 },
    { id: "UploadThumb", label: "Upload thumbnail", x: 500, y: 350 },
    { id: "Module", label: "Quan ly module", x: 810, y: 350 },
    { id: "Lesson", label: "Quan ly lesson", x: 1120, y: 350 },
    { id: "UploadVideo", label: "Upload video bai hoc", x: 500, y: 490 },
    { id: "CreateTest", label: "Tao bai test khoa hoc", x: 810, y: 490 },
    { id: "Question", label: "Quan ly cau hoi va dap an", x: 1120, y: 490 },
    { id: "Audio", label: "Upload audio cau hoi", x: 500, y: 630 },
    { id: "Material", label: "Upload tai lieu test", x: 810, y: 630 },
    { id: "Preview", label: "Preview/lam thu test", x: 1120, y: 630 },
    { id: "Students", label: "Xem va quan ly hoc vien", x: 500, y: 770 },
    { id: "Revenue", label: "Xem doanh thu", x: 810, y: 770 },
    { id: "Withdraw", label: "Gui yeu cau rut doanh thu", x: 1120, y: 770 },
  ],
  links: [
    ...["Profile", "CreateCourse", "EditCourse", "UploadThumb", "Module", "Lesson", "UploadVideo", "CreateTest", "Question", "Audio", "Material", "Preview", "Students", "Revenue", "Withdraw"].map((to) => ({ from: "Teacher", to })),
    { from: "CreateCourse", to: "EditCourse", dashed: true, label: "cho duyet" },
    { from: "Module", to: "Lesson", dashed: true, label: "include" },
    { from: "Lesson", to: "UploadVideo", dashed: true, label: "include" },
    { from: "Question", to: "Audio", dashed: true, label: "optional" },
    { from: "Question", to: "Material", dashed: true, label: "optional" },
    { from: "Preview", to: "AI", dashed: true, label: "AI test" },
    { from: "Withdraw", to: "Revenue", dashed: true, label: "dua tren" },
  ],
});

diagram({
  file: "use-case-admin.svg",
  titleText: "Use-case role Admin",
  width: 1600,
  height: 1060,
  system: { x: 290, y: 110, w: 980, h: 820, label: "FinnCenter Admin" },
  actors: [{ id: "Admin", label: "Admin", x: 120, y: 520 }],
  externals: [
    { id: "Mail", label: "Email service", x: 1460, y: 450 },
    { id: "AI", label: "Ollama AI", x: 1460, y: 760 },
  ],
  useCases: [
    { id: "Dashboard", label: "Xem analytics dashboard", x: 500, y: 210 },
    { id: "User", label: "Quan ly user, role, ban/unban", x: 810, y: 210 },
    { id: "Language", label: "Quan ly ngon ngu hoc", x: 1120, y: 210 },
    { id: "Entrance", label: "Bat/tat dang ky giao vien", x: 500, y: 350 },
    { id: "ReviewTeacher", label: "Duyet/tu choi ho so giao vien", x: 810, y: 350 },
    { id: "Approval", label: "Bat/tat auto approval khoa hoc", x: 1120, y: 350 },
    { id: "ReviewCourse", label: "Duyet/tu choi/khoa/mo khoa hoc", x: 500, y: 490 },
    { id: "Tests", label: "Tao public practice/teacher entrance test", x: 810, y: 490 },
    { id: "SpeakingConfig", label: "Cau hinh Speaking AI", x: 1120, y: 490 },
    { id: "Withdraw", label: "Xu ly rut doanh thu", x: 500, y: 630 },
    { id: "EmailLog", label: "Theo doi email/notification", x: 810, y: 630 },
    { id: "AntiCheat", label: "Xem anti-cheat", x: 1120, y: 630 },
    { id: "Health", label: "Kiem tra health/database", x: 810, y: 770 },
  ],
  links: [
    ...["Dashboard", "User", "Language", "Entrance", "ReviewTeacher", "Approval", "ReviewCourse", "Tests", "SpeakingConfig", "Withdraw", "EmailLog", "AntiCheat", "Health"].map((to) => ({ from: "Admin", to })),
    { from: "Entrance", to: "Mail", dashed: true, label: "thong bao" },
    { from: "ReviewTeacher", to: "Mail", dashed: true, label: "ket qua" },
    { from: "Withdraw", to: "Mail", dashed: true, label: "notify" },
    { from: "Tests", to: "AI", dashed: true, label: "AI mode" },
  ],
});

flowDiagram({
  file: "use-case-flow-learning-test.svg",
  titleText: "Luong quan trong: Mua khoa hoc, hoc bai, lam test",
  width: 1700,
  height: 900,
  system: { x: 240, y: 120, w: 1220, h: 620, label: "Luong hoc vien" },
  actors: [{ id: "Student", label: "Student", x: 100, y: 430 }],
  externals: [
    { id: "VNPAY", label: "VNPAY", x: 1590, y: 280 },
    { id: "AI", label: "Ollama AI", x: 1590, y: 490 },
    { id: "Mail", label: "Email service", x: 1590, y: 680 },
  ],
  boxes: [
    { id: "Browse", label: "1. Tim va xem khoa hoc", x: 390, y: 250 },
    { id: "Wallet", label: "2. Kiem tra so du vi", x: 660, y: 250 },
    { id: "Enroll", label: "3. Mua/dang ky khoa hoc", x: 930, y: 250 },
    { id: "Learn", label: "4. Hoc lesson", x: 1200, y: 250 },
    { id: "TopUp", label: "Nap vi neu thieu tien", x: 660, y: 430, fill: "#fff7ed", stroke: "#ea580c" },
    { id: "Complete", label: "5. Hoan thanh lesson", x: 390, y: 610 },
    { id: "Unlock", label: "6. Mo test khi tien do 100%", x: 660, y: 610 },
    { id: "Submit", label: "7. Nop bai test", x: 930, y: 610 },
    { id: "Result", label: "8. Luu ket qua", x: 1200, y: 610 },
    { id: "Cert", label: "Gui chung chi neu dat", x: 1350, y: 430 },
  ],
  links: [
    { from: "Student", to: "Browse" },
    { from: "Browse", to: "Wallet" },
    { from: "Wallet", to: "Enroll" },
    { from: "Enroll", to: "Learn" },
    { from: "Wallet", to: "TopUp", dashed: true, label: "thieu so du" },
    { from: "TopUp", to: "VNPAY", dashed: true, label: "thanh toan" },
    { from: "TopUp", to: "Enroll" },
    { from: "Learn", to: "Complete" },
    { from: "Complete", to: "Unlock" },
    { from: "Unlock", to: "Submit" },
    { from: "Submit", to: "Result" },
    { from: "Submit", to: "AI", dashed: true, label: "AI cau hoi" },
    { from: "Result", to: "Cert", dashed: true, label: "neu dat" },
    { from: "Cert", to: "Mail", dashed: true, label: "gui email" },
  ],
});

flowDiagram({
  file: "use-case-flow-ai.svg",
  titleText: "Luong quan trong: AI Writing/Speaking va hat dau",
  width: 1500,
  height: 820,
  system: { x: 240, y: 120, w: 1000, h: 540, label: "AI practice" },
  actors: [
    { id: "User", label: "Student/Teacher", x: 100, y: 330 },
    { id: "Admin", label: "Admin", x: 100, y: 560 },
  ],
  externals: [{ id: "AI", label: "Ollama AI", x: 1380, y: 390 }],
  boxes: [
    { id: "Beans", label: "Mua hat dau bang vi", x: 430, y: 240 },
    { id: "Prompt", label: "Tao de Writing/Speaking", x: 730, y: 240 },
    { id: "Free", label: "Cham diem mien phi", x: 1030, y: 240 },
    { id: "Check", label: "Kiem tra hat dau", x: 430, y: 470 },
    { id: "Detail", label: "Nhan xet AI chi tiet", x: 730, y: 470 },
    { id: "Save", label: "Luu AiAssessment", x: 1030, y: 470 },
  ],
  links: [
    { from: "User", to: "Beans" },
    { from: "User", to: "Prompt" },
    { from: "User", to: "Free" },
    { from: "User", to: "Detail" },
    { from: "Admin", to: "Prompt" },
    { from: "Admin", to: "Free" },
    { from: "Admin", to: "Detail" },
    { from: "Prompt", to: "AI", dashed: true, label: "generate" },
    { from: "Free", to: "AI", dashed: true, label: "score only" },
    { from: "Detail", to: "Check", dashed: true, label: "tru hat dau" },
    { from: "Detail", to: "AI", dashed: true, label: "feedback" },
    { from: "Free", to: "Save" },
    { from: "Detail", to: "Save" },
  ],
});

flowDiagram({
  file: "use-case-flow-teacher-application.svg",
  titleText: "Luong quan trong: Dang ky giao vien",
  width: 1700,
  height: 920,
  system: { x: 240, y: 120, w: 1220, h: 650, label: "Teacher onboarding" },
  actors: [
    { id: "Applicant", label: "Student/Teacher", x: 100, y: 410 },
    { id: "Admin", label: "Admin", x: 100, y: 670 },
  ],
  externals: [
    { id: "AI", label: "Ollama AI", x: 1590, y: 370 },
    { id: "Mail", label: "Email service", x: 1590, y: 660 },
  ],
  boxes: [
    { id: "Open", label: "Admin bat dang ky giao vien", x: 410, y: 240 },
    { id: "Form", label: "Ung vien chon ngon ngu", x: 690, y: 240 },
    { id: "Upload", label: "Upload 1-3 chung chi", x: 970, y: 240 },
    { id: "Create", label: "Tao ho so", x: 1250, y: 240 },
    { id: "Entrance", label: "Lam bai test dau vao neu co", x: 410, y: 470 },
    { id: "Autosave", label: "Autosave bai lam", x: 690, y: 470 },
    { id: "Anti", label: "Ghi anti-cheat", x: 970, y: 470 },
    { id: "Submit", label: "Nop ho so/bai test", x: 1250, y: 470 },
    { id: "Review", label: "Admin review ho so", x: 550, y: 670 },
    { id: "Approve", label: "Approve: chuyen role TEACHER", x: 880, y: 670 },
    { id: "Reject", label: "Reject: luu ly do", x: 1190, y: 670 },
  ],
  links: [
    { from: "Admin", to: "Open" },
    { from: "Applicant", to: "Form" },
    { from: "Form", to: "Upload" },
    { from: "Upload", to: "Create" },
    { from: "Create", to: "Entrance", dashed: true, label: "co test" },
    { from: "Entrance", to: "Autosave" },
    { from: "Entrance", to: "Anti" },
    { from: "Entrance", to: "AI", dashed: true, label: "AI cau hoi" },
    { from: "Create", to: "Submit" },
    { from: "Entrance", to: "Submit" },
    { from: "Submit", to: "Review" },
    { from: "Admin", to: "Review" },
    { from: "Review", to: "Approve" },
    { from: "Review", to: "Reject" },
    { from: "Approve", to: "Mail", dashed: true, label: "notify" },
    { from: "Reject", to: "Mail", dashed: true, label: "notify" },
  ],
});

flowDiagram({
  file: "use-case-flow-revenue.svg",
  titleText: "Luong quan trong: Doanh thu va rut tien giao vien",
  width: 1600,
  height: 880,
  system: { x: 260, y: 120, w: 1080, h: 600, label: "Revenue workflow" },
  actors: [
    { id: "Student", label: "Student", x: 100, y: 260 },
    { id: "Teacher", label: "Teacher", x: 100, y: 520 },
    { id: "Admin", label: "Admin", x: 100, y: 730 },
  ],
  externals: [{ id: "VNPAY", label: "VNPAY", x: 1480, y: 260 }],
  boxes: [
    { id: "TopUp", label: "Hoc vien nap vi", x: 430, y: 240 },
    { id: "Buy", label: "Hoc vien mua khoa hoc", x: 700, y: 240 },
    { id: "Split", label: "Chia doanh thu 70/30", x: 970, y: 240 },
    { id: "View", label: "Giao vien xem doanh thu kha dung", x: 430, y: 500 },
    { id: "Request", label: "Tao yeu cau rut tien", x: 700, y: 500 },
    { id: "Approve", label: "Admin duyet yeu cau", x: 970, y: 500 },
    { id: "Pay", label: "Xac nhan da thanh toan", x: 700, y: 660 },
    { id: "Reject", label: "Tu choi kem ly do", x: 970, y: 660 },
  ],
  links: [
    { from: "Student", to: "TopUp" },
    { from: "TopUp", to: "VNPAY", dashed: true, label: "thanh toan" },
    { from: "TopUp", to: "Buy" },
    { from: "Buy", to: "Split" },
    { from: "Split", to: "View" },
    { from: "Teacher", to: "View" },
    { from: "View", to: "Request" },
    { from: "Request", to: "Approve" },
    { from: "Admin", to: "Approve" },
    { from: "Approve", to: "Pay" },
    { from: "Approve", to: "Reject" },
  ],
});

console.log(`Generated SVG diagrams in ${outDir}`);
