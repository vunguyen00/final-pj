import { normalizeLanguageCode, type UiLanguage } from "@/lib/test-language-labels";

export type CourseReportCategory =
  | "INACCURATE_CONTENT"
  | "BROKEN_RESOURCE"
  | "ACCESS_PROBLEM"
  | "INAPPROPRIATE_CONTENT"
  | "QUALITY_MISMATCH"
  | "INSTRUCTOR_PROBLEM"
  | "OTHER";

type CourseReportLabels = {
  button: string;
  title: string;
  description: string;
  close: string;
  category: string;
  relatedLesson: string;
  wholeCourse: string;
  reportTitle: string;
  details: string;
  truthfulConfirmation: string;
  submit: string;
  submitting: string;
  submitSuccess: string;
  submitFailed: string;
  categories: Record<CourseReportCategory, string>;
  acknowledgedNotificationTitle: string;
  acknowledgedNotificationBody: (courseName: string) => string;
  updatedNotificationTitle: string;
  updatedNotificationBody: (courseName: string, status: string) => string;
  responsePrefix: string;
  statuses: Record<"PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED", string>;
};

const labels: Record<UiLanguage, CourseReportLabels> = {
  vi: {
    button: "Báo cáo khóa học",
    title: "Báo cáo khóa học",
    description: "Mô tả rõ vấn đề để giảng viên và admin có thể kiểm tra.",
    close: "Đóng",
    category: "Loại vấn đề",
    relatedLesson: "Bài học liên quan (không bắt buộc)",
    wholeCourse: "Toàn bộ khóa học",
    reportTitle: "Tiêu đề",
    details: "Nội dung chi tiết",
    truthfulConfirmation: "Tôi xác nhận nội dung báo cáo là đúng sự thật.",
    submit: "Gửi báo cáo",
    submitting: "Đang gửi...",
    submitSuccess: "Báo cáo đã được gửi. Bạn sẽ nhận thông báo khi giảng viên hoặc admin tiếp nhận.",
    submitFailed: "Không thể gửi báo cáo.",
    categories: {
      INACCURATE_CONTENT: "Nội dung sai hoặc thiếu chính xác",
      BROKEN_RESOURCE: "Video hoặc tài liệu bị lỗi",
      ACCESS_PROBLEM: "Không truy cập được bài học",
      INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
      QUALITY_MISMATCH: "Chất lượng không đúng mô tả",
      INSTRUCTOR_PROBLEM: "Vấn đề với giảng viên",
      OTHER: "Vấn đề khác",
    },
    acknowledgedNotificationTitle: "Báo cáo của bạn đã được tiếp nhận",
    acknowledgedNotificationBody: (courseName) => `Giảng viên hoặc admin đã tiếp nhận báo cáo của bạn về khóa học “${courseName}” và đang kiểm tra.`,
    updatedNotificationTitle: "Báo cáo khóa học đã được cập nhật",
    updatedNotificationBody: (courseName, status) => `Báo cáo về khóa học “${courseName}” hiện ở trạng thái: ${status}.`,
    responsePrefix: "Phản hồi",
    statuses: { PENDING: "Chờ xử lý", IN_REVIEW: "Đang xem xét", RESOLVED: "Đã giải quyết", REJECTED: "Đã từ chối" },
  },
  en: {
    button: "Report course",
    title: "Report course",
    description: "Describe the issue clearly so the instructor and admin can investigate it.",
    close: "Close",
    category: "Issue type",
    relatedLesson: "Related lesson (optional)",
    wholeCourse: "Entire course",
    reportTitle: "Title",
    details: "Details",
    truthfulConfirmation: "I confirm that this report is truthful.",
    submit: "Submit report",
    submitting: "Submitting...",
    submitSuccess: "Your report has been submitted. You will be notified when an instructor or admin acknowledges it.",
    submitFailed: "Could not submit the report.",
    categories: {
      INACCURATE_CONTENT: "Inaccurate or incomplete content",
      BROKEN_RESOURCE: "Broken video or resource",
      ACCESS_PROBLEM: "Cannot access the lesson",
      INAPPROPRIATE_CONTENT: "Inappropriate content",
      QUALITY_MISMATCH: "Quality does not match the description",
      INSTRUCTOR_PROBLEM: "Instructor issue",
      OTHER: "Other issue",
    },
    acknowledgedNotificationTitle: "Your report has been acknowledged",
    acknowledgedNotificationBody: (courseName) => `An instructor or admin has acknowledged your report about “${courseName}” and is reviewing it.`,
    updatedNotificationTitle: "Course report updated",
    updatedNotificationBody: (courseName, status) => `Your report about “${courseName}” is now: ${status}.`,
    responsePrefix: "Response",
    statuses: { PENDING: "Pending", IN_REVIEW: "In review", RESOLVED: "Resolved", REJECTED: "Rejected" },
  },
  zh: {
    button: "举报课程",
    title: "举报课程",
    description: "请清楚描述问题，以便讲师和管理员进行核查。",
    close: "关闭",
    category: "问题类型",
    relatedLesson: "相关课时（可选）",
    wholeCourse: "整个课程",
    reportTitle: "标题",
    details: "详细内容",
    truthfulConfirmation: "我确认举报内容真实无误。",
    submit: "提交举报",
    submitting: "提交中...",
    submitSuccess: "举报已提交。讲师或管理员接收后，您将收到通知。",
    submitFailed: "无法提交举报。",
    categories: {
      INACCURATE_CONTENT: "内容不准确或不完整",
      BROKEN_RESOURCE: "视频或资料损坏",
      ACCESS_PROBLEM: "无法访问课时",
      INAPPROPRIATE_CONTENT: "内容不当",
      QUALITY_MISMATCH: "质量与描述不符",
      INSTRUCTOR_PROBLEM: "讲师问题",
      OTHER: "其他问题",
    },
    acknowledgedNotificationTitle: "您的举报已被接收",
    acknowledgedNotificationBody: (courseName) => `讲师或管理员已接收您对《${courseName}》的举报，正在核查。`,
    updatedNotificationTitle: "课程举报已更新",
    updatedNotificationBody: (courseName, status) => `您对《${courseName}》的举报当前状态：${status}。`,
    responsePrefix: "回复",
    statuses: { PENDING: "待处理", IN_REVIEW: "审核中", RESOLVED: "已解决", REJECTED: "已拒绝" },
  },
  ja: {
    button: "コースを報告",
    title: "コースを報告",
    description: "講師と管理者が確認できるよう、問題を具体的に記載してください。",
    close: "閉じる",
    category: "問題の種類",
    relatedLesson: "関連レッスン（任意）",
    wholeCourse: "コース全体",
    reportTitle: "タイトル",
    details: "詳細",
    truthfulConfirmation: "報告内容が事実であることを確認します。",
    submit: "報告を送信",
    submitting: "送信中...",
    submitSuccess: "報告を送信しました。講師または管理者が受領すると通知されます。",
    submitFailed: "報告を送信できませんでした。",
    categories: {
      INACCURATE_CONTENT: "不正確または不十分な内容",
      BROKEN_RESOURCE: "動画または資料の不具合",
      ACCESS_PROBLEM: "レッスンにアクセスできない",
      INAPPROPRIATE_CONTENT: "不適切な内容",
      QUALITY_MISMATCH: "説明と品質が一致しない",
      INSTRUCTOR_PROBLEM: "講師に関する問題",
      OTHER: "その他",
    },
    acknowledgedNotificationTitle: "報告が受理されました",
    acknowledgedNotificationBody: (courseName) => `「${courseName}」に関する報告を講師または管理者が受理し、確認しています。`,
    updatedNotificationTitle: "コース報告が更新されました",
    updatedNotificationBody: (courseName, status) => `「${courseName}」に関する報告の現在の状態：${status}。`,
    responsePrefix: "回答",
    statuses: { PENDING: "処理待ち", IN_REVIEW: "確認中", RESOLVED: "解決済み", REJECTED: "却下" },
  },
  ko: {
    button: "강좌 신고",
    title: "강좌 신고",
    description: "강사와 관리자가 확인할 수 있도록 문제를 구체적으로 설명해 주세요.",
    close: "닫기",
    category: "문제 유형",
    relatedLesson: "관련 수업 (선택 사항)",
    wholeCourse: "전체 강좌",
    reportTitle: "제목",
    details: "상세 내용",
    truthfulConfirmation: "신고 내용이 사실임을 확인합니다.",
    submit: "신고 제출",
    submitting: "제출 중...",
    submitSuccess: "신고가 제출되었습니다. 강사 또는 관리자가 접수하면 알림을 받게 됩니다.",
    submitFailed: "신고를 제출할 수 없습니다.",
    categories: {
      INACCURATE_CONTENT: "부정확하거나 불완전한 내용",
      BROKEN_RESOURCE: "영상 또는 자료 오류",
      ACCESS_PROBLEM: "수업에 접근할 수 없음",
      INAPPROPRIATE_CONTENT: "부적절한 내용",
      QUALITY_MISMATCH: "설명과 품질이 일치하지 않음",
      INSTRUCTOR_PROBLEM: "강사 관련 문제",
      OTHER: "기타 문제",
    },
    acknowledgedNotificationTitle: "신고가 접수되었습니다",
    acknowledgedNotificationBody: (courseName) => `“${courseName}” 강좌에 대한 신고를 강사 또는 관리자가 접수하여 검토 중입니다.`,
    updatedNotificationTitle: "강좌 신고가 업데이트되었습니다",
    updatedNotificationBody: (courseName, status) => `“${courseName}” 강좌 신고의 현재 상태: ${status}.`,
    responsePrefix: "답변",
    statuses: { PENDING: "처리 대기", IN_REVIEW: "검토 중", RESOLVED: "해결됨", REJECTED: "거부됨" },
  },
};

export function getCourseReportLabels(languageCode?: string | null) {
  return labels[normalizeLanguageCode(languageCode)];
}
