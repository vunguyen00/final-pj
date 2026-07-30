import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("course report panel shows five reports per page and preserves search while paging", async () => {
  const panel = await source("app/components/CourseReportsPanel.tsx");

  assert.match(panel, /const REPORTS_PER_PAGE = 5/);
  assert.match(panel, /params\.set\("search", requestedSearch\)/);
  assert.match(panel, /load\(page - 1, appliedSearch\)/);
  assert.match(panel, /load\(page \+ 1, appliedSearch\)/);
  assert.match(panel, /Tìm kiếm báo cáo/);
});

test("course report API searches report, course, lesson, and reporter fields", async () => {
  const route = await source("app/api/course-reports/route.ts");

  assert.match(route, /searchParams\.get\("search"\)/);
  assert.match(route, /title: \{ contains: search/);
  assert.match(route, /description: \{ contains: search/);
  assert.match(route, /course: \{ name: \{ contains: search/);
  assert.match(route, /lesson: \{ title: \{ contains: search/);
  assert.match(route, /reporter: \{ username: \{ contains: search/);
  assert.match(route, /reporter: \{ email: \{ contains: search/);
  assert.match(route, /mode: "insensitive"/);
});
