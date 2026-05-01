"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
};

type ResultData = {
  attemptId: string;
  score: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
};

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
  { value: "FILL_IN_BLANK", label: "Điền từ" },
  { value: "ESSAY", label: "Viết bài văn" },
  { value: "TRUE_FALSE", label: "Đúng/Sai" },
];

export default function StudentTestResultPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  const attemptId = params.attemptId as string;
  
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResult();
  }, [testId, attemptId]);

  const fetchResult = async () => {
    try {
      // For now, we'll get the result from the submit response stored in sessionStorage
      // In a real app, you'd have an API to get the result by attemptId
      const storedResult = sessionStorage.getItem(`test-result-${attemptId}`);
      if (storedResult) {
        setResult(JSON.parse(storedResult));
      } else {
        // Fallback: try to get from API
        const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        } else {
          setError("Không tìm thấy kết quả");
        }
      }
    } catch (error) {
      console.error("Error fetching result:", error);
      setError("Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Không tìm thấy kết quả"}</p>
          <Link href="/student/tests" className="mt-4 text-emerald-600 hover:underline">
            ← Quay lại danh sách test
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Result Summary */}
        <div className={`mb-6 rounded-xl border-2 p-6 text-center ${
          result.isPassed 
            ? "border-green-500 bg-green-50" 
            : "border-red-500 bg-red-50"
        }`}>
          <div className="text-6xl mb-4">
            {result.isPassed ? "🎉" : "😢"}
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">
            {result.isPassed ? "Chúc mừng! Bạn đã đạt" : "Chưa đạt"}
          </h1>
          <div className="mt-4 text-4xl font-bold text-emerald-900">
            {result.score.toFixed(1)} / {result.maxScore}
          </div>
          <p className="mt-2 text-emerald-700">
            Điểm đạt: {result.passingScore} • Bạn đã trả lời đúng {result.correctAnswers}/{result.totalQuestions} câu
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-center gap-4">
          <Link
            href="/student/tests"
            className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700"
          >
            ← Danh sách bài test
          </Link>
          {!result.isPassed && (
            <Link
              href={`/student/tests/${testId}`}
              className="rounded-lg border border-emerald-300 px-6 py-2 font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Làm lại
            </Link>
          )}
        </div>

        {/* Question Results */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-emerald-900">Chi tiết bài làm</h2>
          {result.questionResults.map((question, index) => (
            <div
              key={question.questionId}
              className={`rounded-xl border p-6 ${
                question.isCorrect === true
                  ? "border-green-200 bg-white"
                  : question.isCorrect === false
                  ? "border-red-200 bg-white"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-center gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  question.isCorrect === true
                    ? "bg-green-100 text-green-700"
                    : question.isCorrect === false
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {index + 1}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {getQuestionTypeLabel(question.questionType)}
                </span>
                <span className="text-sm text-emerald-600">
                  {question.earnedScore}/{question.score} điểm
                </span>
                {question.isCorrect === true && (
                  <span className="text-green-600">✓ Đúng</span>
                )}
                {question.isCorrect === false && (
                  <span className="text-red-600">✗ Sai</span>
                )}
                {question.isCorrect === null && (
                  <span className="text-yellow-600">⏳ Chờ chấm</span>
                )}
              </div>

              {/* Question Content */}
              <p className="mt-3 text-emerald-900">{question.content}</p>

              {/* Answers */}
              <div className="mt-4 space-y-2">
                {question.questionType === "MULTIPLE_CHOICE" || question.questionType === "TRUE_FALSE" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-700">Bạn chọn:</span>
                      <span className={question.isCorrect === true ? "text-green-700" : "text-red-700"}>
                        {question.studentAnswer || "(Không chọn)"}
                      </span>
                    </div>
                    {question.correctAnswer && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-emerald-700">Đáp án đúng:</span>
                        <span className="text-green-700">{question.correctAnswer}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium text-emerald-700">Câu trả lời của bạn:</span>
                      <p className="mt-1 rounded bg-slate-50 p-3 text-emerald-900">
                        {question.studentAnswer || "(Không trả lời)"}
                      </p>
                    </div>
                    {question.correctAnswer && (
                      <div>
                        <span className="text-sm font-medium text-emerald-700">Đáp án đúng:</span>
                        <p className="mt-1 rounded bg-green-50 p-3 text-green-800">
                          {question.correctAnswer}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Explanation */}
              {question.explanation && (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <span className="text-sm font-medium text-yellow-700">Giải thích:</span>
                  <p className="mt-1 text-sm text-emerald-800">{question.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}