import { getLanguageDisplayLabel } from "@/lib/language-display";

export const LANGUAGES = ["English", "Chinese", "Japanese", "Korean"] as const;

export const LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper Intermediate", "Advanced"] as const;

export type LanguageName = (typeof LANGUAGES)[number];
export type CourseLevel = (typeof LEVELS)[number];
export type CourseLike = {
  name: string;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  duration?: string | null;
  lessons?: number;
  price?: number;
  language?: {
    name?: string | null;
    code?: string | null;
  } | null;
};

const languageHints: Array<[LanguageName, string[]]> = [
  ["English", ["english", "ielts", "toeic", "toefl", "grammar", "speaking", "writing", "reading", "listening"]],
  ["Chinese", ["chinese", "mandarin", "hsk", "hanzi", "pinyin", "trung", "tieng trung"]],
  ["Japanese", ["japanese", "jlpt", "kanji", "hiragana", "katakana", "nhat", "tieng nhat"]],
  ["Korean", ["korean", "topik", "hangul", "hanja", "han quoc", "tieng han"]],
];

export function courseText(course: CourseLike) {
  return `${course.name} ${course.description ?? ""} ${course.category ?? ""}`.toLowerCase();
}

export function getCourseLanguage(course: CourseLike): LanguageName {
  const directLanguage = normalizeLanguage(course.language?.name || course.language?.code);
  if (directLanguage) return directLanguage;

  const text = courseText(course);
  return languageHints.find(([, hints]) => hints.some((hint) => text.includes(hint)))?.[0] ?? "English";
}

export function getCourseLevel(course: CourseLike) {
  const directLevel = normalizeLevel(course.level);
  if (directLevel) return directLevel;

  const text = courseText(course);
  if (/(advanced|c1|c2|n1|hsk 6|topik 6)/.test(text)) return "Advanced";
  if (/(upper|b2|n2|hsk 5|topik 5)/.test(text)) return "Upper Intermediate";
  if (/(intermediate|b1|n3|hsk 3|hsk 4|topik 3|topik 4)/.test(text)) return "Intermediate";
  if (/(elementary|a2|n4|hsk 2|topik 2)/.test(text)) return "Elementary";
  return "Beginner";
}

function normalizeLanguage(value?: string | null): LanguageName | null {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (["english", "en", "tieng anh", "tiếng anh"].includes(text)) return "English";
  if (["chinese", "zh", "cn", "mandarin", "tieng trung", "tiếng trung"].includes(text)) return "Chinese";
  if (["japanese", "ja", "jp", "tieng nhat", "tiếng nhật"].includes(text)) return "Japanese";
  if (["korean", "ko", "kr", "tieng han", "tiếng hàn"].includes(text)) return "Korean";
  return null;
}

function normalizeLevel(value?: string | null): CourseLevel | null {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (["beginner", "moi bat dau", "mới bắt đầu"].includes(text)) return "Beginner";
  if (["elementary", "so cap", "sơ cấp"].includes(text)) return "Elementary";
  if (["intermediate", "trung cap", "trung cấp"].includes(text)) return "Intermediate";
  if (["upper intermediate", "trung cap cao", "trung cấp cao"].includes(text)) return "Upper Intermediate";
  if (["advanced", "nang cao", "nâng cao"].includes(text)) return "Advanced";
  return null;
}

const levelLabels: Record<CourseLevel, string> = {
  Beginner: "Mới bắt đầu",
  Elementary: "Sơ cấp",
  Intermediate: "Trung cấp",
  "Upper Intermediate": "Trung cấp cao",
  Advanced: "Nâng cao",
};

export function getLanguageLabel(language: LanguageName | string) {
  return getLanguageDisplayLabel(language);
}

export function getLevelLabel(level: CourseLevel | string) {
  return levelLabels[level as CourseLevel] || level;
}

export function getCertification(course: CourseLike) {
  const text = courseText(course);
  if (text.includes("ielts")) return "IELTS";
  if (text.includes("toeic")) return "TOEIC";
  if (text.includes("toefl")) return "TOEFL";
  if (text.includes("jlpt")) return "JLPT";
  if (text.includes("hsk")) return "HSK";
  if (text.includes("topik")) return "TOPIK";
  return "Chứng chỉ";
}

export function getCourseDuration(course: CourseLike) {
  if (course.duration) return course.duration;
  const lessons = course.lessons ?? 0;
  if (lessons <= 0) return "Học theo tiến độ cá nhân";
  return `${Math.max(2, Math.ceil(lessons * 1.5))} giờ`;
}

export function priceLabel(price?: number) {
  const value = Number(price ?? 0);
  return value > 0 ? `${value.toLocaleString("vi-VN")}đ` : "Miễn phí";
}
