import { prisma } from "@/lib/prisma";

export const ADMIN_MANAGED_TESTS_PAGE_SIZE = 10;

const MANAGED_TEST_KINDS = ["TEACHER_ENTRANCE", "PUBLIC_PRACTICE"] as const;
const ASSESSMENT_MODES = ["STANDARD", "WRITING", "SPEAKING"] as const;

type ManagedTestKind = (typeof MANAGED_TEST_KINDS)[number];
type AssessmentMode = (typeof ASSESSMENT_MODES)[number];

export type AdminManagedTestFilters = {
  page?: number;
  search?: string;
  languageId?: string;
  kind?: string;
  assessmentMode?: string;
};

function normalizeEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function getAdminManagedTestsPage(
  filters: AdminManagedTestFilters = {},
) {
  const page = Math.max(1, Math.trunc(Number(filters.page)) || 1);
  const search = String(filters.search ?? "").trim().slice(0, 100);
  const languageId = String(filters.languageId ?? "").trim();
  const kind = normalizeEnum<ManagedTestKind>(filters.kind, MANAGED_TEST_KINDS);
  const assessmentMode = normalizeEnum<AssessmentMode>(
    filters.assessmentMode,
    ASSESSMENT_MODES,
  );
  const where = {
    kind: kind ? { equals: kind } : { in: [...MANAGED_TEST_KINDS] },
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(languageId ? { languageId } : {}),
    ...(assessmentMode ? { assessmentMode } : {}),
  };

  const result = await prisma.$transaction(async (tx) => {
    const total = await tx.test.count({ where });
    const totalPages = Math.max(
      1,
      Math.ceil(total / ADMIN_MANAGED_TESTS_PAGE_SIZE),
    );
    const currentPage = Math.min(page, totalPages);
    const tests = await tx.test.findMany({
      where,
      select: {
        id: true,
        name: true,
        kind: true,
        assessmentMode: true,
        timeLimit: true,
        language: { select: { id: true, name: true, code: true } },
        createdAt: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (currentPage - 1) * ADMIN_MANAGED_TESTS_PAGE_SIZE,
      take: ADMIN_MANAGED_TESTS_PAGE_SIZE,
    });

    return { total, totalPages, currentPage, tests };
  });

  return {
    tests: result.tests.map((test) => ({
      ...test,
      kind: test.kind as ManagedTestKind,
      createdAt: test.createdAt.toISOString(),
    })),
    page: result.currentPage,
    pageSize: ADMIN_MANAGED_TESTS_PAGE_SIZE,
    total: result.total,
    totalPages: result.totalPages,
  };
}
