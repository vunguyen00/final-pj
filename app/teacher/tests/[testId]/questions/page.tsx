"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionModal } from "./components/QuestionModal";
import { createDefaultForm, inferKindFromQuestion, mapKindToPayload } from "./helpers";
import { Question, QuestionForm, QuestionKind, Test } from "./types";

export default function TeacherTestQuestionsPage() {
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(createDefaultForm());
  const [pageError, setPageError] = useState<string | null>(null);
  const isWritingCourse = (test?.course.category || "").trim().toLowerCase() === "writing";

  useEffect(() => {
    void fetchTestAndQuestions();
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
        setPageError(null);
      } else {
        const data = await testRes.json().catch(() => ({}));
        setPageError(data?.error || "Không thể tải thông tin bài test.");
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

  const resetForm = () => setQuestionForm(createDefaultForm());

  const openCreateModal = () => {
    if (!test) {
      alert("Không tìm thấy bài test. Vui lòng quay lại danh sách bài test và mở lại.");
      return;
    }
    setEditingQuestion(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (question: Question) => {
    const kind = inferKindFromQuestion(question);
    setEditingQuestion(question);
    setQuestionForm({
      kind,
      type: question.type,
      content: question.content,
      audioUrl: question.audioUrl || "",
      hasListening: Boolean(question.audioUrl),
      score: String(question.score),
      explanation: question.explanation || "",
      hint: question.hint || "",
      answers: question.answers || [],
    });
    setShowModal(true);
  };

  const validateForm = (form: QuestionForm): string | null => {
    if (!form.kind) return "Vui lòng chọn dạng câu hỏi";
    if (!form.content.trim()) return "Vui lòng nhập nội dung câu hỏi";
    if (!form.score || Number(form.score) <= 0) return "Điểm số phải lớn hơn 0";
    if (form.kind === "ESSAY" && !isWritingCourse) return "Dạng tự luận chỉ áp dụng cho khóa học Writing";
    if (form.kind === "LISTENING" && !form.audioUrl.trim()) return "Vui lòng nhập URL audio";

    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && form.answers.some((a) => !a.content.trim())) {
      return "Vui lòng điền đủ nội dung cho tất cả đáp án";
    }
    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && !form.answers.some((a) => a.isCorrect)) {
      return "Vui lòng chọn đáp án đúng";
    }
    if (form.kind === "FILL_IN_BLANK" && !form.answers[0]?.content?.trim()) return "Vui lòng nhập đáp án đúng";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test) {
      alert("Bài test không tồn tại hoặc bạn không có quyền truy cập.");
      return;
    }
    const validationError = validateForm(questionForm);
    if (validationError) {
      alert(validationError);
      return;
    }

    const kindPayload = mapKindToPayload(questionForm.kind as QuestionKind);
    const payload = {
      ...questionForm,
      ...kindPayload,
      audioUrl: kindPayload.hasListening ? questionForm.audioUrl : null,
      answers: questionForm.kind === "ESSAY" || questionForm.kind === "LISTENING" ? [] : questionForm.answers,
    };

    try {
      const url = editingQuestion
        ? `/api/teacher/tests/${testId}/questions/${editingQuestion.id}`
        : `/api/teacher/tests/${testId}/questions`;
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.details ? `${data.error || "Không thể lưu câu hỏi"}: ${data.details}` : data?.error || "Không thể lưu câu hỏi. Vui lòng thử lại.";
        alert(message);
        return;
      }

      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
      await fetchTestAndQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Lỗi khi lưu câu hỏi. Vui lòng kiểm tra console.");
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions/${questionId}`, { method: "DELETE" });
      if (res.ok) await fetchTestAndQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/teacher/courses/${test?.course.id}`} className="text-sm text-slate-600 hover:text-slate-900">
            Quay lại khóa học
          </Link>
          <Link href="/teacher/courses" className="text-sm text-slate-600 hover:text-slate-900">
            Danh sách khóa học
          </Link>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{test?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">Khóa học: {test?.course.name}</p>
            </div>
            <button onClick={openCreateModal} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Thêm câu hỏi
            </button>
          </div>
        </div>

        {pageError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {questions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
            Chưa có câu hỏi nào
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard key={question.id} question={question} index={index} onEdit={openEditModal} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <QuestionModal
        show={showModal}
        isEditing={Boolean(editingQuestion)}
        form={questionForm}
        onClose={() => {
          setShowModal(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleSubmit}
        setForm={(updater) => setQuestionForm((prev) => updater(prev))}
        canUseEssay={isWritingCourse}
      />
    </div>
  );
}
