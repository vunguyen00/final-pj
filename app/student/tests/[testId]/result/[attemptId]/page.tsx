"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AiEvaluation = {
  language: string;
  overallScore: number;
  band?: {
    system: string;
    level: string;
    score: number;
    rationale: string;
  };
  taskRequirements?: {
    promptUnderstanding: string;
    addressedPoints: string[];
    missingPoints: string[];
  };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
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
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
};

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trac nghiem" },
  { value: "FILL_IN_BLANK", label: "Dien tu" },
  { value: "ESSAY", label: "Viet bai" },
  { value: "TRUE_FALSE", label: "Dung/Sai" },
];

export default function StudentTestResultPage() {
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
      const storedResult = sessionStorage.getItem(`test-result-${attemptId}`);
      if (storedResult) {
        setResult(JSON.parse(storedResult));
      } else {
        const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        } else {
          setError("Khong tim thay ket qua");
        }
      }
    } catch (err) {
      console.error("Error fetching result:", err);
      setError("Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    return QUESTION_TYPES.find((t) => t.value === type)?.label || type;
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
          <p className="text-red-600">{error || "Khong tim thay ket qua"}</p>
          <Link href="/student/tests" className="mt-4 text-emerald-600 hover:underline">
            ← Quay lai danh sach test
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div
          className={`mb-6 rounded-xl border-2 p-6 text-center ${
            result.isPassed ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
          }`}
        >
          <h1 className="text-2xl font-bold text-emerald-900">
            {result.isPassed ? "Chuc mung! Ban da dat" : "Chua dat"}
          </h1>
          <div className="mt-4 text-4xl font-bold text-emerald-900">
            {result.score.toFixed(1)} / {result.maxScore}
          </div>
          <p className="mt-2 text-emerald-700">
            Diem dat: {result.passingScore} • Ban da tra loi dung {result.correctAnswers}/{result.totalQuestions} cau
          </p>
        </div>

        <div className="mb-6 flex justify-center gap-4">
          <Link
            href="/student/tests"
            className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700"
          >
            ← Danh sach bai test
          </Link>
          {!result.isPassed && (
            <Link
              href={`/student/tests/${testId}`}
              className="rounded-lg border border-emerald-300 px-6 py-2 font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Lam lai
            </Link>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-emerald-900">Chi tiet bai lam</h2>
          {result.questionResults.map((question, index) => {
            const isEssay = question.questionType === "ESSAY";

            return (
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
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      question.isCorrect === true
                        ? "bg-green-100 text-green-700"
                        : question.isCorrect === false
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {getQuestionTypeLabel(question.questionType)}
                  </span>
                  <span className="text-sm text-emerald-600">
                    {question.earnedScore}/{question.score} diem
                  </span>
                  {!isEssay && question.isCorrect === true && <span className="text-green-600">✓ Dung</span>}
                  {!isEssay && question.isCorrect === false && <span className="text-red-600">✗ Sai</span>}
                </div>

                <p className="mt-3 text-emerald-900">{question.content}</p>

                <div className="mt-4 space-y-2">
                  {question.questionType === "MULTIPLE_CHOICE" || question.questionType === "TRUE_FALSE" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-emerald-700">Ban chon:</span>
                        <span className={question.isCorrect === true ? "text-green-700" : "text-red-700"}>
                          {question.studentAnswer || "(Khong chon)"}
                        </span>
                      </div>
                      {question.correctAnswer && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-emerald-700">Dap an dung:</span>
                          <span className="text-green-700">{question.correctAnswer}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <span className="text-sm font-medium text-emerald-700">Cau tra loi cua ban:</span>
                      <p className="mt-1 rounded bg-slate-50 p-3 text-emerald-900">
                        {question.studentAnswer || "(Khong tra loi)"}
                      </p>
                    </div>
                  )}
                </div>

                {question.questionType === "ESSAY" && question.aiEvaluation && (
                  <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div>
                      <h4 className="font-semibold text-blue-900">Danh gia bai viet</h4>
                      <p className="mt-1 text-sm text-blue-700">
                        Ngon ngu: {question.aiEvaluation.language} • Diem: {question.aiEvaluation.overallScore}/10
                      </p>
                      {question.aiEvaluation.band && (
                        <p className="mt-1 text-sm text-blue-700">
                          Band {question.aiEvaluation.band.system}: {question.aiEvaluation.band.level} ({question.aiEvaluation.band.score})
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-blue-900">Tom tat:</p>
                      <p className="mt-1 text-sm text-blue-800">{question.aiEvaluation.summary}</p>
                    </div>

                    {question.aiEvaluation.taskRequirements && (
                      <div>
                        <p className="text-sm font-medium text-blue-900">Bam sat yeu cau de bai:</p>
                        {question.aiEvaluation.taskRequirements.promptUnderstanding && (
                          <p className="mt-1 text-sm text-blue-800">
                            {question.aiEvaluation.taskRequirements.promptUnderstanding}
                          </p>
                        )}
                        {question.aiEvaluation.taskRequirements.missingPoints.length > 0 && (
                          <>
                            <p className="mt-2 text-sm font-medium text-red-700">Phan con thieu:</p>
                            <ul className="mt-1 space-y-1">
                              {question.aiEvaluation.taskRequirements.missingPoints.map((point, i) => (
                                <li key={i} className="text-sm text-blue-800">• {point}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}

                    {question.aiEvaluation.weaknesses.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-orange-700">Diem yeu:</p>
                        <ul className="mt-1 space-y-1">
                          {question.aiEvaluation.weaknesses.map((weakness, i) => (
                            <li key={i} className="text-sm text-blue-800">• {weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(question.aiEvaluation.corrections || []).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-700">Loi sai o dau va sua nhu the nao:</p>
                        <ul className="mt-1 space-y-2">
                          {(question.aiEvaluation.corrections || []).slice(0, 5).map((c, i) => (
                            <li key={i} className="rounded bg-white p-2 text-sm text-blue-800">
                              <p><span className="font-medium">Sai:</span> {c.original}</p>
                              <p><span className="font-medium">Sua:</span> {c.improved}</p>
                              <p><span className="font-medium">Ly do:</span> {c.reason}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {question.aiEvaluation.suggestions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-blue-900">Goi y viet hay hon:</p>
                        <ul className="mt-1 space-y-1">
                          {question.aiEvaluation.suggestions.map((suggestion, i) => (
                            <li key={i} className="text-sm text-blue-800">• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
