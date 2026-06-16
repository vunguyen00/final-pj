"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionModal } from "./components/QuestionModal";
import { TestMaterialPanel } from "@/app/components/TestMaterialPanel";
import type { ChartMaterialData } from "@/lib/test-material";
import { createDefaultForm, inferKindFromQuestion, mapKindToPayload } from "./helpers";
import { Question, QuestionForm, QuestionKind, Test } from "./types";
import {
  FIXED_TEST_MAX_SCORE,
  getAssessmentModeLabel,
  getRemainingQuestionScore,
  isTestReady,
} from "@/lib/test-rules";

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
  const [materialForm, setMaterialForm] = useState({
    title: "",
    content: "",
    url: "",
    type: "",
    data: null as ChartMaterialData | null,
  });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialMessage, setMaterialMessage] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadMessage, setAudioUploadMessage] = useState("");

  const totalQuestionScore = useMemo(() => questions.reduce((sum, question) => sum + Number(question.score || 0), 0), [questions]);
  const remainingScore = getRemainingQuestionScore(totalQuestionScore);
  const fetchTestAndQuestions = useCallback(async () => {
    try {
      const [testRes, questionsRes] = await Promise.all([
        fetch(`/api/teacher/tests/${testId}`),
        fetch(`/api/teacher/tests/${testId}/questions`),
      ]);
      if (testRes.ok) {
        const data = await testRes.json();
        setTest(data.test);
        setMaterialForm({
          title: data.test.materialTitle || "",
          content: data.test.materialContent || "",
          url: data.test.materialUrl || "",
          type: data.test.materialType || "",
          data: data.test.materialData || null,
        });
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
  }, [testId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTestAndQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTestAndQuestions]);

  const resetForm = () => setQuestionForm(createDefaultForm());

  async function uploadMaterial(file: File | null) {
    if (!file) return;
    setUploadingMaterial(true);
    setMaterialMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/teacher/test-material-upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMaterialMessage(data.error || "Không thể tải tài liệu lên.");
        return;
      }
      setMaterialForm((current) => ({
        ...current,
        url: data.url,
        type: data.type,
        data: null,
      }));
      setMaterialMessage(
        "Đã tải tệp lên. Bấm Lưu tài liệu để áp dụng cho đề.",
      );
    } catch {
      setMaterialMessage("Không thể tải tài liệu lên.");
    } finally {
      setUploadingMaterial(false);
    }
  }

  async function uploadQuestionAudio(file: File | null) {
    if (!file) return;
    setUploadingAudio(true);
    setAudioUploadMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/teacher/question-audio-upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAudioUploadMessage(data.error || "Không thể tải audio lên.");
        return;
      }
      setQuestionForm((current) => ({
        ...current,
        kind: "LISTENING",
        audioUrl: data.url,
        hasListening: true,
      }));
      setAudioUploadMessage(
        "Đã tải file audio lên. Câu hỏi sẽ dùng file này khi lưu.",
      );
    } catch {
      setAudioUploadMessage("Không thể tải audio lên.");
    } finally {
      setUploadingAudio(false);
    }
  }

  async function saveMaterial() {
    setSavingMaterial(true);
    setMaterialMessage("");
    try {
      const response = await fetch(`/api/teacher/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialTitle: materialForm.title,
          materialContent: materialForm.content,
          materialUrl: materialForm.url,
          materialType: materialForm.type,
          materialData: materialForm.data,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMaterialMessage(data.error || "Không thể lưu tài liệu đề bài.");
        return;
      }
      setTest((current) =>
        current
          ? {
              ...current,
              materialTitle: data.test.materialTitle,
              materialContent: data.test.materialContent,
              materialUrl: data.test.materialUrl,
              materialType: data.test.materialType,
              materialData: data.test.materialData,
            }
          : current,
      );
      setMaterialMessage("Đã lưu tài liệu đề bài.");
    } catch {
      setMaterialMessage("Không thể lưu tài liệu đề bài.");
    } finally {
      setSavingMaterial(false);
    }
  }

  const openCreateModal = () => {
    if (!test) {
      alert("Không tìm thấy bài test. Vui lòng thử lại.");
      return;
    }
    if (remainingScore <= 0) {
      alert("Tổng điểm câu hỏi đã đạt 100. Hãy sửa hoặc xóa câu hỏi trước khi thêm mới.");
      return;
    }
    setEditingQuestion(null);
    setQuestionForm(createDefaultForm());
    setAudioUploadMessage("");
    setShowModal(true);
  };

  const openEditModal = (question: Question) => {
    const kind = inferKindFromQuestion(question);
    setEditingQuestion(question);
    setAudioUploadMessage("");
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
    if (form.kind === "LISTENING" && !form.audioUrl.trim()) return "Vui lòng nhập URL hoặc tải file audio";

    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && form.answers.some((a) => !a.content.trim())) {
      return "Vui lòng điền đủ nội dung cho tất cả đáp án";
    }
    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && !form.answers.some((a) => a.isCorrect)) {
      return "Vui lòng chọn đáp án đúng";
    }
    if (form.kind === "FILL_IN_BLANK" && !form.answers[0]?.content?.trim()) return "Vui lòng nhập đáp án đúng";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      answers:
        questionForm.kind === "ESSAY" || questionForm.kind === "LISTENING" || questionForm.kind === "SPEAKING"
          ? []
          : questionForm.answers,
    };

    try {
      const url = editingQuestion ? `/api/teacher/tests/${testId}/questions/${editingQuestion.id}` : `/api/teacher/tests/${testId}/questions`;
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMessage = data?.details
          ? `${data.error || "Không thể lưu câu hỏi"}: ${data.details}`
          : data?.error || "Không thể lưu câu hỏi. Vui lòng thử lại.";
        alert(errorMessage);
        return;
      }

      setShowModal(false);
      setEditingQuestion(null);
      setAudioUploadMessage("");
      resetForm();
      await fetchTestAndQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Lỗi khi lưu câu hỏi.");
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
          {test?.course?.id ? (
            <Link href={`/teacher/courses/${test.course.id}`} className="text-sm text-slate-600 hover:text-slate-900">
              Quay lại khóa học
            </Link>
          ) : (
            <span className="text-sm text-slate-500">Đề test độc lập</span>
          )}
          <Link href="/teacher/courses" className="text-sm text-slate-600 hover:text-slate-900">
            Danh sách khóa học
          </Link>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{test?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {test?.course?.name ? `Khóa học: ${test.course.name}` : `Loại đề: ${getAssessmentModeLabel(test?.assessmentMode || "STANDARD")}`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Ngôn ngữ: {test?.language?.name || test?.course?.language?.name || "Chưa gán"}
              </p>
            </div>
            <button onClick={openCreateModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Thêm câu hỏi
            </button>
          </div>

          <div className={`mt-4 rounded-lg border p-4 text-sm ${isTestReady(totalQuestionScore) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : remainingScore > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            Tổng điểm hiện tại: <strong>{totalQuestionScore}</strong> / {FIXED_TEST_MAX_SCORE}. {isTestReady(totalQuestionScore) ? "Đề đã hợp lệ để sử dụng." : remainingScore > 0 ? `Còn thiếu ${remainingScore} điểm.` : `Vượt ${Math.abs(remainingScore)} điểm, cần giảm xuống ${FIXED_TEST_MAX_SCORE}.`}
          </div>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Tài liệu chung của đề
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Passage, ảnh hoặc PDF sẽ nằm ở cột trái; câu hỏi nằm ở cột
                phải khi học viên làm bài.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setMaterialForm({
                  title: "",
                  content: "",
                  url: "",
                  type: "",
                  data: null,
                })
              }
              className="text-sm font-semibold text-red-600"
            >
              Xóa nội dung đang nhập
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Tiêu đề tài liệu
                <input
                  value={materialForm.title}
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Nineteenth-Century Paperback Literature"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Passage hoặc dữ liệu dạng văn bản
                <textarea
                  rows={9}
                  value={materialForm.content}
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Nhập bài đọc, mô tả bảng số liệu hoặc hướng dẫn chung..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal leading-6"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Ảnh hoặc PDF
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  disabled={uploadingMaterial}
                  onChange={(event) =>
                    void uploadMaterial(event.target.files?.[0] || null)
                  }
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              {materialForm.url ? (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="truncate text-slate-600">
                    {materialForm.url}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMaterialForm((current) => ({
                        ...current,
                        url: "",
                        type: "",
                      }))
                    }
                    className="ml-3 font-semibold text-red-600"
                  >
                    Bỏ tệp
                  </button>
                </div>
              ) : null}

              {materialMessage ? (
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  {materialMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void saveMaterial()}
                disabled={savingMaterial || uploadingMaterial}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploadingMaterial
                  ? "Đang tải tệp..."
                  : savingMaterial
                    ? "Đang lưu..."
                    : "Lưu tài liệu đề bài"}
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Xem trước cột tài liệu
              </p>
              {materialForm.title ||
              materialForm.content ||
              materialForm.url ||
              materialForm.data ? (
                <TestMaterialPanel
                  compact
                  material={{
                    title: materialForm.title,
                    content: materialForm.content,
                    url: materialForm.url,
                    type: materialForm.type,
                    data: materialForm.data,
                  }}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Chưa có tài liệu để xem trước.
                </div>
              )}
            </div>
          </div>
        </section>

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
          setAudioUploadMessage("");
        }}
        onSubmit={handleSubmit}
        setForm={(updater) => setQuestionForm((prev) => updater(prev))}
        uploadingAudio={uploadingAudio}
        audioUploadMessage={audioUploadMessage}
        onAudioUpload={uploadQuestionAudio}
      />
    </div>
  );
}
