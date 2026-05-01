"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Question = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  order: number;
  score: number;
  answers: { id: string; content: string; order: number }[] | null;
};

type TestInfo = {
  id: string;
  name: string;
  description: string | null;
  courseName: string;
  maxScore: number;
  passingScore: number;
  maxAttempts: number;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  remainingAttempts: number;
};

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
  { value: "FILL_IN_BLANK", label: "Điền từ" },
  { value: "ESSAY", label: "Viết bài văn" },
  { value: "TRUE_FALSE", label: "Đúng/Sai" },
];

export default function StudentTakeTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  
  const [test, setTest] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft]);

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/student/tests/${testId}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to load test");
        return;
      }

      setTest(data.test);
      setQuestions(data.questions);
      
      if (data.test.timeLimit) {
        setTimeLeft(data.test.timeLimit * 60);
      }
    } catch (error) {
      console.error("Error fetching test:", error);
      setError("Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`Còn ${unanswered.length} câu chưa trả lời. Bạn có chắc muốn nộp bài?`)) {
        return;
      }
    }

    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/student/tests/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();
      
      if (res.ok) {
        // Store result for result page
        sessionStorage.setItem(`test-result-${data.attemptId}`, JSON.stringify(data));
        router.push(`/student/tests/${testId}/result/${data.attemptId}`);
      } else {
        alert(data.error || "Failed to submit test");
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("Failed to submit test");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-white p-4">
          <div>
            <h1 className="text-xl font-bold text-emerald-900">{test?.name}</h1>
            <p className="mt-1 text-sm text-emerald-600">Khóa học: {test?.courseName}</p>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <div className={`rounded-lg px-4 py-2 text-lg font-bold ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}
            <Link
              href="/student/tests"
              className="rounded-lg border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
            >
              Thoát
            </Link>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-xl border border-emerald-200 bg-white p-6"
            >
              {/* Question Header */}
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                  {index + 1}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {getQuestionTypeLabel(question.type)}
                </span>
                <span className="text-sm text-emerald-600">{question.score} điểm</span>
              </div>

              {/* Audio for Listening */}
              {question.audioUrl && (
                <div className="mt-3">
                  <audio controls className="w-full max-w-md">
                    <source src={question.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Question Content */}
              <p className="mt-3 text-lg text-emerald-900">{question.content}</p>

              {/* Answers */}
              <div className="mt-4">
                {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && question.answers && (
                  <div className="space-y-2">
                    {question.answers.map((answer) => (
                      <label
                        key={answer.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                          answers[question.id] === answer.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={answer.id}
                          checked={answers[question.id] === answer.id}
                          onChange={() => handleAnswerChange(question.id, answer.id)}
                          className="h-4 w-4 text-emerald-600"
                        />
                        <span className="text-emerald-900">{answer.content}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "FILL_IN_BLANK" && (
                  <input
                    type="text"
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Nhập đáp án..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                )}

                {question.type === "ESSAY" && (
                  <textarea
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Viết câu trả lời..."
                    rows={6}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-8 py-3 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Đang nộp bài..." : "Nộp bài"}
          </button>
        </div>
      </div>
    </div>
  );
}