import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function missing(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url));
    return false;
  } catch {
    return true;
  }
}

test("teacher recruitment is a paper-exam notice with a bounded registration window", async () => {
  const [setting, page, admin, locationApi, recruitmentApi, adminShell, overview, testsAdmin, workspace] = await Promise.all([
    source("lib/teacher-onboarding.ts"),
    source("app/teacher-registration/TeacherRegistrationClient.tsx"),
    source("app/admin/AdminTeacherRecruitment.tsx"),
    source("app/api/admin/teacher-exam-locations/route.ts"),
    source("app/api/admin/teacher-recruitment/route.ts"),
    source("app/admin/AdminShell.tsx"),
    source("app/admin/AdminDashboard.tsx"),
    source("app/admin/AdminTestsManagement.tsx"),
    source("app/admin/AdminWorkspace.tsx"),
  ]);
  assert.match(setting, /registrationOpensAt/);
  assert.match(setting, /registrationClosesAt/);
  assert.match(setting, /examStartsAt/);
  assert.match(setting, /location/);
  assert.match(setting, /now >= new Date\(setting\.registrationClosesAt\)/);
  assert.match(page, /Bài thi được thực hiện trực tiếp trên giấy/);
  assert.match(admin, /Tạo đợt tuyển mới/);
  assert.match(admin, /Chọn đợt tuyển/);
  assert.doesNotMatch(admin, /id: "notice"/);
  assert.match(admin, /method: "POST"/);
  assert.match(admin, /Tạo và mở đợt tuyển mới/);
  assert.match(admin, /Địa điểm thi cố định/);
  assert.match(admin, /Tự động mở và đóng theo lịch đăng ký/);
  assert.doesNotMatch(admin, /checked=\{form\.enabled\}/);
  assert.match(recruitmentApi, /export async function POST/);
  assert.match(recruitmentApi, /tx\.recruitmentRound\.create/);
  assert.match(recruitmentApi, /tx\.recruitmentRound\.updateMany/);
  assert.match(recruitmentApi, /activeRoundId: round\.id/);
  assert.match(recruitmentApi, /status: "OPEN"/);
  assert.match(recruitmentApi, /status: "CLOSED"/);
  assert.match(recruitmentApi, /Không được cập nhật đè lên đợt tuyển hiện tại/);
  assert.doesNotMatch(recruitmentApi, /where: \{ id: setting\.activeRoundId/);
  assert.match(locationApi, /setTeacherExamLocations/);
  assert.match(recruitmentApi, /"Địa điểm thi:"/);
  assert.match(recruitmentApi, /locationsText/);
  assert.match(adminShell, /flex min-w-max gap-2/);
  assert.match(admin, /Cập nhật tài khoản giảng viên/);
  assert.doesNotMatch(admin, /Tạo tài khoản có kiểm soát/);
  assert.match(overview, /Duyệt hồ sơ đăng ký giảng viên/);
  assert.match(overview, /Mời dự thi/);
  assert.match(overview, /Duyệt khóa học giảng viên/);
  assert.match(testsAdmin, /Tạo bài luyện tập công khai/);
  assert.match(testsAdmin, /Danh sách bài luyện tập/);
  assert.match(workspace, /display: "flex"/);
  assert.match(workspace, /sidebarWidth = 400/);
  assert.match(workspace, /`0 0 \$\{sidebarWidth\}px`/);
  assert.match(workspace, /flex: "1 1 0%"/);
  assert.match(workspace, /<aside className="p-4"/);
  assert.match(workspace, /<div className="p-4"/);
  assert.doesNotMatch(workspace, /border-r border-border/);
  assert.doesNotMatch(workspace, /rounded-2xl border border-border bg-card shadow-sm/);
  assert.match(workspace, /w-full rounded-xl border px-3 py-3/);
  assert.match(workspace, /border-border bg-transparent/);
  assert.match(overview, /APPLICATIONS_PER_PAGE = 10/);
  assert.match(overview, /visibleApplications\.map/);
  assert.match(overview, /sidebarWidth=\{260\}/);
  assert.match(overview, /normalizedName\.slice\(0, 5\)/);
  assert.match(overview, /title=\{certificate\.fileName\}/);
  assert.match(overview, /sticky right-0/);
});

test("teacher applications store a selected exam location and send readable linked emails", async () => {
  const [page, applicationApi, reviewApi, recruitmentApi, mailer, schema] = await Promise.all([
    source("app/teacher-registration/TeacherRegistrationClient.tsx"),
    source("app/api/teacher-applications/route.ts"),
    source("app/api/admin/recruitment-applications/[applicationId]/route.ts"),
    source("app/api/admin/teacher-recruitment/route.ts"),
    source("lib/mailer.ts"),
    source("prisma/schema.prisma"),
  ]);

  assert.match(page, /formData\.set\("locationId", locationId\)/);
  assert.match(page, /Chọn địa điểm thi/);
  assert.match(applicationApi, /roundLocations\.find\(\(location\) => location\.id === locationId\)/);
  assert.match(applicationApi, /examLocationName: selectedLocation\.name/);
  assert.match(schema, /examLocationId\s+String\?/);
  assert.match(schema, /examLocationAddress\s+String\?/);
  assert.match(recruitmentApi, /registrationUrl/);
  assert.match(recruitmentApi, /actionLabel: "Đăng ký làm giảng viên"/);
  assert.match(reviewApi, /Hồ sơ đã được duyệt tham gia kỳ thi/);
  assert.match(reviewApi, /Địa điểm thi: \$\{application\.examLocationName/);
  assert.match(reviewApi, /Thời gian thi: \$\{examTime\}/);
  assert.match(reviewApi, /tx\.notification\.create/);
  assert.match(mailer, /replace\(\/\\r\?\\n\/g, "<br \/>"\)/);
  assert.match(mailer, /actionUrl/);
});

test("recruitment rounds isolate candidates, public grading, and language-scoped admin conversion", async () => {
  const [schema, roundsApi, roundActionApi, gradingApi, adminActionApi, adminUi, accountUpdatesUi, gradingUi, applicationApi, skills] = await Promise.all([
    source("prisma/schema.prisma"),
    source("app/api/admin/recruitment-rounds/route.ts"),
    source("app/api/admin/recruitment-rounds/[roundId]/route.ts"),
    source("app/api/recruitment-grading/[token]/route.ts"),
    source("app/api/admin/recruitment-applications/[applicationId]/route.ts"),
    source("app/admin/AdminRecruitmentRounds.tsx"),
    source("app/admin/AdminTeacherAccountUpdates.tsx"),
    source("app/recruitment-grading/[token]/RecruitmentGradingClient.tsx"),
    source("app/api/teacher-applications/route.ts"),
    source("lib/teacher-exam-skills.ts"),
  ]);

  assert.match(schema, /model RecruitmentRound/);
  assert.match(schema, /model TeacherExamResult/);
  assert.match(schema, /recruitmentRoundId\s+String\?/);
  assert.match(schema, /INVITED_TO_EXAM/);
  assert.match(schema, /CONVERTED_TO_TEACHER/);
  assert.match(applicationApi, /recruitmentRoundId: activeRound\.id/);
  assert.match(applicationApi, /status: "PENDING"/);
  assert.match(roundsApi, /applications:/);
  assert.doesNotMatch(roundsApi, /export async function POST/);
  assert.doesNotMatch(adminUi, /createRound/);
  assert.match(adminUi, /Chọn và quản lý đợt tuyển/);
  assert.match(roundActionApi, /hashRecruitmentGradingToken/);
  assert.match(roundActionApi, /EXPORT_GRADING_LINK/);
  assert.match(roundActionApi, /UPDATE_TIMES/);
  assert.match(roundActionApi, /registrationClosesAt > times\.examStartsAt/);
  assert.match(roundActionApi, /current\.activeRoundId === round\.id/);
  assert.match(gradingApi, /round\.applications\.find/);
  assert.match(gradingApi, /Array\.isArray\(body\?\.results\)/);
  assert.match(gradingApi, /status: item\.status/);
  assert.match(gradingApi, /!checkedIn && \(completed \|\| manuallyFailed \|\| hasAnyScore\)/);
  assert.match(gradingApi, /!completed && \(manuallyFailed \|\| hasAnyScore\)/);
  assert.match(gradingApi, /averageScore < TEACHER_EXAM_PASSING_AVERAGE/);
  assert.match(gradingApi, /failed[\s\S]*"REJECTED"/);
  assert.doesNotMatch(gradingApi, /role: "TEACHER"/);
  assert.match(adminActionApi, /admin\.role !== "ADMIN"/);
  assert.match(adminActionApi, /action === "CONVERT_TO_TEACHER"/);
  assert.match(adminActionApi, /role: "TEACHER"/);
  assert.match(adminActionApi, /languageId: language\.id/);
  assert.match(adminActionApi, /id: application\.languageId/);
  assert.match(adminActionApi, /averageScore < TEACHER_EXAM_PASSING_AVERAGE/);
  assert.doesNotMatch(adminActionApi, /body\?\.languageId/);
  assert.match(adminUi, /APPLICATIONS_PER_PAGE = 10/);
  assert.match(adminUi, /Xuất link chấm thi/);
  assert.match(adminUi, /Chỉnh sửa thời gian/);
  assert.match(adminUi, /action: "UPDATE_TIMES"/);
  assert.doesNotMatch(adminUi, /ConversionAction/);
  assert.doesNotMatch(adminUi, />Xử lý</);
  assert.match(adminUi, /ExamResultDetailDialog/);
  assert.match(adminUi, />\s*Chi tiết\s*</);
  assert.match(adminUi, /Điểm trung bình/);
  assert.match(adminUi, /sm:grid-cols-2/);
  assert.doesNotMatch(adminUi, /min-w-\[500px\]/);
  assert.doesNotMatch(adminUi, /setLanguageId/);
  assert.match(accountUpdatesUi, /application\.status === "PASSED"/);
  assert.match(accountUpdatesUi, /type="checkbox"/);
  assert.match(accountUpdatesUi, /Giảng viên \{group\.languageName\}/);
  assert.match(accountUpdatesUi, /Giáo viên \{application\.language\.name\}/);
  assert.match(accountUpdatesUi, /Điểm trung bình 4 kỹ năng/);
  assert.doesNotMatch(accountUpdatesUi, />Trạng thái</);
  assert.match(accountUpdatesUi, /action: "CONVERT_TO_TEACHER"/);
  assert.match(gradingUi, /Nộp kết quả/);
  assert.match(gradingUi, /table-fixed/);
  assert.match(gradingUi, /<col className="w-\[150px\]" \/>/);
  assert.match(gradingUi, /h-11 w-full/);
  assert.match(gradingUi, /size-11/);
  assert.match(gradingUi, /const completionLocked = locked \|\| !form\.checkedIn/);
  assert.match(gradingUi, /const gradingLocked = completionLocked \|\| !form\.completed/);
  assert.match(gradingUi, /Tìm kiếm thí sinh/);
  assert.match(gradingUi, /Tất cả ngôn ngữ/);
  assert.match(gradingUi, /Tất cả địa điểm/);
  assert.match(gradingUi, /display: "flex", minWidth: 900/);
  assert.match(gradingUi, /flex: "1 1 420px"/);
  assert.match(gradingUi, /Chứng chỉ \{index \+ 1\}/);
  assert.match(gradingUi, /results: submittedIds\.map/);
  assert.match(gradingUi, /type="number"/);
  assert.match(skills, /写作/);
  assert.match(skills, /作文/);
  assert.match(skills, /쓰기/);
  assert.match(skills, /TEACHER_EXAM_PASSING_AVERAGE = 80/);
  assert.match(skills, /calculateTeacherExamAverage/);
});

test("online teacher entrance routes and wallet endpoints are removed", async () => {
  assert.equal(await missing("app/api/teacher-applications/[applicationId]/submit-test/route.ts"), true);
  assert.equal(await missing("app/api/teacher-applications/[applicationId]/heartbeat/route.ts"), true);
  assert.equal(await missing("app/api/wallet/route.ts"), true);
  const schema = await source("prisma/schema.prisma");
  assert.doesNotMatch(schema, /model Wallet/);
});

test("admin invitations create approved language-scoped teachers through an emailed password link", async () => {
  const [adminInvite, acceptInvite, schema] = await Promise.all([
    source("app/api/admin/invitations/route.ts"),
    source("app/api/auth/invitations/route.ts"),
    source("prisma/schema.prisma"),
  ]);
  assert.match(adminInvite, /role: "TEACHER"/);
  assert.match(adminInvite, /sendBasicEmail/);
  assert.match(acceptInvite, /hashPassword/);
  assert.match(acceptInvite, /status: "APPROVED"/);
  assert.match(schema, /model UserInvitation/);
});

test("unknown devices require email confirmation, remember multiple accounts, and revoke previous sessions", async () => {
  const [login, auth, confirm, schema] = await Promise.all([
    source("app/api/auth/login/route.ts"),
    source("lib/auth.ts"),
    source("app/api/auth/confirm-device/route.ts"),
    source("prisma/schema.prisma"),
  ]);
  assert.match(login, /requiresDeviceConfirmation/);
  assert.match(login, /createLoginDeviceChallenge/);
  assert.match(confirm, /confirmLoginDevice/);
  assert.match(auth, /session\.deleteMany\(\{ where: \{ userId: params\.user\.id \} \}\)/);
  assert.match(auth, /trustedDevice\.tokenHash !== hashOpaqueToken/);
  assert.match(auth, /cookieStore\.get\(TRUSTED_DEVICE_COOKIE_NAME\)\?\.value \|\| randomBytes/);
  assert.match(auth, /userId_tokenHash: \{ userId: params\.user\.id, tokenHash \}/);
  assert.match(schema, /@@unique\(\[userId, tokenHash\]\)/);
  assert.match(schema, /model TrustedDevice/);
  assert.match(schema, /model LoginDeviceChallenge/);
});
