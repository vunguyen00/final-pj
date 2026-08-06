const path = require('path');
const pptxgen = require(path.join(__dirname, '..', '.generated', 'pptx-tools', 'node_modules', 'pptxgenjs'));

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'FinnCenter';
pptx.subject = 'Tác nhân, chức năng và quy trình nghiệp vụ FinnCenter';
pptx.title = 'FinnCenter — Tác nhân, chức năng và quy trình nghiệp vụ';
pptx.company = 'FinnCenter';
pptx.lang = 'vi-VN';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'vi-VN',
};
pptx.defineSlideMaster({
  title: 'BASE',
  background: { color: 'F5F7FB' },
  objects: [
    { rect: { x: 0, y: 0, w: 13.333, h: 0.10, fill: { color: '14B8A6' }, line: { color: '14B8A6' } } },
    { text: { text: 'FINNCENTER · PHÂN TÍCH NGHIỆP VỤ', options: { x: 0.55, y: 7.14, w: 5.1, h: 0.18, fontFace: 'Aptos', fontSize: 8, bold: true, color: '6B7280', margin: 0 } } },
    { text: { text: 'Nguồn: code hiện tại · 05/08/2026', options: { x: 9.40, y: 7.14, w: 3.35, h: 0.18, fontFace: 'Aptos', fontSize: 8, color: '94A3B8', align: 'right', margin: 0 } } },
  ],
  slideNumber: { x: 12.80, y: 7.10, w: 0.30, h: 0.20, fontFace: 'Aptos', fontSize: 8, color: '64748B', align: 'right' },
});

const C = {
  navy: '0F172A',
  slate: '334155',
  muted: '64748B',
  line: 'D9E1EC',
  white: 'FFFFFF',
  bg: 'F5F7FB',
  teal: '14B8A6',
  tealDark: '0F766E',
  blue: '2563EB',
  blueLight: 'DBEAFE',
  orange: 'F97316',
  orangeLight: 'FFEDD5',
  purple: '7C3AED',
  purpleLight: 'EDE9FE',
  red: 'DC2626',
  redLight: 'FEE2E2',
  green: '16A34A',
  greenLight: 'DCFCE7',
  yellow: 'CA8A04',
  yellowLight: 'FEF9C3',
};

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: options.fontFace || 'Aptos',
    fontSize: options.fontSize || 14,
    color: options.color || C.slate,
    bold: options.bold || false,
    align: options.align || 'left',
    valign: options.valign || 'mid',
    margin: options.margin === undefined ? 0 : options.margin,
    breakLine: false,
    fit: 'shrink',
    ...options,
  });
}

function pill(slide, text, x, y, w, color, fill = C.white, fontSize = 10) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.34,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color, width: 1.1 },
  });
  addText(slide, text, x + 0.08, y + 0.02, w - 0.16, 0.29, {
    fontSize, bold: true, color, align: 'center',
  });
}

function header(slide, title, actor, routes, accent = C.teal, kicker = 'TRANG / CHỨC NĂNG') {
  addText(slide, kicker, 0.55, 0.30, 2.75, 0.24, { fontSize: 10, bold: true, color: accent, charSpacing: 1.5 });
  addText(slide, title, 0.55, 0.60, 9.7, 0.52, { fontSize: 26, bold: true, color: C.navy });
  pill(slide, `TÁC NHÂN · ${actor}`, 10.45, 0.42, 2.30, accent, C.white, 9.3);
  let x = 0.55;
  routes.slice(0, 4).forEach((route) => {
    const w = Math.min(2.8, Math.max(1.25, route.length * 0.075 + 0.35));
    pill(slide, route, x, 1.18, w, C.muted, 'EEF2F7', 8.8);
    x += w + 0.12;
  });
}

function card(slide, x, y, w, h, title, accent = C.teal, fill = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: C.line, width: 0.8 },
    shadow: { type: 'outer', color: 'B6C2D2', opacity: 0.15, blur: 1.3, angle: 45, distance: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: accent }, line: { color: accent } });
  addText(slide, title, x + 0.22, y + 0.14, w - 0.38, 0.28, { fontSize: 13, bold: true, color: C.navy });
}

function iconBullet(slide, text, x, y, w, accent, index) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y: y + 0.03, w: 0.25, h: 0.25,
    fill: { color: accent }, line: { color: accent },
  });
  addText(slide, String(index), x, y + 0.035, 0.25, 0.22, { fontSize: 8.5, bold: true, color: C.white, align: 'center' });
  addText(slide, text, x + 0.36, y, w - 0.36, 0.40, { fontSize: 12.2, color: C.slate, valign: 'top', breakLine: false });
}

function processNode(slide, text, x, y, w, h, accent, index) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.06,
    fill: { color: C.white },
    line: { color: accent, width: 1.2 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + 0.10, y: y + 0.12, w: 0.34, h: 0.34,
    fill: { color: accent }, line: { color: accent },
  });
  addText(slide, String(index), x + 0.10, y + 0.12, 0.34, 0.34, { fontSize: 9, bold: true, color: C.white, align: 'center' });
  addText(slide, text, x + 0.53, y + 0.08, w - 0.63, h - 0.16, { fontSize: 11.6, color: C.navy, bold: true, valign: 'mid' });
}

function actorProcessSlide({ title, actor, routes, summary, usage, steps, control, accent = C.teal, notes }) {
  const slide = pptx.addSlide('BASE');
  header(slide, title, actor, routes, accent);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55, y: 1.67, w: 12.20, h: 0.70,
    rectRadius: 0.06,
    fill: { color: 'E8EEF7' }, line: { color: 'D6E0ED', width: 0.8 },
  });
  addText(slide, 'MỤC TIÊU', 0.78, 1.82, 1.15, 0.22, { fontSize: 9.5, bold: true, color: accent, charSpacing: 1.1 });
  addText(slide, summary, 1.80, 1.76, 10.65, 0.42, { fontSize: 13.4, color: C.navy, bold: true });

  card(slide, 0.55, 2.62, 4.08, 3.72, 'Cách sử dụng / chức năng chính', accent);
  usage.slice(0, 6).forEach((item, i) => iconBullet(slide, item, 0.82, 3.10 + i * 0.49, 3.55, accent, i + 1));

  card(slide, 4.86, 2.62, 7.89, 3.72, 'Quy trình nghiệp vụ', accent);
  const row1 = steps.slice(0, 3);
  const row2 = steps.slice(3, 6);
  const nodeW = 2.18;
  row1.forEach((step, i) => {
    const x = 5.14 + i * 2.47;
    processNode(slide, step, x, 3.12, nodeW, 0.78, accent, i + 1);
    if (i < row1.length - 1) slide.addShape(pptx.ShapeType.chevron, { x: x + 2.22, y: 3.36, w: 0.20, h: 0.26, fill: { color: accent }, line: { color: accent } });
  });
  row2.forEach((step, i) => {
    const x = 5.14 + i * 2.47;
    processNode(slide, step, x, 4.32, nodeW, 0.78, accent, i + 4);
    if (i < row2.length - 1) slide.addShape(pptx.ShapeType.chevron, { x: x + 2.22, y: 4.56, w: 0.20, h: 0.26, fill: { color: accent }, line: { color: accent } });
  });
  if (steps.length > 3) {
    slide.addShape(pptx.ShapeType.line, { x: 11.45, y: 3.90, w: 0, h: 0.42, line: { color: accent, width: 1.3, beginArrowType: 'none', endArrowType: 'triangle' } });
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.99, y: 5.42, w: 7.59, h: 0.78,
    rectRadius: 0.05,
    fill: { color: 'FFF7ED' }, line: { color: 'FED7AA', width: 0.9 },
  });
  addText(slide, 'ĐIỂM KIỂM SOÁT', 5.18, 5.68, 1.42, 0.18, { fontSize: 9, bold: true, color: C.orange, charSpacing: 0.9 });
  addText(slide, control, 6.50, 5.49, 5.85, 0.54, { fontSize: 11.2, color: C.slate, bold: true });
  if (notes) slide.addNotes(notes);
  return slide;
}

// 1. Cover
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.arc, { x: 8.25, y: -1.45, w: 6.1, h: 6.1, adjustPoint: 0.25, rotate: 18, fill: { color: C.teal, transparency: 35 }, line: { color: C.teal, transparency: 100 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.65, y: 4.65, w: 2.5, h: 2.5, fill: { color: C.orange, transparency: 20 }, line: { color: C.orange, transparency: 100 } });
  pill(slide, 'ĐỒ ÁN FINNCENTER', 0.72, 0.68, 2.18, C.teal, C.navy, 10);
  addText(slide, 'Tác nhân, chức năng\nvà quy trình nghiệp vụ', 0.72, 1.48, 8.8, 1.65, { fontSize: 34, bold: true, color: C.white, valign: 'top', breakLine: true, margin: 0 });
  addText(slide, 'Website học ngoại ngữ tích hợp AI · LMS + Marketplace', 0.75, 3.35, 7.5, 0.42, { fontSize: 17, color: 'B9C6D8' });
  addText(slide, '42 trang  ·  80 API route  ·  42 mô hình dữ liệu', 0.75, 4.10, 7.9, 0.38, { fontSize: 14, color: '7DD3FC', bold: true });
  const labels = [
    ['KHÁCH / NGƯỜI DÙNG', C.blue],
    ['HỌC VIÊN', C.teal],
    ['ỨNG VIÊN / GIẢNG VIÊN', C.orange],
    ['QUẢN TRỊ VIÊN', C.purple],
  ];
  labels.forEach((it, i) => pill(slide, it[0], 0.75 + (i % 2) * 2.85, 5.05 + Math.floor(i / 2) * 0.56, 2.55, it[1], C.navy, 9));
  addText(slide, 'Bản chuẩn bị thuyết trình · 05/08/2026', 0.75, 6.65, 4.8, 0.28, { fontSize: 10, color: '94A3B8' });
  slide.addNotes('Mở đầu: FinnCenter là hệ thống học ngoại ngữ kết hợp marketplace, LMS, AI và thanh toán trực tiếp. Bài trình bày đi theo góc nhìn tác nhân và luồng nghiệp vụ.');
}

// 2. Actor map
{
  const slide = pptx.addSlide('BASE');
  header(slide, 'Bản đồ tác nhân của hệ thống', 'TOÀN HỆ THỐNG', ['/public', '/student', '/teacher', '/admin'], C.blue, 'TỔNG QUAN');
  addText(slide, 'Mỗi tác nhân có một không gian thao tác riêng, liên kết bằng dữ liệu khóa học, thanh toán, đánh giá và phê duyệt.', 0.55, 1.70, 12.0, 0.45, { fontSize: 14, color: C.slate, bold: true });
  const actors = [
    { x: 0.60, color: C.blue, title: 'KHÁCH / NGƯỜI DÙNG', sub: 'Khám phá · đăng ký · xác thực', items: ['Marketplace công khai', 'Đăng ký / OTP / đăng nhập', 'Hồ sơ và thông báo'] },
    { x: 3.70, color: C.teal, title: 'HỌC VIÊN', sub: 'Mua · học · thi · dùng AI', items: ['Học và theo dõi tiến độ', 'Test · kết quả · chứng nhận', 'Hoàn tiền / báo cáo'] },
    { x: 6.80, color: C.orange, title: 'GIẢNG VIÊN', sub: 'Sản xuất · vận hành · doanh thu', items: ['Hồ sơ / kỳ thi bàn giấy', 'Khóa học · bài học · test', 'Rút tiền / khiếu nại'] },
    { x: 9.90, color: C.purple, title: 'QUẢN TRỊ VIÊN', sub: 'Phê duyệt · kiểm soát · phân tích', items: ['Lời mời · hồ sơ · khóa học', 'Hoàn tiền · rút tiền · báo cáo', 'Analytics và cấu hình'] },
  ];
  actors.forEach((a) => {
    card(slide, a.x, 2.40, 2.78, 3.45, a.title, a.color);
    addText(slide, a.sub, a.x + 0.22, 2.92, 2.33, 0.48, { fontSize: 11.5, color: a.color, bold: true, valign: 'top' });
    a.items.forEach((t, i) => iconBullet(slide, t, a.x + 0.22, 3.67 + i * 0.56, 2.35, a.color, i + 1));
  });
  slide.addShape(pptx.ShapeType.roundRect, { x: 1.25, y: 6.15, w: 10.85, h: 0.56, rectRadius: 0.05, fill: { color: 'E9EEF6' }, line: { color: 'CBD5E1' } });
  addText(slide, 'TÁC NHÂN TÍCH HỢP', 1.50, 6.30, 1.55, 0.18, { fontSize: 9, bold: true, color: C.muted });
  addText(slide, 'VNPay · Ollama AI · SMTP/Nodemailer · Trình duyệt (thiết bị tin cậy, microphone, Web Worker)', 3.10, 6.22, 8.50, 0.32, { fontSize: 12, color: C.navy, bold: true });
  slide.addNotes('Giải thích nhanh 4 nhóm người dùng và nhóm tích hợp. Đây là khung để theo dõi các trang sau.');
}

actorProcessSlide({
  title: 'Khu vực công khai: khám phá trước khi đăng nhập',
  actor: 'KHÁCH',
  routes: ['/', '/courses', '/teachers', '/top-students', '/about'],
  summary: 'Giúp khách hiểu giá trị hệ thống, tìm khóa học phù hợp và chuyển đổi thành người dùng đăng ký.',
  usage: [
    'Xem khóa học và giảng viên nổi bật trên trang chủ.',
    'Tìm kiếm, lọc ngôn ngữ, trình độ, loại khóa và sắp xếp giá.',
    'Mở chi tiết để xem chương, bài học, test, đánh giá và học phí.',
    'Xem hồ sơ giảng viên, bảng xếp hạng và trang giới thiệu.',
  ],
  steps: ['Truy cập trang công khai', 'Tìm / lọc khóa học', 'Xem chi tiết & đánh giá', 'Chọn mua hoặc học', 'Hệ thống yêu cầu đăng nhập', 'Chuyển sang đăng ký / đăng nhập'],
  control: 'Chỉ hiển thị khóa ACTIVE; khóa chưa công khai chỉ chủ sở hữu hoặc admin được xem trước.',
  accent: C.blue,
  notes: 'Demo nhanh marketplace: tìm theo ngôn ngữ, trình độ, mở chi tiết khóa và chỉ ra điểm chuyển đổi sang đăng nhập.',
});

actorProcessSlide({
  title: 'Tài khoản, xác thực và hồ sơ cá nhân',
  actor: 'NGƯỜI DÙNG',
  routes: ['/auth/register', '/auth/login', '/auth/forgot-password', '/profile'],
  summary: 'Tạo danh tính an toàn, xác thực email và chỉ cho phép một thiết bị có phiên đăng nhập hoạt động.',
  usage: [
    'Đăng ký bằng tên, email, mật khẩu mạnh và OTP 6 số.',
    'Đăng nhập; hệ thống chặn email chưa xác thực hoặc tài khoản bị khóa.',
    'Quên mật khẩu qua OTP mà không tiết lộ email có tồn tại.',
    'Thiết bị lạ phải xác nhận qua liên kết email trong 15 phút.',
    'Thiết bị đã xác nhận được ghi nhớ; đăng nhập mới thu hồi phiên cũ.',
  ],
  steps: ['Nhập email + mật khẩu', 'Kiểm tra tài khoản / rate limit', 'Nhận diện thiết bị tin cậy', 'Thiết bị lạ → gửi email', 'Người dùng xác nhận', 'Tạo 1 session, thu hồi session cũ'],
  control: 'scrypt + salt, HMAC token gắn session, trusted-device cookie, authVersion và chỉ một phiên hoạt động.',
  accent: C.blue,
  notes: 'Nhấn mạnh tài khoản mới mặc định là STUDENT và role quyết định khu vực được truy cập.',
});

actorProcessSlide({
  title: 'Dashboard học viên và “Khóa học của tôi”',
  actor: 'HỌC VIÊN',
  routes: ['/student', '/my-courses'],
  summary: 'Cho học viên biết đang học gì, tiến độ ra sao và hành động tiếp theo cần thực hiện.',
  usage: [
    'Xem tiến độ trung bình, khóa đang học và khóa đã hoàn thành.',
    'Tiếp tục đúng bài học gần nhất từ dashboard.',
    'Xem hoạt động 7 ngày, test gần đây và điểm AI còn lại.',
    'Mở “Khóa học của tôi” để lọc đang học / hoàn thành.',
    'Theo dõi quyền học bị tạm khóa khi hoàn tiền đang chờ xử lý.',
  ],
  steps: ['Đăng nhập STUDENT', 'Tải enrollment & tiến độ', 'Tổng hợp hoạt động 7 ngày', 'Hiển thị hành động tiếp theo', 'Chọn khóa cần tiếp tục', 'Đi vào màn hình học'],
  control: 'Giảng viên có thể dùng chế độ học thử; enrollment đang hoàn tiền sẽ bị tạm khóa quyền học.',
  accent: C.teal,
  notes: 'Trang này là điểm vào chính của học viên. Dùng nó để dẫn sang luồng mua, học, thi và kết quả.',
});

actorProcessSlide({
  title: 'Mua khóa học và thanh toán trực tiếp qua VNPay',
  actor: 'HỌC VIÊN',
  routes: ['/courses/[id]', '/api/courses/[id]/enroll', '/api/payments/vnpay-*'],
  summary: 'Ghi danh khóa miễn phí ngay; với khóa trả phí, tạo thanh toán VNPay và chỉ cấp quyền học sau khi xác thực thành công.',
  usage: [
    'Chọn khóa học từ marketplace và nhấn mua / đăng ký.',
    'Khóa miễn phí được ghi danh ngay; khóa trả phí chuyển sang VNPay.',
    'Hoàn tất giao dịch rồi quay lại website.',
    'Sau thành công, khóa xuất hiện trong “Khóa học của tôi”.',
    'Doanh thu giảng viên được ghi nhận theo tỷ lệ 70/30.',
  ],
  steps: ['Kiểm tra quyền & giá khóa', 'Tạo Payment PENDING', 'Ký tham số VNPay', 'VNPay return + IPN', 'Xác thực chữ ký / số tiền', 'Tạo Order + Enrollment'],
  control: 'Mã giao dịch duy nhất, chống ghi nhận lặp; hệ thống hiện không còn ví VND nội bộ.',
  accent: C.teal,
  notes: 'Đây là thay đổi hiện hành: thanh toán khóa học trực tiếp qua VNPay, không trừ ví nội bộ.',
});

actorProcessSlide({
  title: 'Học bài và xác minh tiến độ',
  actor: 'HỌC VIÊN',
  routes: ['/student/hoc-bai', '/api/learning/lessons/[id]/*'],
  summary: 'Theo dõi tiến độ thật, hạn chế đánh dấu hoàn thành giả và mở bài test khi hoàn tất 100% bài học.',
  usage: [
    'Chọn chương và bài học theo thứ tự trong khóa đã ghi danh.',
    'Bài không video: học tối thiểu 3 phút trước khi hoàn thành.',
    'Bài có video: xem liên tục, heartbeat và không tua vượt phần đã xem.',
    'Theo dõi bài chưa học / đang học / đã hoàn thành.',
    'Đạt 100% thì chuyển sang bài test của khóa.',
  ],
  steps: ['Kiểm tra enrollment', 'Ghi nhận bắt đầu bài', 'Theo dõi thời gian / video', 'Máy chủ xác minh điều kiện', 'Đánh dấu lesson hoàn thành', 'Tính lại % và mở test'],
  control: 'Video cần heartbeat mới, xem ≥90%, đến gần cuối và không vi phạm tua; refund pending chặn truy cập.',
  accent: C.teal,
  notes: 'Nêu hai nhánh: bài văn bản tối thiểu 3 phút và bài video có heartbeat, chống tua.',
});

actorProcessSlide({
  title: 'Bài test → kết quả → chứng nhận → đánh giá',
  actor: 'HỌC VIÊN',
  routes: ['/student/tests', '/student/results', '/student/tests/[id]/result/[attemptId]'],
  summary: 'Đánh giá đầu ra khóa học, lưu lịch sử và chỉ công nhận hoàn thành khi đạt ngưỡng cấu hình.',
  usage: [
    'Chọn test COURSE hoặc PUBLIC_PRACTICE đủ điều kiện.',
    'Làm câu trắc nghiệm, đúng/sai, điền, tự luận hoặc speaking.',
    'Theo dõi đồng hồ; hệ thống tự nộp khi hết giờ.',
    'Xem điểm, đáp án, tiêu chí AI và gợi ý cải thiện.',
    'Khi đạt COURSE test: nhận chứng nhận và mở quyền đánh giá.',
  ],
  steps: ['Kiểm tra đã học 100%', 'Tạo lượt thi có token ký', 'Lưu đáp án & đếm giờ', 'Chấm tự động + AI', 'Lưu attempt & kết quả', 'Đạt → chứng nhận / review'],
  control: 'Tổng điểm câu hỏi phải bằng 100; lưu từng attempt; AI feedback chi tiết cần điểm AI với Student/Teacher.',
  accent: C.teal,
  notes: 'Mô tả chuỗi giá trị hoàn chỉnh: học đủ, thi, đạt, chứng nhận, sau đó mới được review.',
});

actorProcessSlide({
  title: 'Writing AI, Speaking AI và điểm dùng AI',
  actor: 'HỌC VIÊN / GIẢNG VIÊN',
  routes: ['/student/writing-ai', '/student/speaking-ai', '/student/wallet', '/student/rewards'],
  summary: 'Cho phép luyện kỹ năng bằng AI theo nhiều ngôn ngữ; tách chế độ chấm điểm và nhận xét chi tiết có tính phí điểm.',
  usage: [
    'Chọn ngôn ngữ, task/chủ đề và tạo đề AI.',
    'Writing: nhập bài; Speaking: ghi âm và tạo transcript.',
    'Chọn chỉ xem điểm hoặc nhận xét chi tiết.',
    'Nhận rubric, lỗi, điểm mạnh/yếu, gợi ý và bài mẫu.',
    'Mua điểm AI trực tiếp qua VNPay; xem lịch sử cộng/trừ.',
  ],
  steps: ['Tạo prompt / topic', 'Người dùng nộp bài / audio', 'Chuẩn hóa dữ liệu đầu vào', 'Ollama đánh giá theo rubric', 'Trừ 3 hoặc 7 điểm', 'Lưu AiAssessment & kết quả'],
  control: 'Writing chi tiết: 3 điểm; Speaking chi tiết: 7 điểm; Admin miễn phí; giá điểm mặc định 1.000 VND.',
  accent: C.teal,
  notes: 'Nhấn mạnh hệ thống hỗ trợ Anh, Trung, Nhật, Hàn và tiêu chí IELTS/HSK/JLPT/TOPIK tương ứng.',
});

actorProcessSlide({
  title: 'Hoàn tiền và báo cáo chất lượng khóa học',
  actor: 'HỌC VIÊN',
  routes: ['/my-courses', '/api/course-refunds', '/api/course-reports'],
  summary: 'Bảo vệ học viên bằng quy trình hoàn tiền có điều kiện và kênh báo cáo nội dung/chất lượng.',
  usage: [
    'Gửi hoàn tiền từ “Khóa học của tôi” và nhập lý do.',
    'Chỉ khóa trả phí, trong 7 ngày, tiến độ không quá 50%.',
    'Quyền học tạm khóa ngay khi yêu cầu chờ xử lý.',
    'Báo cáo toàn khóa hoặc một bài học, chọn nhóm vấn đề.',
    'Theo dõi kết quả qua thông báo hệ thống.',
  ],
  steps: ['Học viên gửi yêu cầu', 'Kiểm tra điều kiện & chống spam', 'Tạm khóa quyền học / tạo report', 'Thông báo admin / giảng viên', 'Admin xử lý & ghi chú', 'Mở lại hoặc hủy quyền'],
  control: 'Mỗi giao dịch chỉ một refund; báo cáo giới hạn 5 lần trong cửa sổ chống spam và cần xác nhận trung thực.',
  accent: C.teal,
  notes: 'Tách rõ refund là nghiệp vụ tài chính; report là nghiệp vụ chất lượng và có thể do giảng viên xem xét trước.',
});

actorProcessSlide({
  title: 'Đăng ký giảng viên và kỳ thi bàn giấy',
  actor: 'ỨNG VIÊN GIẢNG VIÊN',
  routes: ['/teacher-registration', '/api/teacher-applications/*'],
  summary: 'Công bố kỳ thi trực tiếp, nhận hồ sơ đúng thời hạn và để admin duyệt kết quả sau kỳ thi bàn giấy.',
  usage: [
    'Xem thông báo, địa điểm thi, thời gian mở/đóng đăng ký.',
    'Chọn ngôn ngữ giảng dạy và tải 1–3 chứng chỉ.',
    'Đăng ký trực tuyến trong khoảng thời gian cho phép.',
    'Tham dự kỳ thi trên giấy tại địa điểm đã công bố.',
    'Theo dõi trạng thái hồ sơ chờ duyệt / đã duyệt / từ chối.',
  ],
  steps: ['Admin đăng lịch & địa điểm', 'Mở thời gian đăng ký', 'Ứng viên nộp hồ sơ', 'Thi trực tiếp trên giấy', 'Admin đối chiếu kết quả', 'Duyệt → TEACHER'],
  control: 'Không còn đề thi, chấm AI, camera, fullscreen, autosave hoặc anti-cheat trên hệ thống.',
  accent: C.orange,
  notes: 'Nhấn mạnh kỳ thi đã chuyển hoàn toàn sang bàn giấy; hệ thống chỉ quản lý thông báo, đăng ký và kết quả duyệt.',
});

actorProcessSlide({
  title: 'Dashboard, khóa học, chương và bài học',
  actor: 'GIẢNG VIÊN',
  routes: ['/teacher', '/teacher/courses', '/teacher/courses/[courseId]'],
  summary: 'Giảng viên tạo và vận hành nội dung khóa học trong phạm vi ngôn ngữ đã được admin phê duyệt.',
  usage: [
    'Xem số khóa, học viên, doanh thu và báo cáo gần đây.',
    'Tạo/sửa khóa: mô tả, giá, ngôn ngữ, level, category, thumbnail.',
    'Tạo chương và bài học; sắp xếp thứ tự; upload video.',
    'Kiểm tra mức sẵn sàng trước khi gửi công khai.',
    'Theo dõi trạng thái ACTIVE / PENDING / LOCKED / REJECTED.',
  ],
  steps: ['Tạo bản nháp khóa', 'Nhập metadata & thumbnail', 'Tạo module / lesson', 'Kiểm tra ngôn ngữ & nội dung', 'Auto-approve hoặc chờ duyệt', 'ACTIVE → bán / giảng dạy'],
  control: 'Khóa có học viên không xóa vật lý ngay; chuyển PENDING_DELETE để admin duyệt.',
  accent: C.orange,
  notes: 'Trình bày theo vòng đời khóa học: tạo nội dung, kiểm tra sẵn sàng, duyệt, hoạt động, khóa/xóa có kiểm soát.',
});

actorProcessSlide({
  title: 'Quản lý test, học viên và báo cáo khóa học',
  actor: 'GIẢNG VIÊN',
  routes: ['/teacher/tests', '/teacher/students', '/teacher/reports'],
  summary: 'Hoàn thiện đầu ra khóa học, theo dõi người học và phản hồi các vấn đề chất lượng thuộc khóa mình phụ trách.',
  usage: [
    'Tạo một COURSE test cho mỗi khóa và cấu hình điểm đạt/thời gian.',
    'Thêm câu hỏi, đáp án, audio, tài liệu; bảo đảm tổng điểm 100.',
    'Xem học viên theo tên, email hoặc khóa học.',
    'Xem báo cáo, chuyển sang IN_REVIEW và khắc phục nội dung.',
    'Theo dõi khóa bị báo cáo nhiều trên dashboard.',
  ],
  steps: ['Chọn khóa sở hữu', 'Tạo test & câu hỏi', 'Validate cấu trúc / 100 điểm', 'Học viên làm bài', 'Theo dõi học viên & kết quả', 'Nhận report → xem xét'],
  control: 'Giảng viên chỉ thao tác khóa thuộc quyền sở hữu; admin mới có quyền quyết định cuối các báo cáo toàn hệ thống.',
  accent: C.orange,
  notes: 'Liên kết ba việc: tạo chuẩn đầu ra, theo dõi người học, cải thiện chất lượng dựa trên báo cáo.',
});

actorProcessSlide({
  title: 'Doanh thu, tài khoản nhận tiền và khiếu nại',
  actor: 'GIẢNG VIÊN',
  routes: ['/teacher/revenue', '/api/teacher/bank-account/*', '/api/teacher/revenue-withdrawals'],
  summary: 'Tính đúng doanh thu khả dụng, xác minh tài khoản ngân hàng và quản lý vòng đời rút tiền.',
  usage: [
    'Xem doanh số, phần hưởng 70%, tiền khả dụng và tiền đang giữ.',
    'Khai báo tài khoản ngân hàng và xác thực OTP qua email.',
    'Tạo yêu cầu rút không vượt doanh thu khả dụng.',
    'Theo dõi PENDING → APPROVED → PAID/COMPLETED.',
    'Nếu chưa nhận/sai tiền, gửi một khiếu nại kèm bằng chứng.',
  ],
  steps: ['Tính doanh thu hợp lệ', 'Trừ refund & khoản đang giữ', 'OTP xác minh ngân hàng', 'Tạo withdrawal transaction', 'Admin duyệt / chuyển tiền', 'Khiếu nại nếu có sai lệch'],
  control: 'Transaction Serializable, snapshot tài khoản, audit IP/device; khiếu nại chỉ mở sau PAID/COMPLETED.',
  accent: C.orange,
  notes: 'Giải thích khái niệm doanh thu khả dụng và vì sao phải giữ tiền khi có yêu cầu rút đang xử lý.',
});

actorProcessSlide({
  title: 'Quản lý người dùng và các luồng phê duyệt',
  actor: 'QUẢN TRỊ VIÊN',
  routes: ['/admin', '/api/admin/users/*', '/api/admin/teacher-applications/*', '/api/admin/course-approval'],
  summary: 'Kiểm soát quyền truy cập và chất lượng cung ứng trước khi giảng viên hoặc khóa học đi vào hoạt động.',
  usage: [
    'Tìm user, đổi role, khóa/mở tài khoản theo quy tắc an toàn.',
    'Xem hồ sơ, chứng chỉ và đối chiếu kết quả kỳ thi bàn giấy.',
    'Mời giảng viên qua email, tên và ngôn ngữ giảng dạy.',
    'Duyệt/từ chối ứng viên; duyệt sẽ nâng role TEACHER.',
    'Xem trước khóa chờ duyệt hoặc yêu cầu xóa.',
    'Duyệt/từ chối/khóa/mở khóa học và lưu lý do.',
  ],
  steps: ['Đăng lịch thi hoặc tạo lời mời', 'Nhận hồ sơ / người nhận mở email', 'Kiểm tra chứng chỉ / đặt mật khẩu', 'Duyệt hoặc tạo TEACHER', 'Gắn ngôn ngữ giảng dạy', 'Thông báo cho người liên quan'],
  control: 'Không cho tự khóa; không khóa/hạ quyền admin hoạt động cuối cùng; hạ quyền teacher sẽ khóa khóa ACTIVE.',
  accent: C.purple,
  notes: 'Nhấn mạnh admin là điểm kiểm soát cuối cho role giảng viên và vòng đời khóa học.',
});

actorProcessSlide({
  title: 'Hoàn tiền, rút tiền, báo cáo và cấu hình nghiệp vụ',
  actor: 'QUẢN TRỊ VIÊN',
  routes: ['/admin?tab=refunds', '/admin?tab=withdrawals', '/admin?tab=reports'],
  summary: 'Xử lý ngoại lệ tài chính, khiếu nại và chất lượng nội dung; đồng thời điều khiển các chính sách hệ thống.',
  usage: [
    'Duyệt/từ chối refund và ghi chú xử lý ngoài hệ thống.',
    'Kiểm tra withdrawal, duyệt, xác nhận đã chuyển hoặc từ chối.',
    'Xem bằng chứng và giải quyết khiếu nại rút tiền.',
    'Xử lý report theo PENDING / IN_REVIEW / RESOLVED / REJECTED.',
    'Bật/tắt đăng ký giảng viên và tự động duyệt khóa.',
  ],
  steps: ['Mở hàng đợi theo tab', 'Lọc theo trạng thái', 'Kiểm tra tiền / tiến độ / bằng chứng', 'Ra quyết định & ghi chú', 'Cập nhật quyền / trạng thái', 'Gửi notification / email'],
  control: 'Luôn kiểm tra doanh thu hợp lệ trước rút; từ chối refund phải mở lại quyền học; quyết định được lưu vết.',
  accent: C.purple,
  notes: 'Đây là nhóm nghiệp vụ ngoại lệ: tiền, khiếu nại và report. Trọng tâm là kiểm tra trước quyết định và lưu vết sau quyết định.',
});

actorProcessSlide({
  title: 'Analytics quản trị và xuất báo cáo',
  actor: 'QUẢN TRỊ VIÊN',
  routes: ['/admin?tab=analytics', '/api/admin/analytics'],
  summary: 'Biến dữ liệu vận hành thành chỉ số ra quyết định theo khoảng thời gian linh hoạt.',
  usage: [
    'Chọn hôm nay, 7/30 ngày, tuần, tháng, quý, năm hoặc tùy chỉnh.',
    'Theo dõi user, khóa học, ghi danh và tỷ lệ hoàn thành.',
    'Phân tích doanh thu, hoa hồng, AI points, refund và withdrawal.',
    'Theo dõi test, AI, email, lời mời và report khóa học.',
    'Xem xếp hạng và xuất CSV / XLSX / PDF.',
  ],
  steps: ['Chọn khoảng thời gian', 'API tổng hợp dữ liệu', 'Chuẩn hóa theo nhóm chỉ số', 'Hiển thị KPI & xu hướng', 'Drill-down bảng xếp hạng', 'Xuất báo cáo'],
  control: 'Số liệu tài chính tách doanh thu khóa, hoa hồng admin/teacher, refund và doanh thu mua điểm AI.',
  accent: C.purple,
  notes: 'Kết thúc nhóm admin bằng góc nhìn quản trị: quan sát, phát hiện vấn đề và xuất báo cáo phục vụ quyết định.',
});

// 18. External actors
{
  const slide = pptx.addSlide('BASE');
  header(slide, 'Các tác nhân tích hợp và trách nhiệm hệ thống', 'HỆ THỐNG NGOÀI', ['VNPay', 'Ollama', 'SMTP', 'Browser APIs'], C.red, 'KIẾN TRÚC TÍCH HỢP');
  addText(slide, 'FinnCenter điều phối nghiệp vụ; hệ thống ngoài cung cấp thanh toán, AI, email và khả năng đa phương tiện.', 0.55, 1.67, 12.0, 0.42, { fontSize: 14, bold: true, color: C.slate });
  const integrations = [
    { x: 0.60, color: C.blue, title: 'VNPAY', role: 'Thanh toán', items: ['Khóa học trả phí', 'Mua điểm AI', 'Return + IPN', 'Ký / xác thực giao dịch'] },
    { x: 3.74, color: C.purple, title: 'OLLAMA', role: 'Tạo đề & chấm AI', items: ['Writing / Speaking', 'Câu tự luận trong test', 'Rubric đa ngôn ngữ', 'Fallback khi tạo đề lỗi'] },
    { x: 6.88, color: C.orange, title: 'SMTP', role: 'Email nghiệp vụ', items: ['OTP đăng ký / reset', 'Mời giảng viên', 'Xác nhận thiết bị lạ', 'Duyệt hồ sơ / chứng nhận'] },
    { x: 10.02, color: C.teal, title: 'TRÌNH DUYỆT', role: 'Thiết bị & media', items: ['Trusted-device cookie', 'Một session hoạt động', 'Microphone / MediaRecorder', 'Web Worker transcript'] },
  ];
  integrations.forEach((it) => {
    card(slide, it.x, 2.32, 2.72, 3.78, it.title, it.color);
    pill(slide, it.role.toUpperCase(), it.x + 0.22, 2.84, 2.20, it.color, C.white, 8.5);
    it.items.forEach((t, i) => iconBullet(slide, t, it.x + 0.22, 3.45 + i * 0.53, 2.25, it.color, i + 1));
  });
  slide.addShape(pptx.ShapeType.roundRect, { x: 1.30, y: 6.34, w: 10.70, h: 0.48, rectRadius: 0.04, fill: { color: C.redLight }, line: { color: 'FCA5A5' } });
  addText(slide, 'Nguyên tắc: FinnCenter chỉ cập nhật trạng thái nghiệp vụ sau khi đã xác thực phản hồi từ hệ thống tích hợp.', 1.55, 6.42, 10.15, 0.25, { fontSize: 11.5, bold: true, color: C.red, align: 'center' });
  slide.addNotes('Giải thích ranh giới: hệ thống ngoài thực thi dịch vụ, nhưng FinnCenter vẫn chịu trách nhiệm xác thực, idempotency và lưu trạng thái.');
}

// 19. End-to-end flows
{
  const slide = pptx.addSlide('BASE');
  header(slide, 'Ba quy trình nghiệp vụ xuyên suốt', 'NHIỀU TÁC NHÂN', ['Học tập', 'Cung ứng nội dung', 'Tài chính'], C.tealDark, 'TỔNG HỢP');
  const rows = [
    { y: 1.82, color: C.teal, label: 'HỌC TẬP', steps: ['Tìm khóa', 'Thanh toán', 'Học 100%', 'Làm test', 'Chứng nhận', 'Đánh giá'] },
    { y: 3.35, color: C.orange, label: 'CUNG ỨNG', steps: ['Thông báo / mời', 'Đăng ký hồ sơ', 'Thi bàn giấy', 'Admin duyệt', 'Tạo khóa', 'Vận hành'] },
    { y: 4.88, color: C.purple, label: 'TÀI CHÍNH', steps: ['Phát sinh doanh thu', 'Tính 70/30', 'Xác minh ngân hàng', 'Yêu cầu rút', 'Admin chuyển', 'Khiếu nại'] },
  ];
  rows.forEach((row) => {
    pill(slide, row.label, 0.60, row.y + 0.28, 1.35, row.color, C.white, 9.5);
    row.steps.forEach((s, i) => {
      const x = 2.18 + i * 1.75;
      processNode(slide, s, x, row.y, 1.48, 0.82, row.color, i + 1);
      if (i < row.steps.length - 1) slide.addShape(pptx.ShapeType.chevron, { x: x + 1.52, y: row.y + 0.29, w: 0.18, h: 0.24, fill: { color: row.color }, line: { color: row.color } });
    });
  });
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 6.32, w: 11.85, h: 0.45, rectRadius: 0.04, fill: { color: 'E8EEF7' }, line: { color: C.line } });
  addText(slide, 'Mỗi quy trình đều có trạng thái, điều kiện chuyển bước, thông báo và log để truy vết.', 1.05, 6.39, 11.20, 0.23, { fontSize: 12, bold: true, color: C.navy, align: 'center' });
  slide.addNotes('Dùng slide này để tóm tắt: một luồng tạo giá trị cho học viên, một luồng tạo nguồn cung và một luồng phân phối doanh thu.');
}

// 20. Closing / demo plan
{
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  addText(slide, 'Kịch bản demo đề xuất', 0.72, 0.62, 5.7, 0.55, { fontSize: 30, bold: true, color: C.white });
  addText(slide, '12–15 phút · đi theo một hành trình hoàn chỉnh', 0.74, 1.25, 5.6, 0.32, { fontSize: 14, color: '94A3B8' });
  const demo = [
    ['01', 'Khách', 'Tìm khóa → xem chi tiết'],
    ['02', 'Học viên', 'Thanh toán → học → test → kết quả'],
    ['03', 'Ứng viên', 'Xem lịch → nộp hồ sơ → thi bàn giấy'],
    ['04', 'Giảng viên', 'Tạo khóa → nội dung → test'],
    ['05', 'Admin', 'Duyệt → xử lý tài chính → analytics'],
  ];
  demo.forEach((d, i) => {
    const y = 1.95 + i * 0.84;
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y, w: 7.10, h: 0.62, rectRadius: 0.05, fill: { color: i % 2 ? '17243A' : '13263B' }, line: { color: '2B3C52' } });
    addText(slide, d[0], 0.95, y + 0.13, 0.45, 0.28, { fontSize: 11, bold: true, color: C.teal });
    addText(slide, d[1], 1.55, y + 0.10, 1.35, 0.33, { fontSize: 14, bold: true, color: C.white });
    addText(slide, d[2], 3.00, y + 0.10, 4.55, 0.33, { fontSize: 13, color: 'C9D4E3' });
  });
  slide.addShape(pptx.ShapeType.roundRect, { x: 8.45, y: 1.35, w: 4.10, h: 4.60, rectRadius: 0.08, fill: { color: '142238' }, line: { color: C.teal, width: 1.3 } });
  addText(slide, 'Thông điệp chốt', 8.82, 1.78, 3.35, 0.38, { fontSize: 18, bold: true, color: C.teal });
  addText(slide, 'FinnCenter không chỉ cung cấp nội dung học. Hệ thống quản lý trọn vòng đời:', 8.82, 2.35, 3.25, 0.85, { fontSize: 15, color: C.white, bold: true, valign: 'top' });
  ['nguồn cung giảng viên', 'mua – học – thi – chứng nhận', 'AI luyện tập đa ngôn ngữ', 'thanh toán và kiểm soát vận hành'].forEach((t, i) => {
    slide.addShape(pptx.ShapeType.ellipse, { x: 8.83, y: 3.43 + i * 0.48, w: 0.20, h: 0.20, fill: { color: C.orange }, line: { color: C.orange } });
    addText(slide, t, 9.15, 3.36 + i * 0.48, 2.90, 0.32, { fontSize: 12.5, color: 'D9E2EE' });
  });
  addText(slide, 'CẢM ƠN · Q&A', 8.82, 5.35, 3.20, 0.34, { fontSize: 16, bold: true, color: C.white, align: 'center' });
  addText(slide, 'FinnCenter · Đồ án tốt nghiệp', 0.75, 6.92, 4.0, 0.20, { fontSize: 9, color: '64748B' });
  slide.addNotes('Khi demo, ưu tiên một hành trình sâu thay vì mở quá nhiều trang. Chốt bằng giá trị xuyên suốt và mời đặt câu hỏi.');
}

const output = path.join(__dirname, '..', 'deliverables', 'FinnCenter_Tac_nhan_Chuc_nang_Quy_trinh_nghiep_vu.pptx');
pptx.writeFile({ fileName: output });
console.log(output);
