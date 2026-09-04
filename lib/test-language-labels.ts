export type UiLanguage = "en" | "ja" | "zh" | "ko" | "vi";

export function normalizeLanguageCode(languageCode?: string | null): UiLanguage {
  const normalized = (languageCode || "").toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja") || normalized.startsWith("jp")) return "ja";
  if (normalized.startsWith("zh") || normalized.startsWith("cn")) return "zh";
  if (normalized.startsWith("ko") || normalized.startsWith("kr")) return "ko";
  if (normalized.startsWith("vi") || normalized.startsWith("vn")) return "vi";
  return "vi";
}

type QuestionTypeLabels = Record<
  "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "ESSAY" | "TRUE_FALSE" | "SPEAKING",
  string
>;

type LearningUiLabels = {
  submit: string;
  score: string;
  scoreFree: string;
  scoreWithAiFeedback: string;
  aiFeedback: string;
  aiFeedbackWithCost: (cost: number) => string;
  waiting: string;
  aiReviewing: string;
  scoring: string;
  reviewing: string;
  expired: string;
  trueFalse: [string, string];
  questionTypes: QuestionTypeLabels;
  assessment: Record<"STANDARD" | "WRITING" | "SPEAKING", string>;
  testKind: Record<"COURSE" | "PUBLIC_PRACTICE" | "TEACHER_ENTRANCE", string>;
  test: {
    loading: string;
    notFound: string;
    backToTests: string;
    commonLanguage: string;
    answered: string;
    timeLeft: string;
    noTimeLimit: string;
    ready: string;
    start: string;
    unavailable: string;
    lockedUntilCourseComplete: string;
    lockedUntilModuleReady: string;
    invalidScore: string;
    exit: string;
    instructions: string;
    expiredNotice: string;
    stopRecordingAlert: string;
    unansweredConfirm: (count: number) => string;
    paymentFailed: string;
    beanPurchaseComplete: string;
    beanPurchaseBlocked: string;
    beanPurchaseOpened: string;
    openBeanPurchase: string;
    submitFailed: string;
    connectionFailed: string;
    unsupportedAudio: string;
    fillPlaceholder: string;
    essayPlaceholder: string;
    transcriptTitle: string;
    transcriptAria: string;
    transcriptEmpty: string;
    historyTitle: string;
    noAttempts: string;
    attempt: (attemptNo: number) => string;
    passed: string;
    notPassed: string;
    points: string;
  };
  result: {
    loadingError: string;
    loadFailed: string;
    title: string;
    estimatedLevel: string;
    score: string;
    correct: string;
    passedRequirement: string;
    needsReview: string;
    skillAnalysis: string;
    improveTitle: string;
    noMajorWeakness: string;
    recommendedPath: string;
    pathReview: string;
    pathContinue: (level: string) => string;
    pathRetake: string;
    viewCourses: string;
    scoreOnlyTitle: string;
    scoreOnlyDescription: string;
    reviewQuestions: string;
    yourAnswer: string;
    noAnswer: string;
    answer: string;
    notCorrect: string;
    aiScore: string;
    aiFeedback: string;
    rubricTotal: string;
    certificateFit: string;
    scoreOnlyNote: string;
    taskRelevance: string;
    offTopic: string;
    offTopicFallback: string;
    needsImprovement: string;
    majorErrors: string;
    shouldFix: string;
    suggestions: string;
    sampleAnswer: string;
    backToTests: string;
    viewCourse: string;
    retake: string;
    reviewCompleteEyebrow: string;
    reviewTitle: (courseName: string) => string;
    reviewDescription: string;
    skip: string;
    later: string;
    saving: string;
    submitReview: string;
    reviewSaved: string;
    optionalComment: string;
    stars: string;
  };
  skills: {
    writing: string;
    speaking: string;
    vocabulary: string;
    reading: string;
  };
  levels: {
    beginner: string;
    elementary: string;
    intermediate: string;
    upperIntermediate: string;
    advanced: string;
  };
  course: {
    uncategorized: string;
    instructor: string;
    duration: string;
    lessons: string;
    students: string;
    progress: string;
    questions: string;
    passingScore: string;
    stars: string;
    learningPath: string;
    learningPathDescription: string;
    chapter: (index: number) => string;
    lessonCount: (count: number) => string;
    noLessons: string;
    testsTitle: string;
    questionCount: (count: number) => string;
    maxScore: (score: number) => string;
    noTimeLimit: string;
    minuteCount: (minutes: number) => string;
    noTests: string;
    reviewsTitle: string;
    ratingSummary: (total: string, count: number, average: string) => string;
    noReviews: string;
    completedOnlyReview: string;
    loginToReview: string;
    noComment: string;
    loginPrompt: string;
    login: string;
    includes: string;
    includesItems: string[];
    teacherFallback: string;
    categoryFallback: string;
    lessonUnit: (count: number) => string;
    studentUnit: (count: number) => string;
    continueLearning: string;
    viewCourse: string;
    enrolled: string;
    creatingPayment: string;
    buyWithVnpay: string;
    enterCourse: string;
    teacherCanLearn: string;
    adminCanLearn: string;
    enrollmentSuccess: string;
    paymentError: string;
    networkError: string;
    accessSuspended: string;
  };
  teacherEntrance: {
    aiFeedbackAfterScore: string;
    relevance: string;
    offTopic: string;
    offTopicFallback: string;
    needsImprovement: string;
    suggestions: string;
    sampleAnswer: string;
    question: (index: number) => string;
    submitTest: string;
    submitting: string;
    history: string;
    noApplications: string;
    applicationAttempt: (attemptNo: number) => string;
    stopRecordingMessage: string;
    submitSuccess: string;
    submitRejected: string;
    submitFailed: string;
  };
};

const labels: Record<UiLanguage, LearningUiLabels> = {
  vi: {
    submit: "Nộp bài",
    score: "Chấm điểm",
    scoreFree: "Chấm điểm miễn phí",
    scoreWithAiFeedback: "Chấm điểm & nhận xét AI",
    aiFeedback: "Nhận xét AI",
    aiFeedbackWithCost: (cost) => `Nhận xét AI (trừ ${cost} điểm nhận xét)`,
    waiting: "Vui lòng đợi...",
    aiReviewing: "AI đang nhận xét...",
    scoring: "Đang chấm điểm...",
    reviewing: "Đang nhận xét...",
    expired: "Đã hết thời gian",
    trueFalse: ["Đúng", "Sai"],
    questionTypes: {
      MULTIPLE_CHOICE: "Trắc nghiệm",
      FILL_IN_BLANK: "Điền từ",
      ESSAY: "Bài viết AI",
      TRUE_FALSE: "Đúng/Sai",
      SPEAKING: "Bài nói AI",
    },
    assessment: {
      STANDARD: "Chấm đáp án",
      WRITING: "Chấm bài viết bằng AI",
      SPEAKING: "Chấm bài nói bằng AI",
    },
    testKind: {
      COURSE: "Bài kiểm tra khóa học",
      PUBLIC_PRACTICE: "Đề luyện tập",
      TEACHER_ENTRANCE: "Bài test đầu vào giảng viên",
    },
    test: {
      loading: "Đang chuẩn bị bài test...",
      notFound: "Không tìm thấy bài test.",
      backToTests: "Quay lại danh sách bài test",
      commonLanguage: "Ngôn ngữ chung",
      answered: "Đã trả lời",
      timeLeft: "Thời gian còn lại",
      noTimeLimit: "Không giới hạn thời gian",
      ready: "Sẵn sàng",
      start: "Làm bài",
      unavailable: "Chưa khả dụng",
      lockedUntilCourseComplete: "Chưa hoàn thành khóa học",
      lockedUntilModuleReady: "Hoàn thành module trước và đạt bài test để mở khóa",
      invalidScore: "Đề chưa đủ 100 điểm",
      exit: "Thoát",
      instructions: "Hướng dẫn làm bài",
      expiredNotice: "Đã hết thời gian. Toàn bộ câu trả lời đã được khóa và hệ thống đang tự động nộp bài.",
      stopRecordingAlert: "Hãy dừng ghi âm và đợi hệ thống phân tích âm thanh xong trước khi chấm điểm.",
      unansweredConfirm: (count) => `Còn ${count} câu chưa trả lời. Bạn có chắc muốn nộp bài?`,
      paymentFailed: "Không tạo được giao dịch thanh toán.",
      beanPurchaseComplete: "Điểm nhận xét đã được cộng. Đáp án vẫn được giữ nguyên; bạn có thể bấm nhận xét AI lần nữa.",
      beanPurchaseBlocked: "Trình duyệt đã chặn trang mua điểm nhận xét. Hãy bấm nút bên dưới để mở trang.",
      beanPurchaseOpened: "Trang mua điểm nhận xét đã được mở ở thẻ riêng. Bài kiểm tra và đáp án vẫn được giữ tại đây.",
      openBeanPurchase: "Mở trang mua điểm nhận xét",
      submitFailed: "Không thể nộp bài. Vui lòng thử lại.",
      connectionFailed: "Không thể nộp bài. Vui lòng kiểm tra kết nối và thử lại.",
      unsupportedAudio: "Trình duyệt của bạn không hỗ trợ phát âm thanh.",
      fillPlaceholder: "Nhập đáp án...",
      essayPlaceholder: "Viết câu trả lời của bạn...",
      transcriptTitle: "Nội dung nhận diện",
      transcriptAria: "Nội dung nhận diện giọng nói",
      transcriptEmpty: "Nội dung sẽ xuất hiện tại đây sau khi bạn nói...",
      historyTitle: "Lịch sử làm bài",
      noAttempts: "Bạn chưa có lần làm bài nào.",
      attempt: (attemptNo) => `Lần làm #${attemptNo}`,
      passed: "Đạt",
      notPassed: "Chưa đạt",
      points: "điểm",
    },
    result: {
      loadingError: "Không tìm thấy kết quả.",
      loadFailed: "Không thể tải kết quả.",
      title: "Kết quả bài test",
      estimatedLevel: "Trình độ ước tính",
      score: "Điểm",
      correct: "Đúng",
      passedRequirement: "Đã đạt yêu cầu",
      needsReview: "Nên ôn tập thêm",
      skillAnalysis: "Phân tích kỹ năng",
      improveTitle: "Nội dung cần cải thiện",
      noMajorWeakness: "Chưa phát hiện điểm yếu đáng kể",
      recommendedPath: "Lộ trình được đề xuất",
      pathReview: "1. Ôn lại các kỹ năng còn yếu bằng bài luyện tập phù hợp.",
      pathContinue: (level) => `2. Tiếp tục khóa học ở trình độ ${level}.`,
      pathRetake: "3. Làm lại bài đánh giá sau khi hoàn thành chương tiếp theo.",
      viewCourses: "Xem khóa học phù hợp",
      scoreOnlyTitle: "Kết quả miễn phí chỉ bao gồm điểm số",
      scoreOnlyDescription: "Chọn Nhận xét AI khi làm bài để xem điểm yếu, lỗi cụ thể, hướng cải thiện và bài mẫu.",
      reviewQuestions: "Xem lại từng câu",
      yourAnswer: "Câu trả lời của bạn:",
      noAnswer: "Chưa trả lời",
      answer: "Đáp án:",
      notCorrect: "Chưa đúng",
      aiScore: "Kết quả chấm",
      aiFeedback: "Phản hồi AI",
      rubricTotal: "Tổng điểm rubric",
      certificateFit: "Mức độ phù hợp chứng chỉ",
      scoreOnlyNote: "Bạn đã chọn chấm điểm miễn phí. Nhận xét, lỗi chi tiết và bài mẫu chỉ có trong chế độ Nhận xét AI.",
      taskRelevance: "Độ bám đề",
      offTopic: "Lạc đề",
      offTopicFallback: "Câu trả lời chưa đúng trọng tâm đề bài.",
      needsImprovement: "Cần cải thiện",
      majorErrors: "Lỗi chính",
      shouldFix: "Nên sửa",
      suggestions: "Đề xuất",
      sampleAnswer: "Bài mẫu đúng đề",
      backToTests: "Quay lại danh sách bài test",
      viewCourse: "Xem lại khóa học",
      retake: "Làm lại bài test",
      reviewCompleteEyebrow: "Hoàn thành khóa học",
      reviewTitle: (courseName) => `Đánh giá ${courseName}`,
      reviewDescription: "Chọn điểm từ 1 đến 5 sao. Bình luận là tùy chọn và bạn có thể sửa lại sau.",
      skip: "Bỏ qua",
      later: "Để sau",
      saving: "Đang lưu...",
      submitReview: "Gửi đánh giá",
      reviewSaved: "Đã lưu đánh giá của bạn.",
      optionalComment: "Bình luận tùy chọn...",
      stars: "sao",
    },
    skills: { writing: "Kỹ năng viết", speaking: "Kỹ năng nói", vocabulary: "Từ vựng", reading: "Đọc hiểu" },
    levels: { beginner: "Mới bắt đầu", elementary: "Sơ cấp", intermediate: "Trung cấp", upperIntermediate: "Trung cấp cao", advanced: "Nâng cao" },
    course: {
      uncategorized: "Chưa phân loại",
      instructor: "Giảng viên",
      duration: "Thời lượng",
      lessons: "Bài học",
      students: "Học viên",
      progress: "Tiến độ",
      questions: "Câu hỏi",
      passingScore: "Điểm đạt",
      stars: "sao",
      learningPath: "Lộ trình học tập",
      learningPathDescription: "Các chương, bài học, bài luyện tập và nội dung chuẩn bị cho chứng chỉ.",
      chapter: (index) => `Chương ${index}`,
      lessonCount: (count) => `${count} bài học`,
      noLessons: "Chưa có bài học.",
      testsTitle: "Bài kiểm tra và đánh giá chứng chỉ",
      questionCount: (count) => `${count} câu hỏi`,
      maxScore: (score) => `Tối đa ${score} điểm`,
      noTimeLimit: "Không giới hạn thời gian",
      minuteCount: (minutes) => `${minutes} phút`,
      noTests: "Khóa học chưa có bài kiểm tra.",
      reviewsTitle: "Đánh giá khóa học",
      ratingSummary: (total, count, average) => `Tổng điểm ${total} từ ${count} đánh giá. Trung bình ${average} / 5.`,
      noReviews: "Chưa có đánh giá nào cho khóa học này.",
      completedOnlyReview: "Chỉ học viên đã hoàn thành khóa học và đạt bài test mới có thể đánh giá.",
      loginToReview: "Đăng nhập bằng tài khoản học viên để đánh giá sau khi hoàn thành khóa học.",
      noComment: "Người học không để lại bình luận.",
      loginPrompt: "Đăng nhập để đăng ký khóa học và theo dõi tiến độ.",
      login: "Đăng nhập",
      includes: "Nội dung bao gồm",
      includesItems: ["Huy hiệu trình độ và lộ trình hướng tới chứng chỉ", "Bài luyện tập và theo dõi tiến độ hoàn thành", "Chương trình học do giảng viên xây dựng", "Đề thi thử khi khóa học có hỗ trợ"],
      teacherFallback: "Giảng viên",
      categoryFallback: "Chưa phân loại",
      lessonUnit: (count) => `${count} bài học`,
      studentUnit: (count) => `${count} học viên`,
      continueLearning: "Tiếp tục học",
      viewCourse: "Xem khóa học",
      enrolled: "Đã đăng ký",
      creatingPayment: "Đang tạo đơn thanh toán...",
      buyWithVnpay: "Mua khóa học qua VNPay",
      enterCourse: "Vào học",
      teacherCanLearn: "Bạn là giảng viên của khóa học này. Có thể vào học ngay.",
      adminCanLearn: "Quản trị viên có thể vào học trực tiếp để kiểm tra khóa học, không cần đăng ký.",
      enrollmentSuccess: "Đăng ký khóa học thành công. Bạn có thể vào học ngay.",
      paymentError: "Không tạo được đường dẫn thanh toán VNPay.",
      networkError: "Lỗi mạng. Vui lòng thử lại.",
      accessSuspended: "Quyền học đang tạm khóa trong khi yêu cầu hoàn tiền được admin xử lý.",
    },
    teacherEntrance: {
      aiFeedbackAfterScore: "Nhận xét AI sau khi chấm",
      relevance: "Bám đề",
      offTopic: "Lạc đề",
      offTopicFallback: "Câu trả lời chưa đúng trọng tâm đề bài.",
      needsImprovement: "Cần cải thiện",
      suggestions: "Gợi ý",
      sampleAnswer: "Bài mẫu đúng đề",
      question: (index) => `Câu ${index}`,
      submitTest: "Nộp bài test",
      submitting: "Đang nộp...",
      history: "Lịch sử apply",
      noApplications: "Chưa có hồ sơ nào.",
      applicationAttempt: (attemptNo) => `Lần #${attemptNo}`,
      stopRecordingMessage: "Hãy dừng ghi âm và đợi hệ thống phân tích âm thanh xong trước khi nộp bài.",
      submitSuccess: "Đã nộp bài test. Hồ sơ đang chờ admin review.",
      submitRejected: "Bạn chưa đạt bài test đầu vào. Hồ sơ đã được hệ thống tự động từ chối.",
      submitFailed: "Không thể nộp bài test.",
    },
  },
  en: {
    submit: "Submit",
    score: "Score",
    scoreFree: "Free scoring",
    scoreWithAiFeedback: "Score & Review",
    aiFeedback: "AI feedback",
    aiFeedbackWithCost: () => "Score & Review",
    waiting: "Please wait...",
    aiReviewing: "AI is reviewing...",
    scoring: "Scoring...",
    reviewing: "Reviewing...",
    expired: "Time is up",
    trueFalse: ["True", "False"],
    questionTypes: {
      MULTIPLE_CHOICE: "Multiple choice",
      FILL_IN_BLANK: "Fill in the blank",
      ESSAY: "AI writing",
      TRUE_FALSE: "True/False",
      SPEAKING: "AI speaking",
    },
    assessment: { STANDARD: "Answer scoring", WRITING: "AI writing scoring", SPEAKING: "AI speaking scoring" },
    testKind: { COURSE: "Course test", PUBLIC_PRACTICE: "Practice test", TEACHER_ENTRANCE: "Teacher entrance test" },
    test: {
      loading: "Preparing the test...",
      notFound: "Test not found.",
      backToTests: "Back to tests",
      commonLanguage: "General language",
      answered: "Answered",
      timeLeft: "Time left",
      noTimeLimit: "No time limit",
      ready: "Ready",
      start: "Start test",
      unavailable: "Unavailable",
      lockedUntilCourseComplete: "Complete the course first",
      lockedUntilModuleReady: "Complete the previous module and pass its test first",
      invalidScore: "Test score is not 100 yet",
      exit: "Exit",
      instructions: "Instructions",
      expiredNotice: "Time is up. Answers are locked and the system is submitting automatically.",
      stopRecordingAlert: "Stop recording and wait for audio analysis before scoring.",
      unansweredConfirm: (count) => `${count} questions are unanswered. Submit anyway?`,
      paymentFailed: "Could not create payment.",
      beanPurchaseComplete: "Beans have been added. Your answers are unchanged; you can request AI feedback again.",
      beanPurchaseBlocked: "Your browser blocked the bean-purchase tab. Use the button below to open it.",
      beanPurchaseOpened: "The bean-purchase page opened in a separate tab. This test and your answers remain here.",
      openBeanPurchase: "Open bean-purchase tab",
      submitFailed: "Could not submit. Please try again.",
      connectionFailed: "Could not submit. Check your connection and try again.",
      unsupportedAudio: "Your browser does not support audio playback.",
      fillPlaceholder: "Enter your answer...",
      essayPlaceholder: "Write your answer...",
      transcriptTitle: "Recognized transcript",
      transcriptAria: "Speech recognition transcript",
      transcriptEmpty: "Your transcript will appear here after you speak...",
      historyTitle: "Attempt history",
      noAttempts: "You have not made any attempts yet.",
      attempt: (attemptNo) => `Attempt #${attemptNo}`,
      passed: "Passed",
      notPassed: "Not passed",
      points: "points",
    },
    result: {
      loadingError: "Result not found.",
      loadFailed: "Could not load the result.",
      title: "Test result",
      estimatedLevel: "Estimated level",
      score: "Score",
      correct: "Correct",
      passedRequirement: "Requirement met",
      needsReview: "More review recommended",
      skillAnalysis: "Skill analysis",
      improveTitle: "Areas to improve",
      noMajorWeakness: "No major weakness detected",
      recommendedPath: "Recommended path",
      pathReview: "1. Review weaker skills with targeted practice.",
      pathContinue: (level) => `2. Continue with a ${level} course.`,
      pathRetake: "3. Retake the assessment after the next chapter.",
      viewCourses: "View suitable courses",
      scoreOnlyTitle: "The free result includes scores only",
      scoreOnlyDescription: "Choose AI feedback during the test to see weaknesses, specific errors, improvement guidance, and a sample answer.",
      reviewQuestions: "Review each question",
      yourAnswer: "Your answer:",
      noAnswer: "No answer",
      answer: "Answer:",
      notCorrect: "Not correct",
      aiScore: "Scoring result",
      aiFeedback: "AI feedback",
      rubricTotal: "Rubric total",
      certificateFit: "Certificate fit",
      scoreOnlyNote: "You chose free scoring. Detailed feedback, errors, and sample answers are available only in AI feedback mode.",
      taskRelevance: "Task relevance",
      offTopic: "Off topic",
      offTopicFallback: "The answer does not fully address the prompt.",
      needsImprovement: "Needs improvement",
      majorErrors: "Major errors",
      shouldFix: "Recommended fixes",
      suggestions: "Suggestions",
      sampleAnswer: "Model answer",
      backToTests: "Back to tests",
      viewCourse: "View course",
      retake: "Retake test",
      reviewCompleteEyebrow: "Course completed",
      reviewTitle: (courseName) => `Review ${courseName}`,
      reviewDescription: "Choose a rating from 1 to 5 stars. The comment is optional and can be edited later.",
      skip: "Skip",
      later: "Later",
      saving: "Saving...",
      submitReview: "Submit review",
      reviewSaved: "Your review has been saved.",
      optionalComment: "Optional comment...",
      stars: "stars",
    },
    skills: { writing: "Writing", speaking: "Speaking", vocabulary: "Vocabulary", reading: "Reading" },
    levels: { beginner: "Beginner", elementary: "Elementary", intermediate: "Intermediate", upperIntermediate: "Upper intermediate", advanced: "Advanced" },
    course: {
      uncategorized: "Uncategorized",
      instructor: "Instructor",
      duration: "Duration",
      lessons: "Lessons",
      students: "Students",
      progress: "Progress",
      questions: "Questions",
      passingScore: "Passing score",
      stars: "stars",
      learningPath: "Learning path",
      learningPathDescription: "Modules, lessons, practice tasks, and certificate preparation content.",
      chapter: (index) => `Chapter ${index}`,
      lessonCount: (count) => `${count} lessons`,
      noLessons: "No lessons yet.",
      testsTitle: "Tests and certificate assessment",
      questionCount: (count) => `${count} questions`,
      maxScore: (score) => `Max ${score} points`,
      noTimeLimit: "No time limit",
      minuteCount: (minutes) => `${minutes} minutes`,
      noTests: "This course has no tests yet.",
      reviewsTitle: "Course reviews",
      ratingSummary: (total, count, average) => `Total ${total} points from ${count} reviews. Average ${average} / 5.`,
      noReviews: "There are no reviews for this course yet.",
      completedOnlyReview: "Only students who completed the course and passed the test can review.",
      loginToReview: "Sign in with a student account to review after completing the course.",
      noComment: "The learner left no comment.",
      loginPrompt: "Sign in to enroll and track progress.",
      login: "Sign in",
      includes: "Included content",
      includesItems: ["Level badge and certificate-oriented path", "Practice tasks and progress tracking", "Teacher-designed curriculum", "Mock tests when supported"],
      teacherFallback: "Instructor",
      categoryFallback: "Uncategorized",
      lessonUnit: (count) => `${count} lessons`,
      studentUnit: (count) => `${count} students`,
      continueLearning: "Continue",
      viewCourse: "View course",
      enrolled: "Enrolled",
      creatingPayment: "Creating payment...",
      buyWithVnpay: "Buy course with VNPay",
      enterCourse: "Start learning",
      teacherCanLearn: "You teach this course and can open it immediately.",
      adminCanLearn: "Administrators can open this course directly for review without enrolling.",
      enrollmentSuccess: "Enrollment successful. You can start learning now.",
      paymentError: "Could not create the VNPay payment link.",
      networkError: "Network error. Please try again.",
      accessSuspended: "Course access is temporarily suspended while the refund request is reviewed.",
    },
    teacherEntrance: {
      aiFeedbackAfterScore: "AI feedback after scoring",
      relevance: "Relevance",
      offTopic: "Off topic",
      offTopicFallback: "The answer does not fully address the prompt.",
      needsImprovement: "Needs improvement",
      suggestions: "Suggestions",
      sampleAnswer: "Model answer",
      question: (index) => `Question ${index}`,
      submitTest: "Submit test",
      submitting: "Submitting...",
      history: "Application history",
      noApplications: "No applications yet.",
      applicationAttempt: (attemptNo) => `Attempt #${attemptNo}`,
      stopRecordingMessage: "Stop recording and wait for audio analysis before submitting.",
      submitSuccess: "Test submitted. Your application is awaiting admin review.",
      submitRejected: "You did not pass the entrance test. Your application was automatically rejected.",
      submitFailed: "Could not submit the test.",
    },
  },
  ja: {
    submit: "提出する",
    score: "採点する",
    scoreFree: "無料で採点",
    scoreWithAiFeedback: "採点・AIフィードバック",
    aiFeedback: "AIフィードバック",
    aiFeedbackWithCost: (cost) => `AIフィードバック（${cost}豆）`,
    waiting: "お待ちください...",
    aiReviewing: "AIがフィードバック中...",
    scoring: "採点中...",
    reviewing: "フィードバック中...",
    expired: "時間切れ",
    trueFalse: ["正しい", "間違い"],
    questionTypes: {
      MULTIPLE_CHOICE: "選択問題",
      FILL_IN_BLANK: "穴埋め",
      ESSAY: "AI作文",
      TRUE_FALSE: "正誤問題",
      SPEAKING: "AIスピーキング",
    },
    assessment: { STANDARD: "解答採点", WRITING: "AI作文採点", SPEAKING: "AIスピーキング採点" },
    testKind: { COURSE: "コーステスト", PUBLIC_PRACTICE: "練習問題", TEACHER_ENTRANCE: "講師登録テスト" },
    test: {
      loading: "テストを準備しています...",
      notFound: "テストが見つかりません。",
      backToTests: "テスト一覧へ戻る",
      commonLanguage: "共通言語",
      answered: "回答済み",
      timeLeft: "残り時間",
      noTimeLimit: "時間制限なし",
      ready: "受験可能",
      start: "受験する",
      unavailable: "利用不可",
      lockedUntilCourseComplete: "コース完了後に受験できます",
      lockedUntilModuleReady: "前の章を完了し、テストに合格すると開放されます",
      invalidScore: "合計点が100点に達していません",
      exit: "退出",
      instructions: "受験案内",
      expiredNotice: "時間切れです。すべての回答はロックされ、システムが自動提出します。",
      stopRecordingAlert: "採点前に録音を停止し、音声解析が完了するまでお待ちください。",
      unansweredConfirm: (count) => `未回答の問題が${count}問あります。このまま提出しますか？`,
      paymentFailed: "決済を作成できませんでした。",
      beanPurchaseComplete: "豆が追加されました。回答はそのまま保存されています。もう一度AIフィードバックを押してください。",
      beanPurchaseBlocked: "ブラウザが豆購入タブをブロックしました。下のボタンから開いてください。",
      beanPurchaseOpened: "豆購入ページを別のタブで開きました。テストと回答はこのまま保持されます。",
      openBeanPurchase: "豆購入タブを開く",
      submitFailed: "提出できませんでした。もう一度お試しください。",
      connectionFailed: "提出できませんでした。接続を確認してもう一度お試しください。",
      unsupportedAudio: "お使いのブラウザは音声再生に対応していません。",
      fillPlaceholder: "答えを入力...",
      essayPlaceholder: "回答を書いてください...",
      transcriptTitle: "認識された内容",
      transcriptAria: "音声認識の内容",
      transcriptEmpty: "話した内容はここに表示されます...",
      historyTitle: "受験履歴",
      noAttempts: "まだ受験履歴はありません。",
      attempt: (attemptNo) => `受験 #${attemptNo}`,
      passed: "合格",
      notPassed: "未合格",
      points: "点",
    },
    result: {
      loadingError: "結果が見つかりません。",
      loadFailed: "結果を読み込めませんでした。",
      title: "テスト結果",
      estimatedLevel: "推定レベル",
      score: "得点",
      correct: "正解",
      passedRequirement: "基準達成",
      needsReview: "復習がおすすめです",
      skillAnalysis: "スキル分析",
      improveTitle: "改善が必要な内容",
      noMajorWeakness: "大きな弱点は見つかりませんでした",
      recommendedPath: "おすすめ学習プラン",
      pathReview: "1. 弱いスキルを重点的に復習しましょう。",
      pathContinue: (level) => `2. ${level}レベルのコースを続けましょう。`,
      pathRetake: "3. 次の章を終えたら再度評価を受けましょう。",
      viewCourses: "おすすめコースを見る",
      scoreOnlyTitle: "無料結果は点数のみです",
      scoreOnlyDescription: "AIフィードバックを選ぶと、弱点、具体的なミス、改善方法、模範解答を確認できます。",
      reviewQuestions: "各問題を確認",
      yourAnswer: "あなたの回答:",
      noAnswer: "未回答",
      answer: "正答:",
      notCorrect: "不正解",
      aiScore: "採点結果",
      aiFeedback: "AIフィードバック",
      rubricTotal: "ルーブリック合計",
      certificateFit: "資格レベルとの適合",
      scoreOnlyNote: "無料採点を選択しました。詳細なフィードバック、ミス、模範解答はAIフィードバックで確認できます。",
      taskRelevance: "課題適合度",
      offTopic: "論点ずれ",
      offTopicFallback: "回答が設問の要点に十分合っていません。",
      needsImprovement: "改善点",
      majorErrors: "主なミス",
      shouldFix: "修正すべき点",
      suggestions: "提案",
      sampleAnswer: "模範解答",
      backToTests: "テスト一覧へ戻る",
      viewCourse: "コースを見る",
      retake: "再受験する",
      reviewCompleteEyebrow: "コース完了",
      reviewTitle: (courseName) => `${courseName}を評価`,
      reviewDescription: "1〜5つ星で評価してください。コメントは任意で、後から編集できます。",
      skip: "スキップ",
      later: "後で",
      saving: "保存中...",
      submitReview: "評価を送信",
      reviewSaved: "評価を保存しました。",
      optionalComment: "任意コメント...",
      stars: "星",
    },
    skills: { writing: "作文", speaking: "会話", vocabulary: "語彙", reading: "読解" },
    levels: { beginner: "入門", elementary: "初級", intermediate: "中級", upperIntermediate: "中上級", advanced: "上級" },
    course: {
      uncategorized: "未分類",
      instructor: "講師",
      duration: "学習時間",
      lessons: "レッスン",
      students: "受講者",
      progress: "進捗",
      questions: "問題数",
      passingScore: "合格点",
      stars: "星",
      learningPath: "学習ロードマップ",
      learningPathDescription: "章、レッスン、練習問題、資格対策の内容を確認できます。",
      chapter: (index) => `第${index}章`,
      lessonCount: (count) => `${count}レッスン`,
      noLessons: "まだレッスンはありません。",
      testsTitle: "テストと資格評価",
      questionCount: (count) => `${count}問`,
      maxScore: (score) => `最高${score}点`,
      noTimeLimit: "時間制限なし",
      minuteCount: (minutes) => `${minutes}分`,
      noTests: "このコースにはまだテストがありません。",
      reviewsTitle: "コース評価",
      ratingSummary: (total, count, average) => `${count}件の評価、合計${total}点。平均${average} / 5。`,
      noReviews: "このコースにはまだ評価がありません。",
      completedOnlyReview: "コースを完了し、テストに合格した受講者のみ評価できます。",
      loginToReview: "コース完了後に評価するには、受講者アカウントでログインしてください。",
      noComment: "受講者はコメントを残していません。",
      loginPrompt: "ログインしてコースに登録し、進捗を確認しましょう。",
      login: "ログイン",
      includes: "含まれる内容",
      includesItems: ["レベルバッジと資格対策ロードマップ", "練習問題と進捗管理", "講師作成のカリキュラム", "対応コースの模擬試験"],
      teacherFallback: "講師",
      categoryFallback: "未分類",
      lessonUnit: (count) => `${count}レッスン`,
      studentUnit: (count) => `${count}人の受講者`,
      continueLearning: "学習を続ける",
      viewCourse: "コースを見る",
      enrolled: "登録済み",
      creatingPayment: "決済を作成中...",
      buyWithVnpay: "VNPayでコースを購入",
      enterCourse: "学習を開始",
      teacherCanLearn: "このコースの講師として、すぐに学習画面を開けます。",
      adminCanLearn: "管理者は登録せずに、確認のためこのコースを直接開けます。",
      enrollmentSuccess: "コースへの登録が完了しました。すぐに学習を開始できます。",
      paymentError: "VNPay決済リンクを作成できませんでした。",
      networkError: "ネットワークエラーです。もう一度お試しください。",
      accessSuspended: "返金申請の審査中はコースへのアクセスが一時停止されます。",
    },
    teacherEntrance: {
      aiFeedbackAfterScore: "採点後のAIフィードバック",
      relevance: "課題適合度",
      offTopic: "論点ずれ",
      offTopicFallback: "回答が設問の要点に十分合っていません。",
      needsImprovement: "改善点",
      suggestions: "提案",
      sampleAnswer: "模範解答",
      question: (index) => `問題 ${index}`,
      submitTest: "テストを提出",
      submitting: "提出中...",
      history: "申請履歴",
      noApplications: "申請履歴はまだありません。",
      applicationAttempt: (attemptNo) => `申請 #${attemptNo}`,
      stopRecordingMessage: "提出前に録音を停止し、音声解析が完了するまでお待ちください。",
      submitSuccess: "テストを提出しました。申請は管理者の確認待ちです。",
      submitRejected: "入学試験に合格しなかったため、申請は自動的に却下されました。",
      submitFailed: "テストを提出できませんでした。",
    },
  },
  zh: {} as LearningUiLabels,
  ko: {} as LearningUiLabels,
};

labels.zh = {
  ...labels.ja,
  submit: "提交",
  score: "评分",
  scoreFree: "免费评分",
  scoreWithAiFeedback: "评分与 AI 反馈",
  aiFeedback: "AI反馈",
  aiFeedbackWithCost: (cost) => `AI反馈（${cost}豆）`,
  waiting: "请稍候...",
  aiReviewing: "AI正在反馈...",
  scoring: "评分中...",
  reviewing: "反馈中...",
  expired: "时间已到",
  trueFalse: ["正确", "错误"],
  questionTypes: {
    MULTIPLE_CHOICE: "选择题",
    FILL_IN_BLANK: "填空题",
    ESSAY: "AI写作",
    TRUE_FALSE: "判断题",
    SPEAKING: "AI口语",
  },
  assessment: { STANDARD: "答案评分", WRITING: "AI写作评分", SPEAKING: "AI口语评分" },
  testKind: { COURSE: "课程测试", PUBLIC_PRACTICE: "练习题", TEACHER_ENTRANCE: "教师入门测试" },
  test: {
    ...labels.ja.test,
    loading: "正在准备测试...",
    notFound: "未找到测试。",
    backToTests: "返回测试列表",
    commonLanguage: "通用语言",
    answered: "已回答",
    timeLeft: "剩余时间",
    noTimeLimit: "不限时",
    ready: "可开始",
    start: "开始答题",
    unavailable: "不可用",
    lockedUntilCourseComplete: "完成课程后开放",
    lockedUntilModuleReady: "完成上一章并通过测试后开放",
    invalidScore: "试题总分尚未达到100分",
    exit: "退出",
    instructions: "答题说明",
    expiredNotice: "时间已到。所有答案已锁定，系统正在自动提交。",
    stopRecordingAlert: "评分前请停止录音，并等待音频分析完成。",
    unansweredConfirm: (count) => `还有${count}题未回答。确定提交吗？`,
    paymentFailed: "无法创建支付。",
    beanPurchaseComplete: "豆已到账。答案保持不变；你可以再次点击 AI 反馈。",
    beanPurchaseBlocked: "浏览器阻止了购买豆子的标签页。请点击下方按钮打开。",
    beanPurchaseOpened: "购买豆子的页面已在新标签页打开。当前测试和答案会保留在这里。",
    openBeanPurchase: "打开购买豆子的标签页",
    submitFailed: "无法提交，请重试。",
    connectionFailed: "无法提交。请检查网络后重试。",
    unsupportedAudio: "您的浏览器不支持音频播放。",
    fillPlaceholder: "输入答案...",
    essayPlaceholder: "请写下你的答案...",
    transcriptTitle: "识别内容",
    transcriptAria: "语音识别内容",
    transcriptEmpty: "你说话后，内容会显示在这里...",
    historyTitle: "作答历史",
    noAttempts: "你还没有作答记录。",
    attempt: (attemptNo) => `第 ${attemptNo} 次`,
    passed: "通过",
    notPassed: "未通过",
    points: "分",
  },
  result: {
    loadingError: "未找到结果。",
    loadFailed: "无法加载结果。",
    title: "测试结果",
    estimatedLevel: "预估水平",
    score: "得分",
    correct: "正确",
    passedRequirement: "已达到要求",
    needsReview: "建议继续复习",
    skillAnalysis: "技能分析",
    improveTitle: "需要改进的内容",
    noMajorWeakness: "未发现明显弱点",
    recommendedPath: "推荐学习路径",
    pathReview: "1. 针对较弱技能进行专项练习。",
    pathContinue: (level) => `2. 继续学习${level}水平的课程。`,
    pathRetake: "3. 完成下一章后再次测评。",
    viewCourses: "查看适合的课程",
    scoreOnlyTitle: "免费结果仅包含分数",
    scoreOnlyDescription: "答题时选择AI反馈，可查看弱点、具体错误、改进方向和范文。",
    reviewQuestions: "逐题回顾",
    yourAnswer: "你的答案：",
    noAnswer: "未回答",
    answer: "正确答案：",
    notCorrect: "不正确",
    aiScore: "评分结果",
    aiFeedback: "AI反馈",
    rubricTotal: "评分量表总分",
    certificateFit: "证书水平匹配度",
    scoreOnlyNote: "你选择了免费评分。详细反馈、错误分析和范文仅在AI反馈模式中提供。",
    taskRelevance: "切题度",
    offTopic: "偏题",
    offTopicFallback: "答案没有充分回应题目重点。",
    needsImprovement: "需要改进",
    majorErrors: "主要错误",
    shouldFix: "建议修改",
    suggestions: "建议",
    sampleAnswer: "范文",
    backToTests: "返回测试列表",
    viewCourse: "查看课程",
    retake: "重新测试",
    reviewCompleteEyebrow: "课程已完成",
    reviewTitle: (courseName) => `评价${courseName}`,
    reviewDescription: "请选择1到5星评分。评论为可选，之后也可以修改。",
    skip: "跳过",
    later: "稍后",
    saving: "保存中...",
    submitReview: "提交评价",
    reviewSaved: "你的评价已保存。",
    optionalComment: "可选评论...",
    stars: "星",
  },
  skills: { writing: "写作", speaking: "口语", vocabulary: "词汇", reading: "阅读" },
  levels: { beginner: "入门", elementary: "初级", intermediate: "中级", upperIntermediate: "中高级", advanced: "高级" },
  course: {
    uncategorized: "未分类",
    instructor: "讲师",
    duration: "时长",
    lessons: "课时",
    students: "学员",
    progress: "进度",
    questions: "题目",
    passingScore: "通过分",
    stars: "星",
    learningPath: "学习路径",
    learningPathDescription: "查看章节、课时、练习题和证书备考内容。",
    chapter: (index) => `第${index}章`,
    lessonCount: (count) => `${count}课时`,
    noLessons: "暂无课时。",
    testsTitle: "测试与证书评估",
    questionCount: (count) => `${count}题`,
    maxScore: (score) => `最高${score}分`,
    noTimeLimit: "不限时",
    minuteCount: (minutes) => `${minutes}分钟`,
    noTests: "本课程暂无测试。",
    reviewsTitle: "课程评价",
    ratingSummary: (total, count, average) => `${count}条评价，总分${total}。平均${average} / 5。`,
    noReviews: "本课程暂无评价。",
    completedOnlyReview: "只有完成课程并通过测试的学员才能评价。",
    loginToReview: "请使用学员账号登录，完成课程后进行评价。",
    noComment: "学员未留下评论。",
    loginPrompt: "登录后报名课程并跟踪学习进度。",
    login: "登录",
    includes: "包含内容",
    includesItems: ["水平徽章和证书导向路径", "练习任务与进度跟踪", "讲师设计的课程体系", "支持课程的模拟测试"],
    teacherFallback: "讲师",
    categoryFallback: "未分类",
    lessonUnit: (count) => `${count}课时`,
    studentUnit: (count) => `${count}名学员`,
    continueLearning: "继续学习",
    viewCourse: "查看课程",
    enrolled: "已报名",
    creatingPayment: "正在创建支付订单...",
    buyWithVnpay: "通过VNPay购买课程",
    enterCourse: "开始学习",
    teacherCanLearn: "您是本课程的讲师，可以立即进入学习。",
    adminCanLearn: "管理员无需报名即可直接进入课程进行检查。",
    enrollmentSuccess: "课程报名成功，现在可以开始学习。",
    paymentError: "无法创建VNPay支付链接。",
    networkError: "网络错误，请重试。",
    accessSuspended: "退款申请审核期间，课程访问权限暂时停用。",
  },
  teacherEntrance: {
    aiFeedbackAfterScore: "评分后的AI反馈",
    relevance: "切题度",
    offTopic: "偏题",
    offTopicFallback: "答案没有充分回应题目重点。",
    needsImprovement: "需要改进",
    suggestions: "建议",
    sampleAnswer: "范文",
    question: (index) => `第${index}题`,
    submitTest: "提交测试",
    submitting: "提交中...",
    history: "申请历史",
    noApplications: "暂无申请记录。",
    applicationAttempt: (attemptNo) => `第 ${attemptNo} 次`,
    stopRecordingMessage: "提交前请停止录音，并等待音频分析完成。",
    submitSuccess: "测试已提交。申请正在等待管理员审核。",
    submitRejected: "您未通过入职测试，申请已被系统自动拒绝。",
    submitFailed: "无法提交测试。",
  },
};

labels.ko = {
  ...labels.ja,
  submit: "제출하기",
  score: "채점하기",
  scoreFree: "무료 채점",
  scoreWithAiFeedback: "채점 및 AI 피드백",
  aiFeedback: "AI 피드백",
  aiFeedbackWithCost: (cost) => `AI 피드백 (${cost}콩)`,
  waiting: "잠시 기다려 주세요...",
  aiReviewing: "AI가 피드백 중...",
  scoring: "채점 중...",
  reviewing: "피드백 중...",
  expired: "시간 종료",
  trueFalse: ["맞음", "틀림"],
  questionTypes: {
    MULTIPLE_CHOICE: "객관식",
    FILL_IN_BLANK: "빈칸 채우기",
    ESSAY: "AI 작문",
    TRUE_FALSE: "참/거짓",
    SPEAKING: "AI 말하기",
  },
  assessment: { STANDARD: "답안 채점", WRITING: "AI 작문 채점", SPEAKING: "AI 말하기 채점" },
  testKind: { COURSE: "코스 테스트", PUBLIC_PRACTICE: "연습 문제", TEACHER_ENTRANCE: "강사 입문 테스트" },
  test: {
    ...labels.ja.test,
    loading: "테스트를 준비하고 있습니다...",
    notFound: "테스트를 찾을 수 없습니다.",
    backToTests: "테스트 목록으로 돌아가기",
    commonLanguage: "공통 언어",
    answered: "답변 완료",
    timeLeft: "남은 시간",
    noTimeLimit: "시간 제한 없음",
    ready: "응시 가능",
    start: "응시하기",
    unavailable: "이용 불가",
    lockedUntilCourseComplete: "코스 완료 후 응시 가능",
    lockedUntilModuleReady: "이전 모듈을 완료하고 테스트에 합격하면 열립니다",
    invalidScore: "문항 총점이 아직 100점이 아닙니다",
    exit: "나가기",
    instructions: "응시 안내",
    expiredNotice: "시간이 종료되었습니다. 모든 답변이 잠겼고 시스템이 자동 제출합니다.",
    stopRecordingAlert: "채점 전에 녹음을 중지하고 음성 분석이 끝날 때까지 기다려 주세요.",
    unansweredConfirm: (count) => `아직 ${count}문항에 답하지 않았습니다. 제출하시겠습니까?`,
    paymentFailed: "결제를 생성할 수 없습니다.",
    beanPurchaseComplete: "콩이 충전되었습니다. 답안은 그대로 유지되며 AI 피드백을 다시 요청할 수 있습니다.",
    beanPurchaseBlocked: "브라우저가 콩 구매 탭을 차단했습니다. 아래 버튼을 눌러 열어 주세요.",
    beanPurchaseOpened: "콩 구매 페이지를 새 탭에서 열었습니다. 현재 시험과 답안은 그대로 유지됩니다.",
    openBeanPurchase: "콩 구매 탭 열기",
    submitFailed: "제출할 수 없습니다. 다시 시도해 주세요.",
    connectionFailed: "제출할 수 없습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
    unsupportedAudio: "브라우저가 오디오 재생을 지원하지 않습니다.",
    fillPlaceholder: "답안을 입력하세요...",
    essayPlaceholder: "답안을 작성하세요...",
    transcriptTitle: "인식된 내용",
    transcriptAria: "음성 인식 내용",
    transcriptEmpty: "말한 내용이 여기에 표시됩니다...",
    historyTitle: "응시 기록",
    noAttempts: "아직 응시 기록이 없습니다.",
    attempt: (attemptNo) => `응시 #${attemptNo}`,
    passed: "통과",
    notPassed: "미통과",
    points: "점",
  },
  result: {
    loadingError: "결과를 찾을 수 없습니다.",
    loadFailed: "결과를 불러올 수 없습니다.",
    title: "테스트 결과",
    estimatedLevel: "예상 수준",
    score: "점수",
    correct: "정답",
    passedRequirement: "기준 충족",
    needsReview: "추가 복습 권장",
    skillAnalysis: "스킬 분석",
    improveTitle: "개선이 필요한 내용",
    noMajorWeakness: "뚜렷한 약점이 발견되지 않았습니다",
    recommendedPath: "추천 학습 경로",
    pathReview: "1. 약한 스킬을 맞춤 연습으로 복습하세요.",
    pathContinue: (level) => `2. ${level} 수준의 코스를 이어서 학습하세요.`,
    pathRetake: "3. 다음 챕터를 마친 뒤 다시 평가를 보세요.",
    viewCourses: "추천 코스 보기",
    scoreOnlyTitle: "무료 결과는 점수만 제공합니다",
    scoreOnlyDescription: "AI 피드백을 선택하면 약점, 구체적인 오류, 개선 방향과 모범 답안을 볼 수 있습니다.",
    reviewQuestions: "문항별 확인",
    yourAnswer: "내 답안:",
    noAnswer: "미답변",
    answer: "정답:",
    notCorrect: "오답",
    aiScore: "채점 결과",
    aiFeedback: "AI 피드백",
    rubricTotal: "루브릭 총점",
    certificateFit: "자격 기준 적합도",
    scoreOnlyNote: "무료 채점을 선택했습니다. 자세한 피드백, 오류, 모범 답안은 AI 피드백 모드에서만 제공됩니다.",
    taskRelevance: "주제 적합도",
    offTopic: "주제 이탈",
    offTopicFallback: "답안이 문제의 핵심을 충분히 다루지 않았습니다.",
    needsImprovement: "개선 필요",
    majorErrors: "주요 오류",
    shouldFix: "수정 권장",
    suggestions: "제안",
    sampleAnswer: "모범 답안",
    backToTests: "테스트 목록으로 돌아가기",
    viewCourse: "코스 보기",
    retake: "다시 응시",
    reviewCompleteEyebrow: "코스 완료",
    reviewTitle: (courseName) => `${courseName} 평가`,
    reviewDescription: "1~5개의 별점으로 평가하세요. 댓글은 선택 사항이며 나중에 수정할 수 있습니다.",
    skip: "건너뛰기",
    later: "나중에",
    saving: "저장 중...",
    submitReview: "평가 제출",
    reviewSaved: "평가가 저장되었습니다.",
    optionalComment: "선택 댓글...",
    stars: "별",
  },
  skills: { writing: "쓰기", speaking: "말하기", vocabulary: "어휘", reading: "읽기" },
  levels: { beginner: "입문", elementary: "초급", intermediate: "중급", upperIntermediate: "중상급", advanced: "고급" },
  course: {
    uncategorized: "미분류",
    instructor: "강사",
    duration: "학습 시간",
    lessons: "레슨",
    students: "수강생",
    progress: "진도",
    questions: "문항",
    passingScore: "합격 점수",
    stars: "별",
    learningPath: "학습 로드맵",
    learningPathDescription: "챕터, 레슨, 연습 문제와 자격 대비 내용을 확인하세요.",
    chapter: (index) => `제${index}장`,
    lessonCount: (count) => `${count}개 레슨`,
    noLessons: "아직 레슨이 없습니다.",
    testsTitle: "테스트 및 자격 평가",
    questionCount: (count) => `${count}문항`,
    maxScore: (score) => `최대 ${score}점`,
    noTimeLimit: "시간 제한 없음",
    minuteCount: (minutes) => `${minutes}분`,
    noTests: "이 코스에는 아직 테스트가 없습니다.",
    reviewsTitle: "코스 평가",
    ratingSummary: (total, count, average) => `${count}개의 평가, 총 ${total}점. 평균 ${average} / 5.`,
    noReviews: "아직 이 코스에 대한 평가가 없습니다.",
    completedOnlyReview: "코스를 완료하고 테스트를 통과한 수강생만 평가할 수 있습니다.",
    loginToReview: "코스 완료 후 평가하려면 수강생 계정으로 로그인하세요.",
    noComment: "수강생이 댓글을 남기지 않았습니다.",
    loginPrompt: "로그인하여 코스를 등록하고 진도를 확인하세요.",
    login: "로그인",
    includes: "포함 내용",
    includesItems: ["레벨 배지와 자격 대비 로드맵", "연습 과제와 진도 추적", "강사가 설계한 커리큘럼", "지원 코스의 모의 테스트"],
    teacherFallback: "강사",
    categoryFallback: "미분류",
    lessonUnit: (count) => `${count}개 레슨`,
    studentUnit: (count) => `${count}명 수강생`,
    continueLearning: "계속 학습",
    viewCourse: "코스 보기",
    enrolled: "등록 완료",
    creatingPayment: "결제 생성 중...",
    buyWithVnpay: "VNPay로 코스 구매",
    enterCourse: "학습 시작",
    teacherCanLearn: "이 코스의 강사이므로 바로 학습 화면을 열 수 있습니다.",
    adminCanLearn: "관리자는 등록하지 않고 검토를 위해 이 코스를 바로 열 수 있습니다.",
    enrollmentSuccess: "코스 등록이 완료되었습니다. 지금 학습을 시작할 수 있습니다.",
    paymentError: "VNPay 결제 링크를 만들 수 없습니다.",
    networkError: "네트워크 오류입니다. 다시 시도해 주세요.",
    accessSuspended: "환불 요청 검토 중에는 코스 접근이 일시 중지됩니다.",
  },
  teacherEntrance: {
    aiFeedbackAfterScore: "채점 후 AI 피드백",
    relevance: "주제 적합도",
    offTopic: "주제 이탈",
    offTopicFallback: "답안이 문제의 핵심을 충분히 다루지 않았습니다.",
    needsImprovement: "개선 필요",
    suggestions: "제안",
    sampleAnswer: "모범 답안",
    question: (index) => `문항 ${index}`,
    submitTest: "테스트 제출",
    submitting: "제출 중...",
    history: "신청 기록",
    noApplications: "아직 신청 기록이 없습니다.",
    applicationAttempt: (attemptNo) => `신청 #${attemptNo}`,
    stopRecordingMessage: "제출 전에 녹음을 중지하고 음성 분석이 끝날 때까지 기다려 주세요.",
    submitSuccess: "테스트가 제출되었습니다. 신청은 관리자 검토 대기 중입니다.",
    submitRejected: "입문 시험에 합격하지 못해 지원서가 자동으로 거절되었습니다.",
    submitFailed: "테스트를 제출할 수 없습니다.",
  },
};

export function getLearningUiLabels(languageCode?: string | null): LearningUiLabels {
  return labels[normalizeLanguageCode(languageCode)];
}
