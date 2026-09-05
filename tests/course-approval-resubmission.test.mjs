import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("teachers can resubmit a rejected course for another approval review", async () => {
  const [detailClient, header, route] = await Promise.all([
    source("app/teacher/courses/[courseId]/CourseDetailClient.tsx"),
    source("app/teacher/courses/[courseId]/_components/CourseHeader.tsx"),
    source("app/api/teacher/courses/[courseId]/route.ts"),
  ]);

  assert.match(header, /viewerRole === "TEACHER" && status === "REJECTED"/);
  assert.match(header, /labels\.resubmit/);
  assert.match(detailClient, /action: "submitForApproval"/);
  assert.match(detailClient, /method: "PATCH"/);
  assert.match(route, /course\.status !== "REJECTED"/);
  assert.match(route, /status: autoApproval\.enabled \? "ACTIVE" : "PENDING_APPROVAL"/);
  assert.match(route, /requiresApproval: updatedCourse\.status === "PENDING_APPROVAL"/);
});
