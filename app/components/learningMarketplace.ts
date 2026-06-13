export const LANGUAGES = ["English", "Chinese", "Japanese", "Korean"] as const;

export const PRODUCT_TYPES = [
  "Single course",
  "Combo course",
  "Skill training",
  "Certification prep",
  "Vocabulary pack",
  "Mock tests",
] as const;

export const LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper Intermediate", "Advanced"] as const;

export type LanguageName = (typeof LANGUAGES)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];
export type CourseLevel = (typeof LEVELS)[number];
export type CourseLike = {
  name: string;
  description?: string | null;
  category?: string | null;
  duration?: string | null;
  lessons?: number;
  price?: number;
};

const languageHints: Array<[LanguageName, string[]]> = [
  ["English", ["english", "ielts", "toeic", "toefl", "grammar", "speaking", "writing", "reading", "listening"]],
  ["Chinese", ["chinese", "mandarin", "hsk", "hanzi", "pinyin", "trung", "tieng trung"]],
  ["Japanese", ["japanese", "jlpt", "kanji", "hiragana", "katakana", "nhat", "tieng nhat"]],
  ["Korean", ["korean", "topik", "hangul", "hanja", "han quoc", "tieng han"]],
];

const typeHints: Array<[ProductType, string[]]> = [
  ["Combo course", ["combo", "bundle", "pathway", "tron goi", "lo trinh"]],
  ["Certification prep", ["ielts", "toeic", "toefl", "jlpt", "hsk", "topik", "certificate", "certification", "exam"]],
  ["Vocabulary pack", ["vocabulary", "tu vung", "flashcard", "word bank"]],
  ["Mock tests", ["mock", "test", "practice test", "de thi", "thi thu"]],
  ["Skill training", ["speaking", "writing", "reading", "listening", "grammar", "pronunciation", "kanji", "hanzi"]],
];

export function courseText(course: CourseLike) {
  return `${course.name} ${course.description ?? ""} ${course.category ?? ""}`.toLowerCase();
}

export function getCourseLanguage(course: CourseLike): LanguageName {
  const text = courseText(course);
  return languageHints.find(([, hints]) => hints.some((hint) => text.includes(hint)))?.[0] ?? "English";
}

export function getCourseType(course: CourseLike): ProductType {
  const text = courseText(course);
  return typeHints.find(([, hints]) => hints.some((hint) => text.includes(hint)))?.[0] ?? "Single course";
}

export function getCourseLevel(course: CourseLike) {
  const text = courseText(course);
  if (/(advanced|c1|c2|n1|hsk 6|topik 6)/.test(text)) return "Advanced";
  if (/(upper|b2|n2|hsk 5|topik 5)/.test(text)) return "Upper Intermediate";
  if (/(intermediate|b1|n3|hsk 3|hsk 4|topik 3|topik 4)/.test(text)) return "Intermediate";
  if (/(elementary|a2|n4|hsk 2|topik 2)/.test(text)) return "Elementary";
  return "Beginner";
}

const languageLabels: Record<LanguageName, string> = {
  English: "Tiếng Anh",
  Chinese: "Tiếng Trung",
  Japanese: "Tiếng Nhật",
  Korean: "Tiếng Hàn",
};

const productTypeLabels: Record<ProductType, string> = {
  "Single course": "Khóa học đơn",
  "Combo course": "Combo khóa học",
  "Skill training": "Luyện kỹ năng",
  "Certification prep": "Luyện thi chứng chỉ",
  "Vocabulary pack": "Gói từ vựng",
  "Mock tests": "Đề thi thử",
};

const levelLabels: Record<CourseLevel, string> = {
  Beginner: "Mới bắt đầu",
  Elementary: "Sơ cấp",
  Intermediate: "Trung cấp",
  "Upper Intermediate": "Trung cấp cao",
  Advanced: "Nâng cao",
};

export function getLanguageLabel(language: LanguageName | string) {
  return languageLabels[language as LanguageName] || language;
}

export function getProductTypeLabel(type: ProductType | string) {
  return productTypeLabels[type as ProductType] || type;
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

export function getLanguageSkills(language: string) {
  if (language === "Japanese") return ["Nghe", "Đọc", "Kanji", "Ngữ pháp", "Từ vựng", "Thi thử JLPT"];
  if (language === "Chinese") return ["Nghe", "Đọc", "Hán tự", "Ngữ pháp", "Từ vựng", "Thi thử HSK"];
  if (language === "Korean") return ["Nghe", "Đọc", "Hangul", "Ngữ pháp", "Từ vựng", "Thi thử TOPIK"];
  return ["Nghe", "Nói", "Đọc", "Viết", "Ngữ pháp", "Từ vựng", "Phát âm"];
}

export function priceLabel(price?: number) {
  const value = Number(price ?? 0);
  return value > 0 ? `${value.toLocaleString("vi-VN")}đ` : "Miễn phí";
}
