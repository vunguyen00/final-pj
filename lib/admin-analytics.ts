import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const APP_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"] as const;

export type AnalyticsPreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM";

type Granularity = "day" | "week" | "month" | "year";

type RangeInput = {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
};

type DateRange = {
  preset: AnalyticsPreset;
  start: Date;
  end: Date;
  days: number;
  label: string;
};

export type AnalyticsPayload = Awaited<ReturnType<typeof getDashboardAnalytics>>;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date: Date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + mondayOffset);
  return value;
}

function endOfWeek(date: Date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  return endOfDay(value);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfQuarter(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
}

function endOfQuarter(date: Date) {
  const start = startOfQuarter(date);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function parseDateInput(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function clampPreset(value?: string | null): AnalyticsPreset {
  const normalized = (value ?? "").toUpperCase();
  const presets: AnalyticsPreset[] = [
    "TODAY",
    "YESTERDAY",
    "LAST_7_DAYS",
    "LAST_30_DAYS",
    "THIS_WEEK",
    "THIS_MONTH",
    "THIS_QUARTER",
    "THIS_YEAR",
    "CUSTOM",
  ];
  return presets.includes(normalized as AnalyticsPreset) ? (normalized as AnalyticsPreset) : "LAST_30_DAYS";
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekInfo(date: Date) {
  const target = startOfDay(date);
  const day = target.getDay() || 7;
  target.setDate(target.getDate() + 4 - day);
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return { year: target.getFullYear(), week };
}

function getDateRange(input: RangeInput = {}): DateRange {
  const now = input.now ?? new Date();
  const preset = clampPreset(input.preset);
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (preset === "TODAY") {
    start = startOfDay(now);
    end = endOfDay(now);
  }
  if (preset === "YESTERDAY") {
    const yesterday = new Date(now.getTime() - DAY_MS);
    start = startOfDay(yesterday);
    end = endOfDay(yesterday);
  }
  if (preset === "LAST_7_DAYS") {
    end = endOfDay(now);
    start = startOfDay(new Date(end.getTime() - DAY_MS * 6));
  }
  if (preset === "LAST_30_DAYS") {
    end = endOfDay(now);
    start = startOfDay(new Date(end.getTime() - DAY_MS * 29));
  }
  if (preset === "THIS_WEEK") {
    start = startOfWeek(now);
    end = endOfWeek(now);
  }
  if (preset === "THIS_MONTH") {
    start = startOfMonth(now);
    end = endOfMonth(now);
  }
  if (preset === "THIS_QUARTER") {
    start = startOfQuarter(now);
    end = endOfQuarter(now);
  }
  if (preset === "THIS_YEAR") {
    start = startOfYear(now);
    end = endOfYear(now);
  }
  if (preset === "CUSTOM") {
    const from = parseDateInput(input.from);
    const to = parseDateInput(input.to);
    start = from ? startOfDay(from) : startOfDay(new Date(now.getTime() - DAY_MS * 29));
    end = to ? endOfDay(to) : endOfDay(now);
    if (start.getTime() > end.getTime()) {
      const backup = start;
      start = startOfDay(end);
      end = endOfDay(backup);
    }
  }

  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1);
  return {
    preset,
    start,
    end,
    days,
    label: `${formatDate(start)} -> ${formatDate(end)}`,
  };
}

function getPreviousRange(range: DateRange) {
  const durationMs = range.end.getTime() - range.start.getTime() + 1;
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - durationMs + 1);
  return { start, end };
}

function formatNumber(value: number, digits = 0) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function getBucketGranularity(days: number): Granularity {
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  if (days <= 730) return "month";
  return "year";
}

function floorByGranularity(date: Date, granularity: Granularity) {
  if (granularity === "day") return startOfDay(date);
  if (granularity === "week") return startOfWeek(date);
  if (granularity === "month") return startOfMonth(date);
  return startOfYear(date);
}

function addStep(date: Date, granularity: Granularity) {
  const result = new Date(date);
  if (granularity === "day") result.setDate(result.getDate() + 1);
  if (granularity === "week") result.setDate(result.getDate() + 7);
  if (granularity === "month") result.setMonth(result.getMonth() + 1);
  if (granularity === "year") result.setFullYear(result.getFullYear() + 1);
  return result;
}

function bucketKey(date: Date, granularity: Granularity) {
  if (granularity === "day") return formatDate(date);
  if (granularity === "week") {
    const week = getWeekInfo(date);
    return `${week.year}-W${String(week.week).padStart(2, "0")}`;
  }
  if (granularity === "month") return formatMonth(date);
  return String(date.getFullYear());
}

function bucketLabelFromKey(key: string, granularity: Granularity) {
  if (granularity === "day") {
    const [y, m, d] = key.split("-");
    return `${d}/${m}/${y}`;
  }
  if (granularity === "week") return key.replace("-", " ");
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${m}/${y}`;
  }
  return key;
}

function buildCountSeries(dates: Date[], start: Date, end: Date, granularity: Granularity) {
  const series: Array<{ key: string; label: string; value: number }> = [];
  const map = new Map<string, number>();
  let cursor = floorByGranularity(start, granularity);

  while (cursor.getTime() <= end.getTime()) {
    const key = bucketKey(cursor, granularity);
    map.set(key, 0);
    series.push({ key, label: bucketLabelFromKey(key, granularity), value: 0 });
    cursor = addStep(cursor, granularity);
  }

  for (const date of dates) {
    const key = bucketKey(date, granularity);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return series.map((item) => ({ ...item, value: map.get(item.key) ?? 0 }));
}

function buildSumSeries(entries: Array<{ date: Date; amount: number }>, start: Date, end: Date, granularity: Granularity) {
  const series: Array<{ key: string; label: string; value: number }> = [];
  const map = new Map<string, number>();
  let cursor = floorByGranularity(start, granularity);

  while (cursor.getTime() <= end.getTime()) {
    const key = bucketKey(cursor, granularity);
    map.set(key, 0);
    series.push({ key, label: bucketLabelFromKey(key, granularity), value: 0 });
    cursor = addStep(cursor, granularity);
  }

  for (const entry of entries) {
    const key = bucketKey(entry.date, granularity);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + entry.amount);
  }

  return series.map((item) => ({ ...item, value: formatNumber(map.get(item.key) ?? 0, 2) }));
}

function buildAverageSeries(entries: Array<{ date: Date; amount: number }>, start: Date, end: Date, granularity: Granularity) {
  const series: Array<{ key: string; label: string; value: number }> = [];
  const sumMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  let cursor = floorByGranularity(start, granularity);

  while (cursor.getTime() <= end.getTime()) {
    const key = bucketKey(cursor, granularity);
    sumMap.set(key, 0);
    countMap.set(key, 0);
    series.push({ key, label: bucketLabelFromKey(key, granularity), value: 0 });
    cursor = addStep(cursor, granularity);
  }

  for (const entry of entries) {
    const key = bucketKey(entry.date, granularity);
    if (!sumMap.has(key)) continue;
    sumMap.set(key, (sumMap.get(key) ?? 0) + entry.amount);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return series.map((item) => {
    const sum = sumMap.get(item.key) ?? 0;
    const count = countMap.get(item.key) ?? 0;
    return { ...item, value: count > 0 ? formatNumber(sum / count, 2) : 0 };
  });
}

function accumulateCounter(map: Map<string, number>, key: string, value = 1) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function toTitleLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function collectMistakeTokens(input: unknown, sink: Map<string, number>) {
  if (typeof input === "string") {
    const chunks = input
      .split(/[\n,;|]+/g)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const chunk of chunks) {
      accumulateCounter(sink, chunk.toLowerCase());
    }
    return;
  }
  if (Array.isArray(input)) {
    for (const item of input) collectMistakeTokens(item, sink);
    return;
  }
  if (input && typeof input === "object") {
    for (const value of Object.values(input as Record<string, unknown>)) {
      collectMistakeTokens(value, sink);
    }
  }
}

function collectCriteriaPenalty(input: unknown, sink: Map<string, number>, fallbackKey = "General") {
  if (!input || typeof input !== "object") {
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) collectCriteriaPenalty(item, sink, fallbackKey);
    return;
  }

  const record = input as Record<string, unknown>;
  const nameCandidates = [record.name, record.criterion, record.criteria, record.label, record.title];
  const name = nameCandidates.find((item): item is string => typeof item === "string" && item.trim().length > 0)?.trim() ?? fallbackKey;
  const score = toNumber(record.score ?? record.bandScore ?? record.value);
  const maxScore = toNumber(record.maxScore ?? record.max ?? record.total ?? record.fullScore);

  if (score !== null && maxScore !== null && maxScore > score) {
    accumulateCounter(sink, name, maxScore - score);
  }

  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") continue;
    collectCriteriaPenalty(value, sink, toTitleLabel(key));
  }
}

function topFromMap(map: Map<string, number>, take: number, valueDigits = 0) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([name, value]) => ({ name, value: formatNumber(value, valueDigits) }));
}

function safePercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

export async function getDashboardAnalytics(input: RangeInput = {}) {
  const range = getDateRange(input);
  const previous = getPreviousRange(range);
  const dateFilter = { gte: range.start, lte: range.end };
  const bucketGranularity = getBucketGranularity(range.days);

  const [
    usersTotal,
    studentsTotal,
    teachersTotal,
    adminsTotal,
    coursesTotal,
    coursesActive,
    coursesLocked,
    testsTotal,
    newUsers,
    previousUsers,
    usersInRange,
    usersAll,
    coursesInRange,
    enrollmentsInRange,
    testsInRange,
    testAttemptsInRange,
    aiAssessmentsInRange,
    learningActivitiesInRange,
    pointTransactionsInRange,
    paymentsInRange,
    orderItemsInRange,
    teacherApplicationsInRange,
    antiCheatLogsInRange,
    cheatingLogsInRange,
    suspiciousEventsInRange,
    notificationsInRange,
    emailsInRange,
    feedbacksInRange,
    languagesAll,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "ACTIVE" } }),
    prisma.course.count({ where: { status: "LOCKED" } }),
    prisma.test.count(),
    prisma.user.count({ where: { createdAt: dateFilter } }),
    prisma.user.count({ where: { createdAt: { gte: previous.start, lte: previous.end } } }),
    prisma.user.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, username: true, role: true, learningLanguageId: true, createdAt: true },
    }),
    prisma.user.findMany({
      select: { id: true, username: true, role: true },
    }),
    prisma.course.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, name: true, status: true, languageId: true, instructorId: true, createdAt: true },
    }),
    prisma.enrollment.findMany({
      where: { createdAt: dateFilter },
      select: {
        id: true,
        courseId: true,
        userId: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            name: true,
            instructorId: true,
            instructor: { select: { id: true, username: true } },
          },
        },
      },
    }),
    prisma.test.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, name: true, languageId: true, courseId: true, createdAt: true },
    }),
    prisma.testAttempt.findMany({
      where: { startedAt: dateFilter },
      select: {
        id: true,
        testId: true,
        userId: true,
        score: true,
        maxScore: true,
        isPassed: true,
        startedAt: true,
        test: {
          select: {
            id: true,
            name: true,
            courseId: true,
            languageId: true,
            course: { select: { id: true, name: true } },
            language: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.aiAssessment.findMany({
      where: { submittedAt: dateFilter },
      select: {
        id: true,
        userId: true,
        courseId: true,
        type: true,
        score: true,
        bandScore: true,
        submittedAt: true,
        mistakes: true,
        criteria: true,
        course: { select: { id: true, name: true } },
      },
    }),
    prisma.learningActivity.findMany({
      where: { activityDate: dateFilter },
      select: { id: true, userId: true, courseId: true, activityType: true, activityDate: true, createdAt: true },
    }),
    prisma.pointTransaction.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, userId: true, courseId: true, type: true, amount: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { createdAt: dateFilter, status: "SUCCESS" },
      select: { id: true, amount: true, createdAt: true, status: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: dateFilter } },
      select: {
        id: true,
        price: true,
        adminRevenue: true,
        teacherRevenue: true,
        revenueSplit: true,
        courseId: true,
        course: {
          select: {
            id: true,
            name: true,
            instructorId: true,
            instructor: { select: { id: true, username: true } },
          },
        },
        order: { select: { id: true, createdAt: true } },
      },
    }),
    prisma.teacherApplication.findMany({
      where: { createdAt: dateFilter },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        language: { select: { id: true, name: true } },
      },
    }),
    prisma.antiCheatLog.findMany({
      where: { serverTimestamp: dateFilter },
      select: { id: true, applicationId: true, testAttemptId: true, eventType: true, severity: true, serverTimestamp: true },
    }),
    prisma.cheatingLog.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, attemptId: true, type: true, severity: true, createdAt: true },
    }),
    prisma.suspiciousEvent.findMany({
      where: { updatedAt: dateFilter },
      select: { id: true, applicationId: true, eventType: true, count: true, severity: true, updatedAt: true },
    }),
    prisma.notification.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, createdAt: true },
    }),
    prisma.emailLog.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.feedback.findMany({
      where: { createdAt: dateFilter },
      select: { id: true, userId: true, courseId: true, createdAt: true },
    }),
    prisma.learningLanguage.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userNameMap = new Map(usersAll.map((item) => [item.id, item.username]));
  const userRoleMap = new Map(usersAll.map((item) => [item.id, item.role]));

  const usersGrowthRate = previousUsers === 0 ? (newUsers > 0 ? 100 : 0) : ((newUsers - previousUsers) / previousUsers) * 100;

  const enrollmentByCourse = new Map<string, number>();
  const enrollmentByInstructor = new Map<string, number>();
  const enrollmentCourseNameMap = new Map<string, string>();
  const instructorNameMap = new Map<string, string>();
  const activeLearners = new Set<string>();

  for (const enrollment of enrollmentsInRange) {
    activeLearners.add(enrollment.userId);
    accumulateCounter(enrollmentByCourse, enrollment.courseId);
    enrollmentCourseNameMap.set(enrollment.courseId, enrollment.course.name);
    if (enrollment.course.instructorId) {
      accumulateCounter(enrollmentByInstructor, enrollment.course.instructorId);
      const instructorName = enrollment.course.instructor?.username ?? userNameMap.get(enrollment.course.instructorId) ?? enrollment.course.instructorId;
      instructorNameMap.set(enrollment.course.instructorId, instructorName);
    }
  }

  const testAttemptDates = testAttemptsInRange.map((item) => item.startedAt);
  const attemptPassed = testAttemptsInRange.filter((item) => item.isPassed).length;
  const totalAttemptScore = testAttemptsInRange.reduce((sum, item) => sum + item.score, 0);
  const totalAttemptMaxScore = testAttemptsInRange.reduce((sum, item) => sum + item.maxScore, 0);
  const avgPassRate = safePercent(attemptPassed, testAttemptsInRange.length);
  const avgSystemScorePercent = safePercent(totalAttemptScore, totalAttemptMaxScore);

  const aiTypeCounter = new Map<string, number>();
  const aiScoreEntries = aiAssessmentsInRange.map((item) => ({ date: item.submittedAt, amount: item.score }));
  const aiScoreAvg = aiAssessmentsInRange.length
    ? aiAssessmentsInRange.reduce((sum, item) => sum + item.score, 0) / aiAssessmentsInRange.length
    : 0;
  const bandCounter = new Map<string, number>();
  const mistakeCounter = new Map<string, number>();
  const criteriaPenaltyCounter = new Map<string, number>();
  const aiByCourse = new Map<string, number>();
  const aiCourseNameMap = new Map<string, string>();

  for (const assessment of aiAssessmentsInRange) {
    const upperType = assessment.type.trim().toUpperCase();
    const type =
      upperType.includes("SPEAK")
        ? "SPEAKING"
        : upperType.includes("WRIT")
          ? "WRITING"
          : upperType.includes("READ")
            ? "READING"
            : upperType.includes("LISTEN")
              ? "LISTENING"
              : upperType || "OTHER";
    accumulateCounter(aiTypeCounter, type);

    const band = Math.min(10, Math.max(1, Math.round(assessment.bandScore || assessment.score || 1)));
    accumulateCounter(bandCounter, String(band));
    collectMistakeTokens(assessment.mistakes as unknown, mistakeCounter);
    collectCriteriaPenalty(assessment.criteria as unknown, criteriaPenaltyCounter);

    if (assessment.courseId) {
      accumulateCounter(aiByCourse, assessment.courseId);
      aiCourseNameMap.set(assessment.courseId, assessment.course?.name ?? assessment.courseId);
    }
  }

  const usablePointTransactions = pointTransactionsInRange.filter(
    (item) =>
      item.type === "AI_POINTS_PURCHASE" ||
      item.type === "AI_POINTS_ADMIN_GRANT" ||
      item.type.endsWith("_SPENT"),
  );
  const pointsIssued = usablePointTransactions
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const pointsUsed = Math.abs(
    usablePointTransactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0),
  );
  const positivePointsByStudent = new Map<string, number>();
  const totalPointsByStudent = new Map<string, number>();
  const pointsByCourseCompletion = new Map<string, number>();
  const pointEntries = usablePointTransactions.map((item) => ({ date: item.createdAt, amount: item.amount }));

  for (const point of usablePointTransactions) {
    const role = userRoleMap.get(point.userId);
    if (role === "STUDENT") {
      accumulateCounter(totalPointsByStudent, point.userId, point.amount);
      if (point.amount > 0) {
        accumulateCounter(positivePointsByStudent, point.userId, point.amount);
      }
    }
    if (point.courseId && point.type.toUpperCase().includes("COURSE_COMPLETED")) {
      accumulateCounter(pointsByCourseCompletion, point.courseId, 1);
    }
  }

  const paymentRevenue = paymentsInRange.reduce((sum, item) => sum + item.amount, 0);
  const courseRevenue = orderItemsInRange.reduce((sum, item) => sum + item.price, 0);
  const adminRevenue = orderItemsInRange.reduce((sum, item) => sum + item.adminRevenue, 0);
  const teacherRevenue = orderItemsInRange.reduce((sum, item) => sum + item.teacherRevenue, 0);
  const courseOrderCount = new Set(orderItemsInRange.map((item) => item.order.id)).size;
  const avgOrderValue = orderItemsInRange.length ? courseRevenue / orderItemsInRange.length : 0;
  const revenueEntries = orderItemsInRange.map((item) => ({ date: item.order.createdAt, amount: item.price }));
  const orderByCourseRevenue = new Map<string, number>();
  const orderByCourseCount = new Map<string, number>();
  const orderByTeacherRevenue = new Map<string, number>();
  const orderCourseNameMap = new Map<string, string>();

  for (const item of orderItemsInRange) {
    accumulateCounter(orderByCourseRevenue, item.courseId, item.price);
    accumulateCounter(orderByCourseCount, item.courseId, 1);
    orderCourseNameMap.set(item.courseId, item.course.name);
    if (item.course.instructorId) {
      accumulateCounter(orderByTeacherRevenue, item.course.instructorId, item.teacherRevenue);
      const teacherName = item.course.instructor?.username ?? userNameMap.get(item.course.instructorId) ?? item.course.instructorId;
      instructorNameMap.set(item.course.instructorId, teacherName);
    }
  }

  const feedbackByCourse = new Map<string, number>();
  for (const feedback of feedbacksInRange) {
    accumulateCounter(feedbackByCourse, feedback.courseId);
  }

  const popularCourseIds = new Set<string>([
    ...enrollmentByCourse.keys(),
    ...orderByCourseRevenue.keys(),
    ...feedbackByCourse.keys(),
    ...pointsByCourseCompletion.keys(),
    ...aiByCourse.keys(),
  ]);

  const topPopularCourses = [...popularCourseIds]
    .map((courseId) => {
      const learners = enrollmentByCourse.get(courseId) ?? 0;
      const revenue = orderByCourseRevenue.get(courseId) ?? 0;
      const reviews = feedbackByCourse.get(courseId) ?? 0;
      const completions = pointsByCourseCompletion.get(courseId) ?? 0;
      return {
        courseId,
        courseName: orderCourseNameMap.get(courseId) ?? enrollmentCourseNameMap.get(courseId) ?? aiCourseNameMap.get(courseId) ?? courseId,
        learners,
        revenue: formatNumber(revenue, 2),
        reviews,
        completionRate: formatNumber(safePercent(completions, learners), 1),
      };
    })
    .sort((a, b) => {
      if (b.learners !== a.learners) return b.learners - a.learners;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.reviews - a.reviews;
    })
    .slice(0, 10);

  const attemptsByTest = new Map<string, { name: string; count: number; scoreSum: number; maxSum: number }>();
  const attemptsByCourse = new Map<string, { name: string; count: number; scoreSum: number; maxSum: number }>();
  const attemptsByLanguage = new Map<string, { name: string; count: number; scoreSum: number; maxSum: number }>();
  const studentScoreAverage = new Map<string, { score: number; max: number; count: number }>();

  for (const attempt of testAttemptsInRange) {
    const percentScore = attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;

    const existingByTest = attemptsByTest.get(attempt.testId) ?? {
      name: attempt.test.name,
      count: 0,
      scoreSum: 0,
      maxSum: 0,
    };
    existingByTest.count += 1;
    existingByTest.scoreSum += attempt.score;
    existingByTest.maxSum += attempt.maxScore;
    attemptsByTest.set(attempt.testId, existingByTest);

    if (attempt.test.course) {
      const key = attempt.test.course.id;
      const existingByCourse = attemptsByCourse.get(key) ?? {
        name: attempt.test.course.name,
        count: 0,
        scoreSum: 0,
        maxSum: 0,
      };
      existingByCourse.count += 1;
      existingByCourse.scoreSum += attempt.score;
      existingByCourse.maxSum += attempt.maxScore;
      attemptsByCourse.set(key, existingByCourse);
    }

    if (attempt.test.language) {
      const key = attempt.test.language.id;
      const existingByLanguage = attemptsByLanguage.get(key) ?? {
        name: attempt.test.language.name,
        count: 0,
        scoreSum: 0,
        maxSum: 0,
      };
      existingByLanguage.count += 1;
      existingByLanguage.scoreSum += attempt.score;
      existingByLanguage.maxSum += attempt.maxScore;
      attemptsByLanguage.set(key, existingByLanguage);
    }

    if (userRoleMap.get(attempt.userId) === "STUDENT") {
      const current = studentScoreAverage.get(attempt.userId) ?? { score: 0, max: 0, count: 0 };
      current.score += percentScore;
      current.max += 100;
      current.count += 1;
      studentScoreAverage.set(attempt.userId, current);
    }
  }

  const testAverageRows = [...attemptsByTest.entries()]
    .map(([id, info]) => ({
      id,
      name: info.name,
      attempts: info.count,
      averageScore: formatNumber(safePercent(info.scoreSum, info.maxSum), 2),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const courseAverageRows = [...attemptsByCourse.entries()]
    .map(([id, info]) => ({
      id,
      name: info.name,
      attempts: info.count,
      averageScore: formatNumber(safePercent(info.scoreSum, info.maxSum), 2),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const languageAverageRows = [...attemptsByLanguage.entries()]
    .map(([id, info]) => ({
      id,
      name: info.name,
      attempts: info.count,
      averageScore: formatNumber(safePercent(info.scoreSum, info.maxSum), 2),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const learningByDay = new Map<string, number>();
  const learningByHour = new Map<string, number>();
  const heatmapGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const activityTypeCounter = new Map<string, number>();
  const studentLearningCounter = new Map<string, number>();

  for (const activity of learningActivitiesInRange) {
    const dateKey = formatDate(activity.activityDate);
    accumulateCounter(learningByDay, dateKey);
    const hour = String(activity.createdAt.getHours());
    accumulateCounter(learningByHour, hour);
    const weekday = (activity.createdAt.getDay() + 6) % 7;
    heatmapGrid[weekday][Number(hour)] += 1;
    accumulateCounter(activityTypeCounter, activity.activityType);
    if (userRoleMap.get(activity.userId) === "STUDENT") {
      accumulateCounter(studentLearningCounter, activity.userId);
    }
  }

  const mostActiveDay = [...learningByDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const peakHour = [...learningByHour.entries()].sort((a, b) => b[1] - a[1])[0];
  const maxHeat = Math.max(1, ...heatmapGrid.flat());

  const appStatusCounter = new Map<string, number>();
  const appByLanguage = new Map<string, number>();
  let totalReviewHours = 0;
  let reviewedCount = 0;

  for (const application of teacherApplicationsInRange) {
    accumulateCounter(appStatusCounter, application.status);
    accumulateCounter(appByLanguage, application.language.name);
    if (application.submittedAt && application.reviewedAt) {
      const diff = application.reviewedAt.getTime() - application.submittedAt.getTime();
      if (diff >= 0) {
        totalReviewHours += diff / (1000 * 60 * 60);
        reviewedCount += 1;
      }
    }
  }

  for (const status of APP_STATUSES) {
    if (!appStatusCounter.has(status)) appStatusCounter.set(status, 0);
  }

  const antiBehaviorCounter = new Map<string, number>();
  const antiTrendDates: Date[] = [];
  const antiSeverityValues: number[] = [];
  const antiAttemptIds = new Set<string>();
  const antiApplicationIds = new Set<string>();

  for (const log of antiCheatLogsInRange) {
    antiTrendDates.push(log.serverTimestamp);
    antiSeverityValues.push(log.severity);
    antiApplicationIds.add(log.applicationId);
    if (log.testAttemptId) antiAttemptIds.add(log.testAttemptId);
    accumulateCounter(antiBehaviorCounter, toTitleLabel(log.eventType));
  }

  for (const log of cheatingLogsInRange) {
    antiTrendDates.push(log.createdAt);
    antiSeverityValues.push(log.severity);
    antiAttemptIds.add(log.attemptId);
    accumulateCounter(antiBehaviorCounter, toTitleLabel(log.type));
  }

  for (const event of suspiciousEventsInRange) {
    antiApplicationIds.add(event.applicationId);
    antiSeverityValues.push(event.severity);
    accumulateCounter(antiBehaviorCounter, toTitleLabel(event.eventType), event.count || 1);
  }

  const emailSuccess = emailsInRange.filter((item) => item.status.toUpperCase().includes("SUCCESS") || item.status.toUpperCase().includes("SENT")).length;
  const emailFailed = emailsInRange.filter((item) => {
    const status = item.status.toUpperCase();
    return status.includes("FAIL") || status.includes("ERROR");
  }).length;

  const languageById = new Map(languagesAll.map((item) => [item.id, item]));
  const studentsByLanguage = new Map<string, number>();
  const coursesByLanguage = new Map<string, number>();
  const testsByLanguage = new Map<string, number>();

  for (const user of usersInRange) {
    if (user.role !== "STUDENT" || !user.learningLanguageId) continue;
    const language = languageById.get(user.learningLanguageId);
    if (!language) continue;
    accumulateCounter(studentsByLanguage, language.name);
  }
  for (const course of coursesInRange) {
    if (!course.languageId) continue;
    const language = languageById.get(course.languageId);
    if (!language) continue;
    accumulateCounter(coursesByLanguage, language.name);
  }
  for (const test of testsInRange) {
    if (!test.languageId) continue;
    const language = languageById.get(test.languageId);
    if (!language) continue;
    accumulateCounter(testsByLanguage, language.name);
  }

  const teacherCourseCounter = new Map<string, number>();
  for (const course of coursesInRange) {
    if (!course.instructorId) continue;
    accumulateCounter(teacherCourseCounter, course.instructorId);
    const username = userNameMap.get(course.instructorId);
    if (username) instructorNameMap.set(course.instructorId, username);
  }

  const rankingMostLearning = topFromMap(studentLearningCounter, 10).map((item) => ({
    userId: item.name,
    username: userNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));
  const rankingMostPoints = topFromMap(positivePointsByStudent, 10).map((item) => ({
    userId: item.name,
    username: userNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));
  const rankingHighestScore = [...studentScoreAverage.entries()]
    .map(([userId, info]) => ({
      userId,
      username: userNameMap.get(userId) ?? userId,
      value: info.count > 0 ? formatNumber(info.score / info.count, 2) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const rankingTeachersMostStudents = topFromMap(enrollmentByInstructor, 10).map((item) => ({
    userId: item.name,
    username: instructorNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));
  const rankingTeachersMostCourses = topFromMap(teacherCourseCounter, 10).map((item) => ({
    userId: item.name,
    username: instructorNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));
  const rankingTeachersRevenue = topFromMap(orderByTeacherRevenue, 10, 2).map((item) => ({
    userId: item.name,
    username: instructorNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));

  const rankingCoursesRevenue = topFromMap(orderByCourseRevenue, 10, 2).map((item) => ({
    courseId: item.name,
    courseName: orderCourseNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));
  const rankingCoursesStudents = topFromMap(enrollmentByCourse, 10).map((item) => ({
    courseId: item.name,
    courseName: enrollmentCourseNameMap.get(item.name) ?? orderCourseNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));
  const rankingCoursesReviews = topFromMap(feedbackByCourse, 10).map((item) => ({
    courseId: item.name,
    courseName: enrollmentCourseNameMap.get(item.name) ?? orderCourseNameMap.get(item.name) ?? item.name,
    value: item.value,
  }));

  return {
    generatedAt: new Date().toISOString(),
    range: {
      preset: range.preset,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      days: range.days,
      label: range.label,
      bucketGranularity,
    },
    overview: {
      users: {
        totalUsers: usersTotal,
        newUsers,
        students: studentsTotal,
        teachers: teachersTotal,
        admins: adminsTotal,
        growthRate: formatNumber(usersGrowthRate, 2),
      },
      courses: {
        totalCourses: coursesTotal,
        activeCourses: coursesActive,
        lockedCourses: coursesLocked,
        newCourses: coursesInRange.length,
      },
      learning: {
        totalEnrollments: enrollmentsInRange.length,
        activeLearners: activeLearners.size,
        learningActivities: learningActivitiesInRange.length,
        totalPointsAwarded: pointsIssued,
      },
      tests: {
        totalTests: testsTotal,
        totalAttempts: testAttemptsInRange.length,
        passRate: formatNumber(avgPassRate, 2),
        averageScore: formatNumber(avgSystemScorePercent, 2),
      },
      aiAssessment: {
        totalAssessments: aiAssessmentsInRange.length,
        averageScore: formatNumber(aiScoreAvg, 2),
        speakingCount: aiTypeCounter.get("SPEAKING") ?? 0,
        writingCount: aiTypeCounter.get("WRITING") ?? 0,
      },
      revenue: {
        totalOrders: courseOrderCount,
        totalRevenue: formatNumber(courseRevenue, 2),
        adminRevenue: formatNumber(adminRevenue, 2),
        teacherRevenue: formatNumber(teacherRevenue, 2),
        walletTopUpRevenue: formatNumber(paymentRevenue, 2),
        averageOrderValue: formatNumber(avgOrderValue, 2),
        successfulTransactions: orderItemsInRange.length,
      },
    },
    userGrowth: {
      byDay: buildCountSeries(usersInRange.map((item) => item.createdAt), range.start, range.end, "day"),
      byWeek: buildCountSeries(usersInRange.map((item) => item.createdAt), range.start, range.end, "week"),
      byMonth: buildCountSeries(usersInRange.map((item) => item.createdAt), range.start, range.end, "month"),
      byYear: buildCountSeries(usersInRange.map((item) => item.createdAt), range.start, range.end, "year"),
    },
    enrollmentAnalytics: {
      byTime: buildCountSeries(enrollmentsInRange.map((item) => item.createdAt), range.start, range.end, bucketGranularity),
      topCourses: topFromMap(enrollmentByCourse, 10).map((item) => ({
        courseId: item.name,
        courseName: enrollmentCourseNameMap.get(item.name) ?? item.name,
        enrollments: item.value,
      })),
      topInstructors: topFromMap(enrollmentByInstructor, 10).map((item) => ({
        instructorId: item.name,
        instructorName: instructorNameMap.get(item.name) ?? item.name,
        students: item.value,
      })),
    },
    courseAnalytics: {
      topPopularCourses,
      topRevenueCourses: topFromMap(orderByCourseRevenue, 10, 2).map((item) => ({
        courseId: item.name,
        courseName: orderCourseNameMap.get(item.name) ?? item.name,
        revenue: item.value,
      })),
      topAiAssessmentCourses: topFromMap(aiByCourse, 10).map((item) => ({
        courseId: item.name,
        courseName: aiCourseNameMap.get(item.name) ?? item.name,
        assessments: item.value,
      })),
    },
    testAnalytics: {
      attemptsByTime: buildCountSeries(testAttemptDates, range.start, range.end, bucketGranularity),
      passFail: {
        passed: attemptPassed,
        failed: testAttemptsInRange.length - attemptPassed,
      },
      averageByTest: testAverageRows.slice(0, 10),
      averageByCourse: courseAverageRows.slice(0, 10),
      averageByLanguage: languageAverageRows.slice(0, 10),
      topTests: testAverageRows.slice(0, 10),
    },
    aiAnalytics: {
      totalsByType: {
        speaking: aiTypeCounter.get("SPEAKING") ?? 0,
        writing: aiTypeCounter.get("WRITING") ?? 0,
        reading: aiTypeCounter.get("READING") ?? 0,
        listening: aiTypeCounter.get("LISTENING") ?? 0,
      },
      averageScoreByDay: buildAverageSeries(aiScoreEntries, range.start, range.end, "day"),
      averageScoreByMonth: buildAverageSeries(aiScoreEntries, range.start, range.end, "month"),
      bandHistogram: Array.from({ length: 10 }, (_, index) => ({
        band: index + 1,
        count: bandCounter.get(String(index + 1)) ?? 0,
      })),
      topMistakes: topFromMap(mistakeCounter, 10).map((item) => ({
        mistake: item.name,
        count: item.value,
      })),
      topCriteriaPenalty: topFromMap(criteriaPenaltyCounter, 10, 2).map((item) => ({
        criteria: item.name,
        penalty: item.value,
      })),
    },
    learningActivityAnalytics: {
      heatmap: heatmapGrid.map((row) => row.map((value) => formatNumber((value / maxHeat) * 100, 2))),
      maxHeatValue: maxHeat,
      mostActiveDay: mostActiveDay ? { day: mostActiveDay[0], count: mostActiveDay[1] } : null,
      peakHour: peakHour ? { hour: Number(peakHour[0]), count: peakHour[1] } : null,
      activitiesPerDay: buildCountSeries(
        learningActivitiesInRange.map((item) => item.activityDate),
        range.start,
        range.end,
        "day",
      ),
      activitiesByType: topFromMap(activityTypeCounter, 20).map((item) => ({
        type: item.name,
        label:
          item.name === "LESSON"
            ? "Xem/hoan thanh bai hoc"
            : item.name === "QUIZ" || item.name === "PRACTICE_TEST"
              ? "Lam bai kiem tra"
              : item.name === "SPEAKING" || item.name === "WRITING"
                ? "AI Assessment"
                : item.name === "COURSE"
                  ? "Hoan thanh khoa hoc"
                  : toTitleLabel(item.name),
        count: item.value,
      })),
    },
    pointAnalytics: {
      issued: pointsIssued,
      used: pointsUsed,
      averagePerStudent: formatNumber(studentsTotal ? (pointsIssued - pointsUsed) / studentsTotal : 0, 2),
      topStudents: topFromMap(totalPointsByStudent, 10).map((item) => ({
        userId: item.name,
        username: userNameMap.get(item.name) ?? item.name,
        points: item.value,
      })),
      growthSeries: buildSumSeries(pointEntries, range.start, range.end, bucketGranularity),
    },
    revenueAnalytics: {
      revenueByTime: buildSumSeries(revenueEntries, range.start, range.end, bucketGranularity),
      totalRevenue: formatNumber(courseRevenue, 2),
      adminRevenue: formatNumber(adminRevenue, 2),
      teacherRevenue: formatNumber(teacherRevenue, 2),
      walletTopUpRevenue: formatNumber(paymentRevenue, 2),
      orderCount: courseOrderCount,
      averageOrderValue: formatNumber(avgOrderValue, 2),
      topSellingCourses: topFromMap(orderByCourseCount, 10).map((item) => ({
        courseId: item.name,
        courseName: orderCourseNameMap.get(item.name) ?? item.name,
        units: item.value,
        revenue: formatNumber(orderByCourseRevenue.get(item.name) ?? 0, 2),
      })),
    },
    teacherApplicationAnalytics: {
      total: teacherApplicationsInRange.length,
      status: APP_STATUSES.map((status) => ({ status, count: appStatusCounter.get(status) ?? 0 })),
      approvalRate: formatNumber(
        safePercent(appStatusCounter.get("APPROVED") ?? 0, teacherApplicationsInRange.length),
        2,
      ),
      avgReviewHours: formatNumber(reviewedCount ? totalReviewHours / reviewedCount : 0, 2),
      topLanguages: topFromMap(appByLanguage, 10),
    },
    antiCheatAnalytics: {
      totalViolations: antiCheatLogsInRange.length + cheatingLogsInRange.length + suspiciousEventsInRange.reduce((sum, item) => sum + item.count, 0),
      cheatingTests: antiAttemptIds.size,
      cheatingCandidates: antiApplicationIds.size,
      averageSeverity: formatNumber(
        antiSeverityValues.length
          ? antiSeverityValues.reduce((sum, item) => sum + item, 0) / antiSeverityValues.length
          : 0,
        2,
      ),
      topBehaviors: topFromMap(antiBehaviorCounter, 10),
      trendByTime: buildCountSeries(antiTrendDates, range.start, range.end, bucketGranularity),
    },
    notificationEmailAnalytics: {
      notificationsSent: notificationsInRange.length,
      emailsSent: emailsInRange.length,
      emailFailed: emailFailed,
      emailSuccess: emailSuccess,
      emailErrorRate: formatNumber(safePercent(emailFailed, emailsInRange.length), 2),
    },
    languageAnalytics: {
      studentsByLanguage: topFromMap(studentsByLanguage, 20),
      coursesByLanguage: topFromMap(coursesByLanguage, 20),
      testsByLanguage: topFromMap(testsByLanguage, 20),
      mostPopularLanguage: topFromMap(studentsByLanguage, 1)[0] ?? null,
    },
    rankings: {
      students: {
        mostLearning: rankingMostLearning,
        highestScore: rankingHighestScore,
        mostBonusPoints: rankingMostPoints,
      },
      teachers: {
        mostStudents: rankingTeachersMostStudents,
        mostCourses: rankingTeachersMostCourses,
        highestRevenue: rankingTeachersRevenue,
      },
      courses: {
        byRevenue: rankingCoursesRevenue,
        byStudents: rankingCoursesStudents,
        byReviews: rankingCoursesReviews,
      },
    },
  };
}
