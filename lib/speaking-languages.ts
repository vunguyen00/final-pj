export const SPEAKING_LANGUAGES = [
  { value: "ENGLISH", label: "English" },
  { value: "CHINESE", label: "\u4e2d\u6587" },
  { value: "JAPANESE", label: "\u65e5\u672c\u8a9e" },
  { value: "KOREAN", label: "\ud55c\uad6d\uc5b4" },
] as const;

export type SpeakingLanguage =
  (typeof SPEAKING_LANGUAGES)[number]["value"];
export type SpeakingTask = 1 | 2 | 3;

const TASK_OPTIONS: Record<
  SpeakingLanguage,
  Array<{ value: SpeakingTask; label: string }>
> = {
  ENGLISH: [
    { value: 1, label: "Task 1 - Answer short questions" },
    { value: 2, label: "Task 2 - Speak at length about a topic" },
    { value: 3, label: "Task 3 - Discuss and give opinions" },
  ],
  CHINESE: [
    { value: 1, label: "\u4efb\u52a1 1 - \u56de\u7b54\u7b80\u77ed\u95ee\u9898" },
    { value: 2, label: "\u4efb\u52a1 2 - \u56f4\u7ed5\u4e3b\u9898\u8fdb\u884c\u8f83\u957f\u53d1\u8a00" },
    { value: 3, label: "\u4efb\u52a1 3 - \u8ba8\u8bba\u5e76\u8868\u8fbe\u89c2\u70b9" },
  ],
  JAPANESE: [
    { value: 1, label: "\u30bf\u30b9\u30af1 - \u77ed\u3044\u8cea\u554f\u306b\u7b54\u3048\u308b" },
    { value: 2, label: "\u30bf\u30b9\u30af2 - \u30c6\u30fc\u30de\u306b\u3064\u3044\u3066\u9577\u304f\u8a71\u3059" },
    { value: 3, label: "\u30bf\u30b9\u30af3 - \u8a71\u3057\u5408\u3063\u3066\u610f\u898b\u3092\u8ff0\u3079\u308b" },
  ],
  KOREAN: [
    { value: 1, label: "\uacfc\uc81c 1 - \uc9e7\uc740 \uc9c8\ubb38\uc5d0 \ub2f5\ud558\uae30" },
    { value: 2, label: "\uacfc\uc81c 2 - \uc8fc\uc81c\uc5d0 \ub300\ud574 \uae38\uac8c \ub9d0\ud558\uae30" },
    { value: 3, label: "\uacfc\uc81c 3 - \ud1a0\ub860\ud558\uace0 \uc758\uacac \ub9d0\ud558\uae30" },
  ],
};

export function normalizeSpeakingLanguage(
  value: unknown,
  fallback: SpeakingLanguage = "ENGLISH",
): SpeakingLanguage {
  const normalized = String(value || "").trim().toUpperCase();
  return SPEAKING_LANGUAGES.some((item) => item.value === normalized)
    ? (normalized as SpeakingLanguage)
    : fallback;
}

export function getSpeakingLanguageFromExamSetting(
  examType: unknown,
): SpeakingLanguage {
  return String(examType || "").toUpperCase() === "HSK"
    ? "CHINESE"
    : "ENGLISH";
}

export function getSpeakingLanguageLabel(language: SpeakingLanguage) {
  return (
    SPEAKING_LANGUAGES.find((item) => item.value === language)?.label ||
    language
  );
}

export function getSpeakingTaskOptions(language: SpeakingLanguage) {
  return TASK_OPTIONS[language];
}

export function normalizeSpeakingTask(
  language: SpeakingLanguage,
  value: unknown,
): SpeakingTask {
  const task = Number(value) as SpeakingTask;
  return TASK_OPTIONS[language].some((item) => item.value === task)
    ? task
    : TASK_OPTIONS[language][0].value;
}

export function getSpeakingWhisperLanguage(language: SpeakingLanguage) {
  const whisperLanguages: Record<SpeakingLanguage, string> = {
    ENGLISH: "english",
    CHINESE: "chinese",
    JAPANESE: "japanese",
    KOREAN: "korean",
  };
  return whisperLanguages[language];
}

export function getSpeakingEvaluationSystem(language: SpeakingLanguage) {
  const systems: Record<SpeakingLanguage, string> = {
    ENGLISH: "IELTS",
    CHINESE: "HSK",
    JAPANESE: "JAPANESE_SPEAKING",
    KOREAN: "KOREAN_SPEAKING",
  };
  return systems[language];
}

export function getDefaultSpeakingPrompt(language: SpeakingLanguage) {
  const prompts: Record<SpeakingLanguage, string> = {
    ENGLISH:
      "Describe a memorable trip. Say where you went, who you went with, what happened, and why it was memorable.",
    CHINESE:
      "\u8bf7\u7528\u4e2d\u6587\u63cf\u8ff0\u4e00\u6b21\u96be\u5fd8\u7684\u65c5\u884c\uff0c\u8bf4\u660e\u4f60\u53bb\u4e86\u54ea\u91cc\u3001\u548c\u8c01\u4e00\u8d77\u53bb\u3001\u53d1\u751f\u4e86\u4ec0\u4e48\uff0c\u4ee5\u53ca\u4e3a\u4ec0\u4e48\u8fd9\u6b21\u65c5\u884c\u4ee4\u4eba\u96be\u5fd8\u3002",
    JAPANESE:
      "\u601d\u3044\u51fa\u306b\u6b8b\u3063\u3066\u3044\u308b\u65c5\u884c\u306b\u3064\u3044\u3066\u3001\u5834\u6240\u3001\u4e00\u7dd2\u306b\u884c\u3063\u305f\u4eba\u3001\u51fa\u6765\u4e8b\u3001\u5370\u8c61\u306b\u6b8b\u3063\u305f\u7406\u7531\u3092\u8a71\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    KOREAN:
      "\uae30\uc5b5\uc5d0 \ub0a8\ub294 \uc5ec\ud589\uc5d0 \ub300\ud574 \uc7a5\uc18c, \ud568\uaed8 \uac04 \uc0ac\ub78c, \uc788\uc5c8\ub358 \uc77c, \uae30\uc5b5\uc5d0 \ub0a8\ub294 \uc774\uc720\ub97c \ub9d0\ud574 \ubcf4\uc138\uc694.",
  };
  return prompts[language];
}

export type SpeakingAiUiLabels = {
  criteria: Record<string, string>;
  paymentFailed: string;
  micError: string;
  audioToTextFailed: string;
  analyzerStartFailed: string;
  customTopicRequired: string;
  topicFailed: string;
  topicFailedRetry: string;
  promptRequired: string;
  paymentRequired: string;
  missingAudio: string;
  noSpeech: string;
  invalidPayment: string;
  scoreFailed: string;
  autoSubmitted: string;
  titlePrefix: string;
  randomTopic: string;
  headerEyebrow: (isAdmin: boolean) => string;
  headerTitle: string;
  headerDescription: string;
  resultHistory: string;
  language: string;
  duration: string;
  minute: string;
  status: string;
  recording: string;
  notRecording: string;
  analyzed: string;
  audioAfterFinish: string;
  promptLabel: string;
  taskBadge: (task: SpeakingTask) => string;
  topicBadge: (topic: string) => string;
  chooseOtherTopic: string;
  reviewing: string;
  scoring: string;
  startingMic: string;
  startSession: string;
  payAiFeedback: string;
  finishScore: string;
  finishFeedback: (isAdmin: boolean) => string;
  waitReady: string;
  transcriptTitle: string;
  transcriptLabel: string;
  transcriptRecording: string;
  transcriptEmpty: string;
  scoreFree: string;
  aiPaid: string;
  aiAdminFree: string;
  viewSaved: string;
  level: string;
  scoreOnlyNote: string;
  offTopic: string;
  offTopicFallback: string;
  relevance: string;
  detailedFeedback: string;
  summaryComment: string;
  criteriaTitle: string;
  improvementMethods: string;
  sampleAnswer: string;
  setupEyebrow: string;
  setupTitle: string;
  setupDescription: string;
  speakingLanguage: string;
  speakingTask: string;
  chooseTopic: string;
  chooseTopicDescription: string;
  randomTopicTitle: string;
  randomTopicDescription: string;
  topic: string;
  topicPlaceholder: string;
  manualPrompt: string;
  generatingTopic: string;
  generateTopic: string;
};

const SPEAKING_AI_UI_LABELS: Record<SpeakingLanguage, SpeakingAiUiLabels> = {
  ENGLISH: {
    criteria: {
      fluency: "Fluency",
      fluencyCoherence: "Fluency and coherence",
      pronunciation: "Pronunciation",
      grammar: "Grammar",
      grammarRangeAccuracy: "Grammar range and accuracy",
      vocabulary: "Vocabulary",
      lexicalResource: "Lexical resource",
      taskResponse: "Task response",
      taskRelevance: "Task relevance",
    },
    paymentFailed: "Could not create payment.",
    micError: "Could not open the microphone for recording.",
    audioToTextFailed: "Could not convert audio to text.",
    analyzerStartFailed: "Could not start the audio analyzer in this browser.",
    customTopicRequired: "Enter a topic or choose random topic mode.",
    topicFailed: "Could not generate a speaking prompt.",
    topicFailedRetry: "Could not generate a speaking prompt. Please try again.",
    promptRequired: "Enter a speaking prompt.",
    paymentRequired: "You need to pay for AI feedback before ending the speaking session.",
    missingAudio: "No recording was found for transcription.",
    noSpeech: "The system could not recognize your speech. Please check the recording and try again.",
    invalidPayment: "The AI feedback payment is invalid.",
    scoreFailed: "Could not score the speaking response.",
    autoSubmitted: "Time is up. The system submitted and scored your response automatically.",
    titlePrefix: "Speaking AI",
    randomTopic: "Random",
    headerEyebrow: (isAdmin) => `Free scoring · AI feedback ${isAdmin ? "free for admins" : "paid per use"}`,
    headerTitle: "Speaking practice with AI scoring",
    headerDescription: "The system records the full response and analyzes the audio after you finish. Scoring is free; detailed AI feedback is paid.",
    resultHistory: "Result history",
    language: "Language",
    duration: "Duration",
    minute: "minutes",
    status: "Status",
    recording: "Recording",
    notRecording: "Not recording",
    analyzed: "Recording analyzed",
    audioAfterFinish: "Audio will be analyzed after you finish",
    promptLabel: "Speaking prompt",
    taskBadge: (task) => `Speaking Task ${task}`,
    topicBadge: (topic) => `Topic: ${topic}`,
    chooseOtherTopic: "Choose another topic",
    reviewing: "AI is reviewing...",
    scoring: "AI is scoring...",
    startingMic: "Starting microphone...",
    startSession: "Start speaking",
    payAiFeedback: "Pay for AI feedback",
    finishScore: "Finish and score for free",
    finishFeedback: (isAdmin) => `Finish and get AI feedback${isAdmin ? "" : " (paid)"}`,
    waitReady: "Please wait until the system is ready before speaking.",
    transcriptTitle: "Recording and transcript",
    transcriptLabel: "Text generated from audio",
    transcriptRecording: "Recording. The transcript will appear after you finish.",
    transcriptEmpty: "No transcript yet. Press start to record your response.",
    scoreFree: "Free scoring",
    aiPaid: "AI feedback · Paid",
    aiAdminFree: "AI feedback · Free for admins",
    viewSaved: "View saved detail",
    level: "Level",
    scoreOnlyNote: "This scoring run only returns a score and does not include detailed feedback.",
    offTopic: "The answer is off topic",
    offTopicFallback: "The response does not fully answer the speaking prompt.",
    relevance: "Relevance",
    detailedFeedback: "Detailed feedback",
    summaryComment: "Overall comment",
    criteriaTitle: "Pronunciation, grammar, vocabulary, and fluency",
    improvementMethods: "Improvement methods",
    sampleAnswer: "On-topic sample answer",
    setupEyebrow: "Create a speaking prompt with AI",
    setupTitle: "Which topic do you want to practice?",
    setupDescription: "Choose the language, speaking task, and topic, or let AI choose a suitable random prompt.",
    speakingLanguage: "Speaking language",
    speakingTask: "Speaking Task",
    chooseTopic: "Choose topic",
    chooseTopicDescription: "AI creates a prompt based on your topic.",
    randomTopicTitle: "Random topic",
    randomTopicDescription: "AI chooses a topic for the selected language and speaking task.",
    topic: "Topic",
    topicPlaceholder: "Example: education, technology, travel...",
    manualPrompt: "Write my own prompt",
    generatingTopic: "AI is generating...",
    generateTopic: "Generate prompt with AI",
  },
  CHINESE: {
    criteria: {
      fluency: "\u6d41\u5229\u5ea6",
      fluencyCoherence: "\u6d41\u5229\u5ea6\u4e0e\u8fde\u8d2f\u6027",
      pronunciation: "\u53d1\u97f3",
      grammar: "\u8bed\u6cd5",
      grammarRangeAccuracy: "\u8bed\u6cd5\u8303\u56f4\u4e0e\u51c6\u786e\u5ea6",
      vocabulary: "\u8bcd\u6c47",
      lexicalResource: "\u8bcd\u6c47\u8d44\u6e90",
      taskResponse: "\u4efb\u52a1\u56de\u5e94",
      taskRelevance: "\u5207\u9898\u5ea6",
    },
    paymentFailed: "\u65e0\u6cd5\u521b\u5efa\u652f\u4ed8\u3002",
    micError: "\u65e0\u6cd5\u6253\u5f00\u9ea6\u514b\u98ce\u8fdb\u884c\u5f55\u97f3\u3002",
    audioToTextFailed: "\u65e0\u6cd5\u5c06\u97f3\u9891\u8f6c\u6362\u4e3a\u6587\u672c\u3002",
    analyzerStartFailed: "\u65e0\u6cd5\u5728\u6b64\u6d4f\u89c8\u5668\u4e2d\u542f\u52a8\u97f3\u9891\u5206\u6790\u5668\u3002",
    customTopicRequired: "\u8bf7\u8f93\u5165\u4e3b\u9898\u6216\u9009\u62e9\u968f\u673a\u4e3b\u9898\u6a21\u5f0f\u3002",
    topicFailed: "\u65e0\u6cd5\u751f\u6210\u53e3\u8bed\u9898\u76ee\u3002",
    topicFailedRetry: "\u65e0\u6cd5\u751f\u6210\u53e3\u8bed\u9898\u76ee\u3002\u8bf7\u91cd\u8bd5\u3002",
    promptRequired: "\u8bf7\u8f93\u5165\u53e3\u8bed\u9898\u76ee\u3002",
    paymentRequired: "\u7ed3\u675f\u53e3\u8bed\u7ec3\u4e60\u524d\uff0c\u9700\u8981\u5148\u652f\u4ed8AI\u53cd\u9988\u8d39\u7528\u3002",
    missingAudio: "\u672a\u627e\u5230\u7528\u4e8e\u8f6c\u5199\u7684\u5f55\u97f3\u3002",
    noSpeech: "\u7cfb\u7edf\u672a\u80fd\u8bc6\u522b\u4f60\u7684\u8bed\u97f3\u3002\u8bf7\u68c0\u67e5\u5f55\u97f3\u5e76\u91cd\u8bd5\u3002",
    invalidPayment: "AI\u53cd\u9988\u652f\u4ed8\u65e0\u6548\u3002",
    scoreFailed: "\u65e0\u6cd5\u8bc4\u5206\u53e3\u8bed\u56de\u7b54\u3002",
    autoSubmitted: "\u65f6\u95f4\u5df2\u5230\u3002\u7cfb\u7edf\u5df2\u81ea\u52a8\u63d0\u4ea4\u5e76\u8bc4\u5206\u3002",
    titlePrefix: "AI\u53e3\u8bed",
    randomTopic: "\u968f\u673a",
    headerEyebrow: (isAdmin) => `\u514d\u8d39\u8bc4\u5206 \u00b7 AI\u53cd\u9988${isAdmin ? "\u7ba1\u7406\u5458\u514d\u8d39" : "\u6309\u6b21\u4ed8\u8d39"}`,
    headerTitle: "AI\u53e3\u8bed\u7ec3\u4e60\u4e0e\u8bc4\u5206",
    headerDescription: "\u7cfb\u7edf\u4f1a\u5f55\u5236\u5b8c\u6574\u56de\u7b54\uff0c\u5e76\u5728\u7ed3\u675f\u540e\u5206\u6790\u97f3\u9891\u3002\u8bc4\u5206\u514d\u8d39\uff1b\u8be6\u7ec6AI\u53cd\u9988\u9700\u4ed8\u8d39\u3002",
    resultHistory: "\u7ed3\u679c\u5386\u53f2",
    language: "\u8bed\u8a00",
    duration: "\u65f6\u957f",
    minute: "\u5206\u949f",
    status: "\u72b6\u6001",
    recording: "\u6b63\u5728\u5f55\u97f3",
    notRecording: "\u672a\u5f55\u97f3",
    analyzed: "\u5f55\u97f3\u5206\u6790\u5b8c\u6210",
    audioAfterFinish: "\u97f3\u9891\u5c06\u5728\u7ed3\u675f\u540e\u5206\u6790",
    promptLabel: "\u53e3\u8bed\u9898\u76ee",
    taskBadge: (task) => `\u53e3\u8bed\u4efb\u52a1 ${task}`,
    topicBadge: (topic) => `\u4e3b\u9898\uff1a${topic}`,
    chooseOtherTopic: "\u9009\u62e9\u5176\u4ed6\u4e3b\u9898",
    reviewing: "AI\u6b63\u5728\u53cd\u9988...",
    scoring: "AI\u6b63\u5728\u8bc4\u5206...",
    startingMic: "\u6b63\u5728\u542f\u52a8\u9ea6\u514b\u98ce...",
    startSession: "\u5f00\u59cb\u53e3\u8bed",
    payAiFeedback: "\u652f\u4ed8AI\u53cd\u9988",
    finishScore: "\u7ed3\u675f\u5e76\u514d\u8d39\u8bc4\u5206",
    finishFeedback: (isAdmin) => `\u7ed3\u675f\u5e76\u83b7\u53d6AI\u53cd\u9988${isAdmin ? "" : "\uff08\u5df2\u4ed8\u8d39\uff09"}`,
    waitReady: "\u8bf7\u7b49\u7cfb\u7edf\u5c31\u7eea\u540e\u518d\u5f00\u59cb\u8bf4\u8bdd\u3002",
    transcriptTitle: "\u5f55\u97f3\u548c\u8bc6\u522b\u5185\u5bb9",
    transcriptLabel: "\u7531\u97f3\u9891\u751f\u6210\u7684\u6587\u672c",
    transcriptRecording: "\u6b63\u5728\u5f55\u97f3\u3002\u7ed3\u675f\u540e\u4f1a\u663e\u793a\u8bc6\u522b\u5185\u5bb9\u3002",
    transcriptEmpty: "\u6682\u65e0\u8bc6\u522b\u5185\u5bb9\u3002\u70b9\u51fb\u5f00\u59cb\u6765\u5f55\u5236\u56de\u7b54\u3002",
    scoreFree: "\u514d\u8d39\u8bc4\u5206",
    aiPaid: "AI\u53cd\u9988 \u00b7 \u5df2\u4ed8\u8d39",
    aiAdminFree: "AI\u53cd\u9988 \u00b7 \u7ba1\u7406\u5458\u514d\u8d39",
    viewSaved: "\u67e5\u770b\u5df2\u4fdd\u5b58\u8be6\u60c5",
    level: "\u7ea7\u522b",
    scoreOnlyNote: "\u672c\u6b21\u8bc4\u5206\u4ec5\u8fd4\u56de\u5206\u6570\uff0c\u4e0d\u5305\u542b\u8be6\u7ec6\u53cd\u9988\u3002",
    offTopic: "\u56de\u7b54\u504f\u9898",
    offTopicFallback: "\u56de\u7b54\u672a\u5145\u5206\u56de\u5e94\u53e3\u8bed\u9898\u76ee\u3002",
    relevance: "\u5207\u9898\u5ea6",
    detailedFeedback: "\u8be6\u7ec6\u53cd\u9988",
    summaryComment: "\u603b\u4f53\u8bc4\u8bed",
    criteriaTitle: "\u53d1\u97f3\u3001\u8bed\u6cd5\u3001\u8bcd\u6c47\u548c\u6d41\u5229\u5ea6",
    improvementMethods: "\u63d0\u9ad8\u65b9\u6cd5",
    sampleAnswer: "\u5207\u9898\u8303\u4f8b\u56de\u7b54",
    setupEyebrow: "\u7528AI\u751f\u6210\u53e3\u8bed\u9898\u76ee",
    setupTitle: "\u4f60\u60f3\u7ec3\u4e60\u54ea\u4e2a\u4e3b\u9898\uff1f",
    setupDescription: "\u9009\u62e9\u8bed\u8a00\u3001\u53e3\u8bed\u4efb\u52a1\u548c\u4e3b\u9898\uff0c\u6216\u8ba9AI\u968f\u673a\u751f\u6210\u5408\u9002\u7684\u9898\u76ee\u3002",
    speakingLanguage: "\u53e3\u8bed\u8bed\u8a00",
    speakingTask: "\u53e3\u8bed\u4efb\u52a1",
    chooseTopic: "\u9009\u62e9\u4e3b\u9898",
    chooseTopicDescription: "AI\u6839\u636e\u4f60\u8f93\u5165\u7684\u4e3b\u9898\u751f\u6210\u9898\u76ee\u3002",
    randomTopicTitle: "\u968f\u673a\u4e3b\u9898",
    randomTopicDescription: "AI\u4f1a\u6839\u636e\u5df2\u9009\u8bed\u8a00\u548c\u53e3\u8bed\u4efb\u52a1\u9009\u62e9\u4e3b\u9898\u3002",
    topic: "\u4e3b\u9898",
    topicPlaceholder: "\u4f8b\u5982\uff1a\u6559\u80b2\u3001\u79d1\u6280\u3001\u65c5\u884c...",
    manualPrompt: "\u81ea\u5df1\u8f93\u5165\u9898\u76ee",
    generatingTopic: "AI\u6b63\u5728\u751f\u6210...",
    generateTopic: "\u7528AI\u751f\u6210\u9898\u76ee",
  },
  JAPANESE: {} as SpeakingAiUiLabels,
  KOREAN: {} as SpeakingAiUiLabels,
};

SPEAKING_AI_UI_LABELS.JAPANESE = {
  ...SPEAKING_AI_UI_LABELS.CHINESE,
  criteria: {
    fluency: "\u6d41\u66a2\u3055",
    fluencyCoherence: "\u6d41\u66a2\u3055\u3068\u4e00\u8cab\u6027",
    pronunciation: "\u767a\u97f3",
    grammar: "\u6587\u6cd5",
    grammarRangeAccuracy: "\u6587\u6cd5\u306e\u5e45\u3068\u6b63\u78ba\u3055",
    vocabulary: "\u8a9e\u5f59",
    lexicalResource: "\u8a9e\u5f59\u529b",
    taskResponse: "\u8ab2\u984c\u3078\u306e\u5fdc\u7b54",
    taskRelevance: "\u8ab2\u984c\u9069\u5408\u5ea6",
  },
  paymentFailed: "\u6c7a\u6e08\u3092\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
  micError: "\u9332\u97f3\u7528\u306e\u30de\u30a4\u30af\u3092\u958b\u3051\u307e\u305b\u3093\u3002",
  audioToTextFailed: "\u97f3\u58f0\u3092\u6587\u5b57\u306b\u5909\u63db\u3067\u304d\u307e\u305b\u3093\u3002",
  analyzerStartFailed: "\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u3067\u97f3\u58f0\u89e3\u6790\u3092\u8d77\u52d5\u3067\u304d\u307e\u305b\u3093\u3002",
  customTopicRequired: "\u30c8\u30d4\u30c3\u30af\u3092\u5165\u529b\u3059\u308b\u304b\u3001\u30e9\u30f3\u30c0\u30e0\u30c8\u30d4\u30c3\u30af\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002",
  topicFailed: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u554f\u984c\u3092\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093\u3002",
  topicFailedRetry: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u554f\u984c\u3092\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093\u3002\u3082\u3046\u4e00\u5ea6\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  promptRequired: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u554f\u984c\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  paymentRequired: "\u30bb\u30c3\u30b7\u30e7\u30f3\u3092\u7d42\u4e86\u3059\u308b\u524d\u306bAI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u306e\u6c7a\u6e08\u304c\u5fc5\u8981\u3067\u3059\u3002",
  missingAudio: "\u6587\u5b57\u8d77\u3053\u3057\u7528\u306e\u9332\u97f3\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002",
  noSpeech: "\u97f3\u58f0\u5185\u5bb9\u3092\u8a8d\u8b58\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u9332\u97f3\u3092\u78ba\u8a8d\u3057\u3066\u3082\u3046\u4e00\u5ea6\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  invalidPayment: "AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u306e\u6c7a\u6e08\u304c\u7121\u52b9\u3067\u3059\u3002",
  scoreFailed: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u3092\u63a1\u70b9\u3067\u304d\u307e\u305b\u3093\u3002",
  autoSubmitted: "\u6642\u9593\u306b\u306a\u308a\u307e\u3057\u305f\u3002\u30b7\u30b9\u30c6\u30e0\u304c\u81ea\u52d5\u3067\u63d0\u51fa\u3057\u3001\u63a1\u70b9\u3057\u307e\u3057\u305f\u3002",
  titlePrefix: "AI\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0",
  randomTopic: "\u30e9\u30f3\u30c0\u30e0",
  headerEyebrow: (isAdmin) => `\u7121\u6599\u63a1\u70b9 \u00b7 AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af${isAdmin ? "\u7ba1\u7406\u8005\u306f\u7121\u6599" : "\u90fd\u5ea6\u6255\u3044"}`,
  headerTitle: "AI\u63a1\u70b9\u4ed8\u304d\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u7df4\u7fd2",
  headerDescription: "\u7d42\u4e86\u5f8c\u306b\u9332\u97f3\u5168\u4f53\u3092\u89e3\u6790\u3057\u307e\u3059\u3002\u63a1\u70b9\u306f\u7121\u6599\u3067\u3001\u8a73\u7d30\u306aAI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u306f\u6709\u6599\u3067\u3059\u3002",
  resultHistory: "\u7d50\u679c\u5c65\u6b74",
  language: "\u8a00\u8a9e",
  duration: "\u6642\u9593",
  minute: "\u5206",
  status: "\u72b6\u614b",
  recording: "\u9332\u97f3\u4e2d",
  notRecording: "\u672a\u9332\u97f3",
  analyzed: "\u9332\u97f3\u306e\u89e3\u6790\u5b8c\u4e86",
  audioAfterFinish: "\u97f3\u58f0\u306f\u7d42\u4e86\u5f8c\u306b\u89e3\u6790\u3055\u308c\u307e\u3059",
  promptLabel: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u554f\u984c",
  taskBadge: (task) => `\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u30bf\u30b9\u30af ${task}`,
  topicBadge: (topic) => `\u30c8\u30d4\u30c3\u30af\uff1a${topic}`,
  chooseOtherTopic: "\u5225\u306e\u30c8\u30d4\u30c3\u30af\u3092\u9078\u3076",
  reviewing: "AI\u304c\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u4e2d...",
  scoring: "AI\u304c\u63a1\u70b9\u4e2d...",
  startingMic: "\u30de\u30a4\u30af\u3092\u8d77\u52d5\u3057\u3066\u3044\u307e\u3059...",
  startSession: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u3092\u958b\u59cb",
  payAiFeedback: "AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u3092\u6c7a\u6e08",
  finishScore: "\u7d42\u4e86\u3057\u3066\u7121\u6599\u63a1\u70b9",
  finishFeedback: (isAdmin) => `\u7d42\u4e86\u3057\u3066AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u3092\u53d7\u3051\u308b${isAdmin ? "" : "\uff08\u6c7a\u6e08\u6e08\u307f\uff09"}`,
  waitReady: "\u30b7\u30b9\u30c6\u30e0\u306e\u6e96\u5099\u5b8c\u4e86\u3092\u5f85\u3063\u3066\u304b\u3089\u8a71\u3057\u59cb\u3081\u3066\u304f\u3060\u3055\u3044\u3002",
  transcriptTitle: "\u9332\u97f3\u3068\u8a8d\u8b58\u5185\u5bb9",
  transcriptLabel: "\u97f3\u58f0\u304b\u3089\u751f\u6210\u3055\u308c\u305f\u30c6\u30ad\u30b9\u30c8",
  transcriptRecording: "\u9332\u97f3\u4e2d\u3067\u3059\u3002\u7d42\u4e86\u5f8c\u306b\u8a8d\u8b58\u5185\u5bb9\u304c\u8868\u793a\u3055\u308c\u307e\u3059\u3002",
  transcriptEmpty: "\u8a8d\u8b58\u5185\u5bb9\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002\u958b\u59cb\u3092\u62bc\u3057\u3066\u56de\u7b54\u3092\u9332\u97f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  scoreFree: "\u7121\u6599\u63a1\u70b9",
  aiPaid: "AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af \u00b7 \u6c7a\u6e08\u6e08\u307f",
  aiAdminFree: "AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af \u00b7 \u7ba1\u7406\u8005\u306f\u7121\u6599",
  viewSaved: "\u4fdd\u5b58\u6e08\u307f\u8a73\u7d30\u3092\u898b\u308b",
  level: "\u30ec\u30d9\u30eb",
  scoreOnlyNote: "\u4eca\u56de\u306e\u63a1\u70b9\u306f\u70b9\u6570\u306e\u307f\u3067\u3001\u8a73\u7d30\u306a\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u306f\u542b\u307e\u308c\u307e\u305b\u3093\u3002",
  offTopic: "\u56de\u7b54\u304c\u8ab2\u984c\u304b\u3089\u5916\u308c\u3066\u3044\u307e\u3059",
  offTopicFallback: "\u56de\u7b54\u304c\u554f\u984c\u306e\u8981\u6c42\u306b\u5341\u5206\u306b\u7b54\u3048\u3066\u3044\u307e\u305b\u3093\u3002",
  relevance: "\u8ab2\u984c\u9069\u5408\u5ea6",
  detailedFeedback: "\u8a73\u7d30\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af",
  summaryComment: "\u7dcf\u5408\u30b3\u30e1\u30f3\u30c8",
  criteriaTitle: "\u767a\u97f3\u30fb\u6587\u6cd5\u30fb\u8a9e\u5f59\u30fb\u6d41\u66a2\u3055",
  improvementMethods: "\u6539\u5584\u65b9\u6cd5",
  sampleAnswer: "\u8ab2\u984c\u306b\u6cbf\u3063\u305f\u6a21\u7bc4\u56de\u7b54",
  setupEyebrow: "AI\u3067\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u554f\u984c\u3092\u4f5c\u6210",
  setupTitle: "\u3069\u306e\u30c8\u30d4\u30c3\u30af\u3092\u7df4\u7fd2\u3057\u307e\u3059\u304b\uff1f",
  setupDescription: "\u8a00\u8a9e\u3001\u30bf\u30b9\u30af\u3001\u30c8\u30d4\u30c3\u30af\u3092\u9078\u3076\u304b\u3001AI\u306b\u9069\u5207\u306a\u554f\u984c\u3092\u30e9\u30f3\u30c0\u30e0\u306b\u4f5c\u6210\u3055\u305b\u307e\u3059\u3002",
  speakingLanguage: "\u7df4\u7fd2\u8a00\u8a9e",
  speakingTask: "\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u30bf\u30b9\u30af",
  chooseTopic: "\u30c8\u30d4\u30c3\u30af\u3092\u9078\u3076",
  chooseTopicDescription: "AI\u304c\u5165\u529b\u3057\u305f\u30c8\u30d4\u30c3\u30af\u3092\u3082\u3068\u306b\u554f\u984c\u3092\u4f5c\u6210\u3057\u307e\u3059\u3002",
  randomTopicTitle: "\u30e9\u30f3\u30c0\u30e0\u554f\u984c",
  randomTopicDescription: "AI\u304c\u9078\u629e\u3055\u308c\u305f\u8a00\u8a9e\u3068\u30bf\u30b9\u30af\u306b\u5408\u3046\u30c8\u30d4\u30c3\u30af\u3092\u9078\u3073\u307e\u3059\u3002",
  topic: "\u30c8\u30d4\u30c3\u30af",
  topicPlaceholder: "\u4f8b\uff1a\u6559\u80b2\u3001\u6280\u8853\u3001\u65c5\u884c...",
  manualPrompt: "\u81ea\u5206\u3067\u554f\u984c\u3092\u5165\u529b",
  generatingTopic: "AI\u304c\u4f5c\u6210\u4e2d...",
  generateTopic: "AI\u3067\u554f\u984c\u3092\u4f5c\u6210",
};

SPEAKING_AI_UI_LABELS.KOREAN = {
  ...SPEAKING_AI_UI_LABELS.JAPANESE,
  criteria: {
    fluency: "\uc720\ucc3d\uc131",
    fluencyCoherence: "\uc720\ucc3d\uc131\uacfc \uc77c\uad00\uc131",
    pronunciation: "\ubc1c\uc74c",
    grammar: "\ubb38\ubc95",
    grammarRangeAccuracy: "\ubb38\ubc95 \ubc94\uc704\uc640 \uc815\ud655\uc131",
    vocabulary: "\uc5b4\ud718",
    lexicalResource: "\uc5b4\ud718\ub825",
    taskResponse: "\uacfc\uc81c \uc751\ub2f5",
    taskRelevance: "\uacfc\uc81c \uc801\ud569\ub3c4",
  },
  paymentFailed: "\uacb0\uc81c\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  micError: "\ub179\uc74c\uc744 \uc704\ud55c \ub9c8\uc774\ud06c\ub97c \uc5f4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  audioToTextFailed: "\uc624\ub514\uc624\ub97c \ud14d\uc2a4\ud2b8\ub85c \ubcc0\ud658\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  analyzerStartFailed: "\uc774 \ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c \uc624\ub514\uc624 \ubd84\uc11d\uae30\ub97c \uc2dc\uc791\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  customTopicRequired: "\uc8fc\uc81c\ub97c \uc785\ub825\ud558\uac70\ub098 \ub79c\ub364 \uc8fc\uc81c \ubaa8\ub4dc\ub97c \uc120\ud0dd\ud558\uc138\uc694.",
  topicFailed: "\ub9d0\ud558\uae30 \ubb38\uc81c\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  topicFailedRetry: "\ub9d0\ud558\uae30 \ubb38\uc81c\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
  promptRequired: "\ub9d0\ud558\uae30 \ubb38\uc81c\ub97c \uc785\ub825\ud558\uc138\uc694.",
  paymentRequired: "\ub9d0\ud558\uae30 \uc138\uc158\uc744 \ub05d\ub0b4\uae30 \uc804\uc5d0 AI \ud53c\ub4dc\ubc31 \uacb0\uc81c\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
  missingAudio: "\uc804\uc0ac\ud560 \ub179\uc74c\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  noSpeech: "\uc2dc\uc2a4\ud15c\uc774 \uc74c\uc131\uc744 \uc778\uc2dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub179\uc74c\uc744 \ud655\uc778\ud558\uace0 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
  invalidPayment: "AI \ud53c\ub4dc\ubc31 \uacb0\uc81c\uac00 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
  scoreFailed: "\ub9d0\ud558\uae30 \ub2f5\ubcc0\uc744 \ucc44\uc810\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  autoSubmitted: "\uc2dc\uac04\uc774 \uc885\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc2dc\uc2a4\ud15c\uc774 \uc790\ub3d9\uc73c\ub85c \uc81c\ucd9c\ud558\uace0 \ucc44\uc810\ud588\uc2b5\ub2c8\ub2e4.",
  titlePrefix: "AI \ub9d0\ud558\uae30",
  randomTopic: "\ub79c\ub364",
  headerEyebrow: (isAdmin) => `\ubb34\ub8cc \ucc44\uc810 \u00b7 AI \ud53c\ub4dc\ubc31 ${isAdmin ? "\uad00\ub9ac\uc790 \ubb34\ub8cc" : "\ud68c\ucc28\ubcc4 \uacb0\uc81c"}`,
  headerTitle: "AI \ucc44\uc810 \ub9d0\ud558\uae30 \uc5f0\uc2b5",
  headerDescription: "\uc138\uc158 \uc885\ub8cc \ud6c4 \uc804\uccb4 \ub179\uc74c\uc744 \ubd84\uc11d\ud569\ub2c8\ub2e4. \ucc44\uc810\uc740 \ubb34\ub8cc\uc774\uba70 \uc790\uc138\ud55c AI \ud53c\ub4dc\ubc31\uc740 \uc720\ub8cc\uc785\ub2c8\ub2e4.",
  resultHistory: "\uacb0\uacfc \uae30\ub85d",
  language: "\uc5b8\uc5b4",
  duration: "\uc2dc\uac04",
  minute: "\ubd84",
  status: "\uc0c1\ud0dc",
  recording: "\ub179\uc74c \uc911",
  notRecording: "\ub179\uc74c \uc804",
  analyzed: "\ub179\uc74c \ubd84\uc11d \uc644\ub8cc",
  audioAfterFinish: "\uc885\ub8cc \ud6c4 \uc624\ub514\uc624\uac00 \ubd84\uc11d\ub429\ub2c8\ub2e4",
  promptLabel: "\ub9d0\ud558\uae30 \ubb38\uc81c",
  taskBadge: (task) => `\ub9d0\ud558\uae30 \uacfc\uc81c ${task}`,
  topicBadge: (topic) => `\uc8fc\uc81c: ${topic}`,
  chooseOtherTopic: "\ub2e4\ub978 \uc8fc\uc81c \uc120\ud0dd",
  reviewing: "AI\uac00 \ud53c\ub4dc\ubc31 \uc911...",
  scoring: "AI\uac00 \ucc44\uc810 \uc911...",
  startingMic: "\ub9c8\uc774\ud06c\ub97c \uc2dc\uc791\ud558\ub294 \uc911...",
  startSession: "\ub9d0\ud558\uae30 \uc2dc\uc791",
  payAiFeedback: "AI \ud53c\ub4dc\ubc31 \uacb0\uc81c",
  finishScore: "\uc885\ub8cc \ubc0f \ubb34\ub8cc \ucc44\uc810",
  finishFeedback: (isAdmin) => `\uc885\ub8cc \ubc0f AI \ud53c\ub4dc\ubc31 \ubc1b\uae30${isAdmin ? "" : "(\uacb0\uc81c \uc644\ub8cc)"}`,
  waitReady: "\uc2dc\uc2a4\ud15c\uc774 \uc900\ube44\ub420 \ub54c\uae4c\uc9c0 \uae30\ub2e4\ub9b0 \ub4a4 \ub9d0\ud558\uae30\ub97c \uc2dc\uc791\ud558\uc138\uc694.",
  transcriptTitle: "\ub179\uc74c \ubc0f \uc778\uc2dd \ub0b4\uc6a9",
  transcriptLabel: "\uc624\ub514\uc624\uc5d0\uc11c \uc0dd\uc131\ub41c \ud14d\uc2a4\ud2b8",
  transcriptRecording: "\ub179\uc74c \uc911\uc785\ub2c8\ub2e4. \uc885\ub8cc \ud6c4 \uc778\uc2dd \ub0b4\uc6a9\uc774 \ud45c\uc2dc\ub429\ub2c8\ub2e4.",
  transcriptEmpty: "\uc544\uc9c1 \uc778\uc2dd \ub0b4\uc6a9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc2dc\uc791\uc744 \ub20c\ub7ec \ub2f5\ubcc0\uc744 \ub179\uc74c\ud558\uc138\uc694.",
  scoreFree: "\ubb34\ub8cc \ucc44\uc810",
  aiPaid: "AI \ud53c\ub4dc\ubc31 \u00b7 \uacb0\uc81c \uc644\ub8cc",
  aiAdminFree: "AI \ud53c\ub4dc\ubc31 \u00b7 \uad00\ub9ac\uc790 \ubb34\ub8cc",
  viewSaved: "\uc800\uc7a5\ub41c \uc0c1\uc138 \ubcf4\uae30",
  level: "\ub808\ubca8",
  scoreOnlyNote: "\uc774\ubc88 \ucc44\uc810\uc740 \uc810\uc218\ub9cc \uc81c\uacf5\ud558\uba70 \uc790\uc138\ud55c \ud53c\ub4dc\ubc31\uc740 \ud3ec\ud568\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
  offTopic: "\ub2f5\ubcc0\uc774 \uc8fc\uc81c\uc5d0\uc11c \ubc97\uc5b4\ub0ac\uc2b5\ub2c8\ub2e4",
  offTopicFallback: "\ub2f5\ubcc0\uc774 \ub9d0\ud558\uae30 \ubb38\uc81c\uc758 \uc694\uad6c\uc5d0 \ucda9\ubd84\ud788 \ub2f5\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
  relevance: "\uacfc\uc81c \uc801\ud569\ub3c4",
  detailedFeedback: "\uc790\uc138\ud55c \ud53c\ub4dc\ubc31",
  summaryComment: "\uc885\ud569 \ucf54\uba58\ud2b8",
  criteriaTitle: "\ubc1c\uc74c, \ubb38\ubc95, \uc5b4\ud718, \uc720\ucc3d\uc131",
  improvementMethods: "\uac1c\uc120 \ubc29\ubc95",
  sampleAnswer: "\uc8fc\uc81c\uc5d0 \ub9de\ub294 \ubaa8\ubc94 \ub2f5\uc548",
  setupEyebrow: "AI\ub85c \ub9d0\ud558\uae30 \ubb38\uc81c \uc0dd\uc131",
  setupTitle: "\uc5b4\ub5a4 \uc8fc\uc81c\ub97c \uc5f0\uc2b5\ud560\uae4c\uc694?",
  setupDescription: "\uc5b8\uc5b4, \ub9d0\ud558\uae30 \uacfc\uc81c, \uc8fc\uc81c\ub97c \uc120\ud0dd\ud558\uac70\ub098 AI\uac00 \uc54c\ub9de\uc740 \ubb38\uc81c\ub97c \ub79c\ub364\uc73c\ub85c \uc120\ud0dd\ud558\uac8c \ud558\uc138\uc694.",
  speakingLanguage: "\ub9d0\ud558\uae30 \uc5b8\uc5b4",
  speakingTask: "\ub9d0\ud558\uae30 \uacfc\uc81c",
  chooseTopic: "\uc8fc\uc81c \uc120\ud0dd",
  chooseTopicDescription: "AI\uac00 \uc785\ub825\ud55c \uc8fc\uc81c\ub97c \uae30\ubc18\uc73c\ub85c \ubb38\uc81c\ub97c \uc0dd\uc131\ud569\ub2c8\ub2e4.",
  randomTopicTitle: "\ub79c\ub364 \uc8fc\uc81c",
  randomTopicDescription: "AI\uac00 \uc120\ud0dd\ub41c \uc5b8\uc5b4\uc640 \uacfc\uc81c\uc5d0 \ub9de\ub294 \uc8fc\uc81c\ub97c \uc120\ud0dd\ud569\ub2c8\ub2e4.",
  topic: "\uc8fc\uc81c",
  topicPlaceholder: "\uc608: \uad50\uc721, \uae30\uc220, \uc5ec\ud589...",
  manualPrompt: "\uc9c1\uc811 \ubb38\uc81c \uc785\ub825",
  generatingTopic: "AI\uac00 \uc0dd\uc131 \uc911...",
  generateTopic: "AI\ub85c \ubb38\uc81c \uc0dd\uc131",
};

export function getSpeakingAiUiLabels(language: SpeakingLanguage) {
  return SPEAKING_AI_UI_LABELS[language];
}
