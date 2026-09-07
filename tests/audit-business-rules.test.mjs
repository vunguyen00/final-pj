import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeScoresToTotal } from "../scripts/test-score-normalization.mjs";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("payment callbacks have a claim step and unique order item key", async () => {
  const [payment, schema] = await Promise.all([
    source("lib/course-payment.ts"),
    source("prisma/schema.prisma"),
  ]);
  assert.match(payment, /updateMany[\s\S]*status: COURSE_PAYMENT_STATUS\.PENDING/);
  assert.match(schema, /@@unique\(\[orderId, courseId\]\)/);
});

test("refund is external, never credited internally, and removes learning state", async () => {
  const [schema, refund] = await Promise.all([
    source("prisma/schema.prisma"),
    source("app/api/admin/course-refunds/[refundId]/route.ts"),
  ]);
  assert.doesNotMatch(schema, /model Wallet/);
  assert.match(refund, /refundMethod: "EXTERNAL_ACCOUNT"/);
  assert.doesNotMatch(refund, /tx\.wallet\.(upsert|update)/);
  assert.match(refund, /testAttempt\.deleteMany/);
  assert.match(refund, /videoWatchProgress\.deleteMany/);
});

test("pending refunds suspend course access and rejection restores it", async () => {
  const [schema, createRefund, reviewRefund, learningPage] = await Promise.all([
    source("prisma/schema.prisma"),
    source("app/api/course-refunds/route.ts"),
    source("app/api/admin/course-refunds/[refundId]/route.ts"),
    source("app/student/hoc-bai/page.tsx"),
  ]);
  assert.match(schema, /enum EnrollmentAccessStatus[\s\S]*ACTIVE[\s\S]*REFUND_PENDING/);
  assert.match(createRefund, /accessStatus: "REFUND_PENDING"/);
  assert.match(reviewRefund, /accessStatus: "ACTIVE"/);
  assert.match(learningPage, /enrollment\?\.accessStatus === "ACTIVE"/);
});

test("all newly created tests and existing-test migration are unlimited", async () => {
  const [route, migration] = await Promise.all([
    source("app/api/teacher/tests/route.ts"),
    source("prisma/migrations/20260716213000_external_refunds_unlimited_tests/migration.sql"),
  ]);
  assert.match(route, /maxAttempts: UNLIMITED_TEST_ATTEMPTS/);
  assert.match(migration, /UPDATE "Test" SET "maxAttempts" = 2147483647/);
});

test("beginner-course test weights are normalized to the platform's 100-point scale", async () => {
  const normalized = normalizeScoresToTotal([1, 1, 1, 1, 1, 1, 1, 1, 5, 5]);
  const total = normalized.reduce((sum, score) => sum + score, 0);

  assert.equal(total, 100);
  assert.equal(normalized.length, 10);
  assert.ok(normalized[8] > normalized[0] * 4.9);
});

test("security-sensitive account changes revoke old auth tokens", async () => {
  const [auth, password, schema] = await Promise.all([
    source("lib/auth.ts"),
    source("app/api/profile/password/route.ts"),
    source("prisma/schema.prisma"),
  ]);
  assert.match(schema, /authVersion\s+Int\s+@default\(0\)/);
  assert.match(auth, /user\.authVersion !== payload\.ver/);
  assert.match(password, /authVersion: \{ increment: 1 \}/);
});

test("video completion follows playback ending while bank withdrawals remain server verified", async () => {
  const [learningClient, complete, bank, withdrawal] = await Promise.all([
    source("app/student/hoc-bai/components/LearningContent.tsx"),
    source("app/api/learning/lessons/[lessonId]/complete/route.ts"),
    source("app/api/teacher/bank-account/verify-otp/route.ts"),
    source("app/api/teacher/revenue-withdrawals/route.ts"),
  ]);
  assert.match(learningClient, /onEnded=\{\(\) => void onMarkDone\(lesson\)\}/);
  assert.doesNotMatch(learningClient, /\/heartbeat/);
  assert.doesNotMatch(learningClient, /onSeek(?:ing|ed)=/);
  assert.doesNotMatch(complete, /body\?\.watchedFull/);
  assert.doesNotMatch(complete, /videoWatchProgress/);
  assert.match(bank, /verificationStatus: "VERIFIED"/);
  assert.match(withdrawal, /verificationStatus !== "VERIFIED"/);
});

test("course publishing and private pages have server-side guards", async () => {
  const [courseRoute, studentLayout, teacherLayout, myCourses, refundRoute] = await Promise.all([
    source("app/api/teacher/courses/[courseId]/route.ts"),
    source("app/student/layout.tsx"),
    source("app/teacher/courses/layout.tsx"),
    source("app/my-courses/page.tsx"),
    source("app/api/course-refunds/route.ts"),
  ]);
  assert.match(courseRoute, /getCourseReadiness/);
  assert.match(studentLayout, /requireUser/);
  assert.match(teacherLayout, /requireRole\("TEACHER", "ADMIN"\)/);
  assert.match(myCourses, /requireRole\("STUDENT", "TEACHER", "ADMIN"\)/);
  assert.match(refundRoute, /requireRole\("STUDENT", "TEACHER", "ADMIN"\)/);
});

test("only admins choose course language and teachers use their latest approved language", async () => {
  const [route, updateRoute, coursePage, courseInfo] = await Promise.all([
    source("app/api/teacher/courses/route.ts"),
    source("app/api/teacher/courses/[courseId]/route.ts"),
    source("app/teacher/courses/page.tsx"),
    source("app/teacher/courses/[courseId]/_components/CourseInfoTab.tsx"),
  ]);

  assert.match(route, /const normalizedLanguageId = typeof languageId === "string" \? languageId\.trim\(\) : ""/);
  assert.match(route, /status: \{ in: \["APPROVED", "CONVERTED_TO_TEACHER"\] \}[\s\S]*orderBy: \{ reviewedAt: "desc" \}/);
  assert.match(route, /user\.role === "TEACHER" && !approvedApplication/);
  assert.match(route, /\? approvedApplication!\.languageId/);
  assert.match(updateRoute, /languageId && user\.role === "ADMIN"/);
  assert.doesNotMatch(updateRoute, /approvedLanguage[\s\S]*updateData\.languageId = languageId/);
  assert.match(coursePage, /user\?\.role === "ADMIN" \? \(/);
  assert.match(coursePage, /readOnly[\s\S]*getLanguageNativeLabel/);
  assert.match(coursePage, /\{formLabels\.approvalNotice\}/);
  assert.match(courseInfo, /viewerRole === "ADMIN" \? \(/);
  assert.match(courseInfo, /readOnly[\s\S]*getLanguageNativeLabel/);
});

test("teachers see every enrollee without roles while admins retain role visibility", async () => {
  const teacherStudents = await source("lib/teacher-students.ts");
  const teacherQuery = teacherStudents.slice(
    teacherStudents.indexOf("async function getTeacherStudents"),
    teacherStudents.indexOf("async function getAdminManagedUsers"),
  );
  const adminQuery = teacherStudents.slice(
    teacherStudents.indexOf("async function getAdminManagedUsers"),
    teacherStudents.indexOf("export async function getStudentsManagementData"),
  );

  assert.match(teacherQuery, /where: \{ course: \{ instructorId: viewerId \} \}/);
  assert.doesNotMatch(teacherQuery, /role/);
  assert.match(teacherQuery, /id: true,[\s\S]*username: true,[\s\S]*email: true/);
  assert.match(adminQuery, /role: true/);
});

test.skip("removed online teacher entrance test was server-sequential", async () => {
  const [
    client,
    sequentialClient,
    heartbeat,
    antiCheat,
    submit,
    grading,
    legacyReveal,
    currentQuestion,
    finalize,
    autosave,
    registrationData,
    schema,
    questionEditor,
    createQuestion,
  ] = await Promise.all([
    source("app/teacher-registration/TeacherRegistrationClient.tsx"),
    source("app/teacher-registration/components/TeacherSequentialExam.tsx"),
    source("app/api/teacher-applications/[applicationId]/heartbeat/route.ts"),
    source("lib/teacher-anti-cheat.ts"),
    source("app/api/teacher-applications/[applicationId]/submit-test/route.ts"),
    source("lib/teacher-entrance-grading.ts"),
    source("app/api/teacher-applications/[applicationId]/questions/[questionId]/reveal/route.ts"),
    source("app/api/teacher-applications/[applicationId]/session/current/route.ts"),
    source("app/api/teacher-applications/[applicationId]/session/finalize/route.ts"),
    source("app/api/teacher-applications/[applicationId]/autosave/route.ts"),
    source("lib/teacher-registration-data.ts"),
    source("prisma/schema.prisma"),
    source("app/teacher/tests/[testId]/questions/components/QuestionModal.tsx"),
    source("app/api/teacher/tests/[testId]/questions/route.ts"),
  ]);

  assert.match(client, /markAway[\s\S]*record\([\s\S]*"TAB_HIDDEN"[\s\S]*"WINDOW_BLUR"/);
  assert.match(client, /setInterval\([\s\S]*sendProctorHeartbeat/);
  assert.match(client, /keyboardLock: "browser"/);
  assert.match(client, /event\.key === "Escape"/);
  assert.match(client, /proctoringActiveRef\.current = false;[\s\S]*setAntiCheatAccepted\(false\);[\s\S]*document\.exitFullscreen/);
  assert.match(client, /if \(!proctoringActiveRef\.current\) return;[\s\S]*const key = event\.key\.toLowerCase\(\)/);
  assert.match(heartbeat, /PROCTOR_HEARTBEAT_GAP/);
  assert.match(heartbeat, /MULTIPLE_EXAM_SESSIONS/);
  assert.match(heartbeat, /MULTIPLE_DISPLAYS/);
  assert.match(antiCheat, /case "TAB_HIDDEN":[\s\S]*case "WINDOW_BLUR":[\s\S]*return "VIOLATION"/);
  assert.match(client, /awayIncidentIdRef\.current = crypto\.randomUUID\(\)/);
  assert.match(antiCheat, /incidentId: input\.incidentId/);
  assert.doesNotMatch(antiCheat, /eventCooldownSeconds/);
  assert.match(submit, /proctorHeartbeatAt[\s\S]*heartbeatGapSeconds/);
  assert.match(submit, /sequentialCompletedAt/);
  assert.match(grading, /questionInstances[\s\S]*finalAnswer/);
  assert.match(submit, /after\(\(\) => processTeacherEntranceSubmission/);
  assert.match(legacyReveal, /QUESTION_NO_LONGER_AVAILABLE/);
  assert.match(currentQuestion, /initializeTeacherQuestionInstances/);
  assert.match(currentQuestion, /rotateTeacherQuestionToken/);
  assert.match(finalize, /FOR UPDATE/);
  assert.match(finalize, /currentQuestionInstanceId !== questionInstanceId/);
  assert.match(finalize, /verifyTeacherTransitionToken/);
  assert.match(finalize, /status: "FINALIZING"/);
  assert.match(finalize, /status: "LOCKED"/);
  assert.match(autosave, /revision <= instance\.answerRevision/);
  assert.match(autosave, /QUESTION_ALREADY_FINALIZED/);
  assert.match(autosave, /currentQuestionInstanceId !== questionInstanceId/);
  assert.match(sequentialClient, /Sau khi chốt, câu hỏi này sẽ không thể mở lại/);
  assert.match(sequentialClient, /Bỏ qua câu này/);
  assert.match(sequentialClient, /popstate/);
  assert.match(registrationData, /questions: \[\]/);
  assert.match(schema, /model TeacherEntranceQuestionInstance/);
  assert.match(schema, /TeacherQuestionInstanceStatus/);
  assert.match(schema, /transitionTokenHash/);
  assert.match(schema, /@@unique\(\[applicationId, sequence\]\)/);
  assert.match(schema, /preparationTimeSeconds\s+Int\?/);
  assert.match(schema, /answerTimeSeconds\s+Int\?/);
  assert.match(questionEditor, /answerMinutes/);
  assert.match(questionEditor, /Number\(event\.target\.value\) \* 60/);
  assert.match(createQuestion, /type === "SPEAKING" \? 120 : 3600/);
  assert.match(createQuestion, /type === "SPEAKING" \? 300 : 10800/);
});

test.skip("removed teacher entrance grading exposed completed attempts to admin", async () => {
  const [client, submit, grading, adminDashboard, adminAttempt] = await Promise.all([
    source("app/teacher-registration/TeacherRegistrationClient.tsx"),
    source("app/api/teacher-applications/[applicationId]/submit-test/route.ts"),
    source("lib/teacher-entrance-grading.ts"),
    source("app/admin/AdminDashboard.tsx"),
    source("app/api/admin/teacher-applications/[applicationId]/attempt/route.ts"),
  ]);

  assert.match(submit, /status: "SUBMITTED"/);
  assert.match(submit, /after\(\(\) => processTeacherEntranceSubmission/);
  assert.match(submit, /\{ status: 202 \}/);
  assert.match(client, /await exitFullscreenPromise;[\s\S]*router\.replace\("\/"\)/);
  assert.match(grading, /title: "Đã chấm xong bài đầu vào giảng viên"/);
  assert.match(grading, /where: \{ role: "ADMIN" \}/);
  assert.match(grading, /failureReason: "AI_GRADING_FAILED"/);
  assert.match(adminAttempt, /admin\.role !== "ADMIN"/);
  assert.match(adminAttempt, /questionResults/);
  assert.match(adminAttempt, /export async function PUT/);
  assert.match(adminAttempt, /current\.failureReason !== "AI_GRADING_FAILED"/);
  assert.match(adminAttempt, /score < 0 \|\| score > question\.score/);
  assert.match(adminAttempt, /manuallyGraded: true/);
  assert.match(adminDashboard, /Xem bài làm/);
  assert.match(adminDashboard, /Mở và chấm thủ công/);
  assert.match(adminDashboard, /PROCTOR_HEARTBEAT_GAP: "Kết nối giám sát bị gián đoạn"/);
  assert.match(adminDashboard, /const APPLICATIONS_PER_PAGE = 5/);
  assert.match(adminDashboard, /const COLLAPSED_BEHAVIOR_COUNT = 5/);
  assert.match(adminDashboard, /visibleApplications = filteredApplications\.slice/);
  assert.match(adminDashboard, /function UserBehaviorDetailDialog/);
  assert.match(adminDashboard, /TeacherEntranceAttemptDialog/);
});

test.skip("removed teacher entrance speaking queue", async () => {
  const [
    sequentialClient,
    recorder,
    transcription,
    upload,
    jobs,
    complete,
    finalize,
    submit,
    schema,
  ] = await Promise.all([
    source("app/teacher-registration/components/TeacherSequentialExam.tsx"),
    source("app/teacher-registration/components/TeacherSpeakingRecorder.tsx"),
    source("lib/client-speaking-transcription.ts"),
    source("app/api/teacher-applications/[applicationId]/session/speaking/upload/route.ts"),
    source("app/api/teacher-applications/[applicationId]/session/speaking/jobs/route.ts"),
    source("app/api/teacher-applications/[applicationId]/session/speaking/complete/route.ts"),
    source("app/api/teacher-applications/[applicationId]/session/finalize/route.ts"),
    source("app/api/teacher-applications/[applicationId]/submit-test/route.ts"),
    source("prisma/schema.prisma"),
  ]);

  assert.match(recorder, /await onAudioReady\(blob\)/);
  assert.match(recorder, /phần nhận dạng sẽ tiếp tục chạy nền/);
  assert.match(sequentialClient, /void processSpeakingMediaJob\(job, blob\)/);
  assert.match(sequentialClient, /loadSpeakingMediaJobs\(false\)/);
  assert.match(sequentialClient, /pendingMediaJobs > 0/);
  assert.match(transcription, /transcriptionQueue = job\.then/);
  assert.match(upload, /speakingAudioHash: audioHash/);
  assert.match(upload, /speakingMediaStatus: "PROCESSING"/);
  assert.match(jobs, /\["UPLOADED", "PROCESSING", "FAILED"\]/);
  assert.match(complete, /speakingMediaStatus: "READY"/);
  assert.match(complete, /speakingMediaStatus: "FAILED"/);
  assert.match(finalize, /instance\.speakingTranscript/);
  assert.match(submit, /speakingMediaStatus !== "READY"/);
  assert.match(submit, /mediaPending/);
  assert.match(schema, /enum TeacherSpeakingMediaStatus/);
  assert.match(schema, /speakingProcessingTokenHash\s+String\?/);
});

test("admin reviews recruitment applications by inviting or rejecting from the dashboard", async () => {
  const [dashboard, reviewRoute] = await Promise.all([
    source("app/admin/AdminDashboard.tsx"),
    source("app/api/admin/recruitment-applications/[applicationId]/route.ts"),
  ]);

  assert.match(dashboard, /function canReviewTeacherApplication[\s\S]*application\.status === "PENDING"/);
  assert.match(dashboard, /pendingApplications[\s\S]*applications\.filter\(canReviewTeacherApplication\)/);
  assert.match(dashboard, /\{canReviewTeacherApplication\(application\) \?/);
  assert.match(dashboard, /action: "INVITE_TO_EXAM"/);
  assert.match(dashboard, /\/api\/admin\/recruitment-applications/);
  assert.doesNotMatch(dashboard, /\/api\/admin\/teacher-applications\/\$\{application\.id\}\/review/);
  assert.match(dashboard, /window\.prompt\("Lý do từ chối hồ sơ:"\)\?\.trim\(\)/);
  assert.match(reviewRoute, /\["PENDING", "UNDER_REVIEW"\]/);
  assert.match(reviewRoute, /nextStatus = "INVITED_TO_EXAM"/);
});

test("admin course approval uses the existing course review endpoint", async () => {
  const dashboard = await source("app/admin/AdminDashboard.tsx");

  assert.match(dashboard, /fetch\(`\/api\/teacher\/courses\/\$\{encodeURIComponent\(course\.id\)\}`/);
  assert.match(dashboard, /method: "PATCH"/);
  assert.match(dashboard, /action: "reviewCourse"/);
  assert.match(dashboard, /decision: action/);
  assert.doesNotMatch(dashboard, /fetch\("\/api\/admin\/course-approval", \{\s*method: "POST"/);
});

test("enabling course auto approval scans and resolves every pending course", async () => {
  const [approvalService, approvalRoute, dashboard, readiness] = await Promise.all([
    source("lib/course-approval.ts"),
    source("app/api/admin/course-approval/route.ts"),
    source("app/admin/AdminDashboard.tsx"),
    source("lib/course-readiness.ts"),
  ]);

  assert.match(approvalService, /scanPendingCoursesForAutoApproval/);
  assert.match(approvalService, /where: \{ status: "PENDING_APPROVAL" \}/);
  assert.match(approvalService, /getCourseReadiness\(course\.id\)/);
  assert.match(approvalService, /const nextStatus = readiness\.ready \? "ACTIVE" : "REJECTED"/);
  assert.match(approvalService, /Lý do: \$\{reasons\.join\(" "\)\}/);
  assert.match(approvalRoute, /enabled \? await scanPendingCoursesForAutoApproval\(\) : null/);
  assert.match(dashboard, /quét toàn bộ khóa chờ duyệt/);
  assert.match(readiness, /Khóa học cần ít nhất một chương/);
  assert.match(readiness, /Khóa học cần ít nhất một bài học/);
  assert.match(readiness, /Khóa học cần một bài kiểm tra cuối khóa/);
});

test("course report submission notifies every admin in the same transaction", async () => {
  const [route, migration] = await Promise.all([
    source("app/api/course-reports/route.ts"),
    source("prisma/migrations/20260722180000_notify_admins_of_existing_course_reports/migration.sql"),
  ]);

  assert.match(route, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(route, /tx\.user\.findMany\([\s\S]*role: "ADMIN"/);
  assert.match(route, /tx\.notification\.createMany\(/);
  assert.match(route, /Có báo cáo khóa học mới/);
  assert.match(migration, /INSERT INTO "Notification"/);
  assert.match(migration, /report\."status" IN \('PENDING', 'IN_REVIEW'\)/);
});

test("course learning enforces module tests before opening later modules", async () => {
  const [learningPage, startLesson, completeLesson, submitTest] = await Promise.all([
    source("app/student/hoc-bai/page.tsx"),
    source("app/api/learning/lessons/[lessonId]/start/route.ts"),
    source("app/api/learning/lessons/[lessonId]/complete/route.ts"),
    source("app/api/student/tests/[testId]/submit/route.ts"),
  ]);

  assert.match(learningPage, /content: isUnlocked \? courseLesson\.content : ""/);
  assert.match(startLesson, /isModuleUnlocked\(gateState, lesson\.module\.id\)/);
  assert.match(completeLesson, /getNextCourseLearningAction\(updatedGateState\)/);
  assert.match(submitTest, /isCourseTestUnlocked\(gateState, test\)/);
  assert.match(submitTest, /courseCompleted = gateState\.courseComplete/);
});

test("buying beans from a test keeps the test open and returns payment to that test", async () => {
  const [testClient, walletClient, buyRoute, returnRoute] = await Promise.all([
    source("app/student/tests/[testId]/StudentTakeTestClient.tsx"),
    source("app/student/wallet/WalletClient.tsx"),
    source("app/api/ai/points/buy/route.ts"),
    source("app/api/ai/points/vnpay-return/route.ts"),
  ]);

  assert.match(testClient, /window\.open\("about:blank", "_blank"\)/);
  assert.doesNotMatch(testClient, /window\.location\.href = "\/student\/wallet"/);
  assert.match(testClient, /AI_POINT_PURCHASE_EVENT_KEY/);
  assert.match(walletClient, /window\.close\(\)/);
  assert.match(walletClient, /window\.location\.replace\(successReturnTo\)/);
  assert.match(buyRoute, /returnUrl\.searchParams\.set\("returnTo", returnTo\)/);
  assert.match(returnRoute, /url\.searchParams\.set\("returnTo", context\.returnTo\)/);
});

test("admin managed tests use server-side search, filters, and ten-item pagination", async () => {
  const [query, route, client] = await Promise.all([
    source("lib/admin-managed-tests.ts"),
    source("app/api/admin/tests/route.ts"),
    source("app/admin/AdminTestsManagement.tsx"),
  ]);

  assert.match(query, /ADMIN_MANAGED_TESTS_PAGE_SIZE = 10/);
  assert.match(query, /name: \{ contains: search, mode: "insensitive"/);
  assert.match(query, /\.\.\.\(languageId \? \{ languageId \} : \{\}\)/);
  assert.match(query, /take: ADMIN_MANAGED_TESTS_PAGE_SIZE/);
  assert.match(route, /user\.role !== "ADMIN"/);
  assert.match(client, /Tìm tên đề/);
  assert.match(client, /kind: "PUBLIC_PRACTICE"/);
  assert.doesNotMatch(client, /kind: "TEACHER_ENTRANCE"/);
});

test("admin analytics highlights platform sales and ranks revenue contributors in full-width reports", async () => {
  const [analytics, sections, dashboard] = await Promise.all([
    source("lib/admin-analytics.ts"),
    source("app/admin/AnalyticsDashboardSections.tsx"),
    source("app/admin/AnalyticsDashboard.tsx"),
  ]);

  assert.match(analytics, /orderByTeacherGrossRevenue/);
  assert.match(analytics, /accumulateCounter\(orderByTeacherGrossRevenue, instructorId, item\.price\)/);
  assert.match(analytics, /highestGrossRevenue: rankingTeachersGrossRevenue/);
  assert.match(sections, /Tổng doanh số nền tảng/);
  assert.match(sections, /Người đóng góp doanh thu cao nhất/);
  assert.doesNotMatch(sections, /<section className="grid gap-5 xl:grid-cols-\[1\.1fr_0\.9fr\]">/);
  assert.doesNotMatch(sections, /<section className="grid gap-5 xl:grid-cols-2">/);
  assert.match(dashboard, /<RevenueContributorsSection data=\{data\} \/>/);
});
