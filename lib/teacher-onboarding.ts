import { prisma } from "@/lib/prisma";

export const TEACHER_RECRUITMENT_SETTING_KEY = "teacher_recruitment_notice";
export const TEACHER_EXAM_LOCATIONS_SETTING_KEY = "teacher_exam_locations";

const DEFAULT_LANGUAGES = [
  { name: "English", code: "en" },
  { name: "Chinese", code: "zh" },
  { name: "Japanese", code: "ja" },
  { name: "Korean", code: "ko" },
];

export type TeacherExamLocation = {
  id: string;
  name: string;
  address: string;
  note: string;
};

export type TeacherRecruitmentSetting = {
  enabled: boolean;
  activeRoundId: string | null;
  title: string;
  description: string;
  location: string;
  locationIds: string[];
  locations: TeacherExamLocation[];
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  examStartsAt: string | null;
  examEndsAt: string | null;
};

const DEFAULT_SETTING: TeacherRecruitmentSetting = {
  enabled: false,
  activeRoundId: null,
  title: "Kỳ thi tuyển giảng viên FinnCenter",
  description: "Ứng viên đăng ký trực tuyến và tham dự kỳ thi trực tiếp tại địa điểm được thông báo.",
  location: "",
  locationIds: [],
  locations: [],
  registrationOpensAt: null,
  registrationClosesAt: null,
  examStartsAt: null,
  examEndsAt: null,
};

function dateOrNull(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function ensureDefaultLanguages() {
  await Promise.all(
    DEFAULT_LANGUAGES.map((language) =>
      prisma.learningLanguage.upsert({
        where: { code: language.code },
        update: {},
        create: language,
      }),
    ),
  );
}

export async function getTeacherRecruitmentSetting(): Promise<TeacherRecruitmentSetting> {
  const [row, locationRow] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: TEACHER_RECRUITMENT_SETTING_KEY } }),
    prisma.systemSetting.findUnique({ where: { key: TEACHER_EXAM_LOCATIONS_SETTING_KEY } }),
  ]);
  const value = row?.value as Partial<TeacherRecruitmentSetting> | null | undefined;
  const savedLocations = parseTeacherExamLocations(locationRow?.value);
  const locationIds = Array.isArray(value?.locationIds)
    ? value.locationIds.filter((item): item is string => typeof item === "string")
    : [];
  const snapshotLocations = parseTeacherExamLocations(value?.locations);
  const resolvedLocations = locationIds
    .map((id) => savedLocations.find((location) => location.id === id))
    .filter((location): location is TeacherExamLocation => Boolean(location));
  const locations = resolvedLocations.length > 0 ? resolvedLocations : snapshotLocations;
  const legacyLocation = typeof value?.location === "string" ? value.location.trim() : "";
  return {
    enabled: Boolean(value?.enabled),
    activeRoundId: typeof value?.activeRoundId === "string" && value.activeRoundId.trim() ? value.activeRoundId : null,
    title: typeof value?.title === "string" && value.title.trim() ? value.title.trim() : DEFAULT_SETTING.title,
    description: typeof value?.description === "string" ? value.description.trim() : DEFAULT_SETTING.description,
    location: locations.length > 0
      ? locations.map(formatTeacherExamLocation).join(" | ")
      : legacyLocation,
    locationIds,
    locations,
    registrationOpensAt: dateOrNull(value?.registrationOpensAt),
    registrationClosesAt: dateOrNull(value?.registrationClosesAt),
    examStartsAt: dateOrNull(value?.examStartsAt),
    examEndsAt: dateOrNull(value?.examEndsAt),
  };
}

function isTeacherExamLocation(value: unknown): value is TeacherExamLocation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TeacherExamLocation>;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.address === "string";
}

function normalizeTeacherExamLocation(location: TeacherExamLocation): TeacherExamLocation {
  return {
    id: location.id.trim(),
    name: location.name.trim(),
    address: location.address.trim(),
    note: typeof location.note === "string" ? location.note.trim() : "",
  };
}

function parseTeacherExamLocations(value: unknown): TeacherExamLocation[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<TeacherExamLocation[]>((locations, item) => {
    if (isTeacherExamLocation(item)) locations.push(normalizeTeacherExamLocation(item));
    return locations;
  }, []);
}

export function formatTeacherExamLocation(location: TeacherExamLocation) {
  return `${location.name}: ${location.address}${location.note ? ` (${location.note})` : ""}`;
}

export async function getTeacherExamLocations(): Promise<TeacherExamLocation[]> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: TEACHER_EXAM_LOCATIONS_SETTING_KEY },
  });
  return parseTeacherExamLocations(row?.value);
}

export async function setTeacherExamLocations(locations: TeacherExamLocation[]) {
  const normalized = locations.map(normalizeTeacherExamLocation);
  await prisma.systemSetting.upsert({
    where: { key: TEACHER_EXAM_LOCATIONS_SETTING_KEY },
    update: { value: normalized },
    create: { key: TEACHER_EXAM_LOCATIONS_SETTING_KEY, value: normalized },
  });
  return normalized;
}

export async function setTeacherRecruitmentSetting(input: TeacherRecruitmentSetting) {
  return prisma.systemSetting.upsert({
    where: { key: TEACHER_RECRUITMENT_SETTING_KEY },
    update: { value: input },
    create: { key: TEACHER_RECRUITMENT_SETTING_KEY, value: input },
  });
}

export function isTeacherRegistrationOpen(setting: TeacherRecruitmentSetting, now = new Date()) {
  // `enabled` only represents whether an active round has been selected. Once it
  // is active, the registration window opens and closes solely from these dates.
  if (!setting.enabled) return false;
  if (!setting.registrationOpensAt || !setting.registrationClosesAt) return false;
  if (now < new Date(setting.registrationOpensAt)) return false;
  if (now >= new Date(setting.registrationClosesAt)) return false;
  return true;
}

export async function getActiveLanguages() {
  await ensureDefaultLanguages();
  return prisma.learningLanguage.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function logTeacherApplication(params: {
  applicationId: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PENDING" | "INVITED_TO_EXAM" | "CHECKED_IN" | "EXAM_COMPLETED" | "PASSED" | "CONVERTED_TO_TEACHER" | "REJECTED" | "EXPIRED" | "FAILED_CHEATING";
  message: string;
  actorId?: string | null;
}) {
  return prisma.teacherApplicationLog.create({
    data: {
      applicationId: params.applicationId,
      status: params.status,
      message: params.message,
      actorId: params.actorId ?? null,
    },
  });
}

// Compatibility alias while callers migrate from the former online entrance-exam setting.
export const getTeacherEntranceSetting = getTeacherRecruitmentSetting;
