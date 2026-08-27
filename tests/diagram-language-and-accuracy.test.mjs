import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("revenue diagram describes the real manual payout workflow", async () => {
  const [generator, adminRevenuePage, teacherRevenuePage] = await Promise.all([
    source("scripts/generate-main-system-drawio.mjs"),
    source("app/admin/AdminRevenueWithdrawals.tsx"),
    source("app/teacher/revenue/RevenueWithdrawalPanel.tsx"),
  ]);

  assert.match(generator, /tự chuyển khoản bên ngoài FinnCenter/);
  assert.match(generator, /FinnCenter không kết nối trực tiếp với ngân hàng/);
  assert.doesNotMatch(generator, /\["bank", "Ngân hàng", "external"\]/);
  assert.match(adminRevenuePage, />Đã chuyển</);
  assert.match(adminRevenuePage, /transferTransactionCode/);
  assert.match(teacherRevenuePage, /\/api\/teacher\/revenue-withdrawals/);
});

test("course management diagram only claims actions present in the management screens", async () => {
  const [generator, adminDashboard, teacherCourses] = await Promise.all([
    source("scripts/generate-main-system-drawio.mjs"),
    source("app/admin/AdminDashboard.tsx"),
    source("app/teacher/courses/page.tsx"),
  ]);

  assert.match(generator, /Duyệt hoặc từ chối khóa học/);
  assert.doesNotMatch(generator, /Duyệt, từ chối, khóa hoặc mở lại khóa học/);
  assert.match(adminDashboard, />Duyệt</);
  assert.match(adminDashboard, />Từ chối</);
  assert.match(teacherCourses, /Tạo khóa học|createCourse|submitCreate/);
});

test("generated draw.io uses at least 16px for every declared font size", async () => {
  const drawio = await source("docs/finncenter-main-system-diagrams.drawio");
  const styleSizes = [...drawio.matchAll(/fontSize=(\d+)/g)].map((match) => Number(match[1]));
  const htmlSizes = [...drawio.matchAll(/font-size:(\d+)px/g)].map((match) => Number(match[1]));
  const diagrams = [...drawio.matchAll(/<diagram\b[\s\S]*?<\/diagram>/g)].map((match) => match[0]);

  assert.ok(styleSizes.length > 0);
  assert.ok([...styleSizes, ...htmlSizes].every((size) => size >= 16));
  assert.equal(diagrams.length, 13);

  for (const diagram of diagrams) {
    const ids = [...diagram.matchAll(/<mxCell\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
    const idSet = new Set(ids);
    assert.equal(ids.length, idSet.size, "Mỗi phần tử trong một trang phải có mã riêng");

    for (const match of diagram.matchAll(/<mxCell\b([^>]*)>/g)) {
      const attributes = match[1];
      const value = attributes.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
      const style = attributes.match(/\bstyle="([^"]*)"/)?.[1] ?? "";
      if (value) assert.match(`${style}${value}`, /fontSize=\d+|font-size:\d+px/);
    }

    for (const match of diagram.matchAll(/<mxCell\b[^>]*\bedge="1"[^>]*>/g)) {
      for (const attribute of ["source", "target"]) {
        const connectedId = match[0].match(new RegExp(`${attribute}="([^"]+)"`))?.[1];
        if (connectedId) assert.ok(idSet.has(connectedId), `${attribute} phải nối tới phần tử có thật`);
      }
    }
  }

  const visibleText = [...drawio.matchAll(/<mxCell\b[^>]*\bvalue="([^"]*)"/g)]
    .map((match) => match[1])
    .join("\n");
  assert.doesNotMatch(visibleText, /điểm đậu|hạt đậu|điểm AI|(?:GET|POST|PATCH) \/api|Prisma|PostgreSQL|SMTP|JSON|JWT|cookie|endpoint/i);
});

test("Vietnamese user-facing AI credit name is Điểm nhận xét", async () => {
  const files = [
    "app/components/Header.tsx",
    "app/components/header/ProfileMenu.tsx",
    "app/profile/page.tsx",
    "app/student/page.tsx",
    "app/student/rewards/page.tsx",
    "app/student/wallet/WalletClient.tsx",
    "app/student/wallet/page.tsx",
    "app/admin/AnalyticsDashboardSections.tsx",
    "lib/ai-points.ts",
    "lib/test-language-labels.ts",
  ];
  const contents = (await Promise.all(files.map(source))).join("\n");

  assert.match(contents, /Điểm nhận xét/i);
  assert.doesNotMatch(contents, /điểm đậu|hạt đậu|điểm AI/i);
});
