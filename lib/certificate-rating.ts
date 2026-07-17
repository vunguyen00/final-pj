export type CertificateRating = {
  system: "IELTS" | "HSK" | "JLPT" | "TOPIK" | "GENERAL";
  level: string;
  label: string;
  note: string;
};

type CertificateRatingInput = {
  score: number;
  maxScore: number;
  bandSystem?: string | null;
  bandScore?: number | null;
  languageCode?: string | null;
  languageName?: string | null;
};

export const CERTIFICATE_REFERENCE_NOTE =
  "Mức tham chiếu nội bộ theo kết quả bài làm, không thay thế kết quả thi chứng chỉ chính thức.";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPercent(score: number, maxScore: number) {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
  return clamp((score / maxScore) * 100, 0, 100);
}

function detectCertificateSystem(input: CertificateRatingInput): CertificateRating["system"] {
  const code = String(input.languageCode || "").trim().toLowerCase();
  const descriptor = `${input.languageName || ""} ${input.bandSystem || ""}`.toLowerCase();

  if (code === "en" || /english|tiếng anh|ielts/.test(descriptor)) return "IELTS";
  if (code === "zh" || /chinese|tiếng trung|中文|hsk/.test(descriptor)) return "HSK";
  if (code === "ja" || /japanese|tiếng nhật|日本語|jlpt/.test(descriptor)) return "JLPT";
  if (code === "ko" || /korean|tiếng hàn|한국어|topik/.test(descriptor)) return "TOPIK";
  return "GENERAL";
}

function getIeltsBand(input: CertificateRatingInput, percent: number) {
  const hasStoredIeltsBand =
    String(input.bandSystem || "").toUpperCase().includes("IELTS") &&
    typeof input.bandScore === "number" &&
    Number.isFinite(input.bandScore) &&
    input.bandScore >= 0 &&
    input.bandScore <= 9;

  if (hasStoredIeltsBand) {
    return clamp(Math.round((input.bandScore as number) * 2) / 2, 0, 9);
  }

  if (percent >= 99) return 9;
  if (percent >= 97) return 8.5;
  if (percent >= 94) return 8;
  if (percent >= 90) return 7.5;
  if (percent >= 85) return 7;
  if (percent >= 78) return 6.5;
  if (percent >= 70) return 6;
  if (percent >= 60) return 5.5;
  if (percent >= 50) return 5;
  if (percent >= 40) return 4.5;
  if (percent >= 30) return 4;
  return 3.5;
}

function getHskLevel(percent: number) {
  if (percent >= 90) return "HSK 6";
  if (percent >= 80) return "HSK 5";
  if (percent >= 70) return "HSK 4";
  if (percent >= 60) return "HSK 3";
  if (percent >= 50) return "HSK 2";
  if (percent >= 40) return "HSK 1";
  return "Dưới HSK 1";
}

function getJlptLevel(percent: number) {
  if (percent >= 85) return "JLPT N1";
  if (percent >= 75) return "JLPT N2";
  if (percent >= 65) return "JLPT N3";
  if (percent >= 55) return "JLPT N4";
  if (percent >= 40) return "JLPT N5";
  return "Dưới JLPT N5";
}

function getTopikLevel(percent: number) {
  if (percent >= 90) return "TOPIK II - Cấp 6";
  if (percent >= 80) return "TOPIK II - Cấp 5";
  if (percent >= 70) return "TOPIK II - Cấp 4";
  if (percent >= 60) return "TOPIK II - Cấp 3";
  if (percent >= 50) return "TOPIK I - Cấp 2";
  if (percent >= 40) return "TOPIK I - Cấp 1";
  return "Dưới TOPIK I - Cấp 1";
}

function getGeneralLevel(percent: number) {
  if (percent >= 85) return "Nâng cao";
  if (percent >= 70) return "Khá";
  if (percent >= 55) return "Trung cấp";
  if (percent >= 40) return "Sơ cấp";
  return "Mới bắt đầu";
}

export function getCertificateRating(input: CertificateRatingInput): CertificateRating {
  const system = detectCertificateSystem(input);
  const percent = getPercent(input.score, input.maxScore);

  if (system === "IELTS") {
    const level = getIeltsBand(input, percent).toFixed(1);
    return { system, level, label: `IELTS ${level}`, note: CERTIFICATE_REFERENCE_NOTE };
  }

  if (system === "HSK") {
    const level = getHskLevel(percent);
    return { system, level, label: level, note: CERTIFICATE_REFERENCE_NOTE };
  }

  if (system === "JLPT") {
    const level = getJlptLevel(percent);
    return { system, level, label: level, note: CERTIFICATE_REFERENCE_NOTE };
  }

  if (system === "TOPIK") {
    const level = getTopikLevel(percent);
    return { system, level, label: level, note: CERTIFICATE_REFERENCE_NOTE };
  }

  const level = getGeneralLevel(percent);
  return { system, level, label: `Trình độ ${level}`, note: CERTIFICATE_REFERENCE_NOTE };
}
