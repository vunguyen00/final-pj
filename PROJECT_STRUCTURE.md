# Cau truc du an

Du an la ung dung Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Prisma 7 va PostgreSQL. API duoc viet bang route handlers trong `app/api/**/route.ts`; server-side logic dung cac service trong `lib/**`; database schema nam trong `prisma/schema.prisma`.

## Thu muc goc

```text
final-pj/
  .agents/                         # Skill/workflow noi bo cua workspace
  .claude/                         # Cau hinh Claude neu co
  .github/                         # GitHub config/workflows
  .vscode/                         # Cau hinh editor
  app/                             # Next.js App Router: pages, layouts, API routes
  components/                      # Component UI dung chung ngoai app/components
  config/                          # Cau hinh runtime tinh
  lib/                             # Business logic, service, helper
  prisma/                          # Prisma schema va migrations
  public/                          # Static assets, uploads, videos, certificates
  docker-compose.yml               # PostgreSQL/container support
  eslint.config.mjs                # ESLint config
  next.config.ts                   # Next config
  package.json                     # Scripts va dependencies
  pnpm-lock.yaml                   # Lockfile pnpm
  package-lock.json                # Lockfile npm
  pnpm-workspace.yaml              # pnpm workspace
  postcss.config.mjs               # PostCSS/Tailwind
  prisma.config.ts                 # Prisma config
  README.md                        # Mo ta tong quan du an
  tsconfig.json                    # TypeScript config
```

## File cau hinh quan trong

```text
package.json
  scripts:
    postinstall: prisma generate
    dev: next dev
    dev:next: next dev -H ::
    dev:tunnel: cloudflared tunnel run finncenter
    dev:ollama: ollama serve
    docker:up: docker start musing_curie
    dev:all: docker + next + tunnel + ollama
    build: next build
    start: next start
    lint: eslint
    doctor: npx react-doctor@latest

next.config.ts
tsconfig.json
eslint.config.mjs
postcss.config.mjs
prisma.config.ts
docker-compose.yml
config/vnpay.json
```

## `app/`

```text
app/
  layout.tsx
  globals.css
  page.tsx
  favicon.ico

  about/
    page.tsx

  admin/
    layout.tsx
    page.tsx
    AdminDashboard.tsx
    AdminRevenueWithdrawals.tsx
    AdminShell.tsx
    AdminTestsManagement.tsx
    AnalyticsDashboard.tsx
    AnalyticsDashboardSections.tsx
    analytics-actions.ts
    types.ts

  api/
    admin/
      analytics/route.ts
      course-approval/route.ts
      revenue-withdrawals/[withdrawalId]/route.ts
      speaking-config/route.ts
      teacher-applications/route.ts
      teacher-applications/[applicationId]/review/route.ts
      teacher-entrance/route.ts
      users/[userId]/route.ts
    ai/
      essay-evaluation/route.ts
      writing-prompt/route.ts
      points/route.ts
      points/buy/route.ts
      points/spend/route.ts
      speaking-evaluation/route.ts
      speaking-evaluation/config/route.ts
      speaking-evaluation/topic/route.ts
    auth/
      login/route.ts
      logout/route.ts
      me/route.ts
      register/route.ts
      verify-email/route.ts
      forgot-password/request-otp/route.ts
      forgot-password/reset/route.ts
    courses/
      route.ts
      [id]/access/route.ts
      [id]/enroll/route.ts
      [id]/reviews/route.ts
    health/
      route.ts
    languages/
      route.ts
    learning/
      lessons/[lessonId]/start/route.ts
      lessons/[lessonId]/complete/route.ts
    profile/
      route.ts
      password/route.ts
    student/
      results/route.ts
      results/[resultId]/route.ts
      tests/route.ts
      tests/history/route.ts
      tests/[testId]/route.ts
      tests/[testId]/submit/route.ts
      tests/[testId]/attempts/[attemptId]/route.ts
    teacher/
      courses/route.ts
      courses/[courseId]/route.ts
      courses/[courseId]/modules/route.ts
      courses/[courseId]/modules/[moduleId]/route.ts
      courses/[courseId]/modules/[moduleId]/lessons/route.ts
      courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/route.ts
      question-audio-upload/route.ts
      revenue-withdrawals/route.ts
      students/route.ts
      test-material-upload/route.ts
      tests/route.ts
      tests/[testId]/route.ts
      tests/[testId]/questions/route.ts
      tests/[testId]/questions/[questionId]/route.ts
      upload/route.ts
      upload-thumbnail/route.ts
    teacher-applications/
      route.ts
      [applicationId]/anti-cheat/route.ts
      [applicationId]/autosave/route.ts
      [applicationId]/submit-test/route.ts
    wallet/
      route.ts
      top-up/route.ts
      vnpay-ipn/route.ts
      vnpay-return/route.ts

  auth/
    layout.tsx
    login/page.tsx
    login/LoginForm.tsx
    register/page.tsx
    register/RegisterForm.tsx
    forgot-password/page.tsx
    forgot-password/ForgotPasswordForm.tsx

  components/
    Footer.tsx
    FormattedHint.tsx
    Header.tsx
    IeltsEvaluationResult.tsx
    LogoutButton.tsx
    SpeakingAnswerInput.tsx
    StarRatingInput.tsx
    TestMaterialPanel.tsx
    index.ts
    learningMarketplace.ts
    header/
      AuthButtons.tsx
      LoadingSkeleton.tsx
      ProfileMenu.tsx
      useUser.ts

  courses/
    page.tsx
    [id]/page.tsx
    [id]/components/CourseReviewForm.tsx
    [id]/components/EnrollCourseCard.tsx

  forgot-password/
    page.tsx

  generated/
    prisma/                         # Prisma Client generated code

  my-courses/
    page.tsx
  my-learning/
    page.tsx

  profile/
    page.tsx
    ProfileSettings.tsx

  student/
    page.tsx
    hoc-bai/page.tsx
    hoc-bai/components/LearningContent.tsx
    lam-bai/page.tsx
    results/page.tsx
    results/ResultsClient.tsx
    results/[resultId]/page.tsx
    rewards/page.tsx
    speaking-ai/page.tsx
    speaking-ai/SpeakingAiClient.tsx
    tests/page.tsx
    tests/history/page.tsx
    tests/[testId]/page.tsx
    tests/[testId]/StudentTakeTestClient.tsx
    tests/[testId]/result/[attemptId]/page.tsx
    tests/[testId]/result/[attemptId]/CourseReviewPopup.tsx
    wallet/page.tsx
    wallet/WalletClient.tsx
    writing-ai/page.tsx

  teacher/
    page.tsx
    courses/page.tsx
    courses/[courseId]/page.tsx
    courses/[courseId]/types.ts
    courses/[courseId]/_components/CourseHeader.tsx
    courses/[courseId]/_components/CourseInfoTab.tsx
    courses/[courseId]/_components/CourseTabs.tsx
    courses/[courseId]/_components/ModuleModal.tsx
    courses/[courseId]/_components/ModulesTab.tsx
    courses/[courseId]/_components/TestModal.tsx
    courses/[courseId]/_components/TestsTab.tsx
    courses/[courseId]/modules/[moduleId]/page.tsx
    students/page.tsx
    students/StudentsManagement.tsx
    tests/page.tsx
    tests/RevenueWithdrawalPanel.tsx
    tests/[testId]/page.tsx
    tests/[testId]/questions/page.tsx
    tests/[testId]/questions/helpers.ts
    tests/[testId]/questions/types.ts
    tests/[testId]/questions/components/QuestionCard.tsx
    tests/[testId]/questions/components/QuestionModal.tsx

  teacher-registration/
    page.tsx

  teachers/
    page.tsx
    [id]/page.tsx

  top-students/
    page.tsx

  wallet/
    page.tsx
```

## `lib/`

```text
lib/
  admin-analytics.ts              # Aggregate dashboard admin
  ai-access.ts                    # Quyen dung AI theo role/course
  ai-points.ts                    # Diem/hat dau AI, streak, learning activity
  ai-score-calibration.ts         # Can chinh diem AI
  auth.ts                         # Hash password, cookie auth, require user/role
  cn.ts                           # Utility className
  course-approval.ts              # Setting auto approval course
  course-reviews.ts               # Course review logic
  database-url.ts                 # Helper log target DB
  ielts-assessment.ts             # Chuyen IELTS eval thanh payload luu DB
  ielts-grading.ts                # Cham IELTS writing/speaking
  ielts-rubric.ts                 # Type/rubric IELTS
  learning-progress.ts            # Marker progress lesson/course/certificate
  mailer.ts                       # Gui OTP/chung chi/email co ban
  prisma.ts                       # Prisma client singleton
  revenue.ts                      # Chia doanh thu course
  speaking-ai-setting.ts          # Setting Speaking AI
  speaking-languages.ts           # Ngon ngu/exam speaking
  student-results.ts              # Ket qua student
  student-test-attempt-result.ts  # Chi tiet attempt
  student-test-data.ts            # Payload lam bai test
  teacher-onboarding.ts           # Dang ky giang vien, entrance setting/test/log
  teacher-revenue.ts              # Doanh thu kha dung cua teacher
  teacher-students.ts             # Data quan ly hoc vien cua teacher
  test-ai-evaluation.ts           # Cham AI cho cau hoi essay/speaking trong test
  test-material.ts                # Tai lieu/chart material cua test
  test-rules.ts                   # Rule diem/test kind/assessment mode
  vnpay.ts                        # Ky va verify VNPAY
  wallet.ts                       # Vi, top-up, ledger, giao dich
  writing-languages.ts           # Ngon ngu/exam writing
  ai/
    feedback-service.ts           # AI feedback service
    index.ts                      # Export AI services
    ollama-service.ts             # Client Ollama
    prompt-builder.ts             # Tao prompt AI
    scoring-service.ts            # Cham diem AI
    speaking-service.ts           # Speaking service
    types.ts                      # AI types
    validators.ts                 # Validate/sanitize input AI
```

## `prisma/`

```text
prisma/
  schema.prisma
  migrations/
    migration_lock.toml
    20260613180000_extend_ai_assessment_ielts/migration.sql
    20260615120000_add_test_material/migration.sql
    20260617090000_vnpay_wallet_hardening/migration.sql
    20260618010000_ai_points_revenue_split/migration.sql
    20260620090000_teacher_revenue_withdrawals/migration.sql
```

## `components/`

```text
components/
  base/
    badge.tsx
    content.tsx
    grid.tsx
    hero.tsx
    section.tsx
```

## `config/`

```text
config/
  vnpay.json
```

## `public/`

```text
public/
  file.svg
  globe.svg
  next.svg
  vercel.svg
  window.svg
  workers/
    speaking-transcription.worker.mjs
  certificates/                   # File chung chi user upload
  uploads/
    course-thumbnails/            # Thumbnail khoa hoc upload
    speaking/                     # Audio speaking upload
  videos/                         # Video bai hoc upload/static
```

## HTML/log tam trong root

```text
domain-home.html
domain-home-after.html
domain-login.html
domain-home.headers.tmp
domain-home-after.headers.tmp
domain-login.headers.tmp
cloudflared.err.log
cloudflared.out.log
next-dev.err.log
next-dev.out.log
stop
tsconfig.tsbuildinfo
```

## Luong phu thuoc chinh

```text
UI page/component
  -> app/api route handler hoac server component query
  -> lib service/helper
  -> Prisma Client
  -> PostgreSQL

AI routes
  -> lib/ai, lib/ielts-grading, lib/test-ai-evaluation
  -> Ollama local service
  -> AiAssessment/PointTransaction/LearningActivity

Wallet/payment
  -> lib/wallet, lib/vnpay
  -> VNPAY callback/IPN
  -> Payment/Wallet/Order/OrderItem

Teacher/Admin workflows
  -> route handlers trong app/api/teacher va app/api/admin
  -> Course/Test/Question/TeacherApplication/TeacherRevenueWithdrawal
```

## Ghi chu ve thu muc sinh ra va runtime

- `node_modules/`, `.next/`, `.next-dev/` la artifact cai dat/build, khong phai source chinh.
- `app/generated/prisma/` la generated Prisma Client theo `schema.prisma`.
- `public/uploads`, `public/videos`, `public/certificates` chua file nguoi dung/upload va co the tang dung luong nhanh.
- `.env` va `.env.local` co the chua secret, khong nen dua noi dung vao tai lieu/commit cong khai.
