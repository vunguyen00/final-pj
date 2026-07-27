"use client";

import { useReducer } from "react";
import Link from "next/link";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import { LanguageEvaluationResult } from "@/app/components/LanguageEvaluationResult";
import { ModalDialog } from "@/app/components/ModalDialog";
import { TestMaterialPanel } from "@/app/components/TestMaterialPanel";
import { readJsonResponse } from "@/lib/http-response";
import { describeChartData, type ChartMaterialData } from "@/lib/test-material";
import type { IeltsWritingEvaluation, IeltsWritingTaskType } from "@/lib/ielts-rubric";
import { getWritingLanguageLabel, WRITING_LANGUAGES, type WritingLanguage } from "@/lib/writing-languages";

type EvaluationResponse = {
  assessmentId: string;
  scoreOnly?: boolean;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    ielts?: IeltsWritingEvaluation;
    evaluation?: {
      scores: Record<string, number>;
      overall: number;
      normalizedOverall?: number;
      taskRelevance?: number;
      language: string;
      exam?: string;
      taskType?: string;
      maxScore?: number;
      band: {
        system: string;
        level: string;
        score: number;
        rationale: string;
      };
      summary: string;
      onTopic?: boolean;
      offTopicReason?: string;
      detailedComment?: string;
      criteriaFeedback?: Record<string, import("@/lib/test-ai-evaluation").TestAiCriterionFeedback>;
    };
    analysis?: {
      strengths: string[];
      weaknesses: string[];
      feedback: string[];
      suggestions: string[];
      majorErrors?: string[];
      improvementsNeeded?: string[];
    };
    mistakes?: {
      grammar: string[];
      vocabulary: string[];
      majorErrors?: string[];
      corrections: Array<{
        original: string;
        improved: string;
        reason: string;
      }>;
    };
    improvements?: {
      suggestions: string[];
      improvementsNeeded?: string[];
      sampleAnswer?: string;
    };
  };
};

type WritingState = {
  writingLanguage: WritingLanguage;
  taskType: IeltsWritingTaskType;
  taskPrompt: string;
  essay: string;
  chartData: ChartMaterialData | null;
  setupOpen: boolean;
  topicMode: "custom" | "random";
  topicInput: string;
  selectedTopic: string;
  generatingPrompt: boolean;
  promptError: string;
  loading: boolean;
  submitAction: "score" | "feedback" | null;
  error: string;
  result: EvaluationResponse | null;
};

type WritingAction =
  | { type: "SET_SETUP_OPEN"; setupOpen: boolean }
  | { type: "SET_TASK_TYPE"; taskType: IeltsWritingTaskType }
  | { type: "SET_LANGUAGE"; language: WritingLanguage }
  | { type: "SET_TASK_PROMPT"; prompt: string }
  | { type: "SET_ESSAY"; essay: string }
  | { type: "SET_TOPIC_MODE"; mode: "custom" | "random" }
  | { type: "SET_TOPIC_INPUT"; topicInput: string }
  | { type: "PROMPT_START" }
  | { type: "PROMPT_ERROR"; error: string }
  | { type: "PROMPT_SUCCESS"; prompt: string; chartData: ChartMaterialData | null; selectedTopic: string }
  | { type: "PROMPT_FINISH" }
  | { type: "SUBMIT_START"; submitAction: "score" | "feedback" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "SUBMIT_SUCCESS"; result: EvaluationResponse }
  | { type: "SUBMIT_FINISH" };

const WRITING_PAYMENT_DRAFT_KEY = "writing-ai-payment-draft";

function readWritingPaymentDraft() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(WRITING_PAYMENT_DRAFT_KEY) || "null") as Partial<WritingState> | null;
  } catch {
    window.localStorage.removeItem(WRITING_PAYMENT_DRAFT_KEY);
    return null;
  }
}

const DEFAULT_TASK_PROMPTS: Record<WritingLanguage, Record<IeltsWritingTaskType, string>> = {
  ENGLISH: {
    task_1:
      "The chart shows changes in household internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    task_2:
      "Some people believe online learning is better than classroom learning. Discuss both views and give your opinion.",
  },
  CHINESE: {
    task_1: "图表展示了2000年至2020年三个国家家庭互联网普及率的变化。请概括主要特征，说明重要数据，并进行适当比较。",
    task_2: "有人认为在线学习比课堂学习更好。请讨论双方观点，并说明你自己的看法。",
  },
  JAPANESE: {
    task_1: "グラフは2000年から2020年までの3か国における家庭のインターネット普及率の変化を示しています。主な特徴を要約し、重要なデータを説明して比較してください。",
    task_2: "オンライン学習は教室での学習より優れているという意見があります。両方の見方を論じ、あなた自身の意見を述べてください。",
  },
  KOREAN: {
    task_1: "그래프는 2000년부터 2020년까지 3개국의 가정 인터넷 보급률 변화를 보여 줍니다. 주요 특징과 중요한 수치를 설명하고 적절히 비교하십시오.",
    task_2: "일부 사람들은 온라인 학습이 교실 학습보다 더 낫다고 생각합니다. 양쪽 견해를 논의하고 자신의 의견을 제시하십시오.",
  },
};

const DEFAULT_TASK_PROMPT_SET = new Set(
  Object.values(DEFAULT_TASK_PROMPTS).flatMap((prompts) => Object.values(prompts)),
);

function getWritingTaskLabel(language: WritingLanguage, taskType: IeltsWritingTaskType) {
  const labels: Record<WritingLanguage, Record<IeltsWritingTaskType, string>> = {
    ENGLISH: {
      task_1: "Task 1 - Analyze a chart or data table",
      task_2: "Task 2 - Write an essay",
    },
    CHINESE: {
      task_1: "\u4efb\u52a11 - \u5206\u6790\u56fe\u8868\u6216\u6570\u636e\u8868",
      task_2: "\u4efb\u52a12 - \u5199\u8bae\u8bba\u6587",
    },
    JAPANESE: {
      task_1: "\u30bf\u30b9\u30af1 - \u30b0\u30e9\u30d5\u3084\u8868\u3092\u5206\u6790\u3059\u308b",
      task_2: "\u30bf\u30b9\u30af2 - \u5c0f\u8ad6\u6587\u3092\u66f8\u304f",
    },
    KOREAN: {
      task_1: "\uacfc\uc81c 1 - \uadf8\ub798\ud504\ub098 \ub370\uc774\ud130\ud45c \ubd84\uc11d",
      task_2: "\uacfc\uc81c 2 - \uc5d0\uc138\uc774 \uc791\uc131",
    },
  };
  return labels[language][taskType];
}

type WritingUiLabels = {
  heroEyebrow: (isAdmin: boolean) => string;
  heroTitle: string;
  heroDescription: string;
  createWithAi: string;
  resultHistory: string;
  writingType: string;
  topicPrefix: string;
  promptLabel: string;
  taskOneNoData: string;
  essayLabel: string;
  essayPlaceholder: string;
  lengthUnitWord: string;
  lengthUnitCharacter: string;
  targetPrefix: string;
  scoringStatus: string;
  emptyResultNotice: string;
  freeScoring: string;
  aiFeedback: (isAdmin?: boolean) => string;
  scoring: string;
  reviewing: string;
  paidAi: string;
  adminFreeAi: string;
  viewSaved: string;
  level: string;
  scoreOnlyNote: string;
  detailedFeedback: string;
  sampleAnswer: string;
  noSampleAnswer: string;
  criteria: Record<string, string>;
  setupEyebrow: string;
  setupTitle: string;
  setupDescription: string;
  language: string;
  writingTask: string;
  chooseTopic: string;
  chooseTopicDescription: string;
  randomTopic: string;
  randomTopicDescription: string;
  topic: string;
  topicPlaceholderTaskOne: string;
  topicPlaceholderTaskTwo: string;
  manualPrompt: string;
  generatingPrompt: string;
  generatePrompt: string;
  generatePromptAndChart: string;
  customTopicRequired: string;
  promptFailed: string;
  taskOneInvalid: string;
  submitFailed: string;
  paymentFailed: string;
};

const WRITING_UI_LABELS: Record<WritingLanguage, WritingUiLabels> = {
  ENGLISH: {
    heroEyebrow: (isAdmin) => `Free scoring - AI feedback ${isAdmin ? "free for admins" : "paid per use"}`,
    heroTitle: "Writing practice with exam-standard AI scoring",
    heroDescription:
      "Task 1 uses AI-generated data with at least two years and two series for comparison. Free scoring returns scores only; AI feedback includes errors, improvement guidance, and a model answer.",
    createWithAi: "Create prompt with AI",
    resultHistory: "Result history",
    writingType: "Writing type",
    topicPrefix: "Topic:",
    promptLabel: "Prompt",
    taskOneNoData:
      "Task 1 does not have chart data yet. Use Create prompt with AI to generate a chart, or write a full data description in the prompt.",
    essayLabel: "Essay",
    essayPlaceholder: "Enter your writing response...",
    lengthUnitWord: "words",
    lengthUnitCharacter: "characters",
    targetPrefix: "reference target",
    scoringStatus: "The system is scoring your response. The result will appear below the form.",
    emptyResultNotice: "Scores and AI feedback will appear here after you submit.",
    freeScoring: "Score",
    aiFeedback: (isAdmin) => (isAdmin ? "Score with AI" : "AI feedback (-2 beans)"),
    scoring: "Scoring...",
    reviewing: "AI is reviewing...",
    paidAi: "AI feedback - Paid",
    adminFreeAi: "AI feedback - Free for admins",
    viewSaved: "View saved detail",
    level: "Level",
    scoreOnlyNote: "This scoring run returns scores only.",
    detailedFeedback: "Detailed feedback",
    sampleAnswer: "Model answer",
    noSampleAnswer: "No model answer yet.",
    criteria: {
      task_response: "Task response",
      coherence: "Coherence and cohesion",
      vocabulary: "Vocabulary",
      grammar: "Grammar",
    },
    setupEyebrow: "Create a Writing prompt with AI",
    setupTitle: "Choose language and task type",
    setupDescription:
      "For Task 1, AI creates comparative data. For Task 2, AI creates an essay prompt based on your topic.",
    language: "Language",
    writingTask: "Writing Task",
    chooseTopic: "Choose topic",
    chooseTopicDescription: "AI creates a prompt from your topic.",
    randomTopic: "Random prompt",
    randomTopicDescription: "AI chooses a suitable topic.",
    topic: "Topic",
    topicPlaceholderTaskOne: "Example: internet access, transport, energy...",
    topicPlaceholderTaskTwo: "Example: education, technology, environment...",
    manualPrompt: "Write my own prompt",
    generatingPrompt: "AI is generating...",
    generatePrompt: "Generate prompt with AI",
    generatePromptAndChart: "Generate prompt and chart",
    customTopicRequired: "Enter a topic or choose random prompt mode.",
    promptFailed: "Could not create a Writing prompt. Please try again.",
    taskOneInvalid: "Task 1 does not have valid chart data yet. Please generate again.",
    submitFailed: "Could not score the writing response.",
    paymentFailed: "Could not create payment.",
  },
  CHINESE: {
    heroEyebrow: (isAdmin) => `免费评分 - AI反馈${isAdmin ? "管理员免费" : "按次付费"}`,
    heroTitle: "按真实考试标准进行写作AI评分",
    heroDescription:
      "Task 1 使用AI生成的对比数据，至少包含两个年份和两个系列。免费评分只返回分数；AI反馈会提供错误、改进建议和范文。",
    createWithAi: "用AI生成题目",
    resultHistory: "结果历史",
    writingType: "写作类型",
    topicPrefix: "主题：",
    promptLabel: "题目",
    taskOneNoData: "Task 1 还没有图表数据。请用AI生成图表，或在题目中完整描述数据。",
    essayLabel: "作文",
    essayPlaceholder: "请输入你的作文...",
    lengthUnitWord: "词",
    lengthUnitCharacter: "字",
    targetPrefix: "参考目标",
    scoringStatus: "系统正在评分，结果会显示在表单下方。",
    emptyResultNotice: "提交后，评分和AI反馈会显示在这里。",
    freeScoring: "评分",
    aiFeedback: (isAdmin) => (isAdmin ? "AI评分" : "AI反馈（-2颗豆）"),
    scoring: "评分中...",
    reviewing: "AI正在反馈...",
    paidAi: "AI反馈 - 已付费",
    adminFreeAi: "AI反馈 - 管理员免费",
    viewSaved: "查看已保存详情",
    level: "级别",
    scoreOnlyNote: "本次评分只返回分数。",
    detailedFeedback: "详细反馈",
    sampleAnswer: "范文",
    noSampleAnswer: "暂无范文。",
    criteria: {
      task_response: "任务回应",
      coherence: "连贯与衔接",
      vocabulary: "词汇",
      grammar: "语法",
    },
    setupEyebrow: "用AI生成写作题目",
    setupTitle: "选择语言和题型",
    setupDescription: "Task 1 会生成对比数据；Task 2 会根据主题生成作文题。",
    language: "语言",
    writingTask: "写作任务",
    chooseTopic: "选择主题",
    chooseTopicDescription: "AI根据你输入的主题生成题目。",
    randomTopic: "随机题目",
    randomTopicDescription: "AI选择合适主题。",
    topic: "主题",
    topicPlaceholderTaskOne: "例如：互联网普及、交通、能源...",
    topicPlaceholderTaskTwo: "例如：教育、科技、环境...",
    manualPrompt: "自己输入题目",
    generatingPrompt: "AI生成中...",
    generatePrompt: "用AI生成题目",
    generatePromptAndChart: "生成题目和图表",
    customTopicRequired: "请输入主题或选择随机题目模式。",
    promptFailed: "无法生成写作题目，请重试。",
    taskOneInvalid: "Task 1 暂无有效图表数据，请重新生成。",
    submitFailed: "无法评分作文。",
    paymentFailed: "无法创建支付。",
  },
  JAPANESE: {
    heroEyebrow: (isAdmin) => `無料採点 - AIフィードバック${isAdmin ? "管理者は無料" : "都度払い"}`,
    heroTitle: "実際の試験基準でライティングをAI採点",
    heroDescription:
      "Task 1は少なくとも2年分、2系列以上の比較データをAIが生成します。無料採点は点数のみ、AIフィードバックは誤り・改善案・模範解答を含みます。",
    createWithAi: "AIで問題を作成",
    resultHistory: "結果履歴",
    writingType: "ライティング形式",
    topicPrefix: "トピック：",
    promptLabel: "問題",
    taskOneNoData: "Task 1の図表データがまだありません。AIで図表を生成するか、問題文にデータを詳しく入力してください。",
    essayLabel: "解答",
    essayPlaceholder: "解答を入力してください...",
    lengthUnitWord: "語",
    lengthUnitCharacter: "文字",
    targetPrefix: "参考目標",
    scoringStatus: "採点中です。結果はフォームの下に表示されます。",
    emptyResultNotice: "提出後、採点結果とAIフィードバックがここに表示されます。",
    freeScoring: "採点",
    aiFeedback: (isAdmin) => (isAdmin ? "AIで採点" : "AIフィードバック（-2豆）"),
    scoring: "採点中...",
    reviewing: "AIがフィードバック中...",
    paidAi: "AIフィードバック - 支払い済み",
    adminFreeAi: "AIフィードバック - 管理者無料",
    viewSaved: "保存済み詳細を見る",
    level: "レベル",
    scoreOnlyNote: "今回の採点は点数のみです。",
    detailedFeedback: "詳細フィードバック",
    sampleAnswer: "模範解答",
    noSampleAnswer: "模範解答はまだありません。",
    criteria: {
      task_response: "課題への応答",
      coherence: "一貫性と結束性",
      vocabulary: "語彙",
      grammar: "文法",
    },
    setupEyebrow: "AIでライティング問題を作成",
    setupTitle: "言語とタスクを選択",
    setupDescription: "Task 1は比較データを作成し、Task 2は選んだトピックに基づいて作文問題を作成します。",
    language: "言語",
    writingTask: "ライティングタスク",
    chooseTopic: "トピックを選ぶ",
    chooseTopicDescription: "AIが入力したトピックに基づいて問題を作成します。",
    randomTopic: "ランダム問題",
    randomTopicDescription: "AIが適切なトピックを選びます。",
    topic: "トピック",
    topicPlaceholderTaskOne: "例：インターネット普及、交通、エネルギー...",
    topicPlaceholderTaskTwo: "例：教育、技術、環境...",
    manualPrompt: "自分で問題を入力",
    generatingPrompt: "AIが作成中...",
    generatePrompt: "AIで問題を作成",
    generatePromptAndChart: "問題と図表を作成",
    customTopicRequired: "トピックを入力するか、ランダム問題を選んでください。",
    promptFailed: "ライティング問題を作成できませんでした。もう一度お試しください。",
    taskOneInvalid: "Task 1の有効な図表データがありません。再生成してください。",
    submitFailed: "ライティングを採点できませんでした。",
    paymentFailed: "決済を作成できませんでした。",
  },
  KOREAN: {
    heroEyebrow: (isAdmin) => `무료 채점 - AI 피드백 ${isAdmin ? "관리자 무료" : "회차별 결제"}`,
    heroTitle: "실제 시험 기준의 AI 작문 채점",
    heroDescription:
      "Task 1은 최소 두 개의 연도와 두 개의 항목이 있는 비교 데이터를 AI가 생성합니다. 무료 채점은 점수만 제공하고, AI 피드백은 오류, 개선 방법, 모범 답안을 제공합니다.",
    createWithAi: "AI로 문제 생성",
    resultHistory: "결과 기록",
    writingType: "쓰기 유형",
    topicPrefix: "주제:",
    promptLabel: "문제",
    taskOneNoData: "Task 1의 차트 데이터가 아직 없습니다. AI로 차트를 생성하거나 문제에 데이터를 자세히 입력하세요.",
    essayLabel: "답안",
    essayPlaceholder: "답안을 입력하세요...",
    lengthUnitWord: "단어",
    lengthUnitCharacter: "글자",
    targetPrefix: "참고 목표",
    scoringStatus: "시스템이 채점 중입니다. 결과는 양식 아래에 표시됩니다.",
    emptyResultNotice: "제출 후 점수와 AI 피드백이 여기에 표시됩니다.",
    freeScoring: "채점",
    aiFeedback: (isAdmin) => (isAdmin ? "AI 채점" : "AI 피드백 (-2콩)"),
    scoring: "채점 중...",
    reviewing: "AI가 피드백 중...",
    paidAi: "AI 피드백 - 결제 완료",
    adminFreeAi: "AI 피드백 - 관리자 무료",
    viewSaved: "저장된 상세 보기",
    level: "레벨",
    scoreOnlyNote: "이번 채점은 점수만 제공합니다.",
    detailedFeedback: "상세 피드백",
    sampleAnswer: "모범 답안",
    noSampleAnswer: "아직 모범 답안이 없습니다.",
    criteria: {
      task_response: "과제 응답",
      coherence: "일관성과 연결성",
      vocabulary: "어휘",
      grammar: "문법",
    },
    setupEyebrow: "AI로 쓰기 문제 생성",
    setupTitle: "언어와 과제 유형 선택",
    setupDescription: "Task 1은 비교 데이터를 만들고, Task 2는 선택한 주제에 맞는 에세이 문제를 만듭니다.",
    language: "언어",
    writingTask: "쓰기 과제",
    chooseTopic: "주제 선택",
    chooseTopicDescription: "AI가 입력한 주제를 바탕으로 문제를 생성합니다.",
    randomTopic: "랜덤 문제",
    randomTopicDescription: "AI가 알맞은 주제를 선택합니다.",
    topic: "주제",
    topicPlaceholderTaskOne: "예: 인터넷 보급, 교통, 에너지...",
    topicPlaceholderTaskTwo: "예: 교육, 기술, 환경...",
    manualPrompt: "직접 문제 입력",
    generatingPrompt: "AI가 생성 중...",
    generatePrompt: "AI로 문제 생성",
    generatePromptAndChart: "문제와 차트 생성",
    customTopicRequired: "주제를 입력하거나 랜덤 문제 모드를 선택하세요.",
    promptFailed: "쓰기 문제를 생성할 수 없습니다. 다시 시도해 주세요.",
    taskOneInvalid: "Task 1에 유효한 차트 데이터가 없습니다. 다시 생성해 주세요.",
    submitFailed: "작문을 채점할 수 없습니다.",
    paymentFailed: "결제를 생성할 수 없습니다.",
  },
};

function getWritingUiLabels(language: WritingLanguage) {
  return WRITING_UI_LABELS[language];
}

function createInitialState(): WritingState {
  const restored = readWritingPaymentDraft();

  return {
    writingLanguage: restored?.writingLanguage || "ENGLISH",
    taskType: restored?.taskType || "task_2",
    taskPrompt: restored?.taskPrompt || DEFAULT_TASK_PROMPTS.ENGLISH.task_2,
    essay: restored?.essay || "",
    chartData: restored?.chartData || null,
    setupOpen: true,
    topicMode: "custom",
    topicInput: restored?.topicInput || "",
    selectedTopic: restored?.selectedTopic || "",
    generatingPrompt: false,
    promptError: "",
    loading: false,
    submitAction: null,
    error: "",
    result: null,
  };
}

function isDefaultTaskPrompt(prompt: string) {
  return DEFAULT_TASK_PROMPT_SET.has(prompt);
}

function writingReducer(state: WritingState, action: WritingAction): WritingState {
  switch (action.type) {
    case "SET_SETUP_OPEN":
      return { ...state, setupOpen: action.setupOpen };
    case "SET_TASK_TYPE":
      return {
        ...state,
        taskType: action.taskType,
        taskPrompt: isDefaultTaskPrompt(state.taskPrompt) ? DEFAULT_TASK_PROMPTS[state.writingLanguage][action.taskType] : state.taskPrompt,
        chartData: null,
        selectedTopic: "",
        result: null,
        error: "",
        promptError: "",
      };
    case "SET_LANGUAGE":
      return {
        ...state,
        writingLanguage: action.language,
        taskPrompt: isDefaultTaskPrompt(state.taskPrompt) ? DEFAULT_TASK_PROMPTS[action.language][state.taskType] : state.taskPrompt,
        chartData: null,
        selectedTopic: "",
        result: null,
        error: "",
        promptError: "",
      };
    case "SET_TASK_PROMPT":
      return { ...state, taskPrompt: action.prompt };
    case "SET_ESSAY":
      return { ...state, essay: action.essay };
    case "SET_TOPIC_MODE":
      return { ...state, topicMode: action.mode, promptError: "" };
    case "SET_TOPIC_INPUT":
      return { ...state, topicInput: action.topicInput, promptError: "" };
    case "PROMPT_START":
      return { ...state, generatingPrompt: true, promptError: "" };
    case "PROMPT_ERROR":
      return { ...state, promptError: action.error };
    case "PROMPT_SUCCESS":
      return {
        ...state,
        taskPrompt: action.prompt,
        chartData: action.chartData,
        selectedTopic: action.selectedTopic,
        essay: "",
        result: null,
        error: "",
        setupOpen: false,
      };
    case "PROMPT_FINISH":
      return { ...state, generatingPrompt: false };
    case "SUBMIT_START":
      return { ...state, loading: true, submitAction: action.submitAction, error: "", result: null };
    case "SUBMIT_ERROR":
      return { ...state, error: action.error };
    case "SUBMIT_SUCCESS":
      return { ...state, result: action.result };
    case "SUBMIT_FINISH":
      return { ...state, loading: false, submitAction: null };
    default:
      return state;
  }
}

export default function WritingAiClient({ userRole }: { userRole: string }) {
  const [state, dispatch] = useReducer(writingReducer, undefined, createInitialState);
  const hasChart = state.taskType === "task_1" && Boolean(state.chartData);
  const writingMeta = getWritingMeta(state);
  const labels = getWritingUiLabels(state.writingLanguage);

  function redirectToBeanPurchase() {
    window.localStorage.setItem(
      WRITING_PAYMENT_DRAFT_KEY,
      JSON.stringify({
        writingLanguage: state.writingLanguage,
        taskType: state.taskType,
        taskPrompt: state.taskPrompt,
        essay: state.essay,
        chartData: state.chartData,
        topicInput: state.topicInput,
        selectedTopic: state.selectedTopic,
      }),
    );

    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/student/wallet?returnTo=${encodeURIComponent(returnTo)}`;
  }

  async function generateWritingPrompt() {
    const topic = state.topicInput.trim();
    if (state.topicMode === "custom" && !topic) {
      dispatch({ type: "PROMPT_ERROR", error: labels.customTopicRequired });
      return;
    }

    dispatch({ type: "PROMPT_START" });
    try {
      const response = await fetch("/api/ai/writing-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: state.taskType,
          language: state.writingLanguage,
          topic: state.topicMode === "custom" ? topic : "",
          randomTopic: state.topicMode === "random",
        }),
      });
      const data = (await readJsonResponse(response).catch(() => ({}))) as {
        topic?: string;
        prompt?: string;
        chart?: ChartMaterialData | null;
        error?: string;
      };

      if (!response.ok || !data.prompt) {
        dispatch({ type: "PROMPT_ERROR", error: data.error || labels.promptFailed });
        return;
      }
      if (state.taskType === "task_1" && !data.chart) {
        dispatch({ type: "PROMPT_ERROR", error: labels.taskOneInvalid });
        return;
      }

      dispatch({
        type: "PROMPT_SUCCESS",
        prompt: data.prompt,
        chartData: data.chart || null,
        selectedTopic: data.topic || topic || "Random",
      });
    } catch {
      dispatch({ type: "PROMPT_ERROR", error: labels.promptFailed });
    } finally {
      dispatch({ type: "PROMPT_FINISH" });
    }
  }

  async function submitWriting(includeAiFeedback: boolean) {
    if (state.loading) return;

    dispatch({ type: "SUBMIT_START", submitAction: includeAiFeedback ? "feedback" : "score" });

    try {
      const response = await fetch("/api/ai/essay-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: state.essay,
          taskPrompt: state.taskPrompt,
          taskType: state.taskType,
          language: state.writingLanguage,
          includeAiFeedback,
          referenceData: state.taskType === "task_1" && state.chartData ? describeChartData(state.chartData) : undefined,
          courseId: new URLSearchParams(window.location.search).get("courseId") || undefined,
          title: "Writing AI - " + (state.taskType === "task_1" ? "Task 1" : "Task 2"),
        }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        if (data.requiresPointPurchase) {
          redirectToBeanPurchase();
          return;
        }
        dispatch({ type: "SUBMIT_ERROR", error: data.error || labels.submitFailed });
        return;
      }
      window.localStorage.removeItem(WRITING_PAYMENT_DRAFT_KEY);
      dispatch({ type: "SUBMIT_SUCCESS", result: data });
    } catch {
      dispatch({ type: "SUBMIT_ERROR", error: labels.submitFailed });
    } finally {
      dispatch({ type: "SUBMIT_FINISH" });
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 py-6 md:py-8">
      <div className={"mx-auto space-y-6 px-4 sm:px-6 lg:px-8 " + (hasChart ? "max-w-[1440px]" : "max-w-6xl")}>
        <WritingHero role={userRole} loading={state.loading} labels={labels} onOpenSetup={() => dispatch({ type: "SET_SETUP_OPEN", setupOpen: true })} />
        <div className={hasChart ? "grid items-start gap-6 lg:grid-cols-12" : ""}>
          {state.chartData && state.taskType === "task_1" ? (
            <aside className="lg:sticky lg:top-24 lg:col-span-5">
              <TestMaterialPanel material={{ title: "Writing Task 1 data", data: state.chartData }} />
            </aside>
          ) : null}

          <WritingForm
            className={hasChart ? "lg:col-span-7" : ""}
            state={state}
            meta={writingMeta}
            labels={labels}
            role={userRole}
            onTaskTypeChange={(taskType) => dispatch({ type: "SET_TASK_TYPE", taskType })}
            onPromptChange={(prompt) => dispatch({ type: "SET_TASK_PROMPT", prompt })}
            onEssayChange={(essay) => dispatch({ type: "SET_ESSAY", essay })}
            onSubmit={submitWriting}
          />
        </div>

        {state.result ? <WritingResult result={state.result} labels={labels} role={userRole} /> : null}
      </div>

      {state.setupOpen ? (
        <WritingSetupModal
          state={state}
          labels={labels}
          onClose={() => dispatch({ type: "SET_SETUP_OPEN", setupOpen: false })}
          onLanguageChange={(language) => dispatch({ type: "SET_LANGUAGE", language })}
          onTaskTypeChange={(taskType) => dispatch({ type: "SET_TASK_TYPE", taskType })}
          onTopicModeChange={(mode) => dispatch({ type: "SET_TOPIC_MODE", mode })}
          onTopicInputChange={(topicInput) => dispatch({ type: "SET_TOPIC_INPUT", topicInput })}
          onGenerate={() => void generateWritingPrompt()}
        />
      ) : null}
    </main>
  );
}

function getWritingMeta(state: WritingState) {
  const usesCharacterCount = state.writingLanguage === "CHINESE" || state.writingLanguage === "JAPANESE";
  const essayLength = usesCharacterCount
    ? Array.from(state.essay).filter((character) => !/\s/.test(character)).length
    : state.essay.trim()
      ? state.essay.trim().split(/\s+/).length
      : 0;
  const targetLength = usesCharacterCount ? (state.taskType === "task_1" ? 300 : 500) : state.taskType === "task_1" ? 150 : 250;
  return { usesCharacterCount, essayLength, targetLength };
}

function WritingHero({
  role,
  loading,
  labels,
  onOpenSetup,
}: {
  role?: string;
  loading: boolean;
  labels: WritingUiLabels;
  onOpenSetup: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            {labels.heroEyebrow(role === "ADMIN")}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{labels.heroTitle}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">{labels.heroDescription}</p>
        </div>
        <div className="grid w-full shrink-0 gap-2 sm:w-52">
          <button type="button" onClick={onOpenSetup} disabled={loading} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {labels.createWithAi}
          </button>
          <Link href="/student/results" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">
            {labels.resultHistory}
          </Link>
        </div>
      </div>
    </section>
  );
}

function WritingForm({
  className = "",
  state,
  meta,
  labels,
  role,
  onTaskTypeChange,
  onPromptChange,
  onEssayChange,
  onSubmit,
}: {
  className?: string;
  state: WritingState;
  meta: ReturnType<typeof getWritingMeta>;
  labels: WritingUiLabels;
  role?: string;
  onTaskTypeChange: (taskType: IeltsWritingTaskType) => void;
  onPromptChange: (prompt: string) => void;
  onEssayChange: (essay: string) => void;
  onSubmit: (includeAiFeedback: boolean) => Promise<void>;
}) {
  const lengthUnit = meta.usesCharacterCount ? labels.lengthUnitCharacter : labels.lengthUnitWord;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(false);
      }}
      className={"rounded-lg border border-slate-200 bg-white p-5 " + className}
    >
      <div className="space-y-2">
        <label htmlFor="writing-task-type" className="text-sm font-semibold text-slate-700">
          {labels.writingType}
        </label>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{getWritingLanguageLabel(state.writingLanguage)}</span>
          {state.selectedTopic ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{labels.topicPrefix} {state.selectedTopic}</span> : null}
        </div>
      </div>
      <select
        id="writing-task-type"
        value={state.taskType}
        onChange={(event) => onTaskTypeChange(event.target.value as IeltsWritingTaskType)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="task_1">{getWritingTaskLabel(state.writingLanguage, "task_1")}</option>
        <option value="task_2">{getWritingTaskLabel(state.writingLanguage, "task_2")}</option>
      </select>

      <label htmlFor="writing-task-prompt" className="mt-4 block text-sm font-semibold text-slate-700">
        {labels.promptLabel}
      </label>
      <textarea
        id="writing-task-prompt"
        value={state.taskPrompt}
        onChange={(event) => onPromptChange(event.target.value)}
        rows={1}
        className="mt-2 min-h-24 w-full resize-none overflow-hidden rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 [field-sizing:content] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {state.taskType === "task_1" && !state.chartData ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {labels.taskOneNoData}
        </p>
      ) : null}

      <label htmlFor="writing-essay" className="mt-4 block text-sm font-semibold text-slate-700">
        {labels.essayLabel}
      </label>
      <textarea
        id="writing-essay"
        value={state.essay}
        onChange={(event) => onEssayChange(event.target.value)}
        rows={10}
        placeholder={labels.essayPlaceholder}
        className="mt-2 min-h-[320px] w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <p className="mt-2 text-right text-xs font-semibold text-slate-500">
        {meta.essayLength} {lengthUnit} - {labels.targetPrefix} {meta.targetLength} {lengthUnit}
      </p>

      {state.error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
      {state.loading ? (
        <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
          {labels.scoringStatus}
        </p>
      ) : !state.result ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          {labels.emptyResultNotice}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button type="submit" disabled={state.loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
          {state.loading && state.submitAction === "score" ? labels.scoring : labels.freeScoring}
        </button>
        <button type="button" onClick={() => void onSubmit(true)} disabled={state.loading} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
          {state.loading && state.submitAction === "feedback" ? labels.reviewing : labels.aiFeedback(role === "ADMIN")}
        </button>
      </div>
    </form>
  );
}

function WritingResult({ result, labels, role }: { result: EvaluationResponse; labels: WritingUiLabels; role?: string }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-red-600">
          {result.scoreOnly ? labels.freeScoring : role !== "ADMIN" ? labels.paidAi : labels.adminFreeAi}
        </p>
        <Link href={'/student/results/' + result.assessmentId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          {labels.viewSaved}
        </Link>
      </div>
      {result.data.ielts ? (
        <IeltsEvaluationResult evaluation={result.data.ielts} scoreOnly={Boolean(result.scoreOnly)} />
      ) : result.data.evaluation ? (
        <LegacyWritingResult result={result} />
      ) : null}
    </section>
  );
}

function LegacyWritingResult({ result }: { result: EvaluationResponse }) {
  const evaluation = result.data.evaluation;
  if (!evaluation) return null;
  return <LanguageEvaluationResult
    skill="writing"
    evaluation={evaluation}
    analysis={result.data.analysis || { strengths: [], weaknesses: [], feedback: [], suggestions: [] }}
    mistakes={result.data.mistakes}
    improvements={result.data.improvements}
    sampleAnswer={result.data.improvements?.sampleAnswer}
    taskType={evaluation.taskType}
    scoreOnly={Boolean(result.scoreOnly)}
  />;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getFeedbackSectionLabels(language: string) {
  const normalized = language.toLowerCase();
  if (normalized.includes("chinese") || normalized.includes("zh") || normalized.includes("cn") || normalized.includes("\u4e2d\u6587")) {
    return {
      strengths: "\u4f18\u70b9",
      weaknesses: "\u4e0d\u8db3",
      mistakes: "\u9700\u4fee\u6b63\u7684\u9519\u8bef",
      improvements: "\u6539\u8fdb\u65b9\u5411",
    };
  }
  if (normalized.includes("japanese") || normalized.includes("ja") || normalized.includes("jp") || normalized.includes("\u65e5\u672c")) {
    return {
      strengths: "\u826f\u3044\u70b9",
      weaknesses: "\u5f31\u70b9",
      mistakes: "\u4fee\u6b63\u3059\u3079\u304d\u8aa4\u308a",
      improvements: "\u6539\u5584\u65b9\u6cd5",
    };
  }
  if (normalized.includes("korean") || normalized.includes("ko") || normalized.includes("kr") || normalized.includes("\ud55c\uad6d")) {
    return {
      strengths: "\uac15\uc810",
      weaknesses: "\uc57d\uc810",
      mistakes: "\uace0\uccd0\uc57c \ud560 \uc624\ub958",
      improvements: "\uac1c\uc120 \ubc29\ubc95",
    };
  }
  return {
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    mistakes: "Errors to fix",
    improvements: "Improvement plan",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatCorrection(correction: { original: string; improved: string; reason: string }) {
  const beforeAfter = [correction.original, correction.improved].filter(Boolean).join(" -> ");
  return [beforeAfter, correction.reason].filter(Boolean).join(": ");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function compactStrings(items: Array<string | null | undefined>) {
  return [...new Set(items.filter((item): item is string => Boolean(item)))];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WritingFeedbackBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </section>
  );
}

function WritingSetupModal({
  state,
  labels,
  onClose,
  onLanguageChange,
  onTaskTypeChange,
  onTopicModeChange,
  onTopicInputChange,
  onGenerate,
}: {
  state: WritingState;
  labels: WritingUiLabels;
  onClose: () => void;
  onLanguageChange: (language: WritingLanguage) => void;
  onTaskTypeChange: (taskType: IeltsWritingTaskType) => void;
  onTopicModeChange: (mode: "custom" | "random") => void;
  onTopicInputChange: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <ModalDialog labelledBy="writing-setup-title" onClose={onClose} className="z-50 py-8">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{labels.setupEyebrow}</p>
        <h2 id="writing-setup-title" className="mt-2 text-2xl font-bold text-slate-950">{labels.setupTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{labels.setupDescription}</p>

        <label htmlFor="writing-language" className="mt-5 block text-sm font-semibold text-slate-700">{labels.language}</label>
        <select
          id="writing-language"
          value={state.writingLanguage}
          onChange={(event) => onLanguageChange(event.target.value as WritingLanguage)}
          disabled={state.generatingPrompt}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
        >
          {WRITING_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
        </select>

        <label htmlFor="writing-modal-task-type" className="mt-5 block text-sm font-semibold text-slate-700">{labels.writingTask}</label>
        <select
          id="writing-modal-task-type"
          value={state.taskType}
          onChange={(event) => onTaskTypeChange(event.target.value as IeltsWritingTaskType)}
          disabled={state.generatingPrompt}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="task_1">{getWritingTaskLabel(state.writingLanguage, "task_1")}</option>
          <option value="task_2">{getWritingTaskLabel(state.writingLanguage, "task_2")}</option>
        </select>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TopicModeButton active={state.topicMode === "custom"} title={labels.chooseTopic} description={labels.chooseTopicDescription} onClick={() => onTopicModeChange("custom")} />
          <TopicModeButton active={state.topicMode === "random"} title={labels.randomTopic} description={labels.randomTopicDescription} onClick={() => onTopicModeChange("random")} />
        </div>

        {state.topicMode === "custom" ? (
          <>
            <label htmlFor="writing-topic" className="mt-4 block text-sm font-semibold text-slate-700">{labels.topic}</label>
            <input
              id="writing-topic"
              value={state.topicInput}
              onChange={(event) => onTopicInputChange(event.target.value)}
              maxLength={100}
              placeholder={state.taskType === "task_1" ? labels.topicPlaceholderTaskOne : labels.topicPlaceholderTaskTwo}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            />
          </>
        ) : null}

        {state.promptError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.promptError}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={state.generatingPrompt} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
            {labels.manualPrompt}
          </button>
          <button type="button" onClick={onGenerate} disabled={state.generatingPrompt} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
            {state.generatingPrompt ? labels.generatingPrompt : state.taskType === "task_1" ? labels.generatePromptAndChart : labels.generatePrompt}
          </button>
        </div>
      </section>
    </ModalDialog>
  );
}

function TopicModeButton({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"rounded-xl border p-4 text-left " + (active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200")}
    >
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      <span className="mt-1 block text-xs text-slate-600">{description}</span>
    </button>
  );
}
