import { getContentUiLanguage } from "@/lib/language-display";
import type { UiLanguage } from "@/lib/test-language-labels";

type SpeakingRecordingLabels = {
  preparingRecording: string;
  preparingAnalyzer: string;
  preparingAnalyzerProgress: (percent: number) => string;
  analyzingAudio: string;
  analyzingFullRecording: string;
  startingMic: string;
  recordAgain: string;
  startRecording: string;
  stopAndAnalyze: string;
  recording: string;
  analyzed: string;
  ready: string;
  completedRecording: string;
  emptyRecording: string;
  noSpeech: string;
  processFailed: string;
  unsupportedBrowser: string;
  microphoneDenied: string;
  workerStartFailed: string;
  recognitionFailed: string;
};

const labels: Record<UiLanguage, SpeakingRecordingLabels> = {
  vi: {
    preparingRecording: "\u0110ang chu\u1ea9n b\u1ecb b\u1ea3n ghi \u00e2m...",
    preparingAnalyzer: "\u0110ang chu\u1ea9n b\u1ecb b\u1ed9 ph\u00e2n t\u00edch \u00e2m thanh...",
    preparingAnalyzerProgress: (percent) => `\u0110ang chu\u1ea9n b\u1ecb b\u1ed9 ph\u00e2n t\u00edch \u00e2m thanh: ${percent}%`,
    analyzingAudio: "\u0110ang ph\u00e2n t\u00edch \u00e2m thanh...",
    analyzingFullRecording: "H\u1ec7 th\u1ed1ng \u0111ang ph\u00e2n t\u00edch to\u00e0n b\u1ed9 b\u1ea3n ghi \u00e2m...",
    startingMic: "\u0110ang kh\u1edfi \u0111\u1ed9ng micro...",
    recordAgain: "Ghi \u00e2m l\u1ea1i",
    startRecording: "B\u1eaft \u0111\u1ea7u ghi \u00e2m",
    stopAndAnalyze: "D\u1eebng ghi v\u00e0 ph\u00e2n t\u00edch \u00e2m thanh",
    recording: "\u0110ang ghi \u00e2m...",
    analyzed: "\u0110\u00e3 ph\u00e2n t\u00edch xong",
    ready: "S\u1eb5n s\u00e0ng",
    completedRecording: "\u0110\u00e3 ph\u00e2n t\u00edch xong b\u1ea3n ghi \u00e2m.",
    emptyRecording: "B\u1ea3n ghi \u00e2m kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u.",
    noSpeech: "Kh\u00f4ng nh\u1eadn di\u1ec7n \u0111\u01b0\u1ee3c n\u1ed9i dung n\u00f3i. H\u00e3y th\u1eed ghi \u00e2m l\u1ea1i.",
    processFailed: "Kh\u00f4ng th\u1ec3 x\u1eed l\u00fd b\u1ea3n ghi \u00e2m.",
    unsupportedBrowser: "Tr\u00ecnh duy\u1ec7t ch\u01b0a h\u1ed7 tr\u1ee3 ghi \u00e2m. H\u00e3y d\u00f9ng Chrome, Edge ho\u1eb7c Firefox phi\u00ean b\u1ea3n m\u1edbi.",
    microphoneDenied: "Kh\u00f4ng m\u1edf \u0111\u01b0\u1ee3c micro. H\u00e3y ki\u1ec3m tra quy\u1ec1n micro c\u1ee7a tr\u00ecnh duy\u1ec7t.",
    workerStartFailed: "Kh\u00f4ng th\u1ec3 kh\u1edfi \u0111\u1ed9ng b\u1ed9 ph\u00e2n t\u00edch \u00e2m thanh tr\u00ean tr\u00ecnh duy\u1ec7t n\u00e0y.",
    recognitionFailed: "Kh\u00f4ng th\u1ec3 nh\u1eadn di\u1ec7n n\u1ed9i dung t\u1eeb b\u1ea3n ghi \u00e2m.",
  },
  en: {
    preparingRecording: "Preparing the recording...",
    preparingAnalyzer: "Preparing the audio analyzer...",
    preparingAnalyzerProgress: (percent) => `Preparing the audio analyzer: ${percent}%`,
    analyzingAudio: "Analyzing audio...",
    analyzingFullRecording: "The system is analyzing the full recording...",
    startingMic: "Starting microphone...",
    recordAgain: "Record again",
    startRecording: "Start recording",
    stopAndAnalyze: "Stop and analyze audio",
    recording: "Recording...",
    analyzed: "Analysis complete",
    ready: "Ready",
    completedRecording: "Recording analysis is complete.",
    emptyRecording: "The recording has no data.",
    noSpeech: "No speech was recognized. Please record again.",
    processFailed: "Could not process the recording.",
    unsupportedBrowser: "This browser does not support recording. Please use a recent version of Chrome, Edge, or Firefox.",
    microphoneDenied: "Could not open the microphone. Please check the browser microphone permission.",
    workerStartFailed: "Could not start the audio analyzer in this browser.",
    recognitionFailed: "Could not recognize content from the recording.",
  },
  zh: {
    preparingRecording: "\u6b63\u5728\u51c6\u5907\u5f55\u97f3...",
    preparingAnalyzer: "\u6b63\u5728\u51c6\u5907\u97f3\u9891\u5206\u6790\u5668...",
    preparingAnalyzerProgress: (percent) => `\u6b63\u5728\u51c6\u5907\u97f3\u9891\u5206\u6790\u5668\uff1a${percent}%`,
    analyzingAudio: "\u6b63\u5728\u5206\u6790\u97f3\u9891...",
    analyzingFullRecording: "\u7cfb\u7edf\u6b63\u5728\u5206\u6790\u5b8c\u6574\u5f55\u97f3...",
    startingMic: "\u6b63\u5728\u542f\u52a8\u9ea6\u514b\u98ce...",
    recordAgain: "\u91cd\u65b0\u5f55\u97f3",
    startRecording: "\u5f00\u59cb\u5f55\u97f3",
    stopAndAnalyze: "\u505c\u6b62\u5f55\u97f3\u5e76\u5206\u6790\u97f3\u9891",
    recording: "\u6b63\u5728\u5f55\u97f3...",
    analyzed: "\u5206\u6790\u5b8c\u6210",
    ready: "\u5c31\u7eea",
    completedRecording: "\u5f55\u97f3\u5206\u6790\u5df2\u5b8c\u6210\u3002",
    emptyRecording: "\u5f55\u97f3\u6ca1\u6709\u6570\u636e\u3002",
    noSpeech: "\u672a\u8bc6\u522b\u5230\u8bed\u97f3\u5185\u5bb9\u3002\u8bf7\u91cd\u65b0\u5f55\u97f3\u3002",
    processFailed: "\u65e0\u6cd5\u5904\u7406\u5f55\u97f3\u3002",
    unsupportedBrowser: "\u6b64\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u5f55\u97f3\u3002\u8bf7\u4f7f\u7528\u6700\u65b0\u7248 Chrome\u3001Edge \u6216 Firefox\u3002",
    microphoneDenied: "\u65e0\u6cd5\u6253\u5f00\u9ea6\u514b\u98ce\u3002\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u7684\u9ea6\u514b\u98ce\u6743\u9650\u3002",
    workerStartFailed: "\u65e0\u6cd5\u5728\u6b64\u6d4f\u89c8\u5668\u4e2d\u542f\u52a8\u97f3\u9891\u5206\u6790\u5668\u3002",
    recognitionFailed: "\u65e0\u6cd5\u8bc6\u522b\u5f55\u97f3\u4e2d\u7684\u5185\u5bb9\u3002",
  },
  ja: {
    preparingRecording: "\u9332\u97f3\u3092\u6e96\u5099\u3057\u3066\u3044\u307e\u3059...",
    preparingAnalyzer: "\u97f3\u58f0\u89e3\u6790\u3092\u6e96\u5099\u3057\u3066\u3044\u307e\u3059...",
    preparingAnalyzerProgress: (percent) => `\u97f3\u58f0\u89e3\u6790\u3092\u6e96\u5099\u3057\u3066\u3044\u307e\u3059\uff1a${percent}%`,
    analyzingAudio: "\u97f3\u58f0\u3092\u89e3\u6790\u3057\u3066\u3044\u307e\u3059...",
    analyzingFullRecording: "\u30b7\u30b9\u30c6\u30e0\u304c\u9332\u97f3\u5168\u4f53\u3092\u89e3\u6790\u3057\u3066\u3044\u307e\u3059...",
    startingMic: "\u30de\u30a4\u30af\u3092\u8d77\u52d5\u3057\u3066\u3044\u307e\u3059...",
    recordAgain: "\u3082\u3046\u4e00\u5ea6\u9332\u97f3",
    startRecording: "\u9332\u97f3\u3092\u958b\u59cb",
    stopAndAnalyze: "\u9332\u97f3\u3092\u505c\u6b62\u3057\u3066\u97f3\u58f0\u3092\u89e3\u6790",
    recording: "\u9332\u97f3\u4e2d...",
    analyzed: "\u89e3\u6790\u5b8c\u4e86",
    ready: "\u6e96\u5099\u5b8c\u4e86",
    completedRecording: "\u9332\u97f3\u306e\u89e3\u6790\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
    emptyRecording: "\u9332\u97f3\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
    noSpeech: "\u97f3\u58f0\u5185\u5bb9\u3092\u8a8d\u8b58\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u9332\u97f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    processFailed: "\u9332\u97f3\u3092\u51e6\u7406\u3067\u304d\u307e\u305b\u3093\u3002",
    unsupportedBrowser: "\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u306f\u9332\u97f3\u306b\u5bfe\u5fdc\u3057\u3066\u3044\u307e\u305b\u3093\u3002\u6700\u65b0\u7248\u306e Chrome\u3001Edge\u3001Firefox \u3092\u4f7f\u7528\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    microphoneDenied: "\u30de\u30a4\u30af\u3092\u958b\u3051\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u30d6\u30e9\u30a6\u30b6\u306e\u30de\u30a4\u30af\u6a29\u9650\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    workerStartFailed: "\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u3067\u97f3\u58f0\u89e3\u6790\u3092\u8d77\u52d5\u3067\u304d\u307e\u305b\u3093\u3002",
    recognitionFailed: "\u9332\u97f3\u304b\u3089\u5185\u5bb9\u3092\u8a8d\u8b58\u3067\u304d\u307e\u305b\u3093\u3002",
  },
  ko: {
    preparingRecording: "\ub179\uc74c\uc744 \uc900\ube44\ud558\ub294 \uc911...",
    preparingAnalyzer: "\uc624\ub514\uc624 \ubd84\uc11d\uae30\ub97c \uc900\ube44\ud558\ub294 \uc911...",
    preparingAnalyzerProgress: (percent) => `\uc624\ub514\uc624 \ubd84\uc11d\uae30\ub97c \uc900\ube44\ud558\ub294 \uc911: ${percent}%`,
    analyzingAudio: "\uc624\ub514\uc624\ub97c \ubd84\uc11d\ud558\ub294 \uc911...",
    analyzingFullRecording: "\uc2dc\uc2a4\ud15c\uc774 \uc804\uccb4 \ub179\uc74c\uc744 \ubd84\uc11d\ud558\ub294 \uc911...",
    startingMic: "\ub9c8\uc774\ud06c\ub97c \uc2dc\uc791\ud558\ub294 \uc911...",
    recordAgain: "\ub2e4\uc2dc \ub179\uc74c",
    startRecording: "\ub179\uc74c \uc2dc\uc791",
    stopAndAnalyze: "\ub179\uc74c \uc911\uc9c0 \ubc0f \uc624\ub514\uc624 \ubd84\uc11d",
    recording: "\ub179\uc74c \uc911...",
    analyzed: "\ubd84\uc11d \uc644\ub8cc",
    ready: "\uc900\ube44 \uc644\ub8cc",
    completedRecording: "\ub179\uc74c \ubd84\uc11d\uc774 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    emptyRecording: "\ub179\uc74c \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
    noSpeech: "\uc74c\uc131 \ub0b4\uc6a9\uc744 \uc778\uc2dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub179\uc74c\ud574 \uc8fc\uc138\uc694.",
    processFailed: "\ub179\uc74c\uc744 \ucc98\ub9ac\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    unsupportedBrowser: "\uc774 \ube0c\ub77c\uc6b0\uc800\ub294 \ub179\uc74c\uc744 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \ucd5c\uc2e0 Chrome, Edge \ub610\ub294 Firefox\ub97c \uc0ac\uc6a9\ud574 \uc8fc\uc138\uc694.",
    microphoneDenied: "\ub9c8\uc774\ud06c\ub97c \uc5f4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ube0c\ub77c\uc6b0\uc800\uc758 \ub9c8\uc774\ud06c \uad8c\ud55c\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    workerStartFailed: "\uc774 \ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c \uc624\ub514\uc624 \ubd84\uc11d\uae30\ub97c \uc2dc\uc791\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    recognitionFailed: "\ub179\uc74c\uc5d0\uc11c \ub0b4\uc6a9\uc744 \uc778\uc2dd\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  },
};

export function getSpeakingRecordingLabels(language?: string | null) {
  return labels[getContentUiLanguage(language)];
}
