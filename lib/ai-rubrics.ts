export type AiAssessmentMode = "WRITING" | "SPEAKING";

export type CertificateRubric = {
  system: "IELTS" | "HSK" | "HSKK" | "JLPT_INTERNAL" | "TOPIK";
  displayName: string;
  mode: AiAssessmentMode;
  scoreScale: "0_100";
  criteria: Array<{ key: string; label: string; weight: number }>;
  notes: string;
};

const writingRubrics: Record<string, CertificateRubric> = {
  IELTS: {
    system: "IELTS",
    displayName: "IELTS Writing",
    mode: "WRITING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_response", label: "Dung yeu cau de", weight: 25 },
      { key: "content_development", label: "Noi dung va phat trien y", weight: 25 },
      { key: "coherence", label: "Mach lac va bo cuc", weight: 20 },
      { key: "vocabulary", label: "Tu vung", weight: 15 },
      { key: "grammar", label: "Ngu phap", weight: 15 },
    ],
    notes: "Use IELTS Writing expectations. Spelling/style are included in vocabulary and grammar.",
  },
  HSK: {
    system: "HSK",
    displayName: "HSK Writing",
    mode: "WRITING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_response", label: "Dung yeu cau de", weight: 25 },
      { key: "content_development", label: "Noi dung va phat trien y", weight: 20 },
      { key: "coherence", label: "Mach lac va bo cuc", weight: 15 },
      { key: "vocabulary", label: "Tu vung", weight: 20 },
      { key: "grammar", label: "Ngu phap", weight: 15 },
      { key: "orthography_style", label: "Chinh ta/chu viet/van phong", weight: 5 },
    ],
    notes: "Use HSK-level writing expectations for Chinese.",
  },
  JLPT_INTERNAL: {
    system: "JLPT_INTERNAL",
    displayName: "JLPT N-level internal writing practice",
    mode: "WRITING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_response", label: "Dung yeu cau de", weight: 25 },
      { key: "content_development", label: "Noi dung va phat trien y", weight: 20 },
      { key: "coherence", label: "Mach lac va bo cuc", weight: 20 },
      { key: "vocabulary", label: "Tu vung", weight: 15 },
      { key: "grammar", label: "Ngu phap", weight: 15 },
      { key: "orthography_style", label: "Chinh ta/chu viet/van phong", weight: 5 },
    ],
    notes: "JLPT has no official Writing section. Use this only as internal N5-N1 practice rubric.",
  },
  TOPIK: {
    system: "TOPIK",
    displayName: "TOPIK Writing",
    mode: "WRITING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_response", label: "Dung yeu cau de", weight: 25 },
      { key: "content_development", label: "Noi dung va phat trien y", weight: 25 },
      { key: "coherence", label: "Mach lac va bo cuc", weight: 20 },
      { key: "vocabulary", label: "Tu vung", weight: 15 },
      { key: "grammar", label: "Ngu phap", weight: 10 },
      { key: "orthography_style", label: "Chinh ta/chu viet/van phong", weight: 5 },
    ],
    notes: "Use TOPIK Writing expectations.",
  },
};

const speakingRubrics: Record<string, CertificateRubric> = {
  IELTS: {
    system: "IELTS",
    displayName: "IELTS Speaking",
    mode: "SPEAKING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_completion", label: "Hoan thanh nhiem vu", weight: 20 },
      { key: "fluency", label: "Fluency / do troi chay", weight: 25 },
      { key: "vocabulary", label: "Tu vung", weight: 20 },
      { key: "grammar", label: "Ngu phap", weight: 20 },
      { key: "pronunciation", label: "Phat am/ngu dieu", weight: 15 },
    ],
    notes: "Use IELTS Speaking expectations.",
  },
  HSKK: {
    system: "HSKK",
    displayName: "HSKK Speaking",
    mode: "SPEAKING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_completion", label: "Hoan thanh nhiem vu", weight: 20 },
      { key: "fluency", label: "Fluency / do troi chay", weight: 20 },
      { key: "vocabulary", label: "Tu vung", weight: 20 },
      { key: "grammar", label: "Ngu phap", weight: 20 },
      { key: "pronunciation", label: "Phat am/ngu dieu", weight: 20 },
    ],
    notes: "Use HSKK expectations for Chinese speaking.",
  },
  JLPT_INTERNAL: {
    system: "JLPT_INTERNAL",
    displayName: "JLPT N-level internal speaking practice",
    mode: "SPEAKING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_completion", label: "Hoan thanh nhiem vu", weight: 25 },
      { key: "fluency", label: "Fluency / do troi chay", weight: 15 },
      { key: "vocabulary", label: "Tu vung", weight: 20 },
      { key: "grammar", label: "Ngu phap", weight: 20 },
      { key: "pronunciation", label: "Phat am/ngu dieu", weight: 20 },
    ],
    notes: "JLPT has no official Speaking section. Use this only as internal N5-N1 practice rubric.",
  },
  TOPIK: {
    system: "TOPIK",
    displayName: "TOPIK Speaking",
    mode: "SPEAKING",
    scoreScale: "0_100",
    criteria: [
      { key: "task_completion", label: "Hoan thanh nhiem vu", weight: 20 },
      { key: "fluency", label: "Fluency / do troi chay", weight: 20 },
      { key: "vocabulary", label: "Tu vung", weight: 20 },
      { key: "grammar", label: "Ngu phap", weight: 20 },
      { key: "pronunciation", label: "Phat am/ngu dieu", weight: 20 },
    ],
    notes: "Use TOPIK Speaking expectations.",
  },
};

function languageFamily(languageCode?: string | null) {
  const code = (languageCode || "").toLowerCase();
  if (code.startsWith("en")) return "english";
  if (code.startsWith("zh") || code.startsWith("cn")) return "chinese";
  if (code.startsWith("ja") || code.startsWith("jp")) return "japanese";
  if (code.startsWith("ko") || code.startsWith("kr")) return "korean";
  return "english";
}

export function getCertificateRubric(languageCode: string | null | undefined, mode: AiAssessmentMode): CertificateRubric {
  const family = languageFamily(languageCode);
  if (mode === "WRITING") {
    if (family === "chinese") return writingRubrics.HSK;
    if (family === "japanese") return writingRubrics.JLPT_INTERNAL;
    if (family === "korean") return writingRubrics.TOPIK;
    return writingRubrics.IELTS;
  }

  if (family === "chinese") return speakingRubrics.HSKK;
  if (family === "japanese") return speakingRubrics.JLPT_INTERNAL;
  if (family === "korean") return speakingRubrics.TOPIK;
  return speakingRubrics.IELTS;
}

export function weightedScoreFromCriteria(
  criteria: Record<string, number>,
  rubric: CertificateRubric,
) {
  const totalWeight = rubric.criteria.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  const weighted = rubric.criteria.reduce((sum, item) => {
    const raw = Number(criteria[item.key] ?? 0);
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
    return sum + score * item.weight;
  }, 0);
  return Math.round(weighted / totalWeight);
}
