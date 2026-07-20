"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionModal } from "./components/QuestionModal";
import { TestMaterialPanel } from "@/app/components/TestMaterialPanel";
import type { ChartMaterialData } from "@/lib/test-material";
import { buildAnswersForKind, createDefaultForm, inferKindFromQuestion, mapKindToPayload } from "./helpers";
import { getQuestionEditorLabels, getQuestionPageLabels } from "./labels";
import { Question, QuestionForm, QuestionKind, Test } from "./types";
import { FIXED_TEST_MAX_SCORE, getRemainingQuestionScore, isTestReady } from "@/lib/test-rules";
import { ModalDialog } from "@/app/components/ModalDialog";

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
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
  const savingQuestionRef = useRef(false);

  const totalQuestionScore = useMemo(() => questions.reduce((sum, question) => sum + Number(question.score || 0), 0), [questions]);
  const remainingScore = getRemainingQuestionScore(totalQuestionScore);
  const questionLanguageCode = test?.language?.code || test?.course?.language?.code || "vi";
  const questionLabels = useMemo(() => getQuestionEditorLabels(questionLanguageCode), [questionLanguageCode]);
  const pageLabels = useMemo(() => getQuestionPageLabels(questionLanguageCode), [questionLanguageCode]);
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
        setPageError(data?.error || pageLabels.loadTestFailed);
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
  }, [pageLabels.loadTestFailed, testId]);

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
        setMaterialMessage(data.error || pageLabels.uploadMaterialFailed);
        return;
      }
      setMaterialForm((current) => ({
        ...current,
        url: data.url,
        type: data.type,
        data: null,
      }));
      setMaterialMessage(pageLabels.materialUploaded);
    } catch {
      setMaterialMessage(pageLabels.uploadMaterialFailed);
    } finally {
      setUploadingMaterial(false);
    }
  }

  async function uploadQuestionAudio(file: File | null) {
    if (!file) return;
    setUploadingAudio(true);
    setAudioUploadMessage(questionLabels.uploadingAudio);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/teacher/question-audio-upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAudioUploadMessage(data.error || questionLabels.audioRequired);
        return;
      }
      setQuestionForm((current) => ({
        ...current,
        kind: current.kind === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "LISTENING",
        audioUrl: data.url,
        hasListening: true,
      }));
      setAudioUploadMessage(questionLabels.audioUploaded);
    } catch {
      setAudioUploadMessage(questionLabels.audioRequired);
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
        setMaterialMessage(data.error || pageLabels.saveMaterialFailed);
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
      setMaterialMessage(pageLabels.materialSaved);
    } catch {
      setMaterialMessage(pageLabels.saveMaterialFailed);
    } finally {
      setSavingMaterial(false);
    }
  }

  const openCreateModal = () => {
    setNotice(null);
    if (!test) {
      setNotice({ tone: "error", message: pageLabels.noTestAlert });
      return;
    }
    if (remainingScore <= 0) {
      setNotice({ tone: "error", message: pageLabels.maxScoreAlert });
      return;
    }
    setEditingQuestion(null);
    setQuestionForm(createDefaultForm());
    setAudioUploadMessage("");
    setIsSavingQuestion(false);
    savingQuestionRef.current = false;
    setShowModal(true);
  };

  const openEditModal = (question: Question) => {
    setNotice(null);
    const kind = inferKindFromQuestion(question);
    const existingAnswers = question.answers?.length ? question.answers : buildAnswersForKind(kind);
    setEditingQuestion(question);
    setAudioUploadMessage("");
    setIsSavingQuestion(false);
    savingQuestionRef.current = false;
    setQuestionForm({
      kind,
      type: question.type,
      content: question.content,
      audioUrl: question.audioUrl || "",
      hasListening: Boolean(question.audioUrl),
      score: String(question.score),
      explanation: question.explanation || "",
      hint: question.hint || "",
      preparationTimeSeconds: String(question.preparationTimeSeconds ?? (question.type === "SPEAKING" ? 60 : 0)),
      answerTimeSeconds: String(question.answerTimeSeconds ?? (question.type === "SPEAKING" ? 120 : 3600)),
      answers: existingAnswers,
    });
    setShowModal(true);
  };

  const validateForm = (form: QuestionForm): string | null => {
    if (!form.kind) return questionLabels.kindOptions[0].label;
    if (!form.content.trim()) return questionLabels.contentLabel.replace(" *", "");
    if (!form.score || Number(form.score) <= 0) return questionLabels.score;
    if (test?.kind === "TEACHER_ENTRANCE" && (form.kind === "ESSAY" || form.kind === "SPEAKING")) {
      const answer = Number(form.answerTimeSeconds);
      if (form.kind === "SPEAKING") {
        const preparation = Number(form.preparationTimeSeconds);
        if (!Number.isInteger(preparation) || preparation < 0 || preparation > 300) return questionLabels.preparationSeconds;
        if (!Number.isInteger(answer) || answer < 30 || answer > 300) return questionLabels.answerSeconds;
      } else if (!Number.isInteger(answer) || answer < 60 || answer > 10800 || answer % 60 !== 0) {
        return questionLabels.answerMinutes;
      }
    }
    const audioUrl = form.audioUrl.trim();
    if (form.kind === "LISTENING" && !audioUrl) return questionLabels.audioRequired;

    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && form.answers.some((a) => !a.content.trim())) {
      return pageLabels.answerContentRequired;
    }
    if ((form.kind === "MULTIPLE_CHOICE" || form.kind === "TRUE_FALSE") && !form.answers.some((a) => a.isCorrect)) {
      return pageLabels.chooseCorrectAnswer;
    }
    if ((form.kind === "FILL_IN_BLANK" || form.kind === "LISTENING") && !form.answers[0]?.content?.trim()) {
      return questionLabels.correctAnswer;
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingQuestionRef.current) return;
    if (uploadingAudio) {
      setNotice({ tone: "error", message: questionLabels.uploadingAudio });
      return;
    }

    if (!test) {
      setNotice({ tone: "error", message: pageLabels.testMissingAlert });
      return;
    }
    const validationError = validateForm(questionForm);
    if (validationError) {
      setNotice({ tone: "error", message: validationError });
      return;
    }

    savingQuestionRef.current = true;
    setIsSavingQuestion(true);

    const kindPayload = mapKindToPayload(questionForm.kind as QuestionKind);
    const audioUrl = questionForm.audioUrl.trim();
    const payload = {
      ...questionForm,
      ...kindPayload,
      hasListening: kindPayload.hasListening || Boolean(audioUrl),
      audioUrl: audioUrl || null,
      answers: questionForm.kind === "ESSAY" || questionForm.kind === "SPEAKING" ? [] : questionForm.answers,
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
          ? `${data.error || pageLabels.saveQuestionFailed}: ${data.details}`
          : data?.error || pageLabels.saveQuestionFallback;
        setNotice({ tone: "error", message: errorMessage });
        return;
      }

      setShowModal(false);
      setEditingQuestion(null);
      setAudioUploadMessage("");
      resetForm();
      await fetchTestAndQuestions();
      setNotice({ tone: "success", message: editingQuestion ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi." });
    } catch (error) {
      console.error("Error saving question:", error);
      setNotice({ tone: "error", message: pageLabels.saveQuestionError });
    } finally {
      savingQuestionRef.current = false;
      setIsSavingQuestion(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setIsDeletingQuestion(true);
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions/${questionId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchTestAndQuestions();
        setNotice({ tone: "success", message: "Đã xóa câu hỏi." });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ tone: "error", message: data?.error || "Không thể xóa câu hỏi." });
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      setNotice({ tone: "error", message: "Có lỗi khi xóa câu hỏi. Vui lòng thử lại." });
    } finally {
      setIsDeletingQuestion(false);
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
              {pageLabels.backToCourse}
            </Link>
          ) : (
            <span className="text-sm text-slate-500">{pageLabels.standaloneTest}</span>
          )}
          <Link href="/teacher/courses" className="text-sm text-slate-600 hover:text-slate-900">
            {pageLabels.courseList}
          </Link>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{test?.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {test?.course?.name ? pageLabels.coursePrefix(test.course.name) : pageLabels.assessmentPrefix(test?.assessmentMode || "STANDARD")}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {pageLabels.languagePrefix(test?.language?.name || test?.course?.language?.name || pageLabels.unassignedLanguage)}
              </p>
            </div>
            <button onClick={openCreateModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              {pageLabels.addQuestion}
            </button>
          </div>

          <div className={`mt-4 rounded-lg border p-4 text-sm ${isTestReady(totalQuestionScore) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : remainingScore > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {pageLabels.scoreSummary(totalQuestionScore, FIXED_TEST_MAX_SCORE, remainingScore, isTestReady(totalQuestionScore))}
          </div>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {notice ? (
          <div role="status" className={`fixed right-4 top-4 z-[70] max-w-md rounded-lg border p-3 text-sm shadow-lg ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        ) : null}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {pageLabels.materialTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {pageLabels.materialDescription}
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
              {pageLabels.clearDraft}
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                {pageLabels.materialTitleLabel}
                <input
                  value={materialForm.title}
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={pageLabels.materialTitlePlaceholder}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                {pageLabels.passageLabel}
                <textarea
                  rows={9}
                  value={materialForm.content}
                  onChange={(event) =>
                    setMaterialForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder={pageLabels.passagePlaceholder}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal leading-6"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                {pageLabels.fileLabel}
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
                    {pageLabels.removeFile}
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
                  ? pageLabels.uploadingFile
                  : savingMaterial
                    ? pageLabels.saving
                    : pageLabels.saveMaterial}
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                {pageLabels.previewTitle}
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
                  {pageLabels.previewEmpty}
                </div>
              )}
            </div>
          </div>
        </section>

        {questions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
            {pageLabels.noQuestions}
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                languageCode={questionLanguageCode}
                onEdit={openEditModal}
                onDelete={() => {
                  setNotice(null);
                  setDeleteTarget(question);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <QuestionModal
        show={showModal}
        isEditing={Boolean(editingQuestion)}
        form={questionForm}
        languageCode={questionLanguageCode}
        onClose={() => {
          if (savingQuestionRef.current) return;
          setShowModal(false);
          setEditingQuestion(null);
          setAudioUploadMessage("");
        }}
        onSubmit={handleSubmit}
        setForm={(updater) => setQuestionForm((prev) => updater(prev))}
        isSubmitting={isSavingQuestion}
        uploadingAudio={uploadingAudio}
        audioUploadMessage={audioUploadMessage}
        notice={notice}
        onAudioUpload={uploadQuestionAudio}
        isTeacherEntrance={test?.kind === "TEACHER_ENTRANCE"}
      />

      {deleteTarget ? (
        <ModalDialog labelledBy="delete-question-title" onClose={() => { if (!isDeletingQuestion) setDeleteTarget(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-question-title" className="text-lg font-bold text-slate-950">Xóa câu hỏi?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{pageLabels.deleteConfirm}</p>
            <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{deleteTarget.content}</p>
            {notice?.tone === "error" ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{notice.message}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isDeletingQuestion} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="button" disabled={isDeletingQuestion} onClick={() => void handleDelete(deleteTarget.id)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isDeletingQuestion ? "Đang xóa..." : pageLabels.delete}
              </button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}
