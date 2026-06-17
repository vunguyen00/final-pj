"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import StarRatingInput from "@/app/components/StarRatingInput";

type AiEvaluation = {
  scoreOnly?: boolean;
  language: string;
  overallScore: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
};

type QuestionResult = {
  questionId: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean | null;
  score: number;
  earnedScore: number;
  explanation: string | null;
  aiEvaluation?: AiEvaluation;
};

type ResultData = {
  attemptId: string;
  score: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  courseId?: string;
  courseName?: string;
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
  scoreOnlyAiFeedback?: boolean;
};

const questionTypes: Record<string, string> = {
  MULTIPLE_CHOICE: "Trắc nghiệm",
  FILL_IN_BLANK: "Điền từ",
  ESSAY: "Bài viết",
  TRUE_FALSE: "Đúng/Sai",
  SPEAKING: "Bài nói",
};

function isQuestionCorrect(question: QuestionResult) {
  if (question.questionType !== "SPEAKING" || !question.aiEvaluation) {
    return question.isCorrect;
  }

  if (question.aiEvaluation.onTopic !== undefined) {
    return question.aiEvaluation.onTopic;
  }

  return (question.aiEvaluation.taskRelevance ?? 0) >= 60;
}

export default function StudentTestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const attemptId = params.attemptId as string;
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        const storedResult = sessionStorage.getItem(`test-result-${attemptId}`);
        if (storedResult) {
          const parsed = JSON.parse(storedResult) as ResultData;
          if (parsed.courseId) {
            setResult(parsed);
          } else {
            const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`, { cache: "no-store" });
            setResult(res.ok ? { ...parsed, ...(await res.json()) } : parsed);
          }
        } else {
          const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`, { cache: "no-store" });
          if (!res.ok) {
            setError("Không tìm thấy kết quả.");
            return;
          }
          setResult(await res.json());
        }
      } catch {
        setError("Không thể tải kết quả.");
      } finally {
        setLoading(false);
      }
    }
    void fetchResult();
  }, [testId, attemptId]);

  const skillBreakdown = useMemo(() => {
    if (!result) return [];
    const groups = new Map<string, { earned: number; max: number }>();
    for (const question of result.questionResults) {
      const key =
        question.questionType === "ESSAY"
          ? "Kỹ năng viết"
          : question.questionType === "SPEAKING"
            ? "Kỹ năng nói"
            : question.questionType === "FILL_IN_BLANK"
              ? "Từ vựng"
              : "Đọc hiểu";
      const current = groups.get(key) ?? { earned: 0, max: 0 };
      current.earned += question.earnedScore;
      current.max += question.score;
      groups.set(key, current);
    }
    return Array.from(groups.entries()).map(([name, value]) => ({
      name,
      score: value.max > 0 ? Math.round((value.earned / value.max) * 100) : 0,
    }));
  }, [result]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <p className="text-red-600">{error || "Không tìm thấy kết quả."}</p>
          <Link href="/student/tests" className="mt-4 inline-block text-blue-600 hover:underline">Quay lại danh sách bài test</Link>
        </div>
      </main>
    );
  }

  const percent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const estimatedLevel = percent >= 85 ? "Nâng cao" : percent >= 70 ? "Trung cấp cao" : percent >= 55 ? "Trung cấp" : percent >= 40 ? "Sơ cấp" : "Mới bắt đầu";
  const weaknesses = skillBreakdown.filter((skill) => skill.score < 70).map((skill) => skill.name);
  const correctAnswers = result.questionResults.filter(
    (question) => isQuestionCorrect(question) === true,
  ).length;
  const hasAiQuestions = result.questionResults.some(
    (question) =>
      question.questionType === "ESSAY" ||
      question.questionType === "SPEAKING",
  );
  const showDetailedGuidance =
    !result.scoreOnlyAiFeedback || !hasAiQuestions;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">Kết quả bài test</p>
              <h1 className="mt-2 text-3xl font-bold">Trình độ ước tính: {estimatedLevel}</h1>
              <p className="mt-2 text-blue-100">
                Điểm {result.score.toFixed(1)} / {result.maxScore} - Đúng {correctAnswers}/{result.totalQuestions} câu
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-5xl font-bold">{percent}%</p>
              <p className={result.isPassed ? "font-semibold text-emerald-200" : "font-semibold text-amber-200"}>
                {result.isPassed ? "Đã đạt yêu cầu" : "Nên ôn tập thêm"}
              </p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-950">Phân tích kỹ năng</h2>
            <div className="mt-4 space-y-4">
              {skillBreakdown.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{skill.name}</span>
                    <span className="text-slate-500">{skill.score}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${skill.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showDetailedGuidance ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-slate-950">Nội dung cần cải thiện</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(weaknesses.length ? weaknesses : ["Chưa phát hiện điểm yếu đáng kể"]).map((item) => (
                    <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{item}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-slate-950">Lộ trình được đề xuất</h2>
                <ol className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>1. Ôn lại các kỹ năng còn yếu bằng bài luyện tập phù hợp.</li>
                  <li>2. Tiếp tục khóa học ở trình độ {estimatedLevel}.</li>
                  <li>3. Làm lại bài đánh giá sau khi hoàn thành chương tiếp theo.</li>
                </ol>
                <Link href="/courses" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Xem khóa học phù hợp</Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 lg:col-span-2">
              <h2 className="font-bold text-violet-950">
                Kết quả miễn phí chỉ bao gồm điểm số
              </h2>
              <p className="mt-2 text-sm leading-6 text-violet-800">
                Chọn Nhận xét AI khi làm bài để xem điểm yếu, lỗi cụ thể,
                hướng cải thiện và bài mẫu.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Xem lại từng câu</h2>
          <div className="mt-4 space-y-4">
            {result.questionResults.map((question, index) => {
              const markedCorrect = isQuestionCorrect(question);

              return (
                <article key={question.questionId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{questionTypes[question.questionType] || question.questionType}</span>
                    <span className="text-sm font-semibold text-slate-500">{question.earnedScore}/{question.score} điểm</span>
                    {markedCorrect !== null ? (
                      <span className={markedCorrect ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-red-600"}>
                        {markedCorrect ? "Đúng" : "Chưa đúng"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-slate-900">{question.content}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p><span className="font-semibold">Câu trả lời của bạn:</span> {question.studentAnswer || "Chưa trả lời"}</p>
                    {question.correctAnswer ? <p className="mt-1"><span className="font-semibold">Đáp án:</span> {question.correctAnswer}</p> : null}
                  </div>
                  {question.aiEvaluation ? (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                      <p className="font-semibold">
<<<<<<< ours
                        {question.aiEvaluation.scoreOnly ? "Điểm AI" : "Phản hồi AI"} - {question.aiEvaluation.language} - {question.aiEvaluation.overallScore}/10
=======
                        {question.aiEvaluation.scoreOnly ? "Kết quả chấm" : "Phản hồi AI"} - {question.aiEvaluation.language} - {question.aiEvaluation.overallScore}/10
>>>>>>> theirs
                        {question.aiEvaluation.band ? ` - ${question.aiEvaluation.band.system} ${question.aiEvaluation.band.level}` : ""}
                      </p>
                      {question.aiEvaluation.scoreOnly ? (
                        <p className="mt-2 text-blue-800">
                          Bạn đã chọn chấm điểm miễn phí. Nhận xét, lỗi chi tiết và
                          bài mẫu chỉ có trong chế độ Nhận xét AI.
                        </p>
                      ) : (
                        <>
                          <p className="mt-2">{question.aiEvaluation.summary}</p>
                          <p className="mt-2 font-semibold">
                            Độ bám đề: {Math.round(question.aiEvaluation.taskRelevance ?? 0)}/100
                          </p>
                        </>
                      )}
                      {!question.aiEvaluation.scoreOnly && question.aiEvaluation.onTopic === false ? (
                        <p className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">
                          Lạc đề: {question.aiEvaluation.offTopicReason || "Câu trả lời chưa đúng trọng tâm đề bài."}
                        </p>
                      ) : null}
                      {!question.aiEvaluation.scoreOnly && question.aiEvaluation.detailedComment ? (
                        <p className="mt-2 leading-6">{question.aiEvaluation.detailedComment}</p>
                      ) : null}
                      {!question.aiEvaluation.scoreOnly && question.aiEvaluation.weaknesses.length ? <p className="mt-2">Cần cải thiện: {question.aiEvaluation.weaknesses.join(", ")}</p> : null}
                      {!question.aiEvaluation.scoreOnly && question.aiEvaluation.suggestions.length ? <p className="mt-2">Đề xuất: {question.aiEvaluation.suggestions.slice(0, 3).join("; ")}</p> : null}
                      {!question.aiEvaluation.scoreOnly && question.aiEvaluation.sampleAnswer ? (
                        <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-slate-800">
                          <p className="font-semibold">Bài mẫu đúng đề</p>
                          <p className="mt-2 whitespace-pre-line leading-6">{question.aiEvaluation.sampleAnswer}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/student/tests" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Quay lại danh sách bài test</Link>
          {result.isPassed && result.courseId ? (
            <Link href={`/courses/${result.courseId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Xem lại khóa học
            </Link>
          ) : null}
          {!result.isPassed ? <Link href={`/student/tests/${testId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Làm lại bài test</Link> : null}
        </div>
      </div>
      {result.isPassed && result.courseId ? (
        <CourseReviewPopup courseId={result.courseId} courseName={result.courseName || "khoa hoc"} />
      ) : null}
    </main>
  );
}

function CourseReviewPopup({ courseId, courseName }: { courseId: string; courseName: string }) {
  const storageKey = `course-review-popup-dismissed-${courseId}`;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkReviewState() {
      if (sessionStorage.getItem(storageKey) === "1") return;

      const response = await fetch(`/api/courses/${courseId}/reviews`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.canReview && !data.myReview) {
        setOpen(true);
      }
    }

    void checkReviewState();
  }, [courseId, storageKey]);

  function closePopup() {
    sessionStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  async function submitReview() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || "Không thể lưu đánh giá.");
        return;
      }

      closePopup();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Hoàn thành khóa học</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Đánh giá {courseName}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Chọn điểm từ 1 đến 5 sao. Bình luận là tùy chọn và bạn có thể sửa lại sau.
            </p>
          </div>
          <button
            type="button"
            onClick={closePopup}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Bỏ qua
          </button>
        </div>

        <StarRatingInput
          value={rating}
          onChange={setRating}
          disabled={submitting}
          className="mt-5"
        />
        <p className="mt-2 text-sm font-semibold text-amber-600">{rating} / 5 sao</p>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          placeholder="Bình luận tùy chọn..."
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={closePopup}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={() => void submitReview()}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {submitting ? "Đang lưu..." : "Gửi đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
}
