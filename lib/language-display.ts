import { normalizeLanguageCode, type UiLanguage } from "@/lib/test-language-labels";

export type CanonicalCourseCategory =
  | "Speaking"
  | "Writing"
  | "Reading"
  | "Listening"
  | "Grammar"
  | "Vocabulary";

export const COURSE_CATEGORIES: CanonicalCourseCategory[] = [
  "Speaking",
  "Writing",
  "Reading",
  "Listening",
  "Grammar",
  "Vocabulary",
];

const languageAliases: Record<string, UiLanguage> = {
  english: "en",
  en: "en",
  chinese: "zh",
  mandarin: "zh",
  "中文": "zh",
  "中国語": "zh",
  "중국어": "zh",
  zh: "zh",
  cn: "zh",
  japanese: "ja",
  "日本": "ja",
  "日本語": "ja",
  "일본어": "ja",
  ja: "ja",
  jp: "ja",
  korean: "ko",
  "한국": "ko",
  "한국어": "ko",
  "韓国語": "ko",
  ko: "ko",
  kr: "ko",
  vietnamese: "vi",
  vi: "vi",
  vn: "vi",
};

export function getContentUiLanguage(value?: string | null): UiLanguage {
  const normalized = String(value || "").trim().toLowerCase();
  return languageAliases[normalized] || normalizeLanguageCode(normalized);
}

export function getLanguageDisplayLabel(value?: string | null) {
  const language = getContentUiLanguage(value);
  if (language === "en") return "Ti\u1ebfng Anh (English)";
  if (language === "zh") return "Ti\u1ebfng Trung (\u4e2d\u6587)";
  if (language === "ja") return "Ti\u1ebfng Nh\u1eadt (\u65e5\u672c\u8a9e)";
  if (language === "ko") return "Ti\u1ebfng H\u00e0n (\ud55c\uad6d\uc5b4)";
  return "Ti\u1ebfng Vi\u1ec7t";
}

export function getLanguageNativeLabel(value?: string | null) {
  const language = getContentUiLanguage(value);
  if (language === "en") return "English";
  if (language === "zh") return "\u4e2d\u6587";
  if (language === "ja") return "\u65e5\u672c\u8a9e";
  if (language === "ko") return "\ud55c\uad6d\uc5b4";
  return "Ti\u1ebfng Vi\u1ec7t";
}

const categoryLabels: Record<UiLanguage, Record<CanonicalCourseCategory, string>> = {
  en: {
    Speaking: "Speaking",
    Writing: "Writing",
    Reading: "Reading",
    Listening: "Listening",
    Grammar: "Grammar",
    Vocabulary: "Vocabulary",
  },
  zh: {
    Speaking: "\u53e3\u8bed",
    Writing: "\u5199\u4f5c",
    Reading: "\u9605\u8bfb",
    Listening: "\u542c\u529b",
    Grammar: "\u8bed\u6cd5",
    Vocabulary: "\u8bcd\u6c47",
  },
  ja: {
    Speaking: "\u4f1a\u8a71",
    Writing: "\u4f5c\u6587",
    Reading: "\u8aad\u89e3",
    Listening: "\u8074\u89e3",
    Grammar: "\u6587\u6cd5",
    Vocabulary: "\u8a9e\u5f59",
  },
  ko: {
    Speaking: "\ub9d0\ud558\uae30",
    Writing: "\uc4f0\uae30",
    Reading: "\uc77d\uae30",
    Listening: "\ub4e3\uae30",
    Grammar: "\ubb38\ubc95",
    Vocabulary: "\uc5b4\ud718",
  },
  vi: {
    Speaking: "N\u00f3i",
    Writing: "Vi\u1ebft",
    Reading: "\u0110\u1ecdc",
    Listening: "Nghe",
    Grammar: "Ng\u1eef ph\u00e1p",
    Vocabulary: "T\u1eeb v\u1ef1ng",
  },
};

export function getCourseCategoryLabel(category?: string | null, language?: string | null) {
  const canonical = COURSE_CATEGORIES.find((item) => item.toLowerCase() === String(category || "").trim().toLowerCase());
  if (!canonical) return category?.trim() || "";
  return categoryLabels[getContentUiLanguage(language)][canonical];
}

const levelLabels: Record<UiLanguage, Record<string, string>> = {
  en: {
    Beginner: "Beginner",
    Elementary: "Elementary",
    Intermediate: "Intermediate",
    "Upper Intermediate": "Upper intermediate",
    Advanced: "Advanced",
  },
  zh: {
    Beginner: "\u5165\u95e8",
    Elementary: "\u521d\u7ea7",
    Intermediate: "\u4e2d\u7ea7",
    "Upper Intermediate": "\u4e2d\u9ad8\u7ea7",
    Advanced: "\u9ad8\u7ea7",
  },
  ja: {
    Beginner: "\u521d\u5fc3\u8005",
    Elementary: "\u521d\u7d1a",
    Intermediate: "\u4e2d\u7d1a",
    "Upper Intermediate": "\u4e2d\u4e0a\u7d1a",
    Advanced: "\u4e0a\u7d1a",
  },
  ko: {
    Beginner: "\uc785\ubb38",
    Elementary: "\ucd08\uae09",
    Intermediate: "\uc911\uae09",
    "Upper Intermediate": "\uc911\uc0c1\uae09",
    Advanced: "\uace0\uae09",
  },
  vi: {
    Beginner: "M\u1edbi b\u1eaft \u0111\u1ea7u",
    Elementary: "S\u01a1 c\u1ea5p",
    Intermediate: "Trung c\u1ea5p",
    "Upper Intermediate": "Trung c\u1ea5p cao",
    Advanced: "N\u00e2ng cao",
  },
};

export function getCourseLevelLabel(level?: string | null, language?: string | null) {
  const normalized = String(level || "Beginner").trim();
  return levelLabels[getContentUiLanguage(language)][normalized] || normalized;
}

export type CourseManagementLabels = {
  backToCourses: string;
  instructor: string;
  unassigned: string;
  createdAt: string;
  students: (count: number) => string;
  modules: (count: number) => string;
  tests: (count: number) => string;
  status: Record<string, string>;
  tabs: {
    information: string;
    modules: (count: number) => string;
    tests: (count: number) => string;
  };
  modulesTab: {
    addModule: string;
    videoOptional: string;
    empty: string;
    lessonCount: (count: number) => string;
    manageLessons: string;
    edit: string;
    delete: string;
  };
  testsTab: {
    createTest: string;
    alreadyHasTest: string;
    needsModule: string;
    emptyTitle: string;
    emptyDescription: string;
    maxScore: (score: number) => string;
    passingScore: (score: number) => string;
    attempts: (count: number) => string;
    timeLimit: (minutes: number | null) => string;
    questions: (count: number) => string;
    editInfo: string;
    manageQuestions: string;
    deleting: string;
    delete: string;
  };
  moduleModal: {
    createTitle: string;
    editTitle: string;
    name: string;
    placeholder: string;
    cancel: string;
    saving: string;
    save: string;
    create: string;
  };
  testModal: {
    title: string;
    description: string;
    name: string;
    namePlaceholder: string;
    instructions: string;
    instructionsPlaceholder: string;
    target: string;
    targetCourse: string;
    targetModule: string;
    targetLesson: string;
    chooseModule: string;
    chooseLesson: string;
    fixedScore: (score: number) => string;
    passingScore: string;
    timeLimit: string;
    noLimit: string;
    minutes: string;
    unlimitedAttempts: string;
    shuffleTitle: string;
    shuffleDescription: string;
    cancel: string;
    creating: string;
    create: string;
  };
  lessonsPage: {
    backToCourse: string;
    course: string;
    addLesson: string;
    empty: string;
    hasVideo: string;
    editLesson: string;
    deleteLesson: string;
    createTitle: string;
    editTitle: string;
    title: string;
    content: string;
    video: string;
    previewVideo: string;
    removeVideo: string;
    uploadVideo: string;
    videoHint: string;
    videoLink: string;
    videoLinkPlaceholder: string;
    orUploadVideo: string;
    uploadingVideo: string;
    cancel: string;
    saving: string;
    saveChanges: string;
  };
};

const courseManagementLabels: Record<UiLanguage, CourseManagementLabels> = {
  vi: {
    backToCourses: "Quay lại danh sách khóa học",
    instructor: "Giảng viên",
    unassigned: "Chưa gán",
    createdAt: "Tạo lúc",
    students: (count) => `${count} học viên`,
    modules: (count) => `${count} chương`,
    tests: (count) => `${count} bài test`,
    status: { ACTIVE: "Hoạt động", LOCKED: "Đã khóa", PENDING_APPROVAL: "Chờ duyệt", PENDING_DELETE: "Chờ duyệt xóa", REJECTED: "Bị từ chối" },
    tabs: {
      information: "Chỉnh sửa thông tin",
      modules: (count) => `Quản lý chương (${count})`,
      tests: (count) => `Quản lý bài test (${count})`,
    },
    modulesTab: {
      addModule: "Thêm chương",
      videoOptional: "Video là nội dung tùy chọn trong từng bài học, có thể thêm hoặc để trống.",
      empty: "Chưa có chương nào",
      lessonCount: (count) => `${count} bài học`,
      manageLessons: "Quản lý",
      edit: "Chỉnh sửa",
      delete: "Xóa",
    },
    testsTab: {
      createTest: "Tạo bài test",
      alreadyHasTest: "Khóa học đã có bài test. Mỗi khóa học chỉ được có một bài test.",
      needsModule: "Khóa học phải có ít nhất một chương trước khi tạo bài test.",
      emptyTitle: "Chưa có bài test nào",
      emptyDescription: "Tạo bài kiểm tra sau khi khóa học đã có ít nhất một chương.",
      maxScore: (score) => `Điểm tối đa: ${score}`,
      passingScore: (score) => `Điểm đạt: ${score}`,
      attempts: (count) => `Lượt đã làm: ${count}`,
      timeLimit: (minutes) => `Thời gian: ${minutes ? `${minutes} phút` : "Không giới hạn"}`,
      questions: (count) => `${count} câu hỏi`,
      editInfo: "Chỉnh sửa thông tin",
      manageQuestions: "Quản lý câu hỏi",
      deleting: "Đang xóa...",
      delete: "Xóa",
    },
    moduleModal: {
      createTitle: "Tạo chương mới",
      editTitle: "Chỉnh sửa chương",
      name: "Tên chương *",
      placeholder: "Ví dụ: Chương 1 - Giới thiệu",
      cancel: "Hủy",
      saving: "Đang lưu...",
      save: "Lưu",
      create: "Tạo",
    },
    testModal: {
      title: "Tạo bài test mới",
      description: "Thiết lập nội dung, điểm đạt và thời gian hoàn thành bài.",
      name: "Tên bài test *",
      namePlaceholder: "Ví dụ: Bài kiểm tra cuối khóa",
      instructions: "Mô tả hoặc hướng dẫn làm bài",
      instructionsPlaceholder: "Nêu yêu cầu và những lưu ý dành cho học viên...",
      target: "Phạm vi bài test",
      targetCourse: "Toàn khóa học",
      targetModule: "Theo chương",
      targetLesson: "Theo bài học",
      chooseModule: "Chọn chương",
      chooseLesson: "Chọn bài học",
      fixedScore: (score) => `Điểm tối đa được cố định là ${score} điểm. Tổng điểm của tất cả câu hỏi phải bằng ${score}.`,
      passingScore: "Điểm đạt",
      timeLimit: "Giới hạn thời gian làm bài",
      noLimit: "Không giới hạn",
      minutes: "phút",
      unlimitedAttempts: "Học viên được làm bài không giới hạn số lượt. Hệ thống vẫn ghi nhận đầy đủ tổng số lượt đã làm.",
      shuffleTitle: "Xáo trộn câu hỏi",
      shuffleDescription: "Thứ tự câu hỏi có thể thay đổi khi học viên bắt đầu làm bài.",
      cancel: "Hủy",
      creating: "Đang tạo...",
      create: "Tạo bài test",
    },
    lessonsPage: {
      backToCourse: "Quay lại khóa học",
      course: "Khóa học",
      addLesson: "Thêm bài học",
      empty: "Chưa có bài học nào. Hãy thêm bài học đầu tiên!",
      hasVideo: "Có video",
      editLesson: "Chỉnh sửa bài học",
      deleteLesson: "Xóa bài học",
      createTitle: "Thêm bài học mới",
      editTitle: "Chỉnh sửa bài học",
      title: "Tiêu đề *",
      content: "Nội dung *",
      video: "Video",
      previewVideo: "Xem trước video bài học",
      removeVideo: "Xóa video",
      uploadVideo: "Tải lên video",
      videoHint: "MP4, WebM, MOV (tối đa 500MB)",
      videoLink: "Hoặc gán liên kết video",
      videoLinkPlaceholder: "https://...",
      orUploadVideo: "Tải tệp video lên",
      uploadingVideo: "Đang tải video...",
      cancel: "Hủy",
      saving: "Đang lưu...",
      saveChanges: "Lưu thay đổi",
    },
  },
  en: {
    backToCourses: "Back to course list",
    instructor: "Instructor",
    unassigned: "Unassigned",
    createdAt: "Created at",
    students: (count) => `${count} students`,
    modules: (count) => `${count} modules`,
    tests: (count) => `${count} tests`,
    status: { ACTIVE: "Active", LOCKED: "Locked", PENDING_APPROVAL: "Pending approval", PENDING_DELETE: "Pending deletion", REJECTED: "Rejected" },
    tabs: {
      information: "Edit information",
      modules: (count) => `Manage modules (${count})`,
      tests: (count) => `Manage tests (${count})`,
    },
    modulesTab: {
      addModule: "Add module",
      videoOptional: "Video is optional for each lesson. You can add it or leave it blank.",
      empty: "No modules yet",
      lessonCount: (count) => `${count} lessons`,
      manageLessons: "Manage",
      edit: "Edit",
      delete: "Delete",
    },
    testsTab: {
      createTest: "Create test",
      alreadyHasTest: "This course already has a test. Each course can only have one test.",
      needsModule: "This course needs at least one module before you create a test.",
      emptyTitle: "No tests yet",
      emptyDescription: "Create a test after the course has at least one module.",
      maxScore: (score) => `Max score: ${score}`,
      passingScore: (score) => `Passing score: ${score}`,
      attempts: (count) => `Attempts: ${count}`,
      timeLimit: (minutes) => `Time: ${minutes ? `${minutes} minutes` : "No limit"}`,
      questions: (count) => `${count} questions`,
      editInfo: "Edit information",
      manageQuestions: "Manage questions",
      deleting: "Deleting...",
      delete: "Delete",
    },
    moduleModal: {
      createTitle: "Create module",
      editTitle: "Edit module",
      name: "Module name *",
      placeholder: "Example: Module 1 - Introduction",
      cancel: "Cancel",
      saving: "Saving...",
      save: "Save",
      create: "Create",
    },
    testModal: {
      title: "Create a new test",
      description: "Set up the content, passing score, and completion time.",
      name: "Test name *",
      namePlaceholder: "Example: Final course test",
      instructions: "Description or instructions",
      instructionsPlaceholder: "Add requirements and notes for students...",
      target: "Test scope",
      targetCourse: "Whole course",
      targetModule: "A chapter",
      targetLesson: "A lesson",
      chooseModule: "Choose a chapter",
      chooseLesson: "Choose a lesson",
      fixedScore: (score) => `The maximum score is fixed at ${score} points. The total score of all questions must equal ${score}.`,
      passingScore: "Passing score",
      timeLimit: "Time limit",
      noLimit: "No limit",
      minutes: "minutes",
      unlimitedAttempts: "Students can take the test an unlimited number of times. The system still records all attempts.",
      shuffleTitle: "Shuffle questions",
      shuffleDescription: "Question order may change when students start the test.",
      cancel: "Cancel",
      creating: "Creating...",
      create: "Create test",
    },
    lessonsPage: {
      backToCourse: "Back to course",
      course: "Course",
      addLesson: "Add lesson",
      empty: "No lessons yet. Add the first lesson.",
      hasVideo: "Has video",
      editLesson: "Edit lesson",
      deleteLesson: "Delete lesson",
      createTitle: "Add new lesson",
      editTitle: "Edit lesson",
      title: "Title *",
      content: "Content *",
      video: "Video",
      previewVideo: "Preview lesson video",
      removeVideo: "Remove video",
      uploadVideo: "Upload video",
      videoHint: "MP4, WebM, MOV (max 500MB)",
      videoLink: "Or assign a video link",
      videoLinkPlaceholder: "https://...",
      orUploadVideo: "Upload a video file",
      uploadingVideo: "Uploading video...",
      cancel: "Cancel",
      saving: "Saving...",
      saveChanges: "Save changes",
    },
  },
  zh: {} as CourseManagementLabels,
  ja: {} as CourseManagementLabels,
  ko: {} as CourseManagementLabels,
};

courseManagementLabels.zh = {
  ...courseManagementLabels.en,
  backToCourses: "\u8fd4\u56de\u8bfe\u7a0b\u5217\u8868",
  instructor: "\u8bb2\u5e08",
  unassigned: "\u672a\u5206\u914d",
  createdAt: "\u521b\u5efa\u65f6\u95f4",
  students: (count) => `${count}\u540d\u5b66\u5458`,
  modules: (count) => `${count}\u4e2a\u7ae0\u8282`,
  tests: (count) => `${count}\u4e2a\u6d4b\u8bd5`,
  status: { ACTIVE: "\u542f\u7528", LOCKED: "\u5df2\u9501\u5b9a", PENDING_APPROVAL: "\u5f85\u5ba1\u6838", PENDING_DELETE: "\u5f85\u5220\u9664\u5ba1\u6838", REJECTED: "\u5df2\u62d2\u7edd" },
  tabs: { information: "\u7f16\u8f91\u4fe1\u606f", modules: (count) => `\u7ba1\u7406\u7ae0\u8282 (${count})`, tests: (count) => `\u7ba1\u7406\u6d4b\u8bd5 (${count})` },
  modulesTab: { ...courseManagementLabels.en.modulesTab, addModule: "\u6dfb\u52a0\u7ae0\u8282", videoOptional: "\u89c6\u9891\u662f\u6bcf\u8282\u8bfe\u7684\u53ef\u9009\u5185\u5bb9\uff0c\u53ef\u4ee5\u6dfb\u52a0\u6216\u7559\u7a7a\u3002", empty: "\u6682\u65e0\u7ae0\u8282", lessonCount: (count) => `${count}\u8282\u8bfe`, manageLessons: "\u7ba1\u7406", edit: "\u7f16\u8f91", delete: "\u5220\u9664" },
  testsTab: { ...courseManagementLabels.en.testsTab, createTest: "\u521b\u5efa\u6d4b\u8bd5", alreadyHasTest: "\u8be5\u8bfe\u7a0b\u5df2\u6709\u6d4b\u8bd5\u3002\u6bcf\u95e8\u8bfe\u7a0b\u53ea\u80fd\u6709\u4e00\u4e2a\u6d4b\u8bd5\u3002", needsModule: "\u521b\u5efa\u6d4b\u8bd5\u524d\uff0c\u8bfe\u7a0b\u81f3\u5c11\u9700\u8981\u4e00\u4e2a\u7ae0\u8282\u3002", emptyTitle: "\u6682\u65e0\u6d4b\u8bd5", emptyDescription: "\u8bfe\u7a0b\u81f3\u5c11\u6709\u4e00\u4e2a\u7ae0\u8282\u540e\u53ef\u521b\u5efa\u6d4b\u8bd5\u3002", maxScore: (score) => `\u6700\u9ad8\u5206\uff1a${score}`, passingScore: (score) => `\u901a\u8fc7\u5206\uff1a${score}`, attempts: (count) => `\u5df2\u4f5c\u7b54\uff1a${count}`, timeLimit: (minutes) => `\u65f6\u95f4\uff1a${minutes ? `${minutes}\u5206\u949f` : "\u4e0d\u9650\u65f6"}`, questions: (count) => `${count}\u9898`, editInfo: "\u7f16\u8f91\u4fe1\u606f", manageQuestions: "\u7ba1\u7406\u9898\u76ee", deleting: "\u5220\u9664\u4e2d...", delete: "\u5220\u9664" },
  moduleModal: { ...courseManagementLabels.en.moduleModal, createTitle: "\u521b\u5efa\u7ae0\u8282", editTitle: "\u7f16\u8f91\u7ae0\u8282", name: "\u7ae0\u8282\u540d\u79f0 *", placeholder: "\u4f8b\u5982\uff1a\u7b2c1\u7ae0 - \u4ecb\u7ecd", cancel: "\u53d6\u6d88", saving: "\u4fdd\u5b58\u4e2d...", save: "\u4fdd\u5b58", create: "\u521b\u5efa" },
  testModal: { ...courseManagementLabels.en.testModal, title: "\u521b\u5efa\u65b0\u6d4b\u8bd5", description: "\u8bbe\u7f6e\u5185\u5bb9\u3001\u901a\u8fc7\u5206\u548c\u5b8c\u6210\u65f6\u95f4\u3002", name: "\u6d4b\u8bd5\u540d\u79f0 *", namePlaceholder: "\u4f8b\u5982\uff1a\u8bfe\u7a0b\u671f\u672b\u6d4b\u8bd5", instructions: "\u63cf\u8ff0\u6216\u4f5c\u7b54\u8bf4\u660e", instructionsPlaceholder: "\u6dfb\u52a0\u5bf9\u5b66\u5458\u7684\u8981\u6c42\u548c\u6ce8\u610f\u4e8b\u9879...", fixedScore: (score) => `\u6700\u9ad8\u5206\u56fa\u5b9a\u4e3a ${score} \u5206\u3002\u6240\u6709\u9898\u76ee\u603b\u5206\u5fc5\u987b\u7b49\u4e8e ${score}\u3002`, passingScore: "\u901a\u8fc7\u5206", timeLimit: "\u65f6\u95f4\u9650\u5236", noLimit: "\u4e0d\u9650\u65f6", minutes: "\u5206\u949f", unlimitedAttempts: "\u5b66\u5458\u53ef\u4ee5\u4e0d\u9650\u6b21\u4f5c\u7b54\u3002\u7cfb\u7edf\u4ecd\u4f1a\u8bb0\u5f55\u6240\u6709\u6b21\u6570\u3002", shuffleTitle: "\u968f\u673a\u9898\u76ee\u987a\u5e8f", shuffleDescription: "\u5b66\u5458\u5f00\u59cb\u4f5c\u7b54\u65f6\uff0c\u9898\u76ee\u987a\u5e8f\u53ef\u80fd\u4f1a\u53d8\u5316\u3002", cancel: "\u53d6\u6d88", creating: "\u521b\u5efa\u4e2d...", create: "\u521b\u5efa\u6d4b\u8bd5" },
  lessonsPage: { ...courseManagementLabels.en.lessonsPage, backToCourse: "\u8fd4\u56de\u8bfe\u7a0b", course: "\u8bfe\u7a0b", addLesson: "\u6dfb\u52a0\u8bfe\u65f6", empty: "\u6682\u65e0\u8bfe\u65f6\u3002\u8bf7\u6dfb\u52a0\u7b2c\u4e00\u8282\u8bfe\u3002", hasVideo: "\u6709\u89c6\u9891", editLesson: "\u7f16\u8f91\u8bfe\u65f6", deleteLesson: "\u5220\u9664\u8bfe\u65f6", createTitle: "\u6dfb\u52a0\u65b0\u8bfe\u65f6", editTitle: "\u7f16\u8f91\u8bfe\u65f6", title: "\u6807\u9898 *", content: "\u5185\u5bb9 *", video: "\u89c6\u9891", previewVideo: "\u9884\u89c8\u8bfe\u65f6\u89c6\u9891", removeVideo: "\u5220\u9664\u89c6\u9891", uploadVideo: "\u4e0a\u4f20\u89c6\u9891", videoHint: "MP4\u3001WebM\u3001MOV\uff08\u6700\u591a500MB\uff09", uploadingVideo: "\u89c6\u9891\u4e0a\u4f20\u4e2d...", cancel: "\u53d6\u6d88", saving: "\u4fdd\u5b58\u4e2d...", saveChanges: "\u4fdd\u5b58\u66f4\u6539" },
};

courseManagementLabels.ja = {
  ...courseManagementLabels.zh,
  backToCourses: "\u30b3\u30fc\u30b9\u4e00\u89a7\u306b\u623b\u308b",
  instructor: "\u8b1b\u5e2b",
  unassigned: "\u672a\u8a2d\u5b9a",
  createdAt: "\u4f5c\u6210\u65e5\u6642",
  students: (count) => `${count}\u4eba\u306e\u5b66\u7fd2\u8005`,
  modules: (count) => `${count}\u7ae0`,
  tests: (count) => `${count}\u4ef6\u306e\u30c6\u30b9\u30c8`,
  status: { ACTIVE: "\u6709\u52b9", LOCKED: "\u30ed\u30c3\u30af\u4e2d", PENDING_APPROVAL: "\u627f\u8a8d\u5f85\u3061", PENDING_DELETE: "\u524a\u9664\u627f\u8a8d\u5f85\u3061", REJECTED: "\u5374\u4e0b" },
  tabs: { information: "\u60c5\u5831\u3092\u7de8\u96c6", modules: (count) => `\u7ae0\u3092\u7ba1\u7406 (${count})`, tests: (count) => `\u30c6\u30b9\u30c8\u3092\u7ba1\u7406 (${count})` },
  modulesTab: {
    ...courseManagementLabels.en.modulesTab,
    addModule: "\u7ae0\u3092\u8ffd\u52a0",
    videoOptional: "\u52d5\u753b\u306f\u5404\u30ec\u30c3\u30b9\u30f3\u306e\u4efb\u610f\u9805\u76ee\u3067\u3059\u3002\u8ffd\u52a0\u3057\u3066\u3082\u7a7a\u6b04\u306b\u3057\u3066\u3082\u69cb\u3044\u307e\u305b\u3093\u3002",
    empty: "\u307e\u3060\u7ae0\u304c\u3042\u308a\u307e\u305b\u3093",
    lessonCount: (count) => `${count}\u4ef6\u306e\u30ec\u30c3\u30b9\u30f3`,
    manageLessons: "\u7ba1\u7406",
    edit: "\u7de8\u96c6",
    delete: "\u524a\u9664",
  },
  testsTab: {
    ...courseManagementLabels.en.testsTab,
    createTest: "\u30c6\u30b9\u30c8\u3092\u4f5c\u6210",
    alreadyHasTest: "\u3053\u306e\u30b3\u30fc\u30b9\u306b\u306f\u3059\u3067\u306b\u30c6\u30b9\u30c8\u304c\u3042\u308a\u307e\u3059\u3002\u5404\u30b3\u30fc\u30b9\u306b\u4f5c\u6210\u3067\u304d\u308b\u30c6\u30b9\u30c8\u306f1\u3064\u3060\u3051\u3067\u3059\u3002",
    needsModule: "\u30c6\u30b9\u30c8\u3092\u4f5c\u6210\u3059\u308b\u524d\u306b\u3001\u5c11\u306a\u304f\u3068\u30821\u3064\u306e\u7ae0\u304c\u5fc5\u8981\u3067\u3059\u3002",
    emptyTitle: "\u307e\u3060\u30c6\u30b9\u30c8\u304c\u3042\u308a\u307e\u305b\u3093",
    emptyDescription: "\u30b3\u30fc\u30b9\u306b\u5c11\u306a\u304f\u3068\u30821\u3064\u306e\u7ae0\u304c\u3067\u304d\u305f\u3089\u30c6\u30b9\u30c8\u3092\u4f5c\u6210\u3067\u304d\u307e\u3059\u3002",
    maxScore: (score) => `\u6700\u9ad8\u70b9\uff1a${score}`,
    passingScore: (score) => `\u5408\u683c\u70b9\uff1a${score}`,
    attempts: (count) => `\u53d7\u9a13\u56de\u6570\uff1a${count}`,
    timeLimit: (minutes) => `\u6642\u9593\uff1a${minutes ? `${minutes}\u5206` : "\u5236\u9650\u306a\u3057"}`,
    questions: (count) => `${count}\u554f`,
    editInfo: "\u60c5\u5831\u3092\u7de8\u96c6",
    manageQuestions: "\u554f\u984c\u3092\u7ba1\u7406",
    deleting: "\u524a\u9664\u4e2d...",
    delete: "\u524a\u9664",
  },
  moduleModal: { ...courseManagementLabels.en.moduleModal, createTitle: "\u7ae0\u3092\u4f5c\u6210", editTitle: "\u7ae0\u3092\u7de8\u96c6", name: "\u7ae0\u540d *", placeholder: "\u4f8b\uff1a\u7b2c1\u7ae0 - \u5c0e\u5165", cancel: "\u30ad\u30e3\u30f3\u30bb\u30eb", saving: "\u4fdd\u5b58\u4e2d...", save: "\u4fdd\u5b58", create: "\u4f5c\u6210" },
  testModal: { ...courseManagementLabels.en.testModal, title: "\u65b0\u3057\u3044\u30c6\u30b9\u30c8\u3092\u4f5c\u6210", description: "\u5185\u5bb9\u3001\u5408\u683c\u70b9\u3001\u5b8c\u4e86\u6642\u9593\u3092\u8a2d\u5b9a\u3057\u307e\u3059\u3002", name: "\u30c6\u30b9\u30c8\u540d *", namePlaceholder: "\u4f8b\uff1a\u30b3\u30fc\u30b9\u6700\u7d42\u30c6\u30b9\u30c8", instructions: "\u8aac\u660e\u307e\u305f\u306f\u53d7\u9a13\u6307\u793a", instructionsPlaceholder: "\u5b66\u7fd2\u8005\u3078\u306e\u8981\u4ef6\u3084\u6ce8\u610f\u70b9\u3092\u5165\u529b...", fixedScore: (score) => `\u6700\u9ad8\u70b9\u306f ${score} \u70b9\u306b\u56fa\u5b9a\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u3059\u3079\u3066\u306e\u554f\u984c\u306e\u5408\u8a08\u70b9\u306f ${score} \u306b\u3059\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002`, passingScore: "\u5408\u683c\u70b9", timeLimit: "\u5236\u9650\u6642\u9593", noLimit: "\u5236\u9650\u306a\u3057", minutes: "\u5206", unlimitedAttempts: "\u5b66\u7fd2\u8005\u306f\u4f55\u5ea6\u3067\u3082\u30c6\u30b9\u30c8\u3092\u53d7\u3051\u3089\u308c\u307e\u3059\u3002\u30b7\u30b9\u30c6\u30e0\u306f\u3059\u3079\u3066\u306e\u53d7\u9a13\u8a18\u9332\u3092\u4fdd\u5b58\u3057\u307e\u3059\u3002", shuffleTitle: "\u554f\u984c\u3092\u30b7\u30e3\u30c3\u30d5\u30eb", shuffleDescription: "\u5b66\u7fd2\u8005\u304c\u30c6\u30b9\u30c8\u3092\u958b\u59cb\u3059\u308b\u3068\u3001\u554f\u984c\u306e\u9806\u756a\u304c\u5909\u308f\u308b\u3053\u3068\u304c\u3042\u308a\u307e\u3059\u3002", cancel: "\u30ad\u30e3\u30f3\u30bb\u30eb", creating: "\u4f5c\u6210\u4e2d...", create: "\u30c6\u30b9\u30c8\u3092\u4f5c\u6210" },
  lessonsPage: { ...courseManagementLabels.en.lessonsPage, backToCourse: "\u30b3\u30fc\u30b9\u306b\u623b\u308b", course: "\u30b3\u30fc\u30b9", addLesson: "\u30ec\u30c3\u30b9\u30f3\u3092\u8ffd\u52a0", empty: "\u307e\u3060\u30ec\u30c3\u30b9\u30f3\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u6700\u521d\u306e\u30ec\u30c3\u30b9\u30f3\u3092\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002", hasVideo: "\u52d5\u753b\u3042\u308a", editLesson: "\u30ec\u30c3\u30b9\u30f3\u3092\u7de8\u96c6", deleteLesson: "\u30ec\u30c3\u30b9\u30f3\u3092\u524a\u9664", createTitle: "\u65b0\u3057\u3044\u30ec\u30c3\u30b9\u30f3\u3092\u8ffd\u52a0", editTitle: "\u30ec\u30c3\u30b9\u30f3\u3092\u7de8\u96c6", title: "\u30bf\u30a4\u30c8\u30eb *", content: "\u5185\u5bb9 *", video: "\u52d5\u753b", previewVideo: "\u30ec\u30c3\u30b9\u30f3\u52d5\u753b\u3092\u30d7\u30ec\u30d3\u30e5\u30fc", removeVideo: "\u52d5\u753b\u3092\u524a\u9664", uploadVideo: "\u52d5\u753b\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9", videoHint: "MP4\u3001WebM\u3001MOV\uff08\u6700\u5927500MB\uff09", uploadingVideo: "\u52d5\u753b\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d...", cancel: "\u30ad\u30e3\u30f3\u30bb\u30eb", saving: "\u4fdd\u5b58\u4e2d...", saveChanges: "\u5909\u66f4\u3092\u4fdd\u5b58" },
};

courseManagementLabels.ko = {
  ...courseManagementLabels.en,
  backToCourses: "\ucf54\uc2a4 \ubaa9\ub85d\uc73c\ub85c \ub3cc\uc544\uac00\uae30",
  instructor: "\uac15\uc0ac",
  unassigned: "\ubbf8\uc9c0\uc815",
  createdAt: "\uc0dd\uc131 \uc2dc\uac01",
  students: (count) => `${count}\uba85 \uc218\uac15\uc0dd`,
  modules: (count) => `${count}\uac1c \ucc55\ud130`,
  tests: (count) => `${count}\uac1c \ud14c\uc2a4\ud2b8`,
  status: { ACTIVE: "\ud65c\uc131", LOCKED: "\uc7a0\uae40", PENDING_APPROVAL: "\uc2b9\uc778 \ub300\uae30", PENDING_DELETE: "\uc0ad\uc81c \uc2b9\uc778 \ub300\uae30", REJECTED: "\uac70\uc808\ub428" },
  tabs: { information: "\uc815\ubcf4 \uc218\uc815", modules: (count) => `\ucc55\ud130 \uad00\ub9ac (${count})`, tests: (count) => `\ud14c\uc2a4\ud2b8 \uad00\ub9ac (${count})` },
  modulesTab: { ...courseManagementLabels.en.modulesTab, addModule: "\ucc55\ud130 \ucd94\uac00", videoOptional: "\ube44\ub514\uc624\ub294 \uac01 \ub808\uc2a8\uc758 \uc120\ud0dd \ud56d\ubaa9\uc774\uba70 \ucd94\uac00\ud558\uac70\ub098 \ube44\uc6cc\ub458 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", empty: "\uc544\uc9c1 \ucc55\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4", lessonCount: (count) => `${count}\uac1c \ub808\uc2a8`, manageLessons: "\uad00\ub9ac", edit: "\uc218\uc815", delete: "\uc0ad\uc81c" },
  testsTab: { ...courseManagementLabels.en.testsTab, createTest: "\ud14c\uc2a4\ud2b8 \uc0dd\uc131", alreadyHasTest: "\uc774 \ucf54\uc2a4\uc5d0\ub294 \uc774\ubbf8 \ud14c\uc2a4\ud2b8\uac00 \uc788\uc2b5\ub2c8\ub2e4. \uac01 \ucf54\uc2a4\ub294 \ud14c\uc2a4\ud2b8\ub97c \ud558\ub098\ub9cc \uac00\uc9c8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", needsModule: "\ud14c\uc2a4\ud2b8\ub97c \uc0dd\uc131\ud558\uae30 \uc804\uc5d0 \ucd5c\uc18c \ud558\ub098\uc758 \ucc55\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.", emptyTitle: "\uc544\uc9c1 \ud14c\uc2a4\ud2b8\uac00 \uc5c6\uc2b5\ub2c8\ub2e4", emptyDescription: "\ucf54\uc2a4\uc5d0 \ucd5c\uc18c \ud558\ub098\uc758 \ucc55\ud130\uac00 \uc788\uc744 \ub54c \ud14c\uc2a4\ud2b8\ub97c \uc0dd\uc131\ud558\uc138\uc694.", maxScore: (score) => `\ucd5c\ub300 \uc810\uc218: ${score}`, passingScore: (score) => `\ud569\uaca9 \uc810\uc218: ${score}`, attempts: (count) => `\uc751\uc2dc \ud69f\uc218: ${count}`, timeLimit: (minutes) => `\uc2dc\uac04: ${minutes ? `${minutes}\ubd84` : "\uc81c\ud55c \uc5c6\uc74c"}`, questions: (count) => `${count}\ubb38\ud56d`, editInfo: "\uc815\ubcf4 \uc218\uc815", manageQuestions: "\ubb38\ud56d \uad00\ub9ac", deleting: "\uc0ad\uc81c \uc911...", delete: "\uc0ad\uc81c" },
  moduleModal: { ...courseManagementLabels.en.moduleModal, createTitle: "\ucc55\ud130 \uc0dd\uc131", editTitle: "\ucc55\ud130 \uc218\uc815", name: "\ucc55\ud130 \uc774\ub984 *", placeholder: "\uc608: 1\uc7a5 - \uc18c\uac1c", cancel: "\ucde8\uc18c", saving: "\uc800\uc7a5 \uc911...", save: "\uc800\uc7a5", create: "\uc0dd\uc131" },
  testModal: { ...courseManagementLabels.en.testModal, title: "\uc0c8 \ud14c\uc2a4\ud2b8 \uc0dd\uc131", description: "\ub0b4\uc6a9, \ud569\uaca9 \uc810\uc218, \uc644\ub8cc \uc2dc\uac04\uc744 \uc124\uc815\ud558\uc138\uc694.", name: "\ud14c\uc2a4\ud2b8 \uc774\ub984 *", namePlaceholder: "\uc608: \ucf54\uc2a4 \uae30\ub9d0 \ud14c\uc2a4\ud2b8", instructions: "\uc124\uba85 \ub610\ub294 \uc751\uc2dc \uc548\ub0b4", instructionsPlaceholder: "\uc218\uac15\uc0dd\uc744 \uc704\ud55c \uc694\uad6c\uc0ac\ud56d\uacfc \uc720\uc758\uc0ac\ud56d\uc744 \uc785\ub825\ud558\uc138\uc694...", fixedScore: (score) => `\ucd5c\ub300 \uc810\uc218\ub294 ${score}\uc810\uc73c\ub85c \uace0\uc815\ub429\ub2c8\ub2e4. \ubaa8\ub4e0 \ubb38\ud56d\uc758 \ucd1d\uc810\uc740 ${score}\uc810\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4.`, passingScore: "\ud569\uaca9 \uc810\uc218", timeLimit: "\uc751\uc2dc \uc2dc\uac04 \uc81c\ud55c", noLimit: "\uc81c\ud55c \uc5c6\uc74c", minutes: "\ubd84", unlimitedAttempts: "\uc218\uac15\uc0dd\uc740 \uc81c\ud55c \uc5c6\uc774 \ud14c\uc2a4\ud2b8\ub97c \uc751\uc2dc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \uc2dc\uc2a4\ud15c\uc740 \ubaa8\ub4e0 \uc751\uc2dc \uae30\ub85d\uc744 \uc800\uc7a5\ud569\ub2c8\ub2e4.", shuffleTitle: "\ubb38\ud56d \uc21c\uc11c \uc11e\uae30", shuffleDescription: "\uc218\uac15\uc0dd\uc774 \ud14c\uc2a4\ud2b8\ub97c \uc2dc\uc791\ud560 \ub54c \ubb38\ud56d \uc21c\uc11c\uac00 \ubc14\ub010 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", cancel: "\ucde8\uc18c", creating: "\uc0dd\uc131 \uc911...", create: "\ud14c\uc2a4\ud2b8 \uc0dd\uc131" },
  lessonsPage: { ...courseManagementLabels.en.lessonsPage, backToCourse: "\ucf54\uc2a4\ub85c \ub3cc\uc544\uac00\uae30", course: "\ucf54\uc2a4", addLesson: "\ub808\uc2a8 \ucd94\uac00", empty: "\uc544\uc9c1 \ub808\uc2a8\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uccab \ub808\uc2a8\uc744 \ucd94\uac00\ud558\uc138\uc694.", hasVideo: "\ube44\ub514\uc624 \uc788\uc74c", editLesson: "\ub808\uc2a8 \uc218\uc815", deleteLesson: "\ub808\uc2a8 \uc0ad\uc81c", createTitle: "\uc0c8 \ub808\uc2a8 \ucd94\uac00", editTitle: "\ub808\uc2a8 \uc218\uc815", title: "\uc81c\ubaa9 *", content: "\ub0b4\uc6a9 *", video: "\ube44\ub514\uc624", previewVideo: "\ub808\uc2a8 \ube44\ub514\uc624 \ubbf8\ub9ac\ubcf4\uae30", removeVideo: "\ube44\ub514\uc624 \uc0ad\uc81c", uploadVideo: "\ube44\ub514\uc624 \uc5c5\ub85c\ub4dc", videoHint: "MP4, WebM, MOV (\ucd5c\ub300 500MB)", uploadingVideo: "\ube44\ub514\uc624 \uc5c5\ub85c\ub4dc \uc911...", cancel: "\ucde8\uc18c", saving: "\uc800\uc7a5 \uc911...", saveChanges: "\ubcc0\uacbd\uc0ac\ud56d \uc800\uc7a5" },
};

export function getCourseManagementLabels(language?: string | null) {
  return courseManagementLabels[getContentUiLanguage(language)];
}

export type CourseLearningLabels = {
  player: string;
  description: string;
  vocabularyDashboard: string;
  tableOfContents: string;
  progress: (percent: number) => string;
  module: (index: number) => string;
  completed: string;
  notCompleted: string;
  completedLesson: string;
  saving: string;
  noLessons: string;
  videoRequirement: string;
  readingRequirement: string;
  startingTimer: string;
  remaining: (time: string) => string;
  allDone: string;
  takeTest: string;
  locked: string;
  moduleTestRequired: string;
  courseComplete: string;
};

const courseLearningLabels: Record<UiLanguage, CourseLearningLabels> = {
  vi: {
    player: "Trình học khóa học",
    description: "Mục lục ở bên trái, nội dung bài học và media ở bên phải.",
    vocabularyDashboard: "Bảng từ vựng",
    tableOfContents: "Mục lục bài học",
    progress: (percent) => `Tiến độ: ${percent}%`,
    module: (index) => `Chương ${index}`,
    completed: "Đã hoàn thành",
    notCompleted: "Chưa hoàn thành",
    completedLesson: "Đã hoàn thành bài học này",
    saving: "Đang lưu...",
    noLessons: "Khóa học chưa có bài học.",
    videoRequirement: "Yêu cầu: xem hết video. Thanh tua sẽ bị khóa trong quá trình học.",
    readingRequirement: "Bài không có video: cần học tối thiểu 3 phút.",
    startingTimer: "Đang bắt đầu tính giờ...",
    remaining: (time) => `Còn lại: ${time}`,
    allDone: "Bạn đã hoàn thành 100% nội dung. Tiếp theo: làm bài test.",
    takeTest: "Làm bài test",
    locked: "Chưa mở khóa",
    moduleTestRequired: "Bạn đã học xong module này. Hãy đạt bài kiểm tra để mở module tiếp theo.",
    courseComplete: "Bạn đã hoàn thành toàn bộ lộ trình khóa học.",
  },
  en: {
    player: "Course player",
    description: "Modules are on the left, lesson content and media are on the right.",
    vocabularyDashboard: "Vocabulary dashboard",
    tableOfContents: "Lesson contents",
    progress: (percent) => `Progress: ${percent}%`,
    module: (index) => `Module ${index}`,
    completed: "Completed",
    notCompleted: "Not completed",
    completedLesson: "This lesson is completed",
    saving: "Saving...",
    noLessons: "This course has no lessons yet.",
    videoRequirement: "Requirement: watch the full video. Seeking is locked while learning.",
    readingRequirement: "No video in this lesson: study for at least 3 minutes.",
    startingTimer: "Starting the timer...",
    remaining: (time) => `Remaining: ${time}`,
    allDone: "You have completed 100% of the content. Next: take the test.",
    takeTest: "Take test",
    locked: "Locked",
    moduleTestRequired: "You finished this module. Pass its test to unlock the next module.",
    courseComplete: "You have completed the full course path.",
  },
  zh: {
    player: "\u8bfe\u7a0b\u64ad\u653e\u5668",
    description: "\u7ae0\u8282\u5728\u5de6\u4fa7\uff0c\u8bfe\u65f6\u5185\u5bb9\u548c\u5a92\u4f53\u5728\u53f3\u4fa7\u3002",
    vocabularyDashboard: "\u8bcd\u6c47\u9762\u677f",
    tableOfContents: "\u8bfe\u65f6\u76ee\u5f55",
    progress: (percent) => `\u8fdb\u5ea6\uff1a${percent}%`,
    module: (index) => `\u7b2c${index}\u7ae0`,
    completed: "\u5df2\u5b8c\u6210",
    notCompleted: "\u672a\u5b8c\u6210",
    completedLesson: "\u672c\u8bfe\u65f6\u5df2\u5b8c\u6210",
    saving: "\u4fdd\u5b58\u4e2d...",
    noLessons: "\u8be5\u8bfe\u7a0b\u6682\u65e0\u8bfe\u65f6\u3002",
    videoRequirement: "\u8981\u6c42\uff1a\u770b\u5b8c\u6574\u4e2a\u89c6\u9891\u3002\u5b66\u4e60\u8fc7\u7a0b\u4e2d\u65e0\u6cd5\u5feb\u8fdb\u3002",
    readingRequirement: "\u672c\u8bfe\u65f6\u6ca1\u6709\u89c6\u9891\uff1a\u9700\u81f3\u5c11\u5b66\u4e603\u5206\u949f\u3002",
    startingTimer: "\u6b63\u5728\u5f00\u59cb\u8ba1\u65f6...",
    remaining: (time) => `\u5269\u4f59\uff1a${time}`,
    allDone: "\u4f60\u5df2\u5b8c\u6210100%\u7684\u5185\u5bb9\u3002\u4e0b\u4e00\u6b65\uff1a\u53c2\u52a0\u6d4b\u8bd5\u3002",
    takeTest: "\u53c2\u52a0\u6d4b\u8bd5",
    locked: "\u5c1a\u672a\u89e3\u9501",
    moduleTestRequired: "\u4f60\u5df2\u5b8c\u6210\u672c\u7ae0\u3002\u901a\u8fc7\u6d4b\u8bd5\u540e\u5373\u53ef\u89e3\u9501\u4e0b\u4e00\u7ae0\u3002",
    courseComplete: "\u4f60\u5df2\u5b8c\u6210\u6574\u4e2a\u8bfe\u7a0b\u8def\u5f84\u3002",
  },
  ja: {
    player: "\u30b3\u30fc\u30b9\u30d7\u30ec\u30fc\u30e4\u30fc",
    description: "\u5de6\u306b\u7ae0\u4e00\u89a7\u3001\u53f3\u306b\u30ec\u30c3\u30b9\u30f3\u5185\u5bb9\u3068\u30e1\u30c7\u30a3\u30a2\u304c\u8868\u793a\u3055\u308c\u307e\u3059\u3002",
    vocabularyDashboard: "\u8a9e\u5f59\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9",
    tableOfContents: "\u30ec\u30c3\u30b9\u30f3\u76ee\u6b21",
    progress: (percent) => `\u9032\u6357\uff1a${percent}%`,
    module: (index) => `\u7b2c${index}\u7ae0`,
    completed: "\u5b8c\u4e86",
    notCompleted: "\u672a\u5b8c\u4e86",
    completedLesson: "\u3053\u306e\u30ec\u30c3\u30b9\u30f3\u306f\u5b8c\u4e86\u3057\u3066\u3044\u307e\u3059",
    saving: "\u4fdd\u5b58\u4e2d...",
    noLessons: "\u3053\u306e\u30b3\u30fc\u30b9\u306b\u306f\u307e\u3060\u30ec\u30c3\u30b9\u30f3\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
    videoRequirement: "\u6761\u4ef6\uff1a\u52d5\u753b\u3092\u6700\u5f8c\u307e\u3067\u8996\u8074\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u5b66\u7fd2\u4e2d\u306f\u30b7\u30fc\u30af\u304c\u30ed\u30c3\u30af\u3055\u308c\u307e\u3059\u3002",
    readingRequirement: "\u52d5\u753b\u306e\u306a\u3044\u30ec\u30c3\u30b9\u30f3\uff1a\u6700\u4f4e3\u5206\u9593\u5b66\u7fd2\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    startingTimer: "\u8a08\u6642\u3092\u958b\u59cb\u3057\u3066\u3044\u307e\u3059...",
    remaining: (time) => `\u6b8b\u308a\uff1a${time}`,
    allDone: "\u5185\u5bb9\u3092100%\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u6b21\u306f\u30c6\u30b9\u30c8\u3067\u3059\u3002",
    takeTest: "\u30c6\u30b9\u30c8\u3092\u53d7\u3051\u308b",
    locked: "\u672a\u89e3\u653e",
    moduleTestRequired: "\u3053\u306e\u7ae0\u306e\u5b66\u7fd2\u304c\u7d42\u4e86\u3057\u307e\u3057\u305f\u3002\u30c6\u30b9\u30c8\u306b\u5408\u683c\u3059\u308b\u3068\u6b21\u306e\u7ae0\u304c\u958b\u653e\u3055\u308c\u307e\u3059\u3002",
    courseComplete: "\u30b3\u30fc\u30b9\u5168\u4f53\u306e\u5b66\u7fd2\u30d1\u30b9\u3092\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
  },
  ko: {
    player: "\ucf54\uc2a4 \ud50c\ub808\uc774\uc5b4",
    description: "\uc67c\ucabd\uc5d0 \ucc55\ud130 \ubaa9\ucc28, \uc624\ub978\ucabd\uc5d0 \ub808\uc2a8 \ub0b4\uc6a9\uacfc \ubbf8\ub514\uc5b4\uac00 \ud45c\uc2dc\ub429\ub2c8\ub2e4.",
    vocabularyDashboard: "\uc5b4\ud718 \ub300\uc2dc\ubcf4\ub4dc",
    tableOfContents: "\ub808\uc2a8 \ubaa9\ucc28",
    progress: (percent) => `\uc9c4\ub3c4: ${percent}%`,
    module: (index) => `${index}\uc7a5`,
    completed: "\uc644\ub8cc",
    notCompleted: "\ubbf8\uc644\ub8cc",
    completedLesson: "\uc774 \ub808\uc2a8\uc744 \uc644\ub8cc\ud588\uc2b5\ub2c8\ub2e4",
    saving: "\uc800\uc7a5 \uc911...",
    noLessons: "\uc774 \ucf54\uc2a4\uc5d0\ub294 \uc544\uc9c1 \ub808\uc2a8\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    videoRequirement: "\uc694\uad6c\uc0ac\ud56d: \ube44\ub514\uc624\ub97c \ub05d\uae4c\uc9c0 \uc2dc\uccad\ud558\uc138\uc694. \ud559\uc2b5 \uc911\uc5d0\ub294 \uc7ac\uc0dd \uc704\uce58 \uc774\ub3d9\uc774 \uc7a0\uae41\ub2c8\ub2e4.",
    readingRequirement: "\ube44\ub514\uc624\uac00 \uc5c6\ub294 \ub808\uc2a8: \ucd5c\uc18c 3\ubd84 \ub3d9\uc548 \ud559\uc2b5\ud574\uc57c \ud569\ub2c8\ub2e4.",
    startingTimer: "\ud0c0\uc774\uba38\ub97c \uc2dc\uc791\ud558\ub294 \uc911...",
    remaining: (time) => `\ub0a8\uc740 \uc2dc\uac04: ${time}`,
    allDone: "\ub0b4\uc6a9\uc744 100% \uc644\ub8cc\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc74c: \ud14c\uc2a4\ud2b8 \uc751\uc2dc.",
    takeTest: "\ud14c\uc2a4\ud2b8 \uc751\uc2dc",
    locked: "\uc7a0\uae40",
    moduleTestRequired: "\uc774 \ubaa8\ub4c8\uc744 \uc644\ub8cc\ud588\uc2b5\ub2c8\ub2e4. \ud14c\uc2a4\ud2b8\uc5d0 \ud569\uaca9\ud558\uba74 \ub2e4\uc74c \ubaa8\ub4c8\uc774 \uc5f4\ub9bd\ub2c8\ub2e4.",
    courseComplete: "\uc804\uccb4 \ucf54\uc2a4 \ud559\uc2b5 \uacbd\ub85c\ub97c \uc644\ub8cc\ud588\uc2b5\ub2c8\ub2e4.",
  },
};

export function getCourseLearningLabels(language?: string | null) {
  return courseLearningLabels[getContentUiLanguage(language)];
}

export type CourseInfoLabels = {
  heading: string;
  createHeading: string;
  description: string;
  name: string;
  courseDescription: string;
  language: string;
  languagePlaceholder: string;
  languageLockedHint: string;
  noApprovedLanguage: string;
  approvalNotice: string;
  price: string;
  category: string;
  categoryPlaceholder: string;
  level: string;
  duration: string;
  durationPlaceholder: string;
  status: string;
  thumbnail: string;
  thumbnailPlaceholder: string;
  uploadImage: string;
  uploadingImage: string;
  imageHint: string;
  directImageWarning: string;
  previewAlt: string;
  uploadError: string;
  invalidImageError: string;
  saveError: string;
  saved: string;
  savedPending: string;
  created: string;
  createdPending: string;
  autoApproved: string;
  cancel: string;
  save: string;
  create: string;
  saving: string;
};

const courseInfoLabels: Record<UiLanguage, CourseInfoLabels> = {
  vi: {
    heading: "Chỉnh sửa thông tin khóa học",
    createHeading: "Tạo khóa học mới",
    description: "Cập nhật nội dung giới thiệu, học phí, danh mục và ảnh đại diện của khóa học.",
    name: "Tên khóa học",
    courseDescription: "Mô tả khóa học",
    language: "Ngôn ngữ khóa học",
    languagePlaceholder: "Chọn ngôn ngữ",
    languageLockedHint: "Ngôn ngữ được khóa theo hồ sơ giảng viên đã được duyệt.",
    noApprovedLanguage: "Tài khoản giáo viên chưa có ngôn ngữ giảng dạy được duyệt.",
    approvalNotice: "Khóa học cần quản trị viên duyệt trước khi hiển thị công khai nếu chế độ Duyệt nhanh đang tắt.",
    price: "Học phí (VNĐ)",
    category: "Danh mục",
    categoryPlaceholder: "Chọn danh mục",
    level: "Trình độ",
    duration: "Thời lượng",
    durationPlaceholder: "Ví dụ: 8 tuần",
    status: "Trạng thái",
    thumbnail: "Ảnh đại diện khóa học",
    thumbnailPlaceholder: "Nhập URL ảnh hoặc tải ảnh lên",
    uploadImage: "Chọn ảnh từ máy",
    uploadingImage: "Đang tải ảnh...",
    imageHint: "JPEG, PNG, WebP hoặc GIF, tối đa 5 MB",
    directImageWarning: "Liên kết này là trang tìm kiếm, không phải ảnh trực tiếp. Hãy mở ảnh rồi sao chép địa chỉ ảnh hoặc tải ảnh từ máy.",
    previewAlt: "Xem trước ảnh khóa học",
    uploadError: "Không thể tải ảnh khóa học lên.",
    invalidImageError: "Không thể hiển thị ảnh này. Vui lòng dùng liên kết ảnh trực tiếp hoặc tải ảnh từ máy.",
    saveError: "Không thể lưu khóa học.",
    saved: "Đã cập nhật thông tin khóa học.",
    savedPending: "Đã lưu thay đổi và gửi khóa học chờ quản trị viên duyệt.",
    created: "Đã lưu khóa học.",
    createdPending: "Khóa học đã được gửi chờ quản trị viên duyệt.",
    autoApproved: "Khóa học đã được duyệt nhanh.",
    cancel: "Hủy",
    save: "Lưu thay đổi",
    create: "Tạo khóa học",
    saving: "Đang lưu...",
  },
  en: {
    heading: "Edit course information",
    createHeading: "Create a new course",
    description: "Update the introduction, tuition, category, and cover image for this course.",
    name: "Course name",
    courseDescription: "Course description",
    language: "Course language",
    languagePlaceholder: "Choose a language",
    languageLockedHint: "The language is locked to your approved teacher profile.",
    noApprovedLanguage: "This teacher account does not have an approved teaching language.",
    approvalNotice: "The course requires admin approval before it becomes public when Quick approval is disabled.",
    price: "Tuition (VND)",
    category: "Category",
    categoryPlaceholder: "Choose category",
    level: "Level",
    duration: "Duration",
    durationPlaceholder: "Example: 8 weeks",
    status: "Status",
    thumbnail: "Course cover image",
    thumbnailPlaceholder: "Enter an image URL or upload an image",
    uploadImage: "Choose image from device",
    uploadingImage: "Uploading image...",
    imageHint: "JPEG, PNG, WebP, or GIF, max 5 MB",
    directImageWarning: "This link is a search page, not a direct image. Open the image and copy its address, or upload it from your device.",
    previewAlt: "Course image preview",
    uploadError: "Unable to upload the course image.",
    invalidImageError: "Unable to display this image. Use a direct image link or upload it from your device.",
    saveError: "Unable to save the course.",
    saved: "Course information updated.",
    savedPending: "Changes saved and sent for admin approval.",
    created: "Course saved.",
    createdPending: "The course was sent for admin approval.",
    autoApproved: "The course was approved through Quick approval.",
    cancel: "Cancel",
    save: "Save changes",
    create: "Create course",
    saving: "Saving...",
  },
  zh: {
    heading: "\u7f16\u8f91\u8bfe\u7a0b\u4fe1\u606f",
    createHeading: "\u521b\u5efa\u65b0\u8bfe\u7a0b",
    description: "\u66f4\u65b0\u8bfe\u7a0b\u4ecb\u7ecd\u3001\u5b66\u8d39\u3001\u5206\u7c7b\u548c\u5c01\u9762\u56fe\u3002",
    name: "\u8bfe\u7a0b\u540d\u79f0",
    courseDescription: "\u8bfe\u7a0b\u63cf\u8ff0",
    language: "\u8bfe\u7a0b\u8bed\u8a00",
    languagePlaceholder: "\u9009\u62e9\u8bed\u8a00",
    languageLockedHint: "\u8bed\u8a00\u5df2\u9501\u5b9a\u4e3a\u6559\u5e08\u8d44\u6599\u4e2d\u5df2\u901a\u8fc7\u5ba1\u6838\u7684\u8bed\u8a00\u3002",
    noApprovedLanguage: "\u6b64\u6559\u5e08\u8d26\u6237\u5c1a\u65e0\u5df2\u901a\u8fc7\u5ba1\u6838\u7684\u6388\u8bfe\u8bed\u8a00\u3002",
    approvalNotice: "\u5982\u679c\u5df2\u5173\u95ed\u5feb\u901f\u5ba1\u6838\uff0c\u8bfe\u7a0b\u5728\u516c\u5f00\u663e\u793a\u524d\u9700\u8981\u7ba1\u7406\u5458\u5ba1\u6838\u3002",
    price: "\u5b66\u8d39\uff08VND\uff09",
    category: "\u5206\u7c7b",
    categoryPlaceholder: "\u9009\u62e9\u5206\u7c7b",
    level: "\u7ea7\u522b",
    duration: "\u65f6\u957f",
    durationPlaceholder: "\u4f8b\u5982\uff1a8\u5468",
    status: "\u72b6\u6001",
    thumbnail: "\u8bfe\u7a0b\u5c01\u9762\u56fe",
    thumbnailPlaceholder: "\u8f93\u5165\u56fe\u7247URL\u6216\u4e0a\u4f20\u56fe\u7247",
    uploadImage: "\u4ece\u8bbe\u5907\u9009\u62e9\u56fe\u7247",
    uploadingImage: "\u56fe\u7247\u4e0a\u4f20\u4e2d...",
    imageHint: "JPEG\u3001PNG\u3001WebP\u6216GIF\uff0c\u6700\u591a5 MB",
    directImageWarning: "\u6b64\u94fe\u63a5\u662f\u641c\u7d22\u9875\u9762\uff0c\u4e0d\u662f\u76f4\u63a5\u56fe\u7247\u3002\u8bf7\u6253\u5f00\u56fe\u7247\u540e\u590d\u5236\u56fe\u7247\u5730\u5740\uff0c\u6216\u4ece\u8bbe\u5907\u4e0a\u4f20\u3002",
    previewAlt: "\u8bfe\u7a0b\u56fe\u7247\u9884\u89c8",
    uploadError: "\u65e0\u6cd5\u4e0a\u4f20\u8bfe\u7a0b\u56fe\u7247\u3002",
    invalidImageError: "\u65e0\u6cd5\u663e\u793a\u6b64\u56fe\u7247\u3002\u8bf7\u4f7f\u7528\u76f4\u63a5\u56fe\u7247\u94fe\u63a5\u6216\u4ece\u8bbe\u5907\u4e0a\u4f20\u3002",
    saveError: "\u65e0\u6cd5\u4fdd\u5b58\u8bfe\u7a0b\u3002",
    saved: "\u8bfe\u7a0b\u4fe1\u606f\u5df2\u66f4\u65b0\u3002",
    savedPending: "\u66f4\u6539\u5df2\u4fdd\u5b58\u5e76\u63d0\u4ea4\u7ba1\u7406\u5458\u5ba1\u6838\u3002",
    created: "\u8bfe\u7a0b\u5df2\u4fdd\u5b58\u3002",
    createdPending: "\u8bfe\u7a0b\u5df2\u63d0\u4ea4\u7ba1\u7406\u5458\u5ba1\u6838\u3002",
    autoApproved: "\u8bfe\u7a0b\u5df2\u901a\u8fc7\u5feb\u901f\u5ba1\u6838\u3002",
    cancel: "\u53d6\u6d88",
    save: "\u4fdd\u5b58\u66f4\u6539",
    create: "\u521b\u5efa\u8bfe\u7a0b",
    saving: "\u4fdd\u5b58\u4e2d...",
  },
  ja: {
    heading: "\u30b3\u30fc\u30b9\u60c5\u5831\u3092\u7de8\u96c6",
    createHeading: "\u65b0\u3057\u3044\u30b3\u30fc\u30b9\u3092\u4f5c\u6210",
    description: "\u30b3\u30fc\u30b9\u306e\u7d39\u4ecb\u3001\u53d7\u8b1b\u6599\u3001\u30ab\u30c6\u30b4\u30ea\u3001\u30ab\u30d0\u30fc\u753b\u50cf\u3092\u66f4\u65b0\u3057\u307e\u3059\u3002",
    name: "\u30b3\u30fc\u30b9\u540d",
    courseDescription: "\u30b3\u30fc\u30b9\u8aac\u660e",
    language: "\u30b3\u30fc\u30b9\u306e\u8a00\u8a9e",
    languagePlaceholder: "\u8a00\u8a9e\u3092\u9078\u629e",
    languageLockedHint: "\u8a00\u8a9e\u306f\u627f\u8a8d\u6e08\u307f\u306e\u8b1b\u5e2b\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u306b\u56fa\u5b9a\u3055\u308c\u3066\u3044\u307e\u3059\u3002",
    noApprovedLanguage: "\u3053\u306e\u8b1b\u5e2b\u30a2\u30ab\u30a6\u30f3\u30c8\u306b\u306f\u627f\u8a8d\u6e08\u307f\u306e\u6307\u5c0e\u8a00\u8a9e\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
    approvalNotice: "\u30af\u30a4\u30c3\u30af\u627f\u8a8d\u304c\u7121\u52b9\u306e\u5834\u5408\u3001\u30b3\u30fc\u30b9\u3092\u516c\u958b\u3059\u308b\u524d\u306b\u7ba1\u7406\u8005\u306e\u627f\u8a8d\u304c\u5fc5\u8981\u3067\u3059\u3002",
    price: "\u53d7\u8b1b\u6599\uff08VND\uff09",
    category: "\u30ab\u30c6\u30b4\u30ea",
    categoryPlaceholder: "\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e",
    level: "\u30ec\u30d9\u30eb",
    duration: "\u671f\u9593",
    durationPlaceholder: "\u4f8b\uff1a8\u9031\u9593",
    status: "\u30b9\u30c6\u30fc\u30bf\u30b9",
    thumbnail: "\u30b3\u30fc\u30b9\u30ab\u30d0\u30fc\u753b\u50cf",
    thumbnailPlaceholder: "\u753b\u50cfURL\u3092\u5165\u529b\u3059\u308b\u304b\u753b\u50cf\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    uploadImage: "\u30c7\u30d0\u30a4\u30b9\u304b\u3089\u753b\u50cf\u3092\u9078\u629e",
    uploadingImage: "\u753b\u50cf\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d...",
    imageHint: "JPEG\u3001PNG\u3001WebP\u307e\u305f\u306fGIF\u3001\u6700\u59275 MB",
    directImageWarning: "\u3053\u306e\u30ea\u30f3\u30af\u306f\u753b\u50cf\u305d\u306e\u3082\u306e\u3067\u306f\u306a\u304f\u691c\u7d22\u30da\u30fc\u30b8\u3067\u3059\u3002\u753b\u50cf\u3092\u958b\u3044\u3066\u30a2\u30c9\u30ec\u30b9\u3092\u30b3\u30d4\u30fc\u3059\u308b\u304b\u3001\u30c7\u30d0\u30a4\u30b9\u304b\u3089\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    previewAlt: "\u30b3\u30fc\u30b9\u753b\u50cf\u306e\u30d7\u30ec\u30d3\u30e5\u30fc",
    uploadError: "\u30b3\u30fc\u30b9\u753b\u50cf\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3067\u304d\u307e\u305b\u3093\u3002",
    invalidImageError: "\u3053\u306e\u753b\u50cf\u3092\u8868\u793a\u3067\u304d\u307e\u305b\u3093\u3002\u753b\u50cf\u306e\u76f4\u63a5\u30ea\u30f3\u30af\u3092\u4f7f\u7528\u3059\u308b\u304b\u3001\u30c7\u30d0\u30a4\u30b9\u304b\u3089\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    saveError: "\u30b3\u30fc\u30b9\u3092\u4fdd\u5b58\u3067\u304d\u307e\u305b\u3093\u3002",
    saved: "\u30b3\u30fc\u30b9\u60c5\u5831\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002",
    savedPending: "\u5909\u66f4\u3092\u4fdd\u5b58\u3057\u3001\u7ba1\u7406\u8005\u306e\u627f\u8a8d\u5f85\u3061\u3068\u3057\u3066\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002",
    created: "\u30b3\u30fc\u30b9\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002",
    createdPending: "\u30b3\u30fc\u30b9\u3092\u7ba1\u7406\u8005\u306e\u627f\u8a8d\u5f85\u3061\u3068\u3057\u3066\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002",
    autoApproved: "\u30b3\u30fc\u30b9\u306f\u30af\u30a4\u30c3\u30af\u627f\u8a8d\u3067\u627f\u8a8d\u3055\u308c\u307e\u3057\u305f\u3002",
    cancel: "\u30ad\u30e3\u30f3\u30bb\u30eb",
    save: "\u5909\u66f4\u3092\u4fdd\u5b58",
    create: "\u30b3\u30fc\u30b9\u3092\u4f5c\u6210",
    saving: "\u4fdd\u5b58\u4e2d...",
  },
  ko: {
    heading: "\ucf54\uc2a4 \uc815\ubcf4 \uc218\uc815",
    createHeading: "\uc0c8 \ucf54\uc2a4 \uc0dd\uc131",
    description: "\ucf54\uc2a4 \uc18c\uac1c, \uc218\uac15\ub8cc, \uce74\ud14c\uace0\ub9ac, \ud45c\uc9c0 \uc774\ubbf8\uc9c0\ub97c \uc5c5\ub370\uc774\ud2b8\ud558\uc138\uc694.",
    name: "\ucf54\uc2a4 \uc774\ub984",
    courseDescription: "\ucf54\uc2a4 \uc124\uba85",
    language: "\ucf54\uc2a4 \uc5b8\uc5b4",
    languagePlaceholder: "\uc5b8\uc5b4 \uc120\ud0dd",
    languageLockedHint: "\uc5b8\uc5b4\ub294 \uc2b9\uc778\ub41c \uac15\uc0ac \ud504\ub85c\ud544\uc5d0 \uace0\uc815\ub429\ub2c8\ub2e4.",
    noApprovedLanguage: "\uc774 \uac15\uc0ac \uacc4\uc815\uc5d0\ub294 \uc2b9\uc778\ub41c \uac15\uc758 \uc5b8\uc5b4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
    approvalNotice: "\ube60\ub978 \uc2b9\uc778\uc774 \ube44\ud65c\uc131\ud654\ub41c \uacbd\uc6b0 \ucf54\uc2a4\ub97c \uacf5\uac1c\ud558\uae30 \uc804\uc5d0 \uad00\ub9ac\uc790 \uc2b9\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    price: "\uc218\uac15\ub8cc (VND)",
    category: "\uce74\ud14c\uace0\ub9ac",
    categoryPlaceholder: "\uce74\ud14c\uace0\ub9ac \uc120\ud0dd",
    level: "\ub808\ubca8",
    duration: "\uae30\uac04",
    durationPlaceholder: "\uc608: 8\uc8fc",
    status: "\uc0c1\ud0dc",
    thumbnail: "\ucf54\uc2a4 \ud45c\uc9c0 \uc774\ubbf8\uc9c0",
    thumbnailPlaceholder: "\uc774\ubbf8\uc9c0 URL\uc744 \uc785\ub825\ud558\uac70\ub098 \uc774\ubbf8\uc9c0\ub97c \uc5c5\ub85c\ub4dc",
    uploadImage: "\uae30\uae30\uc5d0\uc11c \uc774\ubbf8\uc9c0 \uc120\ud0dd",
    uploadingImage: "\uc774\ubbf8\uc9c0 \uc5c5\ub85c\ub4dc \uc911...",
    imageHint: "JPEG, PNG, WebP \ub610\ub294 GIF, \ucd5c\ub300 5 MB",
    directImageWarning: "\uc774 \ub9c1\ud06c\ub294 \uc9c1\uc811 \uc774\ubbf8\uc9c0\uac00 \uc544\ub2cc \uac80\uc0c9 \ud398\uc774\uc9c0\uc785\ub2c8\ub2e4. \uc774\ubbf8\uc9c0\ub97c \uc5f4\uc5b4 \uc8fc\uc18c\ub97c \ubcf5\uc0ac\ud558\uac70\ub098 \uae30\uae30\uc5d0\uc11c \uc5c5\ub85c\ub4dc\ud558\uc138\uc694.",
    previewAlt: "\ucf54\uc2a4 \uc774\ubbf8\uc9c0 \ubbf8\ub9ac\ubcf4\uae30",
    uploadError: "\ucf54\uc2a4 \uc774\ubbf8\uc9c0\ub97c \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    invalidImageError: "\uc774 \uc774\ubbf8\uc9c0\ub97c \ud45c\uc2dc\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uc774\ubbf8\uc9c0 \ub9c1\ud06c\ub97c \uc0ac\uc6a9\ud558\uac70\ub098 \uae30\uae30\uc5d0\uc11c \uc5c5\ub85c\ub4dc\ud558\uc138\uc694.",
    saveError: "\ucf54\uc2a4\ub97c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    saved: "\ucf54\uc2a4 \uc815\ubcf4\uac00 \uc5c5\ub370\uc774\ud2b8\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    savedPending: "\ubcc0\uacbd \uc0ac\ud56d\uc744 \uc800\uc7a5\ud558\uace0 \uad00\ub9ac\uc790 \uc2b9\uc778\uc744 \uc694\uccad\ud588\uc2b5\ub2c8\ub2e4.",
    created: "\ucf54\uc2a4\uac00 \uc800\uc7a5\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    createdPending: "\ucf54\uc2a4\uac00 \uad00\ub9ac\uc790 \uc2b9\uc778\uc744 \uc704\ud574 \uc81c\ucd9c\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    autoApproved: "\ucf54\uc2a4\uac00 \ube60\ub978 \uc2b9\uc778\uc73c\ub85c \uc2b9\uc778\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    cancel: "\ucde8\uc18c",
    save: "\ubcc0\uacbd\uc0ac\ud56d \uc800\uc7a5",
    create: "\ucf54\uc2a4 \uc0dd\uc131",
    saving: "\uc800\uc7a5 \uc911...",
  },
};

export function getCourseInfoLabels(language?: string | null) {
  return courseInfoLabels[getContentUiLanguage(language)];
}
