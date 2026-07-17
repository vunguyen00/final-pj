import { normalizeLanguageCode, type UiLanguage } from "@/lib/test-language-labels";
import type { Question, QuestionKind } from "./types";

export type QuestionEditorLabels = {
  editTitle: string;
  addTitle: string;
  description: string;
  typeLabel: string;
  contentLabel: string;
  audioLabel: string;
  optionalAudioLabel: string;
  uploadAudio: string;
  audioHint: string;
  audioRequired: string;
  uploadingAudio: string;
  audioUploaded: string;
  score: string;
  answers: string;
  answerPlaceholder: (index: number) => string;
  correctAnswer: string;
  aiNotice: string;
  explanation: string;
  hint: string;
  hintPlaceholder: string;
  hintHelp: string;
  cancel: string;
  saving: string;
  save: string;
  add: string;
  unsupportedAudio: string;
  removeAudio: string;
  kindOptions: Array<{ value: QuestionKind; label: string }>;
};

export type QuestionPageLabels = {
  loadTestFailed: string;
  uploadMaterialFailed: string;
  materialUploaded: string;
  saveMaterialFailed: string;
  materialSaved: string;
  noTestAlert: string;
  maxScoreAlert: string;
  testMissingAlert: string;
  answerContentRequired: string;
  chooseCorrectAnswer: string;
  saveQuestionFailed: string;
  saveQuestionFallback: string;
  saveQuestionError: string;
  deleteConfirm: string;
  backToCourse: string;
  courseList: string;
  standaloneTest: string;
  coursePrefix: (name: string) => string;
  assessmentPrefix: (mode: "STANDARD" | "WRITING" | "SPEAKING") => string;
  languagePrefix: (name: string) => string;
  unassignedLanguage: string;
  addQuestion: string;
  scoreSummary: (current: number, max: number, remaining: number, ready: boolean) => string;
  materialTitle: string;
  materialDescription: string;
  clearDraft: string;
  materialTitleLabel: string;
  materialTitlePlaceholder: string;
  passageLabel: string;
  passagePlaceholder: string;
  fileLabel: string;
  removeFile: string;
  uploadingFile: string;
  saving: string;
  saveMaterial: string;
  previewTitle: string;
  previewEmpty: string;
  noQuestions: string;
  points: (score: number | string) => string;
  correctAnswer: string;
  aiQuestionNotice: string;
  explanation: string;
  edit: string;
  delete: string;
  unsupportedAudio: string;
  questionType: (question: Pick<Question, "type" | "audioUrl">) => string;
};

const editorLabels: Record<UiLanguage, QuestionEditorLabels> = {
  vi: {
    editTitle: "Chỉnh sửa câu hỏi",
    addTitle: "Thêm câu hỏi mới",
    description: "Nội dung câu hỏi và gợi ý sẽ giữ nguyên định dạng xuống dòng.",
    typeLabel: "Dạng câu hỏi",
    contentLabel: "Nội dung câu hỏi *",
    audioLabel: "Audio nghe và trả lời *",
    optionalAudioLabel: "Audio câu hỏi (không bắt buộc)",
    uploadAudio: "Hoặc tải file audio lên",
    audioHint: "Chỉ hỗ trợ MP3, WAV, OGG, WEBM, M4A hoặc AAC.",
    audioRequired: "Vui lòng nhập URL hoặc đợi file audio tải lên xong.",
    uploadingAudio: "Đang tải file audio...",
    audioUploaded: "Đã tải file audio lên. Câu hỏi sẽ dùng file này khi lưu.",
    score: "Điểm số",
    answers: "Đáp án (chọn đáp án đúng)",
    answerPlaceholder: (index) => `Đáp án ${index + 1}`,
    correctAnswer: "Đáp án đúng *",
    aiNotice: "Câu hỏi này được AI chấm điểm. Người làm bài sẽ nộp bài viết hoặc transcript giọng nói thay vì chọn đáp án cố định.",
    explanation: "Giải thích",
    hint: "Gợi ý",
    hintPlaceholder: "Nhập mỗi ý trên một dòng, ví dụ:\n- Xác định từ khóa chính\n- Chú ý thì của động từ",
    hintHelp: "Mỗi dòng sẽ được hiển thị thành một gạch đầu dòng cho người làm bài.",
    cancel: "Hủy",
    saving: "Đang lưu...",
    save: "Lưu thay đổi",
    add: "Thêm câu hỏi",
    unsupportedAudio: "Trình duyệt của bạn không hỗ trợ phát âm thanh.",
    removeAudio: "Bỏ audio",
    kindOptions: [
      { value: "", label: "Hãy chọn dạng câu hỏi" },
      { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
      { value: "TRUE_FALSE", label: "Đúng/Sai" },
      { value: "FILL_IN_BLANK", label: "Điền từ" },
      { value: "LISTENING", label: "Nghe và trả lời" },
      { value: "ESSAY", label: "Bài viết AI" },
      { value: "SPEAKING", label: "Bài nói AI" },
    ],
  },
  en: {
    editTitle: "Edit question",
    addTitle: "Add new question",
    description: "Question content and hints keep their line breaks.",
    typeLabel: "Question type",
    contentLabel: "Question content *",
    audioLabel: "Listening audio *",
    optionalAudioLabel: "Question audio (optional)",
    uploadAudio: "Or upload an audio file",
    audioHint: "Supports MP3, WAV, OGG, WEBM, M4A, or AAC.",
    audioRequired: "Enter an audio URL or wait until the audio upload finishes.",
    uploadingAudio: "Uploading audio...",
    audioUploaded: "Audio uploaded. This question will use the file when saved.",
    score: "Score",
    answers: "Answers (choose the correct answer)",
    answerPlaceholder: (index) => `Answer ${index + 1}`,
    correctAnswer: "Correct answer *",
    aiNotice: "This question is scored by AI. Students submit writing or a speech transcript instead of choosing a fixed answer.",
    explanation: "Explanation",
    hint: "Hint",
    hintPlaceholder: "Enter one hint per line, for example:\n- Identify the key word\n- Check the verb tense",
    hintHelp: "Each line will be shown as a bullet point for students.",
    cancel: "Cancel",
    saving: "Saving...",
    save: "Save changes",
    add: "Add question",
    unsupportedAudio: "Your browser does not support audio playback.",
    removeAudio: "Remove audio",
    kindOptions: [
      { value: "", label: "Choose a question type" },
      { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
      { value: "TRUE_FALSE", label: "True/False" },
      { value: "FILL_IN_BLANK", label: "Fill in the blank" },
      { value: "LISTENING", label: "Listen and answer" },
      { value: "ESSAY", label: "AI writing" },
      { value: "SPEAKING", label: "AI speaking" },
    ],
  },
  zh: {} as QuestionEditorLabels,
  ja: {} as QuestionEditorLabels,
  ko: {} as QuestionEditorLabels,
};

editorLabels.zh = {
  ...editorLabels.en,
  editTitle: "编辑题目",
  addTitle: "添加新题目",
  description: "题目内容和提示会保留换行格式。",
  typeLabel: "题型",
  contentLabel: "题目内容 *",
  audioLabel: "听力音频 *",
  optionalAudioLabel: "题目音频（可选）",
  uploadAudio: "或上传音频文件",
  audioHint: "支持 MP3、WAV、OGG、WEBM、M4A 或 AAC。",
  audioRequired: "请输入音频 URL，或等待音频上传完成。",
  uploadingAudio: "正在上传音频...",
  audioUploaded: "音频已上传，保存后将用于该题。",
  score: "分数",
  answers: "答案（选择正确答案）",
  answerPlaceholder: (index) => `答案 ${index + 1}`,
  correctAnswer: "正确答案 *",
  aiNotice: "此题由 AI 评分。学生提交写作或口语转写文本，而不是选择固定答案。",
  explanation: "解析",
  hint: "提示",
  hintPlaceholder: "每行输入一个提示，例如：\n- 找出关键词\n- 注意动词时态",
  hintHelp: "每一行都会作为项目符号显示给学生。",
  cancel: "取消",
  saving: "保存中...",
  save: "保存更改",
  add: "添加题目",
  unsupportedAudio: "你的浏览器不支持音频播放。",
  removeAudio: "移除音频",
  kindOptions: [
    { value: "", label: "请选择题型" },
    { value: "MULTIPLE_CHOICE", label: "选择题" },
    { value: "TRUE_FALSE", label: "判断题" },
    { value: "FILL_IN_BLANK", label: "填空题" },
    { value: "LISTENING", label: "听音频回答" },
    { value: "ESSAY", label: "AI 写作" },
    { value: "SPEAKING", label: "AI 口语" },
  ],
};

editorLabels.ja = {
  ...editorLabels.en,
  editTitle: "問題を編集",
  addTitle: "新しい問題を追加",
  description: "問題文とヒントの改行はそのまま保持されます。",
  typeLabel: "問題タイプ",
  contentLabel: "問題文 *",
  audioLabel: "リスニング音声 *",
  optionalAudioLabel: "問題音声（任意）",
  uploadAudio: "または音声ファイルをアップロード",
  audioHint: "MP3、WAV、OGG、WEBM、M4A、AAC に対応しています。",
  audioRequired: "音声URLを入力するか、アップロード完了までお待ちください。",
  uploadingAudio: "音声をアップロード中...",
  audioUploaded: "音声をアップロードしました。保存後、この問題で使用されます。",
  score: "点数",
  answers: "解答（正解を選択）",
  answerPlaceholder: (index) => `解答 ${index + 1}`,
  correctAnswer: "正解 *",
  aiNotice: "この問題はAIが採点します。学生は固定解答ではなく、作文または音声 transcript を提出します。",
  explanation: "解説",
  hint: "ヒント",
  hintPlaceholder: "1行に1つずつ入力します。例：\n- キーワードを確認\n- 動詞の時制に注意",
  hintHelp: "各行は学生向けに箇条書きで表示されます。",
  cancel: "キャンセル",
  saving: "保存中...",
  save: "変更を保存",
  add: "問題を追加",
  unsupportedAudio: "お使いのブラウザは音声再生に対応していません。",
  removeAudio: "音声を削除",
  kindOptions: [
    { value: "", label: "問題タイプを選択" },
    { value: "MULTIPLE_CHOICE", label: "選択問題" },
    { value: "TRUE_FALSE", label: "正誤問題" },
    { value: "FILL_IN_BLANK", label: "穴埋め" },
    { value: "LISTENING", label: "聞いて答える" },
    { value: "ESSAY", label: "AIライティング" },
    { value: "SPEAKING", label: "AIスピーキング" },
  ],
};

editorLabels.ko = {
  ...editorLabels.en,
  editTitle: "문항 수정",
  addTitle: "새 문항 추가",
  description: "문항 내용과 힌트의 줄바꿈은 그대로 유지됩니다.",
  typeLabel: "문항 유형",
  contentLabel: "문항 내용 *",
  audioLabel: "듣기 오디오 *",
  optionalAudioLabel: "문항 오디오 (선택)",
  uploadAudio: "또는 오디오 파일 업로드",
  audioHint: "MP3, WAV, OGG, WEBM, M4A, AAC를 지원합니다.",
  audioRequired: "오디오 URL을 입력하거나 업로드가 끝날 때까지 기다려 주세요.",
  uploadingAudio: "오디오 업로드 중...",
  audioUploaded: "오디오가 업로드되었습니다. 저장하면 이 파일을 사용합니다.",
  score: "점수",
  answers: "답안 (정답 선택)",
  answerPlaceholder: (index) => `답안 ${index + 1}`,
  correctAnswer: "정답 *",
  aiNotice: "이 문항은 AI가 채점합니다. 학생은 고정 답안 대신 글쓰기 또는 말하기 transcript 를 제출합니다.",
  explanation: "해설",
  hint: "힌트",
  hintPlaceholder: "한 줄에 하나씩 입력하세요. 예:\n- 핵심 단어 찾기\n- 동사 시제 확인",
  hintHelp: "각 줄은 학생에게 글머리표로 표시됩니다.",
  cancel: "취소",
  saving: "저장 중...",
  save: "변경사항 저장",
  add: "문항 추가",
  unsupportedAudio: "브라우저가 오디오 재생을 지원하지 않습니다.",
  removeAudio: "오디오 제거",
  kindOptions: [
    { value: "", label: "문항 유형 선택" },
    { value: "MULTIPLE_CHOICE", label: "객관식" },
    { value: "TRUE_FALSE", label: "참/거짓" },
    { value: "FILL_IN_BLANK", label: "빈칸 채우기" },
    { value: "LISTENING", label: "듣고 답하기" },
    { value: "ESSAY", label: "AI 글쓰기" },
    { value: "SPEAKING", label: "AI 말하기" },
  ],
};

const questionTypeMaps: Record<UiLanguage, Record<string, string>> = {
  vi: {
    MULTIPLE_CHOICE: "Trắc nghiệm",
    TRUE_FALSE: "Đúng/Sai",
    FILL_IN_BLANK: "Điền từ",
    LISTENING: "Nghe và trả lời",
    ESSAY: "Bài viết AI",
    SPEAKING: "Bài nói AI",
  },
  en: {
    MULTIPLE_CHOICE: "Multiple choice",
    TRUE_FALSE: "True/False",
    FILL_IN_BLANK: "Fill in the blank",
    LISTENING: "Listen and answer",
    ESSAY: "AI writing",
    SPEAKING: "AI speaking",
  },
  zh: {
    MULTIPLE_CHOICE: "选择题",
    TRUE_FALSE: "判断题",
    FILL_IN_BLANK: "填空题",
    LISTENING: "听音频回答",
    ESSAY: "AI 写作",
    SPEAKING: "AI 口语",
  },
  ja: {
    MULTIPLE_CHOICE: "選択問題",
    TRUE_FALSE: "正誤問題",
    FILL_IN_BLANK: "穴埋め",
    LISTENING: "聞いて答える",
    ESSAY: "AIライティング",
    SPEAKING: "AIスピーキング",
  },
  ko: {
    MULTIPLE_CHOICE: "객관식",
    TRUE_FALSE: "참/거짓",
    FILL_IN_BLANK: "빈칸 채우기",
    LISTENING: "듣고 답하기",
    ESSAY: "AI 글쓰기",
    SPEAKING: "AI 말하기",
  },
};

const assessmentMaps: Record<UiLanguage, Record<"STANDARD" | "WRITING" | "SPEAKING", string>> = {
  vi: { STANDARD: "Chấm đáp án", WRITING: "Chấm bài viết bằng AI", SPEAKING: "Chấm bài nói bằng AI" },
  en: { STANDARD: "Answer scoring", WRITING: "AI writing scoring", SPEAKING: "AI speaking scoring" },
  zh: { STANDARD: "答案评分", WRITING: "AI 写作评分", SPEAKING: "AI 口语评分" },
  ja: { STANDARD: "解答採点", WRITING: "AIライティング採点", SPEAKING: "AIスピーキング採点" },
  ko: { STANDARD: "답안 채점", WRITING: "AI 글쓰기 채점", SPEAKING: "AI 말하기 채점" },
};

const pageBase: Record<UiLanguage, Omit<QuestionPageLabels, "questionType" | "assessmentPrefix">> = {
  vi: {
    loadTestFailed: "Không thể tải thông tin bài test.",
    uploadMaterialFailed: "Không thể tải tài liệu lên.",
    materialUploaded: "Đã tải tệp lên. Bấm Lưu tài liệu để áp dụng cho đề.",
    saveMaterialFailed: "Không thể lưu tài liệu đề bài.",
    materialSaved: "Đã lưu tài liệu đề bài.",
    noTestAlert: "Không tìm thấy bài test. Vui lòng thử lại.",
    maxScoreAlert: "Tổng điểm câu hỏi đã đạt 100. Hãy sửa hoặc xóa câu hỏi trước khi thêm mới.",
    testMissingAlert: "Bài test không tồn tại hoặc bạn không có quyền truy cập.",
    answerContentRequired: "Vui lòng điền đủ nội dung cho tất cả đáp án",
    chooseCorrectAnswer: "Vui lòng chọn đáp án đúng",
    saveQuestionFailed: "Không thể lưu câu hỏi",
    saveQuestionFallback: "Không thể lưu câu hỏi. Vui lòng thử lại.",
    saveQuestionError: "Lỗi khi lưu câu hỏi.",
    deleteConfirm: "Bạn có chắc chắn muốn xóa câu hỏi này?",
    backToCourse: "Quay lại khóa học",
    courseList: "Danh sách khóa học",
    standaloneTest: "Đề test độc lập",
    coursePrefix: (name) => `Khóa học: ${name}`,
    languagePrefix: (name) => `Ngôn ngữ: ${name}`,
    unassignedLanguage: "Chưa gán",
    addQuestion: "Thêm câu hỏi",
    scoreSummary: (current, max, remaining, ready) =>
      `Tổng điểm hiện tại: ${current} / ${max}. ${ready ? "Đề đã hợp lệ để sử dụng." : remaining > 0 ? `Còn thiếu ${remaining} điểm.` : `Vượt ${Math.abs(remaining)} điểm, cần giảm xuống ${max}.`}`,
    materialTitle: "Tài liệu chung của đề",
    materialDescription: "Passage, ảnh hoặc PDF sẽ nằm ở cột trái; câu hỏi nằm ở cột phải khi học viên làm bài.",
    clearDraft: "Xóa nội dung đang nhập",
    materialTitleLabel: "Tiêu đề tài liệu",
    materialTitlePlaceholder: "Ví dụ: Nineteenth-Century Paperback Literature",
    passageLabel: "Passage hoặc dữ liệu dạng văn bản",
    passagePlaceholder: "Nhập bài đọc, mô tả bảng số liệu hoặc hướng dẫn chung...",
    fileLabel: "Ảnh hoặc PDF",
    removeFile: "Bỏ tệp",
    uploadingFile: "Đang tải tệp...",
    saving: "Đang lưu...",
    saveMaterial: "Lưu tài liệu đề bài",
    previewTitle: "Xem trước cột tài liệu",
    previewEmpty: "Chưa có tài liệu để xem trước.",
    noQuestions: "Chưa có câu hỏi nào",
    points: (score) => `${score} điểm`,
    correctAnswer: "Đáp án:",
    aiQuestionNotice: "Câu hỏi này được AI chấm điểm, không có đáp án đúng/sai cố định.",
    explanation: "Giải thích:",
    edit: "Sửa",
    delete: "Xóa",
    unsupportedAudio: "Trình duyệt của bạn không hỗ trợ phát âm thanh.",
  },
  en: {
    loadTestFailed: "Could not load test details.",
    uploadMaterialFailed: "Could not upload the material.",
    materialUploaded: "File uploaded. Click Save material to apply it to the test.",
    saveMaterialFailed: "Could not save the test material.",
    materialSaved: "Test material saved.",
    noTestAlert: "Test not found. Please try again.",
    maxScoreAlert: "The question total is already 100. Edit or delete a question before adding a new one.",
    testMissingAlert: "The test does not exist or you do not have access.",
    answerContentRequired: "Please fill in every answer option.",
    chooseCorrectAnswer: "Please choose the correct answer.",
    saveQuestionFailed: "Could not save question",
    saveQuestionFallback: "Could not save the question. Please try again.",
    saveQuestionError: "Error while saving the question.",
    deleteConfirm: "Are you sure you want to delete this question?",
    backToCourse: "Back to course",
    courseList: "Course list",
    standaloneTest: "Standalone test",
    coursePrefix: (name) => `Course: ${name}`,
    languagePrefix: (name) => `Language: ${name}`,
    unassignedLanguage: "Unassigned",
    addQuestion: "Add question",
    scoreSummary: (current, max, remaining, ready) =>
      `Current total: ${current} / ${max}. ${ready ? "This test is ready to use." : remaining > 0 ? `${remaining} points remaining.` : `${Math.abs(remaining)} points over; reduce the total to ${max}.`}`,
    materialTitle: "Shared test material",
    materialDescription: "Passages, images, or PDFs appear in the left column; questions appear on the right when students take the test.",
    clearDraft: "Clear draft",
    materialTitleLabel: "Material title",
    materialTitlePlaceholder: "Example: Nineteenth-Century Paperback Literature",
    passageLabel: "Passage or text data",
    passagePlaceholder: "Enter a reading passage, chart description, or general instructions...",
    fileLabel: "Image or PDF",
    removeFile: "Remove file",
    uploadingFile: "Uploading file...",
    saving: "Saving...",
    saveMaterial: "Save test material",
    previewTitle: "Material column preview",
    previewEmpty: "No material to preview yet.",
    noQuestions: "No questions yet",
    points: (score) => `${score} points`,
    correctAnswer: "Answer:",
    aiQuestionNotice: "This question is scored by AI and does not use a fixed right/wrong answer.",
    explanation: "Explanation:",
    edit: "Edit",
    delete: "Delete",
    unsupportedAudio: "Your browser does not support audio playback.",
  },
  zh: {} as Omit<QuestionPageLabels, "questionType" | "assessmentPrefix">,
  ja: {} as Omit<QuestionPageLabels, "questionType" | "assessmentPrefix">,
  ko: {} as Omit<QuestionPageLabels, "questionType" | "assessmentPrefix">,
};

pageBase.zh = {
  ...pageBase.en,
  loadTestFailed: "无法加载测试信息。",
  uploadMaterialFailed: "无法上传材料。",
  materialUploaded: "文件已上传。点击保存材料以应用到测试。",
  saveMaterialFailed: "无法保存测试材料。",
  materialSaved: "测试材料已保存。",
  noTestAlert: "未找到测试，请重试。",
  maxScoreAlert: "题目总分已达到 100。请先编辑或删除题目。",
  testMissingAlert: "测试不存在，或你没有访问权限。",
  answerContentRequired: "请填写所有答案选项。",
  chooseCorrectAnswer: "请选择正确答案。",
  saveQuestionFailed: "无法保存题目",
  saveQuestionFallback: "无法保存题目，请重试。",
  saveQuestionError: "保存题目时出错。",
  deleteConfirm: "确定要删除此题吗？",
  addQuestion: "添加题目",
  backToCourse: "返回课程",
  courseList: "课程列表",
  standaloneTest: "独立测试",
  coursePrefix: (name) => `课程：${name}`,
  languagePrefix: (name) => `语言：${name}`,
  unassignedLanguage: "未设置",
  scoreSummary: (current, max, remaining, ready) =>
    `当前总分：${current} / ${max}。${ready ? "此测试已可使用。" : remaining > 0 ? `还差 ${remaining} 分。` : `超出 ${Math.abs(remaining)} 分，请将总分降至 ${max}。`}`,
  materialTitle: "测试共用材料",
  materialDescription: "文章、图片或 PDF 会显示在左侧；学生答题时题目显示在右侧。",
  clearDraft: "清空草稿",
  materialTitleLabel: "材料标题",
  materialTitlePlaceholder: "例如：十九世纪平装文学",
  passageLabel: "文章或文本数据",
  passagePlaceholder: "输入阅读文章、图表说明或通用说明...",
  fileLabel: "图片或 PDF",
  removeFile: "移除文件",
  uploadingFile: "正在上传文件...",
  saving: "保存中...",
  saveMaterial: "保存测试材料",
  previewTitle: "材料栏预览",
  previewEmpty: "暂无可预览材料。",
  noQuestions: "暂无题目",
  points: (score) => `${score} 分`,
  correctAnswer: "答案：",
  aiQuestionNotice: "此题由 AI 评分，不使用固定的对错答案。",
  explanation: "解析：",
  edit: "编辑",
  delete: "删除",
};

pageBase.ja = {
  ...pageBase.en,
  loadTestFailed: "テスト情報を読み込めませんでした。",
  uploadMaterialFailed: "資料をアップロードできませんでした。",
  materialUploaded: "ファイルをアップロードしました。テストに適用するには資料を保存してください。",
  saveMaterialFailed: "テスト資料を保存できませんでした。",
  materialSaved: "テスト資料を保存しました。",
  noTestAlert: "テストが見つかりません。もう一度お試しください。",
  maxScoreAlert: "問題の合計点はすでに100点です。新規追加前に問題を編集または削除してください。",
  testMissingAlert: "テストが存在しないか、アクセス権限がありません。",
  answerContentRequired: "すべての解答選択肢を入力してください。",
  chooseCorrectAnswer: "正解を選択してください。",
  saveQuestionFailed: "問題を保存できません",
  saveQuestionFallback: "問題を保存できませんでした。もう一度お試しください。",
  saveQuestionError: "問題の保存中にエラーが発生しました。",
  deleteConfirm: "この問題を削除してもよろしいですか？",
  addQuestion: "問題を追加",
  backToCourse: "コースへ戻る",
  courseList: "コース一覧",
  standaloneTest: "単独テスト",
  coursePrefix: (name) => `コース：${name}`,
  languagePrefix: (name) => `言語：${name}`,
  unassignedLanguage: "未設定",
  scoreSummary: (current, max, remaining, ready) =>
    `現在の合計：${current} / ${max}。${ready ? "このテストは使用可能です。" : remaining > 0 ? `あと ${remaining} 点必要です。` : `${Math.abs(remaining)} 点超過しています。合計を ${max} 点に下げてください。`}`,
  materialTitle: "共通テスト資料",
  materialDescription: "文章、画像、PDF は左列に、問題は学生の受験画面の右列に表示されます。",
  clearDraft: "入力内容をクリア",
  materialTitleLabel: "資料タイトル",
  materialTitlePlaceholder: "例：19世紀のペーパーバック文学",
  passageLabel: "文章またはテキストデータ",
  passagePlaceholder: "読解文、表の説明、または共通指示を入力...",
  fileLabel: "画像またはPDF",
  removeFile: "ファイルを削除",
  uploadingFile: "ファイルをアップロード中...",
  saving: "保存中...",
  saveMaterial: "テスト資料を保存",
  previewTitle: "資料列のプレビュー",
  previewEmpty: "プレビューできる資料はまだありません。",
  noQuestions: "問題はまだありません",
  points: (score) => `${score} 点`,
  correctAnswer: "正解：",
  aiQuestionNotice: "この問題はAIが採点するため、固定の正誤解答はありません。",
  explanation: "解説：",
  edit: "編集",
  delete: "削除",
};

pageBase.ko = {
  ...pageBase.en,
  loadTestFailed: "테스트 정보를 불러올 수 없습니다.",
  uploadMaterialFailed: "자료를 업로드할 수 없습니다.",
  materialUploaded: "파일이 업로드되었습니다. 테스트에 적용하려면 자료 저장을 누르세요.",
  saveMaterialFailed: "테스트 자료를 저장할 수 없습니다.",
  materialSaved: "테스트 자료가 저장되었습니다.",
  noTestAlert: "테스트를 찾을 수 없습니다. 다시 시도해 주세요.",
  maxScoreAlert: "문항 총점이 이미 100점입니다. 새 문항을 추가하기 전에 수정하거나 삭제해 주세요.",
  testMissingAlert: "테스트가 존재하지 않거나 접근 권한이 없습니다.",
  answerContentRequired: "모든 답안 선택지를 입력해 주세요.",
  chooseCorrectAnswer: "정답을 선택해 주세요.",
  saveQuestionFailed: "문항을 저장할 수 없습니다",
  saveQuestionFallback: "문항을 저장할 수 없습니다. 다시 시도해 주세요.",
  saveQuestionError: "문항 저장 중 오류가 발생했습니다.",
  deleteConfirm: "이 문항을 삭제하시겠습니까?",
  addQuestion: "문항 추가",
  backToCourse: "코스로 돌아가기",
  courseList: "코스 목록",
  standaloneTest: "독립 테스트",
  coursePrefix: (name) => `코스: ${name}`,
  languagePrefix: (name) => `언어: ${name}`,
  unassignedLanguage: "미지정",
  scoreSummary: (current, max, remaining, ready) =>
    `현재 총점: ${current} / ${max}. ${ready ? "이 테스트는 사용할 수 있습니다." : remaining > 0 ? `${remaining}점이 더 필요합니다.` : `${Math.abs(remaining)}점 초과되었습니다. 총점을 ${max}점으로 낮춰 주세요.`}`,
  materialTitle: "공통 테스트 자료",
  materialDescription: "지문, 이미지 또는 PDF는 왼쪽에, 문항은 학생 응시 화면의 오른쪽에 표시됩니다.",
  clearDraft: "작성 내용 지우기",
  materialTitleLabel: "자료 제목",
  materialTitlePlaceholder: "예: 19세기 페이퍼백 문학",
  passageLabel: "지문 또는 텍스트 자료",
  passagePlaceholder: "읽기 지문, 표 설명 또는 공통 안내를 입력하세요...",
  fileLabel: "이미지 또는 PDF",
  removeFile: "파일 제거",
  uploadingFile: "파일 업로드 중...",
  saving: "저장 중...",
  saveMaterial: "테스트 자료 저장",
  previewTitle: "자료 영역 미리보기",
  previewEmpty: "아직 미리볼 자료가 없습니다.",
  noQuestions: "아직 문항이 없습니다",
  points: (score) => `${score}점`,
  correctAnswer: "정답:",
  aiQuestionNotice: "이 문항은 AI가 채점하며 고정된 정오답을 사용하지 않습니다.",
  explanation: "해설:",
  edit: "수정",
  delete: "삭제",
};

export function getQuestionEditorLabels(languageCode?: string | null): QuestionEditorLabels {
  return editorLabels[normalizeLanguageCode(languageCode)];
}

export function getQuestionPageLabels(languageCode?: string | null): QuestionPageLabels {
  const language = normalizeLanguageCode(languageCode);
  return {
    ...pageBase[language],
    assessmentPrefix: (mode) => {
      const prefix = language === "en" ? "Test type" : language === "vi" ? "Loại đề" : language === "zh" ? "测试类型" : language === "ja" ? "テスト種別" : "테스트 유형";
      return `${prefix}: ${assessmentMaps[language][mode]}`;
    },
    questionType: (question) => {
      const typeKey = question.audioUrl && question.type === "FILL_IN_BLANK" ? "LISTENING" : question.type;
      return questionTypeMaps[language][typeKey];
    },
  };
}
