export type TeacherEntranceSecurityLabels = {
  mandatory: string;
  rulesTitle: string;
  failureRule: string;
  rules: string[];
  consent: string;
  cameraReady: string;
  requestingCamera: string;
  startFullscreen: string;
  retryCamera: string;
  grantCamera: string;
  lockedTitle: string;
  lockedBody: string;
  reenterFullscreen: string;
  failedTitle: string;
  failedBody: string;
  redirecting: string;
  violationCounter: (count: number, max: number) => string;
  cameraState: Record<"active" | "requesting" | "unavailable" | "idle", string>;
  violationPrefix: (count: number, max: number) => string;
  warningPrefix: string;
  failedNotice: string;
  cameraPermissionError: string;
  multipleDisplaysError: string;
  startError: string;
  reenterError: string;
  getQuestion: string;
  speakingRevealNotice: (preparationSeconds: number, answerSeconds: number) => string;
  writingRevealNotice: (answerSeconds: number) => string;
  startQuestion: string;
  preparationRemaining: (seconds: number) => string;
  answerRemaining: (seconds: number) => string;
  questionExpired: string;
  revealFailed: string;
  eventFallback: string;
  eventMessages: Record<string, string>;
};

const vi: TeacherEntranceSecurityLabels = {
  mandatory: "Quy định bắt buộc",
  rulesTitle: "Quy định chống gian lận bài kiểm tra đầu vào",
  failureRule: "Mỗi lần thoát toàn màn hình hoặc chuyển sang cửa sổ khác được tính là một vi phạm. Đủ 3 vi phạm, bài kiểm tra bị đánh trượt tự động.",
  rules: [
    "Bạn phải tự làm bài, không nhận hỗ trợ hoặc để người khác làm thay.",
    "Không chuyển tab, cửa sổ, ứng dụng khác hoặc thoát toàn màn hình.",
    "Không dùng điện thoại, tài liệu, công cụ AI hoặc công cụ dành cho nhà phát triển.",
    "Camera phải hoạt động trong toàn bộ thời gian làm bài.",
  ],
  consent: "Tôi đã đọc, đồng ý bật camera và hiểu rằng 3 vi phạm sẽ khiến bài kiểm tra bị đánh trượt.",
  cameraReady: "Camera đã sẵn sàng. Vào toàn màn hình để bắt đầu bài kiểm tra.",
  requestingCamera: "Đang yêu cầu quyền camera...",
  startFullscreen: "Vào toàn màn hình và bắt đầu bài kiểm tra",
  retryCamera: "Thử cấp quyền camera lại",
  grantCamera: "Cấp quyền camera",
  lockedTitle: "Bài kiểm tra đang bị khóa",
  lockedBody: "Bạn đã rời toàn màn hình. Nội dung câu hỏi được che và phần trả lời bị khóa cho đến khi bạn vào lại toàn màn hình.",
  reenterFullscreen: "Vào lại toàn màn hình",
  failedTitle: "Bài kiểm tra đã bị đánh trượt",
  failedBody: "Hệ thống đã ghi nhận đủ 3 vi phạm. Câu trả lời hiện tại đã được lưu và không thể tiếp tục chỉnh sửa.",
  redirecting: "Đang chuyển đến trang kết quả...",
  violationCounter: (count, max) => `Vi phạm: ${count}/${max}`,
  cameraState: { active: "đang giám sát", requesting: "đang yêu cầu quyền", unavailable: "không khả dụng", idle: "chưa bật" },
  violationPrefix: (count, max) => `Vi phạm ${count}/${max}`,
  warningPrefix: "Cảnh báo",
  failedNotice: "Bài kiểm tra đã bị đánh trượt do đạt 3 lần vi phạm.",
  cameraPermissionError: "Không thể truy cập camera. Vui lòng cấp quyền camera trong trình duyệt rồi thử lại.",
  multipleDisplaysError: "Thiết bị đang kết nối nhiều màn hình. Vui lòng ngắt màn hình phụ trước khi bắt đầu.",
  startError: "Không thể bắt đầu phiên thi toàn màn hình. Vui lòng kiểm tra quyền trình duyệt rồi thử lại.",
  reenterError: "Không thể vào lại toàn màn hình. Hãy kiểm tra quyền trình duyệt rồi thử lại.",
  getQuestion: "Lấy câu hỏi",
  speakingRevealNotice: (prep, answer) => `Sau khi bắt đầu, bạn có ${Math.ceil(prep / 60)} phút chuẩn bị và ${Math.ceil(answer / 60)} phút để nói. Đồng hồ không thể đặt lại.`,
  writingRevealNotice: (answer) => `Sau khi bắt đầu, bạn có tối đa ${Math.ceil(answer / 60)} phút để hoàn thành bài viết. Đồng hồ không thể đặt lại.`,
  startQuestion: "Hiển thị câu hỏi và bắt đầu tính giờ",
  preparationRemaining: (seconds) => `Thời gian chuẩn bị còn ${seconds} giây`,
  answerRemaining: (seconds) => `Thời gian trả lời còn ${seconds} giây`,
  questionExpired: "Đã hết thời gian trả lời câu hỏi này.",
  revealFailed: "Không thể lấy câu hỏi. Vui lòng thử lại.",
  eventFallback: "Hệ thống đã ghi nhận một hành vi cần chú ý.",
  eventMessages: {
    TAB_HIDDEN: "Bạn đã chuyển khỏi tab bài kiểm tra.",
    WINDOW_BLUR: "Cửa sổ bài kiểm tra đã mất trạng thái hoạt động.",
    FULLSCREEN_EXIT: "Bạn đã thoát chế độ toàn màn hình.",
    CAMERA_DISABLED: "Camera đã bị tắt trong lúc làm bài.",
    MULTIPLE_DISPLAYS: "Hệ thống phát hiện thiết bị đang sử dụng nhiều màn hình.",
    MULTIPLE_EXAM_SESSIONS: "Hệ thống phát hiện nhiều phiên làm bài đồng thời.",
    PROCTOR_HEARTBEAT_GAP: "Kết nối giám sát đã bị gián đoạn.",
  },
};

const en: TeacherEntranceSecurityLabels = {
  mandatory: "Mandatory rules",
  rulesTitle: "Teacher entrance test integrity rules",
  failureRule: "Each fullscreen exit or switch to another window counts as one violation. Three violations automatically fail the test.",
  rules: ["Complete the test yourself without assistance.", "Do not switch tabs, windows, apps, or exit fullscreen.", "Do not use a phone, reference material, AI, or developer tools.", "Keep the camera active throughout the test."],
  consent: "I have read the rules, agree to use the camera, and understand that three violations will fail the test.",
  cameraReady: "Camera ready. Enter fullscreen to start the test.",
  requestingCamera: "Requesting camera permission...",
  startFullscreen: "Enter fullscreen and start",
  retryCamera: "Retry camera permission",
  grantCamera: "Grant camera permission",
  lockedTitle: "Test locked",
  lockedBody: "You left fullscreen. Questions are concealed and answers remain locked until you return to fullscreen.",
  reenterFullscreen: "Return to fullscreen",
  failedTitle: "Test failed",
  failedBody: "Three violations were recorded. Your current answers were saved and can no longer be edited.",
  redirecting: "Redirecting to results...",
  violationCounter: (count, max) => `Violations: ${count}/${max}`,
  cameraState: { active: "monitoring", requesting: "requesting permission", unavailable: "unavailable", idle: "not enabled" },
  violationPrefix: (count, max) => `Violation ${count}/${max}`,
  warningPrefix: "Warning",
  failedNotice: "The test was failed after three violations.",
  cameraPermissionError: "Camera access failed. Grant camera permission in your browser and try again.",
  multipleDisplaysError: "Multiple displays are connected. Disconnect secondary displays before starting.",
  startError: "Could not start the fullscreen session. Check browser permissions and try again.",
  reenterError: "Could not return to fullscreen. Check browser permissions and try again.",
  getQuestion: "Get question",
  speakingRevealNotice: (prep, answer) => `After starting, you have ${Math.ceil(prep / 60)} minute(s) to prepare and ${Math.ceil(answer / 60)} minute(s) to speak. The timer cannot be reset.`,
  writingRevealNotice: (answer) => `After starting, you have up to ${Math.ceil(answer / 60)} minute(s) to complete the writing task. The timer cannot be reset.`,
  startQuestion: "Show question and start timer",
  preparationRemaining: (seconds) => `${seconds} seconds of preparation remaining`,
  answerRemaining: (seconds) => `${seconds} seconds to answer`,
  questionExpired: "The answer time for this question has ended.",
  revealFailed: "Could not retrieve the question. Please try again.",
  eventFallback: "The system recorded an event that requires attention.",
  eventMessages: { TAB_HIDDEN: "You switched away from the test tab.", WINDOW_BLUR: "The test window lost focus.", FULLSCREEN_EXIT: "You exited fullscreen.", CAMERA_DISABLED: "The camera was disabled during the test.", MULTIPLE_DISPLAYS: "Multiple displays were detected.", MULTIPLE_EXAM_SESSIONS: "Multiple test sessions were detected.", PROCTOR_HEARTBEAT_GAP: "The monitoring connection was interrupted." },
};

const zh: TeacherEntranceSecurityLabels = {
  ...en,
  mandatory: "强制规则", rulesTitle: "教师入职测试防作弊规则", failureRule: "每次退出全屏或切换到其他窗口均计为一次违规。累计三次将自动判定测试不合格。",
  rules: ["必须独立完成测试，不得接受他人协助。", "不得切换标签页、窗口、应用或退出全屏。", "不得使用手机、资料、AI 或开发者工具。", "测试期间必须保持摄像头开启。"],
  consent: "我已阅读规则，同意开启摄像头，并理解三次违规将导致测试不合格。", cameraReady: "摄像头已就绪。请进入全屏开始测试。", requestingCamera: "正在请求摄像头权限...", startFullscreen: "进入全屏并开始测试", retryCamera: "重新授予摄像头权限", grantCamera: "授予摄像头权限",
  lockedTitle: "测试已锁定", lockedBody: "你已离开全屏。返回全屏前，题目将被遮挡且无法作答。", reenterFullscreen: "返回全屏", failedTitle: "测试不合格", failedBody: "系统已记录三次违规。当前答案已保存，无法继续修改。", redirecting: "正在跳转到结果页面...",
  violationCounter: (count, max) => `违规：${count}/${max}`, cameraState: { active: "监控中", requesting: "正在请求权限", unavailable: "不可用", idle: "未开启" }, violationPrefix: (count, max) => `违规 ${count}/${max}`, warningPrefix: "警告", failedNotice: "因累计三次违规，本次测试已判定不合格。",
  cameraPermissionError: "无法访问摄像头。请在浏览器中授予权限后重试。", multipleDisplaysError: "检测到多个显示器。请断开副屏后再开始。", startError: "无法启动全屏测试。请检查浏览器权限后重试。", reenterError: "无法返回全屏。请检查浏览器权限后重试。",
  getQuestion: "获取题目", speakingRevealNotice: (prep, answer) => `开始后，你有 ${Math.ceil(prep / 60)} 分钟准备和 ${Math.ceil(answer / 60)} 分钟作答。计时器无法重置。`, writingRevealNotice: (answer) => `开始后，你最多有 ${Math.ceil(answer / 60)} 分钟完成写作。计时器无法重置。`, startQuestion: "显示题目并开始计时", preparationRemaining: (seconds) => `准备时间剩余 ${seconds} 秒`, answerRemaining: (seconds) => `作答时间剩余 ${seconds} 秒`, questionExpired: "本题作答时间已结束。", revealFailed: "无法获取题目，请重试。",
  eventFallback: "系统已记录一项需要注意的行为。",
  eventMessages: { TAB_HIDDEN: "你已离开测试标签页。", WINDOW_BLUR: "测试窗口已失去焦点。", FULLSCREEN_EXIT: "你已退出全屏。", CAMERA_DISABLED: "测试期间摄像头被关闭。", MULTIPLE_DISPLAYS: "检测到多个显示器。", MULTIPLE_EXAM_SESSIONS: "检测到多个测试会话。", PROCTOR_HEARTBEAT_GAP: "监控连接已中断。" },
};

const ja: TeacherEntranceSecurityLabels = {
  ...en,
  mandatory: "必須ルール", rulesTitle: "講師入職テストの不正防止規定", failureRule: "全画面の終了または別ウィンドウへの切り替えは、その都度1回の違反として記録されます。3回で自動的に不合格になります。",
  rules: ["他者の助けを借りず、自分で受験してください。", "タブ、ウィンドウ、アプリを切り替えたり、全画面を終了したりしないでください。", "スマートフォン、資料、AI、開発者ツールを使用しないでください。", "受験中はカメラを常に有効にしてください。"],
  consent: "規定を読み、カメラの使用に同意し、3回の違反で不合格になることを理解しました。", cameraReady: "カメラの準備ができました。全画面でテストを開始してください。", requestingCamera: "カメラの許可を要求しています...", startFullscreen: "全画面でテストを開始", retryCamera: "カメラの許可を再試行", grantCamera: "カメラを許可",
  lockedTitle: "テストはロックされています", lockedBody: "全画面を離れました。全画面に戻るまで問題は隠され、回答はロックされます。", reenterFullscreen: "全画面に戻る", failedTitle: "テスト不合格", failedBody: "3回の違反が記録されました。現在の回答は保存され、編集できません。", redirecting: "結果ページへ移動しています...",
  violationCounter: (count, max) => `違反：${count}/${max}`, cameraState: { active: "監視中", requesting: "許可を要求中", unavailable: "利用不可", idle: "未使用" }, violationPrefix: (count, max) => `違反 ${count}/${max}`, warningPrefix: "警告", failedNotice: "3回の違反によりテストは不合格になりました。",
  cameraPermissionError: "カメラにアクセスできません。ブラウザで許可して再試行してください。", multipleDisplaysError: "複数のディスプレイが接続されています。副画面を外してから開始してください。", startError: "全画面テストを開始できません。ブラウザの権限を確認してください。", reenterError: "全画面に戻れません。ブラウザの権限を確認してください。",
  getQuestion: "問題を取得", speakingRevealNotice: (prep, answer) => `開始後、準備時間は ${Math.ceil(prep / 60)} 分、発話時間は ${Math.ceil(answer / 60)} 分です。タイマーはリセットできません。`, writingRevealNotice: (answer) => `開始後、作文の制限時間は最大 ${Math.ceil(answer / 60)} 分です。タイマーはリセットできません。`, startQuestion: "問題を表示して計時開始", preparationRemaining: (seconds) => `準備時間：残り${seconds}秒`, answerRemaining: (seconds) => `回答時間：残り${seconds}秒`, questionExpired: "この問題の回答時間は終了しました。", revealFailed: "問題を取得できません。もう一度お試しください。",
  eventFallback: "注意が必要な操作を記録しました。",
  eventMessages: { TAB_HIDDEN: "テストのタブから離れました。", WINDOW_BLUR: "テストウィンドウがフォーカスを失いました。", FULLSCREEN_EXIT: "全画面を終了しました。", CAMERA_DISABLED: "受験中にカメラが無効になりました。", MULTIPLE_DISPLAYS: "複数のディスプレイを検出しました。", MULTIPLE_EXAM_SESSIONS: "複数の受験セッションを検出しました。", PROCTOR_HEARTBEAT_GAP: "監視接続が中断されました。" },
};

const ko: TeacherEntranceSecurityLabels = {
  ...en,
  mandatory: "필수 규정", rulesTitle: "강사 입문 시험 부정행위 방지 규정", failureRule: "전체 화면 종료 또는 다른 창으로 전환할 때마다 1회 위반으로 기록됩니다. 3회 위반 시 자동 불합격 처리됩니다.",
  rules: ["다른 사람의 도움 없이 직접 시험에 응시해야 합니다.", "탭, 창, 앱을 전환하거나 전체 화면을 종료하지 마세요.", "휴대전화, 자료, AI 또는 개발자 도구를 사용하지 마세요.", "시험 중에는 카메라를 계속 켜 두세요."],
  consent: "규정을 읽었고 카메라 사용에 동의하며, 3회 위반 시 불합격 처리됨을 이해했습니다.", cameraReady: "카메라가 준비되었습니다. 전체 화면으로 시험을 시작하세요.", requestingCamera: "카메라 권한 요청 중...", startFullscreen: "전체 화면으로 시험 시작", retryCamera: "카메라 권한 다시 요청", grantCamera: "카메라 권한 허용",
  lockedTitle: "시험이 잠겼습니다", lockedBody: "전체 화면을 벗어났습니다. 다시 전체 화면으로 돌아올 때까지 문제가 가려지고 답안이 잠깁니다.", reenterFullscreen: "전체 화면으로 돌아가기", failedTitle: "시험 불합격", failedBody: "3회의 위반이 기록되었습니다. 현재 답안은 저장되었으며 더 이상 수정할 수 없습니다.", redirecting: "결과 페이지로 이동 중...",
  violationCounter: (count, max) => `위반: ${count}/${max}`, cameraState: { active: "감독 중", requesting: "권한 요청 중", unavailable: "사용 불가", idle: "꺼짐" }, violationPrefix: (count, max) => `위반 ${count}/${max}`, warningPrefix: "경고", failedNotice: "3회 위반으로 시험이 불합격 처리되었습니다.",
  cameraPermissionError: "카메라에 접근할 수 없습니다. 브라우저 권한을 허용한 후 다시 시도하세요.", multipleDisplaysError: "여러 디스플레이가 연결되어 있습니다. 보조 화면을 분리한 후 시작하세요.", startError: "전체 화면 시험을 시작할 수 없습니다. 브라우저 권한을 확인하세요.", reenterError: "전체 화면으로 돌아갈 수 없습니다. 브라우저 권한을 확인하세요.",
  getQuestion: "문제 받기", speakingRevealNotice: (prep, answer) => `시작 후 준비 시간 ${Math.ceil(prep / 60)}분, 말하기 시간 ${Math.ceil(answer / 60)}분이 주어집니다. 타이머는 초기화할 수 없습니다.`, writingRevealNotice: (answer) => `시작 후 최대 ${Math.ceil(answer / 60)}분 안에 작문을 완료해야 합니다. 타이머는 초기화할 수 없습니다.`, startQuestion: "문제 표시 및 타이머 시작", preparationRemaining: (seconds) => `준비 시간 ${seconds}초 남음`, answerRemaining: (seconds) => `답변 시간 ${seconds}초 남음`, questionExpired: "이 문제의 답변 시간이 종료되었습니다.", revealFailed: "문제를 가져올 수 없습니다. 다시 시도하세요.",
  eventFallback: "주의가 필요한 동작이 기록되었습니다.",
  eventMessages: { TAB_HIDDEN: "시험 탭을 벗어났습니다.", WINDOW_BLUR: "시험 창이 포커스를 잃었습니다.", FULLSCREEN_EXIT: "전체 화면을 종료했습니다.", CAMERA_DISABLED: "시험 중 카메라가 꺼졌습니다.", MULTIPLE_DISPLAYS: "여러 디스플레이가 감지되었습니다.", MULTIPLE_EXAM_SESSIONS: "여러 시험 세션이 감지되었습니다.", PROCTOR_HEARTBEAT_GAP: "감독 연결이 중단되었습니다." },
};

export function getTeacherEntranceSecurityLabels(languageCode?: string | null) {
  const code = String(languageCode || "").toLowerCase();
  if (code.startsWith("zh")) return zh;
  if (code.startsWith("ja")) return ja;
  if (code.startsWith("ko")) return ko;
  if (code.startsWith("en")) return en;
  return vi;
}
