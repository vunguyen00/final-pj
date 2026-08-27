import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");
const outputDir = path.join(root, "deliverables", "database-erd-a4");
const schema = fs.readFileSync(schemaPath, "utf8");

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const modelBlocks = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(
  ([, name, body]) => ({ name, body }),
);
const modelNames = new Set(modelBlocks.map(({ name }) => name));

const domainDefinitions = [
  {
    key: "identity",
    short: "AUTH",
    label: "Tài khoản & bảo mật",
    color: "#2563EB",
    tint: "#EFF6FF",
    models: [
      "User",
      "Session",
      "TrustedDevice",
      "LoginDeviceChallenge",
      "UserInvitation",
      "PasswordResetOtp",
      "EmailVerificationOtp",
      "RegistrationSecurityEvent",
      "LearningLanguage",
    ],
  },
  {
    key: "learning",
    short: "LMS",
    label: "Khóa học & học tập",
    color: "#059669",
    tint: "#ECFDF5",
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
    key: "assessment",
    short: "TEST",
    label: "Kiểm tra & AI",
    color: "#7C3AED",
    tint: "#F5F3FF",
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
    key: "teacher",
    short: "HR",
    label: "Tuyển dụng giảng viên",
    color: "#D97706",
    tint: "#FFFBEB",
    models: [
      "TeacherApplication",
      "RecruitmentRound",
      "TeacherExamResult",
      "TeacherEntranceQuestionInstance",
      "TeacherCertificate",
      "TeacherApplicationLog",
      "AntiCheatLog",
      "SuspiciousEvent",
    ],
  },
  {
    key: "commerce",
    short: "PAY",
    label: "Thanh toán & doanh thu",
    color: "#E11D48",
    tint: "#FFF1F2",
    models: [
      "Order",
      "OrderItem",
      "CourseRefundRequest",
      "CourseReport",
      "TeacherBankAccount",
      "TeacherBankAccountChangeOtp",
      "TeacherBankAccountChangeLog",
      "TeacherRevenueWithdrawal",
      "TeacherRevenueWithdrawalComplaint",
      "Payment",
    ],
  },
  {
    key: "communication",
    short: "MSG",
    label: "Thông báo & email",
    color: "#475569",
    tint: "#F8FAFC",
    models: ["Notification", "EmailLog"],
  },
];

const modelToDomain = new Map();
for (const domain of domainDefinitions) {
  for (const modelName of domain.models) modelToDomain.set(modelName, domain);
}

function parseModel({ name, body }) {
  const rawLines = body
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+\/\/.*$/, "").trim())
    .filter(Boolean);

  const foreignKeys = new Map();
  for (const line of rawLines) {
    if (!line.includes("@relation")) continue;
    const parts = line.split(/\s+/);
    const target = parts[1]?.replace(/[?\[\]]/g, "");
    const fieldsMatch = line.match(/fields:\s*\[([^\]]+)\]/);
    const referencesMatch = line.match(/references:\s*\[([^\]]+)\]/);
    if (!target || !fieldsMatch) continue;
    const localFields = fieldsMatch[1].split(",").map((item) => item.trim());
    const targetFields = (referencesMatch?.[1] ?? "id")
      .split(",")
      .map((item) => item.trim());
    localFields.forEach((field, index) => {
      foreignKeys.set(field, {
        target,
        targetField: targetFields[index] ?? targetFields[0] ?? "id",
      });
    });
  }

  const fields = [];
  const constraints = [];
  for (const line of rawLines) {
    if (line.startsWith("@@unique")) {
      const match = line.match(/@@unique\(\[([^\]]+)\]/);
      if (match) constraints.push(`UQ (${match[1].replace(/\s+/g, "")})`);
      continue;
    }
    if (line.startsWith("@@") || line.startsWith("@")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [fieldName, rawType] = parts;
    const baseType = rawType.replace(/[?\[\]]/g, "");
    if (modelNames.has(baseType)) continue;

    const flags = [];
    if (/\s@id(?:\s|$)/.test(` ${line}`)) flags.push("PK");
    if (foreignKeys.has(fieldName)) flags.push("FK");
    if (/\s@unique(?:\s|$)/.test(` ${line}`)) flags.push("UQ");

    fields.push({
      name: fieldName,
      type: rawType,
      flags,
      foreignKey: foreignKeys.get(fieldName),
    });
  }

  return {
    name,
    fields,
    constraints,
    domain: modelToDomain.get(name) ?? {
      short: "DB",
      label: "Khác",
      color: "#475569",
      tint: "#F8FAFC",
    },
  };
}

const models = modelBlocks.map(parseModel);
const missingFromDomains = models.filter(({ name }) => !modelToDomain.has(name));
if (missingFromDomains.length) {
  throw new Error(
    `Chưa phân nhóm các model: ${missingFromDomains.map(({ name }) => name).join(", ")}`,
  );
}

const WIDTH = 1684;
const HEIGHT = 1191;
const PAGE_MARGIN = 28;
const HEADER_HEIGHT = 82;
const FOOTER_HEIGHT = 30;
const CONTENT_TOP = PAGE_MARGIN + HEADER_HEIGHT;
const CONTENT_BOTTOM = HEIGHT - PAGE_MARGIN - FOOTER_HEIGHT;
const CONTENT_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;
const COLUMN_COUNT = 7;
const COLUMN_GAP = 9;
const COLUMN_WIDTH =
  (WIDTH - PAGE_MARGIN * 2 - COLUMN_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
const TABLE_GAP = 8;
const TABLE_HEADER_HEIGHT = 21;
const TABLE_PADDING_BOTTOM = 5;

function tableHeight(model, rowHeight) {
  return (
    TABLE_HEADER_HEIGHT +
    (model.fields.length + model.constraints.length) * rowHeight +
    TABLE_PADDING_BOTTOM
  );
}

function pack(rowHeight) {
  const columns = Array.from({ length: COLUMN_COUNT }, () => ({ height: 0, models: [] }));
  const ordered = [...models].sort(
    (a, b) => tableHeight(b, rowHeight) - tableHeight(a, rowHeight),
  );

  for (const model of ordered) {
    columns.sort((a, b) => a.height - b.height);
    const column = columns[0];
    column.models.push(model);
    column.height += tableHeight(model, rowHeight) + TABLE_GAP;
  }

  return columns;
}

let rowHeight = 11;
let columns = pack(rowHeight);
while (Math.max(...columns.map((column) => column.height)) > CONTENT_HEIGHT && rowHeight > 7.2) {
  rowHeight -= 0.2;
  columns = pack(rowHeight);
}

// Restore columns to their visual left-to-right order by tallest first. This keeps
// the silhouette balanced without changing which tables share a column.
columns.sort((a, b) => b.height - a.height);

function compactType(type) {
  const replacements = new Map([
    ["TeacherBankAccountVerificationStatus", "BankVerificationStatus"],
    ["TeacherRevenueWithdrawalComplaintReason", "WithdrawalComplaintReason"],
    ["TeacherRevenueWithdrawalComplaintStatus", "WithdrawalComplaintStatus"],
    ["TeacherRevenueWithdrawalStatus", "WithdrawalStatus"],
    ["TeacherQuestionInstanceStatus", "QuestionInstanceStatus"],
    ["TeacherSpeakingMediaStatus", "SpeakingMediaStatus"],
    ["TeacherApplicationStatus", "TeacherAppStatus"],
    ["CourseRefundRequestStatus", "RefundStatus"],
    ["EnrollmentAccessStatus", "AccessStatus"],
    ["RecruitmentRoundStatus", "RoundStatus"],
  ]);
  const suffix = type.endsWith("?") ? "?" : type.endsWith("[]") ? "[]" : "";
  const base = type.replace(/[?\[\]]/g, "");
  return `${replacements.get(base) ?? base}${suffix}`;
}

function fitText(value, maxCharacters) {
  if (value.length <= maxCharacters) return value;
  return `${value.slice(0, Math.max(1, maxCharacters - 1))}…`;
}

const svg = [];
const tablePositions = new Map();
svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
svg.push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title description">`,
);
svg.push(`<title id="title">FinnCenter — Sơ đồ cơ sở dữ liệu</title>`);
svg.push(
  `<desc id="description">Sơ đồ 44 bảng PostgreSQL từ Prisma schema, tối ưu cho giấy A4 nằm ngang.</desc>`,
);
svg.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="#F7F9FC"/>`);
svg.push(
  `<rect x="0" y="0" width="${WIDTH}" height="7" fill="#0F172A"/>`,
  `<text x="${PAGE_MARGIN}" y="43" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#0F172A">FinnCenter — Sơ đồ cơ sở dữ liệu</text>`,
  `<text x="${PAGE_MARGIN}" y="66" font-family="Arial, sans-serif" font-size="11.5" fill="#475569">PostgreSQL • Prisma schema • ${models.length} bảng • A4 ngang (297 × 210 mm)</text>`,
  `<text x="${WIDTH - PAGE_MARGIN}" y="43" text-anchor="end" font-family="Arial, sans-serif" font-size="10.5" font-weight="700" fill="#334155">PHYSICAL DATA MODEL</text>`,
  `<text x="${WIDTH - PAGE_MARGIN}" y="62" text-anchor="end" font-family="Arial, sans-serif" font-size="9.5" fill="#64748B">PK: khóa chính • FK: khóa ngoại • UQ: duy nhất • ?: nullable</text>`,
);

let legendX = PAGE_MARGIN;
for (const domain of domainDefinitions) {
  const legendWidth = 30 + domain.label.length * 6.2;
  svg.push(
    `<rect x="${legendX}" y="79" width="8" height="8" rx="2" fill="${domain.color}"/>`,
    `<text x="${legendX + 13}" y="87" font-family="Arial, sans-serif" font-size="9.2" font-weight="600" fill="#334155">${escapeXml(domain.label)}</text>`,
  );
  legendX += legendWidth;
}

columns.forEach((column, columnIndex) => {
  const x = PAGE_MARGIN + columnIndex * (COLUMN_WIDTH + COLUMN_GAP);
  let y = CONTENT_TOP;

  for (const model of column.models) {
    const height = tableHeight(model, rowHeight);
    const { color, tint, short } = model.domain;
    tablePositions.set(model.name, { x, y, width: COLUMN_WIDTH, height });
    svg.push(
      `<g>`,
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${COLUMN_WIDTH.toFixed(2)}" height="${height.toFixed(2)}" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>`,
      `<path d="M ${(x + 5).toFixed(2)} ${y.toFixed(2)} H ${(x + COLUMN_WIDTH - 5).toFixed(2)} Q ${(x + COLUMN_WIDTH).toFixed(2)} ${y.toFixed(2)} ${(x + COLUMN_WIDTH).toFixed(2)} ${(y + 5).toFixed(2)} V ${(y + TABLE_HEADER_HEIGHT).toFixed(2)} H ${x.toFixed(2)} V ${(y + 5).toFixed(2)} Q ${x.toFixed(2)} ${y.toFixed(2)} ${(x + 5).toFixed(2)} ${y.toFixed(2)} Z" fill="${tint}"/>`,
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="4" height="${TABLE_HEADER_HEIGHT}" rx="2" fill="${color}"/>`,
      `<text x="${(x + 10).toFixed(2)}" y="${(y + 14.5).toFixed(2)}" font-family="Arial, sans-serif" font-size="10.8" font-weight="700" fill="#0F172A">${escapeXml(model.name)}</text>`,
      `<text x="${(x + COLUMN_WIDTH - 7).toFixed(2)}" y="${(y + 14).toFixed(2)}" text-anchor="end" font-family="Arial, sans-serif" font-size="7.3" font-weight="700" fill="${color}">${short}</text>`,
      `<line x1="${x.toFixed(2)}" y1="${(y + TABLE_HEADER_HEIGHT).toFixed(2)}" x2="${(x + COLUMN_WIDTH).toFixed(2)}" y2="${(y + TABLE_HEADER_HEIGHT).toFixed(2)}" stroke="#E2E8F0"/>`,
    );

    let rowY = y + TABLE_HEADER_HEIGHT + rowHeight * 0.72;
    const fontSize = Math.max(6.8, rowHeight - 2.4);
    for (const field of model.fields) {
      const flagText = field.flags.join("·");
      const fieldType = compactType(field.type);
      const fkText = field.foreignKey
        ? ` → ${field.foreignKey.target}.${field.foreignKey.targetField}`
        : "";
      const availableCharacters = Math.floor((COLUMN_WIDTH - 16) / (fontSize * 0.51));
      const content = fitText(`${field.name}: ${fieldType}${fkText}`, availableCharacters);
      svg.push(
        `<text x="${(x + 7).toFixed(2)}" y="${rowY.toFixed(2)}" font-family="Arial, sans-serif" font-size="${fontSize.toFixed(2)}" font-weight="700" fill="${field.flags.includes("PK") ? color : "#64748B"}">${escapeXml(flagText)}</text>`,
        `<text x="${(x + 32).toFixed(2)}" y="${rowY.toFixed(2)}" font-family="Arial, sans-serif" font-size="${fontSize.toFixed(2)}" fill="#1E293B">${escapeXml(content)}</text>`,
      );
      rowY += rowHeight;
    }

    for (const constraint of model.constraints) {
      svg.push(
        `<text x="${(x + 7).toFixed(2)}" y="${rowY.toFixed(2)}" font-family="Arial, sans-serif" font-size="${fontSize.toFixed(2)}" font-style="italic" fill="#64748B">${escapeXml(constraint)}</text>`,
      );
      rowY += rowHeight;
    }
    svg.push(`</g>`);
    y += height + TABLE_GAP;
  }
});

svg.push(
  `<line x1="${PAGE_MARGIN}" y1="${HEIGHT - 43}" x2="${WIDTH - PAGE_MARGIN}" y2="${HEIGHT - 43}" stroke="#CBD5E1"/>`,
  `<text x="${PAGE_MARGIN}" y="${HEIGHT - 25}" font-family="Arial, sans-serif" font-size="8.8" fill="#64748B">Nguồn: prisma/schema.prisma • FK được ghi ngay tại cột theo dạng → Bảng.cột</text>`,
  `<text x="${WIDTH - PAGE_MARGIN}" y="${HEIGHT - 25}" text-anchor="end" font-family="Arial, sans-serif" font-size="8.8" fill="#64748B">Sinh tự động • ${new Date().toISOString().slice(0, 10)}</text>`,
  `</svg>`,
);

const svgContent = svg.join("\n");
const htmlContent = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>FinnCenter — Database ERD A4 ngang</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    html, body { width: 297mm; height: 210mm; margin: 0; background: #F7F9FC; }
    body { overflow: hidden; }
    svg { display: block; width: 297mm; height: 210mm; }
  </style>
</head>
<body>${svgContent.replace(/^<\?xml[^>]+>\s*/, "")}</body>
</html>`;

function drawioTableLabel(model) {
  const fieldLines = model.fields.map((field) => {
    const flags = field.flags.length ? `<b>${field.flags.join("·")}</b> ` : "";
    const relation = field.foreignKey
      ? ` <span style="color:#64748B">→ ${field.foreignKey.target}.${field.foreignKey.targetField}</span>`
      : "";
    return `${flags}${field.name}: ${compactType(field.type)}${relation}`;
  });
  const constraintLines = model.constraints.map(
    (constraint) => `<i style="color:#64748B">${constraint}</i>`,
  );
  return [
    `<div style="font-size:10px;line-height:1.15">`,
    `<div style="font-size:12px;font-weight:700;color:#0F172A;margin-bottom:5px">${model.name} <span style="float:right;color:${model.domain.color};font-size:8px">${model.domain.short}</span></div>`,
    ...[...fieldLines, ...constraintLines].map((line) => `<div>${line}</div>`),
    `</div>`,
  ].join("");
}

const DRAWIO_PAGE_WIDTH = 1169;
const DRAWIO_PAGE_HEIGHT = 827;
const drawioScale = DRAWIO_PAGE_WIDTH / WIDTH;
const drawioCells = [
  `<mxCell id="0"/>`,
  `<mxCell id="tables-layer" value="Bảng dữ liệu" parent="0"/>`,
  `<mxCell id="relations-layer" value="Quan hệ FK (bật/tắt layer này)" parent="0" visible="0"/>`,
];

drawioCells.push(
  `<mxCell id="diagram-title" value="${escapeXml("FinnCenter — Sơ đồ cơ sở dữ liệu • 44 bảng • A4 ngang")}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=18;fontStyle=1;fontColor=#0F172A;" vertex="1" parent="tables-layer"><mxGeometry x="${(
    PAGE_MARGIN * drawioScale
  ).toFixed(2)}" y="10" width="700" height="35" as="geometry"/></mxCell>`,
  `<mxCell id="diagram-note" value="${escapeXml("PK: khóa chính • FK: khóa ngoại • UQ: duy nhất • ?: nullable • Quan hệ nằm ở layer riêng")}" style="text;html=1;strokeColor=none;fillColor=none;align=right;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=8;fontColor=#64748B;" vertex="1" parent="tables-layer"><mxGeometry x="720" y="12" width="420" height="30" as="geometry"/></mxCell>`,
);

for (const model of models) {
  const position = tablePositions.get(model.name);
  const x = position.x * drawioScale;
  const y = position.y * drawioScale;
  const width = position.width * drawioScale;
  const height = position.height * drawioScale;
  const style = [
    "rounded=1",
    "whiteSpace=wrap",
    "html=1",
    "align=left",
    "verticalAlign=top",
    "spacingTop=4",
    "spacingLeft=5",
    "spacingRight=4",
    `fillColor=${model.domain.tint}`,
    `strokeColor=${model.domain.color}`,
    "strokeWidth=1",
    "fontColor=#1E293B",
    "fontSize=7",
    "shadow=0",
  ].join(";");
  drawioCells.push(
    `<mxCell id="table-${model.name}" value="${escapeXml(drawioTableLabel(model))}" style="${style};" vertex="1" parent="tables-layer"><mxGeometry x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" as="geometry"/></mxCell>`,
  );
}

let edgeIndex = 0;
for (const childModel of models) {
  for (const field of childModel.fields) {
    if (!field.foreignKey || !modelNames.has(field.foreignKey.target)) continue;
    const parentModel = models.find(({ name }) => name === field.foreignKey.target);
    const edgeColor = parentModel?.domain.color ?? "#64748B";
    const optional = field.type.endsWith("?");
    const edgeStyle = [
      "edgeStyle=orthogonalEdgeStyle",
      "rounded=0",
      "orthogonalLoop=1",
      "jettySize=auto",
      "html=1",
      `strokeColor=${edgeColor}`,
      "strokeWidth=1",
      "startArrow=ERone",
      "startFill=0",
      `endArrow=${optional ? "ERzeroToMany" : "ERmany"}`,
      "endFill=0",
      "fontSize=7",
      "fontColor=#475569",
      "labelBackgroundColor=#FFFFFF",
    ].join(";");
    drawioCells.push(
      `<mxCell id="fk-${edgeIndex++}" value="${escapeXml(field.name)}" style="${edgeStyle};" edge="1" parent="relations-layer" source="table-${field.foreignKey.target}" target="table-${childModel.name}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  }
}

const drawioContent = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Codex" version="24.7.17" type="device" compressed="false">
  <diagram id="finncenter-database-a4" name="FinnCenter Database A4">
    <mxGraphModel dx="1169" dy="827" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${DRAWIO_PAGE_WIDTH}" pageHeight="${DRAWIO_PAGE_HEIGHT}" math="0" shadow="0" background="#F7F9FC">
      <root>
        ${drawioCells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

fs.mkdirSync(outputDir, { recursive: true });
const svgPath = path.join(outputDir, "FinnCenter_Database_ERD_A4_Ngang.svg");
const htmlPath = path.join(outputDir, "FinnCenter_Database_ERD_A4_Ngang.html");
const drawioPath = path.join(outputDir, "FinnCenter_Database_ERD_A4_Ngang.drawio");
fs.writeFileSync(svgPath, svgContent, "utf8");
fs.writeFileSync(htmlPath, htmlContent, "utf8");
fs.writeFileSync(drawioPath, drawioContent, "utf8");

const totalFields = models.reduce((sum, model) => sum + model.fields.length, 0);
console.log(
  JSON.stringify(
    {
      models: models.length,
      physicalFields: totalFields,
      rowHeight: Number(rowHeight.toFixed(2)),
      tallestColumn: Number(Math.max(...columns.map((column) => column.height)).toFixed(2)),
      availableHeight: CONTENT_HEIGHT,
      foreignKeyRelations: edgeIndex,
      svgPath,
      htmlPath,
      drawioPath,
    },
    null,
    2,
  ),
);
