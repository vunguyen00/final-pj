"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Question = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  order: number;
  score: number;
  explanation: string | null;
  hint: string | null;
  answers: Answer[];
};

type Answer = {
  id: string;
  content: string;
  isCorrect: boolean;
  order: number;
  feedback: string | null;
};

type Test = {
  id: string;
  name: string;
  description: string | null;
  course: {
    id: string;
    name: string;
  };
};

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm", icon: "☑️" },
  { value: "FILL_IN_BLANK", label: "Điền từ", icon: "✏️" },
  { value: "ESSAY", label: "Viết bài văn", icon: "📝" },
  { value: "TRUE_FALSE", label: "Đúng/Sai", icon: "✓✗" },
];

export default function TeacherTestQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [questionForm, setQuestionForm] = useState({
    type: "MULTIPLE_CHOICE",
    content: "",
    audioUrl: "",
    hasListening: false,
    score: "10",
    explanation: "",
    hint: "",
    answers: [] as Answer[],
  });

  useEffect(() => {
    fetchTestAndQuestions();
  }, [testId]);

  const fetchTestAndQuestions = async () => {
    try {
      const [testRes, questionsRes] = await Promise.all([
        fetch(`/api/teacher/tests/${testId}`),
        fetch(`/api/teacher/tests/${testId}/questions`),
      ]);

      if (testRes.ok) {
        const data = await testRes.json();
        setTest(data.test);
      }

      if (questionsRes.ok) {
        const data = await questionsRes.json();
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionForm({
      type: "MULTIPLE_CHOICE",
      content: "",
      audioUrl: "",
      hasListening: false,
      score: "10",
      explanation: "",
      hint: "",
      answers: [],
    });
  };

  const openCreateModal = () => {
    setEditingQuestion(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      type: question.type,
      content: question.content,
      audioUrl: question.audioUrl || "",
      hasListening: !!question.audioUrl,
      score: question.score.toString(),
      explanation: question.explanation || "",
      hint: question.hint || "",
      answers: question.answers || [],
    });
    setShowModal(true);
  };

  const handleTypeChange = (type: string) => {
    setQuestionForm((prev) => {
      let newAnswers: Answer[] = [];
      
      switch (type) {
        case "MULTIPLE_CHOICE":
        case "TRUE_FALSE":
          newAnswers = [
            { id: "1", content: "", isCorrect: false, order: 1, feedback: "" },
            { id: "2", content: "", isCorrect: false, order: 2, feedback: "" },
            { id: "3", content: "", isCorrect: false, order: 3, feedback: "" },
            { id: "4", content: "", isCorrect: false, order: 4, feedback: "" },
          ];
          if (type === "TRUE_FALSE") {
            newAnswers = [
              { id: "1", content: "Đúng", isCorrect: false, order: 1, feedback: "" },
              { id: "2", content: "Sai", isCorrect: false, order: 2, feedback: "" },
            ];
          }
          break;
        case "FILL_IN_BLANK":
        case "ESSAY":
          newAnswers = [
            { id: "1", content: "", isCorrect: true, order: 1, feedback: "" },
          ];
          break;
      }
      
      return { ...prev, type, answers: newAnswers };
    });
  };

  const handleAnswerChange = (index: number, field: keyof Answer, value: any) => {
    setQuestionForm((prev) => {
      const newAnswers = [...prev.answers];
      newAnswers[index] = { ...newAnswers[index], [field]: value };
      return { ...prev, answers: newAnswers };
    });
  };

  const handleSetCorrectAnswer = (index: number) => {
    setQuestionForm((prev) => {
      const newAnswers = prev.answers.map((answer, i) => ({
        ...answer,
        isCorrect: i === index,
      }));
      return { ...prev, answers: newAnswers };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!questionForm.content.trim()) {
      alert("Vui lòng nhập nội dung câu hỏi");
      return;
    }

    if (!questionForm.score || parseFloat(questionForm.score) <= 0) {
      alert("Điểm số phải lớn hơn 0");
      return;
    }

    if (questionForm.hasListening && !questionForm.audioUrl.trim()) {
      alert("Vui lòng nhập URL audio hoặc upload file");
      return;
    }

    if (questionForm.answers.some(a => !a.content.trim())) {
      alert("Vui lòng điền đủ nội dung cho tất cả đáp án");
      return;
    }

    if (questionForm.type === "MULTIPLE_CHOICE" || questionForm.type === "TRUE_FALSE") {
      const hasCorrect = questionForm.answers.some(a => a.isCorrect);
      if (!hasCorrect) {
        alert("Vui lòng chọn đáp án đúng");
        return;
      }
    }

    if ((questionForm.type === "FILL_IN_BLANK" || questionForm.type === "ESSAY") && !questionForm.answers[0]?.content) {
      alert("Vui lòng nhập đáp án đúng");
      return;
    }

    try {
      const url = editingQuestion
        ? `/api/teacher/tests/${testId}/questions/${editingQuestion.id}`
        : `/api/teacher/tests/${testId}/questions`;
      
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionForm,
          audioUrl: questionForm.hasListening ? questionForm.audioUrl : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        setEditingQuestion(null);
        resetForm();
        fetchTestAndQuestions();
      } else {
        alert(data.error || "Không thể lưu câu hỏi. Vui lòng thử lại.");
        console.error("Error response:", data);
      }
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Lỗi khi lưu câu hỏi. Vui lòng kiểm tra console.");
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions/${questionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTestAndQuestions();
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Back button */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/teacher/courses/${test?.course.id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Quay lại khóa học
          </Link>
          <Link
            href="/teacher/courses"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Danh sách khóa học
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{test?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Khóa học: {test?.course.name}
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Thêm câu hỏi
            </button>
          </div>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto h-12 w-12 text-slate-400"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Chưa có câu hỏi nào</h3>
            <p className="mt-2 text-slate-600">Hãy thêm câu hỏi đầu tiên cho bài test</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                        {index + 1}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                      {question.audioUrl && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          🎧 Listening
                        </span>
                      )}
                      <span className="text-sm text-slate-500">
                        {question.score} điểm
                      </span>
                    </div>
                    {question.audioUrl && (
                      <div className="mt-2">
                        <audio controls className="h-8 w-full max-w-md">
                          <source src={question.audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                    <p className="mt-3 text-slate-900">{question.content}</p>
                    
                    {/* Show answers for multiple choice */}
                    {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && 
                      question.answers && (
                        <div className="mt-3 space-y-2">
                          {question.answers.map((answer, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 rounded-lg border p-3 ${
                                answer.isCorrect
                                  ? "border-green-300 bg-green-50"
                                  : "border-slate-200"
                              }`}
                            >
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                answer.isCorrect
                                  ? "border-green-500 bg-green-500 text-white"
                                  : "border-slate-300"
                              }`}>
                                {answer.isCorrect && (
                                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm text-slate-700">{answer.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    
                    {/* Show correct answer for fill in blank / essay */}
                    {(question.type === "FILL_IN_BLANK" || question.type === "ESSAY") && 
                      question.answers && question.answers[0] && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                          <span className="text-sm font-medium text-green-700">Đáp án: </span>
                          <span className="text-sm text-slate-700">{question.answers[0].content}</span>
                        </div>
                      )}
                    
                    {/* Explanation */}
                    {question.explanation && (
                      <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                        <span className="text-sm font-medium text-yellow-700">Giải thích: </span>
                        <span className="text-sm text-slate-700">{question.explanation}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(question)}
                      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">
              {editingQuestion ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Loại câu hỏi
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUESTION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeChange(type.value)}
                      className={`rounded-lg border p-3 text-center transition-colors ${
                        questionForm.type === type.value
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-lg">{type.icon}</div>
                      <div className="mt-1 text-xs font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nội dung câu hỏi *
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionForm.content}
                  onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              {/* Audio URL for Listening */}
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasListening"
                    checked={questionForm.hasListening}
                    onChange={(e) => setQuestionForm({ 
                      ...questionForm, 
                      hasListening: e.target.checked,
                      audioUrl: e.target.checked ? questionForm.audioUrl : ""
                    })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="hasListening" className="text-sm font-medium text-slate-700">
                    Câu hỏi có audio (Listening) 🎧
                  </label>
                </div>
              </div>

              {/* Audio Input - Show only if hasListening is true */}
              {questionForm.hasListening && (
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Chọn cách nhập audio *
                    </label>
                    <div className="mt-2 space-y-3">
                      {/* Link Input */}
                      <div>
                        <label className="text-xs font-medium text-slate-600">Dán link URL:</label>
                        <input
                          type="url"
                          value={questionForm.audioUrl}
                          onChange={(e) => setQuestionForm({ ...questionForm, audioUrl: e.target.value })}
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="https://example.com/audio.mp3"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Ví dụ: https://storage.googleapis.com/audio.mp3
                        </p>
                      </div>

                      {/* File Upload Info */}
                      <div className="rounded bg-white p-3">
                        <p className="text-xs font-medium text-slate-700">📤 Hoặc upload file:</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Tải file lên một dịch vụ lưu trữ (Google Drive, Dropbox, etc.) và dán link vào ô trên.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Score */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Điểm số
                </label>
                <input
                  type="number"
                  value={questionForm.score}
                  onChange={(e) => setQuestionForm({ ...questionForm, score: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Answers for Multiple Choice / True-False */}
              {(questionForm.type === "MULTIPLE_CHOICE" || questionForm.type === "TRUE_FALSE") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Đáp án (chọn đáp án đúng)
                  </label>
                  <div className="mt-2 space-y-2">
                    {questionForm.answers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetCorrectAnswer(index)}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            answer.isCorrect
                              ? "border-green-500 bg-green-500"
                              : "border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {answer.isCorrect && (
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <input
                          type="text"
                          value={answer.content}
                          onChange={(e) => handleAnswerChange(index, "content", e.target.value)}
                          placeholder={`Đáp án ${index + 1}`}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer for Fill in Blank / Essay */}
              {(questionForm.type === "FILL_IN_BLANK" || questionForm.type === "ESSAY") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Đáp án đúng *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={questionForm.answers[0]?.content || ""}
                    onChange={(e) => handleAnswerChange(0, "content", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Nhập đáp án đúng..."
                  />
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Giải thích / Lý do đúng
                </label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Giải thích vì sao đáp án này đúng..."
                />
              </div>

              {/* Hint */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Gợi ý
                </label>
                <input
                  type="text"
                  value={questionForm.hint}
                  onChange={(e) => setQuestionForm({ ...questionForm, hint: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Gợi ý cho học sinh..."
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingQuestion(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {editingQuestion ? "Lưu thay đổi" : "Thêm câu hỏi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}