import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("teacher uses the shared test center and can open the AI point wallet", async () => {
  const [header, profileMenu, legacyTeacherTestsPage] = await Promise.all([
    source("app/components/Header.tsx"),
    source("app/components/header/ProfileMenu.tsx"),
    source("app/teacher/tests/page.tsx"),
  ]);

  const teacherNavigation = header.match(
    /const teacherNavItems = \[([\s\S]*?)\] satisfies BasicNavItem\[\];/,
  )?.[1] ?? "";

  assert.match(teacherNavigation, /href: "\/student\/tests", label: "Bài kiểm tra"/);
  assert.match(teacherNavigation, /href: "\/student\/wallet", label: "Điểm nhận xét"/);
  assert.doesNotMatch(teacherNavigation, /href: "\/teacher\/tests"/);
  assert.match(profileMenu, /href="\/student\/tests"/);
  assert.match(profileMenu, /href="\/student\/wallet"[\s\S]*?Mua điểm nhận xét/);
  assert.match(legacyTeacherTestsPage, /redirect\("\/student\/tests"\)/);
});
