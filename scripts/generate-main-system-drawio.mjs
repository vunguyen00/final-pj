import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outputFile = path.join(projectRoot, "docs", "finncenter-main-system-diagrams.drawio");

const C = {
  navy: { fill: "#0f172a", stroke: "#0f172a", text: "#ffffff" },
  blue: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  teal: { fill: "#ccfbf1", stroke: "#0f766e", text: "#134e4a" },
  green: { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  orange: { fill: "#ffedd5", stroke: "#ea580c", text: "#7c2d12" },
  purple: { fill: "#f3e8ff", stroke: "#9333ea", text: "#581c87" },
  yellow: { fill: "#fef9c3", stroke: "#ca8a04", text: "#713f12" },
  red: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  gray: { fill: "#f8fafc", stroke: "#64748b", text: "#334155" },
  white: { fill: "#ffffff", stroke: "#cbd5e1", text: "#334155" },
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cell(id, value, x, y, w, h, style, parent = "1") {
  return `<mxCell id="${esc(id)}" value="${esc(value)}" style="${esc(style)}" vertex="1" parent="${esc(parent)}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}

function link(id, source, target, value = "", style = "", points = []) {
  const pointXml = points.length
    ? `<Array as="points">${points.map((p) => `<mxPoint x="${p.x}" y="${p.y}"/>`).join("")}</Array>`
    : "";
  return `<mxCell id="${esc(id)}" value="${esc(value)}" style="${esc(style)}" edge="1" parent="1" source="${esc(source)}" target="${esc(target)}"><mxGeometry relative="1" as="geometry">${pointXml}</mxGeometry></mxCell>`;
}

function page(name, id, cells, width = 1800, height = 1100) {
  return `<diagram id="${esc(id)}" name="${esc(name)}"><mxGraphModel dx="${width}" dy="${height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram>`;
}

function boxStyle(color, extra = "") {
  return `rounded=1;whiteSpace=wrap;html=1;fillColor=${color.fill};strokeColor=${color.stroke};fontColor=${color.text};fontSize=16;spacing=8;${extra}`;
}

function title(cells, id, text, width = 1720) {
  cells.push(cell(`${id}-title`, `<b>${text}</b>`, 40, 24, width, 52, boxStyle(C.navy, "fontSize=22;fontStyle=1;")));
}

function section(cells, id, text, x, y, w, h, color = C.gray) {
  cells.push(cell(id, `<b>${text}</b>`, x, y, w, h, `swimlane;horizontal=1;startSize=42;rounded=1;whiteSpace=wrap;html=1;fillColor=${color.fill};swimlaneFillColor=#ffffff;strokeColor=${color.stroke};fontColor=${color.text};fontSize=16;fontStyle=1;`));
}

function arrowStyle(color = "#475569", dashed = false) {
  return `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeWidth=2;strokeColor=${color};fontColor=#334155;fontSize=16;labelBackgroundColor=#ffffff;${dashed ? "dashed=1;dashPattern=5 5;" : ""}`;
}

const sequenceFlows = [
  {
    name: "04 - Trình tự - Đăng ký tài khoản",
    participants: [
      ["user", "Người đăng ký", "actor"], ["ui", "Trang đăng ký", "ui"], ["api", "Hệ thống FinnCenter", "api"],
      ["otp", "Kiểm tra mã xác nhận", "service"], ["mail", "Dịch vụ email", "external"], ["db", "Dữ liệu tài khoản", "db"],
    ],
    messages: [
      ["user", "ui", "Điền tên, email và mật khẩu"],
      ["ui", "api", "Gửi thông tin đăng ký"],
      ["api", "api", "Kiểm tra thông tin có đầy đủ và an toàn", "self"],
      ["api", "db", "Kiểm tra email chưa được sử dụng"],
      ["api", "otp", "Tạo mã xác nhận dùng một lần"],
      ["otp", "mail", "Gửi mã xác nhận gồm 6 số"],
      ["api", "ui", "Yêu cầu người đăng ký nhập mã", "return"],
      ["user", "ui", "Nhập mã nhận được trong email"],
      ["ui", "api", "Gửi mã để kiểm tra"],
      ["api", "otp", "Kiểm tra mã còn hạn và đúng người"],
      ["api", "db", "Tạo tài khoản học viên"],
      ["api", "db", "Ghi nhận thiết bị đang sử dụng"],
      ["api", "ui", "Đăng ký thành công và vào trang học", "return"],
    ],
    note: "Nếu mã sai, hết hạn hoặc nhập sai quá nhiều lần, người dùng phải xin mã mới. Tài khoản chỉ được tạo sau khi xác nhận thành công.",
  },
  {
    name: "05 - Trình tự - Đăng nhập",
    participants: [
      ["user", "Người dùng", "actor"], ["ui", "Trang đăng nhập", "ui"], ["api", "Hệ thống FinnCenter", "api"],
      ["auth", "Kiểm tra an toàn", "service"], ["mail", "Dịch vụ email", "external"], ["db", "Dữ liệu tài khoản", "db"],
    ],
    messages: [
      ["user", "ui", "Nhập email và mật khẩu"],
      ["ui", "api", "Gửi yêu cầu đăng nhập"],
      ["api", "auth", "Kiểm tra có đăng nhập sai quá nhiều lần không"],
      ["api", "db", "Tìm tài khoản và thiết bị đã từng dùng"],
      ["api", "auth", "Kiểm tra mật khẩu và tình trạng tài khoản"],
      ["api", "db", "Nếu là thiết bị quen: ghi nhận lần đăng nhập mới"],
      ["api", "db", "Nếu là thiết bị lạ: tạo yêu cầu xác nhận"],
      ["api", "mail", "Gửi liên kết xác nhận thiết bị"],
      ["user", "ui", "Mở liên kết trên thiết bị đang đăng nhập"],
      ["ui", "api", "Xác nhận đây là thiết bị của mình"],
      ["api", "db", "Ghi nhớ thiết bị và cho phép đăng nhập"],
      ["api", "ui", "Chuyển đến trang phù hợp với quyền người dùng", "return"],
    ],
    note: "Tài khoản bị khóa, chưa xác nhận email hoặc nhập sai mật khẩu sẽ không được đăng nhập. Thiết bị lạ phải được xác nhận qua email.",
  },
  {
    name: "06 - Trình tự - Quên mật khẩu",
    participants: [
      ["user", "Người dùng", "actor"], ["ui", "Trang quên mật khẩu", "ui"], ["api", "Hệ thống FinnCenter", "api"],
      ["mail", "Dịch vụ email", "external"], ["db", "Dữ liệu tài khoản", "db"],
    ],
    messages: [
      ["user", "ui", "Nhập email đã đăng ký"],
      ["ui", "api", "Gửi yêu cầu lấy lại mật khẩu"],
      ["api", "api", "Kiểm tra số lần yêu cầu gần đây", "self"],
      ["api", "db", "Tìm tài khoản và tạo mã xác nhận"],
      ["api", "mail", "Gửi mã đặt lại mật khẩu"],
      ["api", "ui", "Thông báo đã tiếp nhận yêu cầu", "return"],
      ["user", "ui", "Nhập mã và mật khẩu mới"],
      ["ui", "api", "Gửi thông tin thay đổi"],
      ["api", "db", "Kiểm tra mã còn hạn và số lần nhập sai"],
      ["api", "db", "Đổi sang mật khẩu mới"],
      ["api", "db", "Đóng các lần đăng nhập cũ"],
      ["api", "ui", "Thông báo thành công và yêu cầu đăng nhập lại", "return"],
    ],
    note: "Hệ thống không tiết lộ email có tồn tại hay không. Mã hết hạn hoặc nhập sai quá nhiều lần sẽ không còn dùng được.",
  },
  {
    name: "07 - Trình tự - Đăng ký khóa học",
    participants: [
      ["student", "Người học", "actor"], ["ui", "Trang khóa học", "ui"], ["api", "Hệ thống FinnCenter", "api"],
      ["pay", "Xử lý thanh toán", "service"], ["vnpay", "Cổng thanh toán VNPay", "external"], ["db", "Dữ liệu ghi danh và doanh thu", "db"],
    ],
    messages: [
      ["student", "ui", "Xem thông tin và chọn khóa học"],
      ["ui", "api", "Yêu cầu thông tin chi tiết"],
      ["api", "db", "Lấy nội dung, giáo viên và đánh giá"],
      ["student", "ui", "Chọn Đăng ký hoặc Mua"],
      ["ui", "api", "Gửi yêu cầu ghi danh"],
      ["api", "db", "Kiểm tra khóa đang mở và chưa đăng ký trước đó"],
      ["api", "db", "Khóa miễn phí: ghi danh ngay"],
      ["api", "pay", "Khóa có phí: tạo yêu cầu thanh toán"],
      ["pay", "ui", "Cung cấp trang thanh toán an toàn", "return"],
      ["ui", "vnpay", "Người học thực hiện thanh toán"],
      ["vnpay", "pay", "Gửi kết quả thanh toán"],
      ["pay", "pay", "Kiểm tra số tiền và tránh ghi nhận hai lần", "self"],
      ["pay", "db", "Ghi nhận đã thanh toán và đã ghi danh"],
      ["pay", "db", "Chia phần doanh thu của hệ thống và giáo viên"],
      ["pay", "ui", "Mở quyền học khóa học", "return"],
    ],
    note: "Khóa miễn phí được mở ngay. Với khóa của giáo viên, 70% doanh thu thuộc giáo viên và 30% thuộc hệ thống.",
  },
  {
    name: "08 - Trình tự - Làm bài kiểm tra",
    participants: [
      ["student", "Người học", "actor"], ["ui", "Trang làm bài", "ui"], ["api", "Hệ thống FinnCenter", "api"],
      ["rules", "Kiểm tra điều kiện học", "service"], ["ai", "Trợ lý chấm bài", "external"], ["db", "Dữ liệu học tập", "db"],
    ],
    messages: [
      ["student", "ui", "Chọn mở bài kiểm tra"],
      ["ui", "api", "Xin phép bắt đầu làm bài"],
      ["api", "rules", "Kiểm tra đã học đủ và còn quyền làm bài"],
      ["api", "db", "Lấy đề và các câu hỏi"],
      ["api", "ui", "Hiển thị đề cùng thời gian làm bài", "return"],
      ["student", "ui", "Trả lời, ghi âm nếu cần và nộp bài"],
      ["ui", "api", "Gửi bài làm"],
      ["api", "rules", "Kiểm tra bài nộp đúng thời gian"],
      ["api", "api", "Chấm các câu có đáp án sẵn", "self"],
      ["api", "ai", "Nhờ trợ lý chấm bài viết hoặc bài nói"],
      ["ai", "api", "Trả điểm và nhận xét", "return"],
      ["api", "db", "Lưu kết quả lần làm bài"],
      ["api", "db", "Cập nhật tiến độ và phần học tiếp theo"],
      ["api", "ui", "Hiển thị điểm, kết quả và nhận xét", "return"],
    ],
    note: "Bài kiểm tra trong khóa chỉ mở khi người học hoàn thành phần học cần thiết. Bài luyện tập công khai có thể làm độc lập.",
  },
  {
    name: "09 - Trình tự - Luyện tập cùng trợ lý AI",
    participants: [
      ["student", "Người học", "actor"], ["ui", "Trang luyện viết / nói", "ui"], ["media", "Chức năng thu âm", "external"],
      ["api", "Hệ thống FinnCenter", "api"], ["points", "Điểm nhận xét", "service"], ["ollama", "Trợ lý AI", "external"], ["db", "Dữ liệu luyện tập", "db"],
    ],
    messages: [
      ["student", "ui", "Chọn ngôn ngữ, kỹ năng và dạng bài"],
      ["ui", "api", "Yêu cầu tạo đề luyện tập"],
      ["api", "ollama", "Nhờ trợ lý tạo đề phù hợp"],
      ["ollama", "api", "Trả đề bài", "return"],
      ["api", "ui", "Hiển thị đề và thời gian gợi ý", "return"],
      ["student", "ui", "Viết bài hoặc ghi âm câu trả lời"],
      ["ui", "media", "Thu giọng nói và chuyển thành chữ"],
      ["media", "ui", "Trả bản ghi âm và nội dung lời nói", "return"],
      ["ui", "api", "Gửi bài và chọn loại kết quả mong muốn"],
      ["api", "points", "Kiểm tra điểm nhận xét nếu chọn xem chi tiết"],
      ["api", "ollama", "Nhờ trợ lý chấm theo tiêu chí phù hợp"],
      ["ollama", "api", "Trả điểm, lỗi và cách cải thiện", "return"],
      ["api", "db", "Lưu bài làm và kết quả"],
      ["api", "db", "Cập nhật điểm nhận xét và lịch sử luyện tập"],
      ["api", "ui", "Hiển thị kết quả cho người học", "return"],
    ],
    note: "Xem kết quả cơ bản là miễn phí. Nhận xét chi tiết dùng điểm nhận xét đối với học viên và giáo viên; quản trị viên được miễn phí.",
  },
  {
    name: "10 - Trình tự - Quản lý khóa học",
    participants: [
      ["teacher", "Giáo viên", "actor"], ["admin", "Quản trị viên", "actor"], ["ui", "Trang quản lý khóa học", "ui"],
      ["api", "Hệ thống FinnCenter", "api"], ["storage", "Kho hình ảnh và video", "external"], ["db", "Dữ liệu khóa học", "db"],
    ],
    messages: [
      ["teacher", "ui", "Tạo mới hoặc sửa khóa học"],
      ["ui", "api", "Gửi thông tin khóa học"],
      ["api", "db", "Kiểm tra đúng giáo viên sở hữu khóa"],
      ["api", "storage", "Lưu ảnh, video và tài liệu"],
      ["api", "db", "Lưu chương và bài học"],
      ["teacher", "ui", "Soạn bài kiểm tra và câu hỏi"],
      ["ui", "api", "Gửi nội dung bài kiểm tra"],
      ["api", "db", "Lưu đề, câu hỏi và đáp án"],
      ["api", "db", "Đưa khóa vào danh sách chờ duyệt nếu cần"],
      ["admin", "ui", "Mở danh sách khóa đang chờ"],
      ["ui", "api", "Gửi quyết định của quản trị viên"],
      ["api", "db", "Duyệt hoặc từ chối khóa học"],
      ["api", "db", "Lưu tình trạng mới"],
      ["api", "ui", "Hiển thị kết quả xử lý", "return"],
    ],
    note: "Giáo viên chỉ sửa khóa của mình. Quản trị viên quyết định khóa nào được công khai và có thể bật chế độ tự động duyệt.",
  },
  {
    name: "11 - Trình tự - Quản lý toàn hệ thống",
    participants: [
      ["admin", "Quản trị viên", "actor"], ["ui", "Trang điều hành", "ui"], ["api", "Hệ thống FinnCenter", "api"],
      ["settings", "Thống kê và cài đặt", "service"], ["mail", "Dịch vụ thông báo và email", "external"], ["db", "Dữ liệu toàn hệ thống", "db"],
    ],
    messages: [
      ["admin", "ui", "Mở trang tổng quan"],
      ["ui", "api", "Yêu cầu số liệu mới nhất"],
      ["api", "db", "Tổng hợp người dùng, khóa học, thu chi và kết quả học"],
      ["api", "ui", "Hiển thị số liệu, biểu đồ và xếp hạng", "return"],
      ["admin", "ui", "Khóa, mở tài khoản hoặc đổi quyền"],
      ["ui", "api", "Gửi thay đổi tài khoản"],
      ["api", "db", "Lưu thay đổi và đăng xuất tài khoản nếu cần"],
      ["admin", "ui", "Thay đổi tuyển giáo viên, tự duyệt hoặc thời gian luyện nói"],
      ["ui", "api", "Gửi cài đặt mới"],
      ["api", "settings", "Kiểm tra cài đặt hợp lệ"],
      ["settings", "db", "Lưu cài đặt chung"],
      ["api", "mail", "Thông báo cho người bị ảnh hưởng"],
      ["admin", "ui", "Xử lý hồ sơ giáo viên, hoàn tiền hoặc báo cáo"],
      ["ui", "api", "Gửi quyết định xử lý"],
      ["api", "db", "Lưu kết quả và người đã xử lý"],
      ["api", "ui", "Hiển thị kết quả", "return"],
    ],
    note: "Chỉ quản trị viên được thực hiện các thao tác này. Những thay đổi quan trọng đều được lưu lại và thông báo cho người liên quan.",
  },
  {
    name: "12 - Trình tự - Quản lý doanh thu",
    participants: [
      ["teacher", "Giáo viên", "actor"], ["admin", "Quản trị viên", "actor"], ["ui", "Các trang doanh thu", "ui"],
      ["api", "Hệ thống FinnCenter", "api"], ["mail", "Dịch vụ email", "external"], ["notify", "Thông báo trong hệ thống", "service"], ["db", "Dữ liệu doanh thu", "db"],
    ],
    messages: [
      ["teacher", "ui", "Mở trang doanh thu của giáo viên"],
      ["ui", "api", "Yêu cầu số tiền hiện có và lịch sử rút"],
      ["api", "db", "Tính doanh thu hợp lệ trừ các khoản đang chờ"],
      ["api", "ui", "Hiển thị doanh thu có thể yêu cầu rút", "return"],
      ["teacher", "ui", "Nhập tài khoản ngân hàng nhận tiền"],
      ["ui", "api", "Gửi thông tin tài khoản"],
      ["api", "mail", "Gửi mã xác nhận qua email"],
      ["teacher", "ui", "Nhập mã xác nhận"],
      ["ui", "api", "Gửi mã xác nhận"],
      ["api", "db", "Lưu tài khoản nhận tiền đã xác nhận"],
      ["teacher", "ui", "Nhập số tiền và gửi yêu cầu rút"],
      ["ui", "api", "Gửi yêu cầu rút doanh thu"],
      ["api", "db", "Kiểm tra số tiền và tạo yêu cầu chờ duyệt"],
      ["admin", "ui", "Mở mục Rút doanh thu và chọn duyệt hoặc từ chối"],
      ["ui", "api", "Gửi quyết định xử lý"],
      ["api", "db", "Lưu kết quả duyệt hoặc từ chối"],
      ["admin", "admin", "Nếu đã duyệt: tự chuyển khoản bên ngoài FinnCenter", "self"],
      ["admin", "ui", "Quay lại FinnCenter, bấm Đã chuyển và nhập mã giao dịch"],
      ["ui", "api", "Gửi xác nhận đã chuyển tiền"],
      ["api", "db", "Lưu trạng thái đã hoàn thành và mã giao dịch"],
      ["api", "notify", "Tạo thông báo cho giáo viên"],
      ["notify", "teacher", "Báo kết quả xử lý yêu cầu rút", "return"],
    ],
    note: "FinnCenter không kết nối trực tiếp với ngân hàng và không tự chuyển tiền. Quản trị viên chuyển khoản ở bên ngoài, sau đó chỉ ghi nhận kết quả trên hệ thống.",
  },
];

function participantStyle(type) {
  if (type === "actor") return "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;align=center;fontSize=16;fontStyle=1;";
  if (type === "db") return boxStyle(C.green, "shape=cylinder3;boundedLbl=1;backgroundOutline=1;fontStyle=1;");
  if (type === "external") return boxStyle(C.orange, "fontStyle=1;");
  if (type === "service") return boxStyle(C.purple, "fontStyle=1;");
  if (type === "ui") return boxStyle(C.teal, "fontStyle=1;");
  return boxStyle(C.blue, "fontStyle=1;");
}

function renderSequence(flow, index) {
  const cells = [];
  const id = `seq-${String(index).padStart(2, "0")}`;
  title(cells, id, flow.name.toUpperCase(), 2120);
  const n = flow.participants.length;
  const left = 140;
  const right = 2060;
  const step = n === 1 ? 0 : (right - left) / (n - 1);
  const coords = new Map();
  const yTop = 190;
  const messageGap = Math.min(64, Math.floor(1050 / Math.max(flow.messages.length, 1)));
  const yBottom = yTop + flow.messages.length * messageGap + 95;

  flow.participants.forEach(([key, label, type], pIndex) => {
    const x = Math.round(left + step * pIndex);
    coords.set(key, x);
    cells.push(cell(`${id}-p-${key}`, label, x - 90, 92, 180, type === "actor" ? 78 : 68, participantStyle(type)));
    cells.push(cell(`${id}-lt-${key}`, "", x, yTop - 6, 1, 1, "opacity=0;fillOpacity=0;strokeOpacity=0;"));
    cells.push(cell(`${id}-lb-${key}`, "", x, yBottom, 1, 1, "opacity=0;fillOpacity=0;strokeOpacity=0;"));
    cells.push(link(`${id}-life-${key}`, `${id}-lt-${key}`, `${id}-lb-${key}`, "", "endArrow=none;dashed=1;dashPattern=6 6;strokeColor=#94a3b8;strokeWidth=1;html=1;"));
  });

  flow.messages.forEach(([from, to, label, type], mIndex) => {
    const y = yTop + 30 + mIndex * messageGap;
    const sx = coords.get(from);
    const tx = coords.get(to);
    const self = type === "self" || from === to;
    if (self) {
      const anchorA = `${id}-m-${mIndex}-a`;
      const anchorB = `${id}-m-${mIndex}-b`;
      cells.push(cell(anchorA, "", sx, y, 1, 1, "opacity=0;fillOpacity=0;strokeOpacity=0;"));
      cells.push(cell(anchorB, "", sx, y + 30, 1, 1, "opacity=0;fillOpacity=0;strokeOpacity=0;"));
      cells.push(link(`${id}-m-${mIndex}`, anchorA, anchorB, `<b>${mIndex + 1}.</b> ${label}`, "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeColor=#7c3aed;fontColor=#581c87;fontSize=16;labelBackgroundColor=#ffffff;", [{ x: sx + 120, y }, { x: sx + 120, y: y + 30 }]));
      return;
    }
    const a = `${id}-m-${mIndex}-a`;
    const b = `${id}-m-${mIndex}-b`;
    cells.push(cell(a, "", sx, y, 1, 1, "opacity=0;fillOpacity=0;strokeOpacity=0;"));
    cells.push(cell(b, "", tx, y, 1, 1, "opacity=0;fillOpacity=0;strokeOpacity=0;"));
    const isReturn = type === "return";
    cells.push(link(`${id}-m-${mIndex}`, a, b, `<b>${mIndex + 1}.</b> ${label}`, `endArrow=${isReturn ? "open" : "block"};endFill=${isReturn ? "0" : "1"};${isReturn ? "dashed=1;dashPattern=4 4;" : ""}strokeColor=${isReturn ? "#475569" : "#2563eb"};fontColor=#1e3a8a;fontSize=16;html=1;labelBackgroundColor=#ffffff;`));
  });

  cells.push(cell(`${id}-note`, `<b>Điều cần lưu ý:</b> ${flow.note}`, 170, yBottom + 25, 1860, 85, boxStyle(C.yellow, "shape=note;fontSize=16;")));
  return page(flow.name, id, cells, 2200, Math.max(1250, yBottom + 145));
}

function renderIndex() {
  const cells = [];
  title(cells, "index", "FINNCENTER — BỘ SƠ ĐỒ GIẢI THÍCH CÁCH HỆ THỐNG HOẠT ĐỘNG");
  cells.push(cell("index-sub", "Dành cho người đọc không cần biết về lập trình • Mỗi trang giải thích một phần hoặc một quy trình", 170, 88, 1460, 48, boxStyle(C.gray, "fontSize=16;")));
  const items = [
    ["01", "Bức tranh tổng quan", "Người dùng, hệ thống và các đơn vị hỗ trợ", C.blue],
    ["02", "Các lớp công việc", "Từ màn hình người dùng đến nơi lưu thông tin", C.teal],
    ["03", "Bản đồ dữ liệu", "Những nhóm thông tin chính và cách chúng liên quan", C.green],
    ...sequenceFlows.map((flow, i) => [String(i + 4).padStart(2, "0"), flow.name.replace(/^\d+ - Trình tự - /, ""), "Các bước diễn ra từ đầu đến cuối", i < 3 ? C.purple : i < 6 ? C.orange : C.blue]),
  ];
  items.forEach(([no, name, desc, color], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 90 + col * 565;
    const y = 155 + row * 180;
    cells.push(cell(`index-${no}`, `<font style="font-size:24px"><b>${no}</b></font><br/><b>${name}</b><br/><font color="#64748b">${desc}</font>`, x, y, 500, 150, boxStyle(color, "fontSize=16;shadow=1;align=left;verticalAlign=middle;")));
  });
  cells.push(cell("index-legend", "<b>Cách đọc:</b> người ở bên trái bắt đầu thao tác • mũi tên liền là yêu cầu • mũi tên nét đứt là kết quả trả về • ô vàng là điều cần lưu ý", 220, 900, 1360, 65, boxStyle(C.white, "fontSize=16;")));
  return page("00 - Mục lục", "index", cells, 1800, 1000);
}

function renderOverviewArchitecture() {
  const cells = [];
  title(cells, "arch-overview", "BỨC TRANH TỔNG QUAN HỆ THỐNG FINNCENTER");
  section(cells, "zone-client", "Người dùng tương tác", 40, 110, 300, 820, C.teal);
  section(cells, "zone-app", "Các công việc FinnCenter thực hiện", 390, 110, 760, 820, C.blue);
  section(cells, "zone-infra", "Nơi lưu trữ và đơn vị hỗ trợ", 1200, 110, 540, 820, C.orange);

  cells.push(cell("client-web", "<b>Trang web</b><br/>Học viên • Giáo viên • Quản trị viên", 80, 200, 220, 100, boxStyle(C.teal, "fontSize=16;shadow=1;")));
  cells.push(cell("client-worker", "<b>Chuyển giọng nói thành chữ</b><br/>Hỗ trợ bài luyện nói", 80, 360, 220, 75, boxStyle(C.purple)));
  cells.push(cell("client-media", "<b>Thu âm</b><br/>Nhận giọng nói từ micro", 80, 500, 220, 75, boxStyle(C.purple)));

  cells.push(cell("app-ui", "<b>Hiển thị các trang</b><br/>Trang công khai • Khu học tập • Khu giáo viên • Khu quản trị", 455, 175, 630, 100, boxStyle(C.teal, "fontSize=16;shadow=1;")));
  cells.push(cell("app-api", "<b>Tiếp nhận yêu cầu</b><br/>Tài khoản • Khóa học • Bài học • Kiểm tra • Thanh toán", 455, 325, 630, 105, boxStyle(C.blue, "fontSize=16;shadow=1;")));
  cells.push(cell("app-domain", "<b>Áp dụng quy tắc hoạt động</b><br/>Kiểm tra quyền • Mở bài học • Chấm điểm • Chia doanh thu • Gửi thông báo", 455, 485, 630, 105, boxStyle(C.purple, "fontSize=16;shadow=1;")));
  cells.push(cell("app-data", "<b>Đọc và ghi thông tin</b><br/>Bảo đảm dữ liệu đúng và không bị ghi trùng", 455, 645, 300, 100, boxStyle(C.green, "fontSize=16;shadow=1;")));
  cells.push(cell("app-files", "<b>Quản lý tệp</b><br/>Hình ảnh • Video • Chứng nhận • Bản ghi âm", 785, 645, 300, 100, boxStyle(C.yellow, "fontSize=16;shadow=1;")));

  cells.push(cell("infra-db", "<b>Kho dữ liệu chính</b><br/>Lưu mọi hồ sơ và hoạt động", 1280, 175, 380, 100, boxStyle(C.green, "shape=cylinder3;boundedLbl=1;backgroundOutline=1;fontSize=16;shadow=1;")));
  cells.push(cell("infra-vnpay", "<b>Cổng thanh toán VNPay</b><br/>Thu tiền khóa học và điểm nhận xét", 1280, 340, 380, 95, boxStyle(C.orange, "fontSize=16;")));
  cells.push(cell("infra-ollama", "<b>Trợ lý AI</b><br/>Tạo đề và nhận xét bài viết, bài nói", 1280, 490, 380, 95, boxStyle(C.purple, "fontSize=16;")));
  cells.push(cell("infra-smtp", "<b>Dịch vụ email</b><br/>Mã xác nhận • Cảnh báo • Chứng nhận", 1280, 640, 380, 95, boxStyle(C.orange, "fontSize=16;")));
  cells.push(cell("infra-cf", "<b>Đường kết nối an toàn</b><br/>Đưa trang web ra Internet", 1280, 790, 380, 85, boxStyle(C.gray, "fontSize=16;")));

  const edges = [
    ["client-web", "app-ui", "xem và thao tác"], ["client-media", "client-worker", "giọng nói"], ["client-worker", "app-ui", "nội dung bằng chữ"],
    ["app-ui", "app-api", "gửi yêu cầu"], ["app-api", "app-domain", "yêu cầu xử lý"], ["app-domain", "app-data", "đọc hoặc lưu"],
    ["app-domain", "app-files", "lưu hoặc mở tệp"], ["app-data", "infra-db", "thông tin"], ["app-domain", "infra-vnpay", "thanh toán"],
    ["app-domain", "infra-ollama", "tạo đề / chấm bài"], ["app-domain", "infra-smtp", "gửi thư"], ["infra-cf", "app-ui", "kết nối Internet"],
  ];
  edges.forEach(([s, t, label], i) => cells.push(link(`arch-e-${i}`, s, t, label, arrowStyle(i === 11 ? "#64748b" : "#2563eb", i === 11))));
  return page("01 - Kiến trúc tổng quan", "arch-overview", cells, 1800, 1000);
}

function renderLayeredArchitecture() {
  const cells = [];
  title(cells, "arch-layer", "CÁC LỚP CÔNG VIỆC TRONG HỆ THỐNG FINNCENTER");
  const layers = [
    ["presentation", "1. NHỮNG GÌ NGƯỜI DÙNG NHÌN THẤY", "Các trang, biểu mẫu, nút bấm, bảng số liệu và phần thu âm", C.teal],
    ["api", "2. NƠI TIẾP NHẬN YÊU CẦU", "Nhận thông tin người dùng gửi lên, kiểm tra đủ dữ liệu và chuyển đến đúng bộ phận", C.blue],
    ["domain", "3. NƠI ÁP DỤNG QUY TẮC", "Kiểm tra quyền, điều kiện học, cách chấm điểm, cách chia doanh thu và xử lý rút tiền", C.purple],
    ["data", "4. NƠI QUẢN LÝ HỒ SƠ", "Đọc, lưu và bảo vệ thông tin tài khoản, khóa học, kết quả, thanh toán và doanh thu", C.green],
    ["infra", "5. CÁC ĐƠN VỊ HỖ TRỢ", "Kho dữ liệu, cổng thanh toán, trợ lý AI, email, kho tệp và đường kết nối Internet", C.orange],
  ];
  layers.forEach(([id, name, desc, color], i) => {
    const y = 125 + i * 165;
    cells.push(cell(`layer-${id}`, `<b>${name}</b><br/><font style="font-size:16px">${desc}</font>`, 170, y, 1460, 120, boxStyle(color, "fontSize=17;align=left;verticalAlign=middle;spacingLeft=28;shadow=1;")));
    if (i > 0) cells.push(link(`layer-e-${i}`, `layer-${layers[i - 1][0]}`, `layer-${id}`, i === 1 ? "gửi thông tin" : i === 2 ? "yêu cầu xử lý" : i === 3 ? "đọc hoặc lưu" : "sử dụng dịch vụ", arrowStyle("#475569")));
  });
  cells.push(cell("layer-cross", "<b>NGUYÊN TẮC ÁP DỤNG Ở MỌI LỚP</b><br/>Đúng người, đúng quyền • thông tin hợp lệ • lưu dấu thay đổi • không ghi nhận hai lần • bảo vệ dữ liệu cá nhân", 250, 960, 1300, 70, boxStyle(C.gray, "fontSize=16;")));
  return page("02 - Kiến trúc phân lớp", "arch-layer", cells, 1800, 1060);
}

function entity(cells, id, titleText, fields, x, y, color = C.white, w = 260, h = 145) {
  const body = fields.join("<br/>");
  cells.push(cell(`erd-${id}`, `<b>${titleText}</b><hr/>${body}`, x, y, w, h, boxStyle(color, "align=left;verticalAlign=top;fontSize=16;spacing=7;shadow=1;")));
}

function renderErd() {
  const cells = [];
  title(cells, "erd", "ERD TỔNG QUAN — BẢN ĐỒ NHỮNG THÔNG TIN HỆ THỐNG LƯU GIỮ");
  cells.push(cell("erd-note", "Mỗi ô là một nhóm thông tin được lưu. Mũi tên cho biết các nhóm thông tin liên quan với nhau như thế nào.", 260, 84, 1280, 48, boxStyle(C.gray, "fontSize=16;")));

  entity(cells, "user", "Tài khoản người dùng", ["Mã tài khoản", "Tên và email", "Loại tài khoản", "Ngôn ngữ đang học"], 60, 170, C.blue);
  entity(cells, "session", "Lần đăng nhập", ["Thuộc tài khoản nào", "Thiết bị đang dùng", "Thời điểm hết hạn", "Lần hoạt động gần nhất"], 60, 350, C.blue);
  entity(cells, "otp", "Mã lấy lại mật khẩu", ["Thuộc tài khoản nào", "Mã xác nhận đã bảo vệ", "Thời điểm hết hạn", "Số lần nhập sai"], 60, 530, C.blue);
  entity(cells, "language", "Ngôn ngữ học", ["Tên ngôn ngữ", "Mã viết tắt", "Còn được sử dụng không"], 60, 710, C.teal);

  entity(cells, "course", "Khóa học", ["Tên và mô tả", "Giáo viên phụ trách", "Ngôn ngữ", "Giá và tình trạng"], 380, 170, C.green);
  entity(cells, "module", "Chương học", ["Thuộc khóa học nào", "Tên chương", "Thứ tự học"], 380, 350, C.green);
  entity(cells, "lesson", "Bài học", ["Thuộc chương nào", "Tên và nội dung", "Video nếu có"], 380, 530, C.green);
  entity(cells, "enroll", "Ghi danh", ["Người học", "Khóa đã đăng ký", "Quyền học hiện tại", "Ngày đăng ký"], 380, 710, C.green);

  entity(cells, "test", "Bài kiểm tra", ["Thuộc khóa/chương/bài", "Loại bài kiểm tra", "Điểm đạt", "Thời gian và số lần làm"], 700, 170, C.purple);
  entity(cells, "question", "Câu hỏi", ["Thuộc bài kiểm tra", "Nội dung và loại câu", "Số điểm", "Thứ tự"], 700, 350, C.purple);
  entity(cells, "answer", "Đáp án", ["Thuộc câu hỏi", "Nội dung đáp án", "Đúng hay sai", "Lời giải thích"], 700, 530, C.purple);
  entity(cells, "attempt", "Lần làm bài", ["Người làm và bài kiểm tra", "Lần làm thứ mấy", "Điểm đạt được", "Đạt hay chưa đạt"], 700, 710, C.purple);

  entity(cells, "ai", "Kết quả luyện cùng AI", ["Người luyện", "Bài viết hoặc bài nói", "Điểm", "Nhận xét và cách cải thiện"], 1020, 170, C.yellow);
  entity(cells, "points", "Lịch sử điểm nhận xét", ["Người sử dụng", "Cộng hoặc trừ điểm", "Số dư sau thay đổi", "Lý do thay đổi"], 1020, 350, C.yellow);
  entity(cells, "order", "Đơn mua hàng", ["Người mua", "Ngày tạo đơn", "Các khóa học trong đơn"], 1020, 530, C.orange);
  entity(cells, "item", "Khóa học trong đơn", ["Thuộc đơn nào", "Khóa học và giá", "Phần của hệ thống", "Phần của giáo viên"], 1020, 710, C.orange);

  entity(cells, "payment", "Lần thanh toán", ["Người thanh toán", "Số tiền và mục đích", "Tình trạng", "Mã giao dịch"], 1340, 170, C.orange);
  entity(cells, "bank", "Tài khoản nhận tiền", ["Giáo viên sở hữu", "Ngân hàng", "Số và tên tài khoản", "Đã xác nhận chưa"], 1340, 350, C.red);
  entity(cells, "withdraw", "Yêu cầu rút doanh thu", ["Giáo viên yêu cầu", "Số tiền", "Tình trạng xử lý", "Mã chuyển tiền"], 1340, 530, C.red);
  entity(cells, "setting", "Cài đặt chung", ["Tên cài đặt", "Giá trị đang dùng", "Lần cập nhật gần nhất"], 1340, 710, C.gray);

  const rels = [
    ["user", "session", "một người → nhiều lần"], ["user", "otp", "một người → nhiều mã"], ["language", "user", "một ngôn ngữ → nhiều người"],
    ["user", "course", "một giáo viên → nhiều khóa"], ["language", "course", "một ngôn ngữ → nhiều khóa"], ["course", "module", "một khóa → nhiều chương"],
    ["module", "lesson", "một chương → nhiều bài"], ["user", "enroll", "một người → nhiều ghi danh"], ["course", "enroll", "một khóa → nhiều ghi danh"],
    ["course", "test", "một khóa → nhiều bài kiểm tra"], ["test", "question", "một đề → nhiều câu"], ["question", "answer", "một câu → nhiều đáp án"],
    ["test", "attempt", "một đề → nhiều lần làm"], ["user", "attempt", "một người → nhiều lần làm"], ["user", "ai", "một người → nhiều bài luyện"],
    ["course", "ai", "một khóa → nhiều bài luyện"], ["user", "points", "một người → nhiều thay đổi điểm"], ["user", "order", "một người → nhiều đơn"],
    ["order", "item", "một đơn → nhiều khóa"], ["course", "item", "một khóa → nhiều lượt mua"], ["order", "payment", "một đơn → tối đa một thanh toán"],
    ["user", "payment", "một người → nhiều thanh toán"], ["user", "bank", "một giáo viên → một tài khoản"], ["user", "withdraw", "một giáo viên → nhiều lần rút"],
  ];
  rels.forEach(([s, t, label], i) => cells.push(link(`erd-r-${i}`, `erd-${s}`, `erd-${t}`, label, "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;startArrow=ERone;startFill=0;endArrow=ERmany;endFill=0;strokeColor=#64748b;fontColor=#475569;fontSize=16;labelBackgroundColor=#ffffff;")));
  cells.push(cell("erd-domains", "<b>Hệ thống còn lưu thêm:</b> hồ sơ tuyển giáo viên • dấu hiệu gian lận • yêu cầu hoàn tiền • báo cáo nội dung • thông báo • tiến độ xem video • khiếu nại rút tiền", 180, 910, 1440, 70, boxStyle(C.white, "fontSize=16;")));
  return page("03 - ERD tổng quan", "erd-overview-main", cells, 1800, 1000);
}

const pages = [
  renderIndex(),
  renderOverviewArchitecture(),
  renderLayeredArchitecture(),
  renderErd(),
  ...sequenceFlows.map(renderSequence),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device" compressed="false">\n${pages.join("\n")}\n</mxfile>\n`;

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, xml, "utf8");
console.log(JSON.stringify({ outputFile, pages: pages.length, sequencePages: sequenceFlows.length }, null, 2));
