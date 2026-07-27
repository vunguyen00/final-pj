"use client";

import Link from "next/link";
import { useReducer, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";
import type { AdminManagedTest, Language } from "./types";

type TestForm = {
  name: string;
  description: string;
  languageId: string;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  timeLimit: string;
};

type ManagedTestKind = "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE";
type ManagedTestQuery = {
  page: number;
  search: string;
  languageId: string;
  kind: string;
  assessmentMode: string;
};

type ManagedTestsResponse = {
  tests: AdminManagedTest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ManagedTestsListState = {
  tests: AdminManagedTest[];
  searchInput: string;
  query: ManagedTestQuery;
  page: number;
  total: number;
  totalPages: number;
  loading: boolean;
  requestSequence: number;
};

type ManagedTestsListAction =
  | { type: "SET_SEARCH_INPUT"; value: string }
  | { type: "REQUEST"; query: ManagedTestQuery; requestSequence: number }
  | {
      type: "SUCCESS";
      data: ManagedTestsResponse;
      requestSequence: number;
    }
  | { type: "FINISH"; requestSequence: number };

function managedTestsListReducer(
  state: ManagedTestsListState,
  action: ManagedTestsListAction,
): ManagedTestsListState {
  switch (action.type) {
    case "SET_SEARCH_INPUT":
      return { ...state, searchInput: action.value };
    case "REQUEST":
      return {
        ...state,
        query: action.query,
        loading: true,
        requestSequence: action.requestSequence,
      };
    case "SUCCESS":
      if (action.requestSequence !== state.requestSequence) return state;
      return {
        ...state,
        tests: action.data.tests,
        page: action.data.page,
        total: action.data.total,
        totalPages: action.data.totalPages,
      };
    case "FINISH":
      if (action.requestSequence !== state.requestSequence) return state;
      return { ...state, loading: false };
    default:
      return state;
  }
}

function createInitialListState(
  tests: AdminManagedTest[],
  total: number,
): ManagedTestsListState {
  return {
    tests,
    searchInput: "",
    query: {
      page: 1,
      search: "",
      languageId: "",
      kind: "",
      assessmentMode: "",
    },
    page: 1,
    total,
    totalPages: Math.max(1, Math.ceil(total / 10)),
    loading: false,
    requestSequence: 0,
  };
}

const DEFAULT_FORM_BY_KIND: Record<ManagedTestKind, TestForm> = {
  TEACHER_ENTRANCE: {
    name: "",
    description: "",
    languageId: "",
    assessmentMode: "WRITING",
    timeLimit: "60",
  },
  PUBLIC_PRACTICE: {
    name: "",
    description: "",
    languageId: "",
    assessmentMode: "STANDARD",
    timeLimit: "30",
  },
};

function labelForKind(kind: AdminManagedTest["kind"]) {
  return kind === "TEACHER_ENTRANCE"
    ? "Đề đầu vào giảng viên"
    : "Đề luyện tập công khai";
}

function descriptionForKind(kind: ManagedTestKind) {
  return kind === "TEACHER_ENTRANCE"
    ? "Hệ thống chọn ngẫu nhiên một đề hợp lệ theo ngôn ngữ khi ứng viên bắt đầu thi."
    : "Tạo đề luyện tập cho học viên và gắn đúng ngôn ngữ.";
}

function buildTestPayload(
  form: TestForm,
  kind: ManagedTestKind,
) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    kind,
    languageId: form.languageId,
    assessmentMode: form.assessmentMode,
    passingScore: 60,
    timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
  };
}

export default function AdminTestsManagement({
  initialLanguages,
  initialAdminManagedTests,
  initialAdminManagedTestTotal,
  isAdmin,
}: {
  initialLanguages: Language[];
  initialAdminManagedTests: AdminManagedTest[];
  initialAdminManagedTestTotal: number;
  isAdmin: boolean;
}) {
  const [languages] = useState(initialLanguages);
  const [listState, dispatchList] = useReducer(
    managedTestsListReducer,
    {
      tests: initialAdminManagedTests,
      total: initialAdminManagedTestTotal,
    },
    (initial) => createInitialListState(initial.tests, initial.total),
  );
  const [selectedKind, setSelectedKind] =
    useState<ManagedTestKind>("TEACHER_ENTRANCE");
  const [testForm, setTestForm] = useState<TestForm>(
    DEFAULT_FORM_BY_KIND.TEACHER_ENTRANCE,
  );
  const [message, setMessage] = useState("");
  const listRequestSequence = useRef(0);

  if (!isAdmin) return null;

  async function loadManagedTests(query: ManagedTestQuery) {
    const requestSequence = listRequestSequence.current + 1;
    listRequestSequence.current = requestSequence;
    dispatchList({ type: "REQUEST", query, requestSequence });
    const params = new URLSearchParams({
      page: String(query.page),
      search: query.search,
      languageId: query.languageId,
      kind: query.kind,
      assessmentMode: query.assessmentMode,
    });

    try {
      const response = await fetch(`/api/admin/tests?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readJsonResponse<ManagedTestsResponse & { error?: string }>(
        response,
      ).catch(() => null);

      if (requestSequence !== listRequestSequence.current) return false;
      if (!response.ok || !data) {
        setMessage(data?.error || "Không thể tải danh sách đề.");
        return false;
      }

      dispatchList({ type: "SUCCESS", data, requestSequence });
      return true;
    } catch {
      if (requestSequence !== listRequestSequence.current) return false;
      setMessage("Lỗi mạng khi tải danh sách đề.");
      return false;
    } finally {
      dispatchList({ type: "FINISH", requestSequence });
    }
  }

  function currentQuery(overrides: Partial<ManagedTestQuery> = {}): ManagedTestQuery {
    return {
      ...listState.query,
      ...overrides,
    };
  }

  async function createManagedTest(
    event: React.FormEvent,
    form: TestForm,
    kind: ManagedTestKind,
    reset: () => void,
  ) {
    event.preventDefault();
    setMessage("");

    if (!form.languageId) {
      setMessage("Vui lòng chọn ngôn ngữ trước khi tạo đề.");
      return;
    }

    const response = await fetch("/api/teacher/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTestPayload(form, kind)),
    });
    const data = await readJsonResponse(response).catch(() => ({}));

    if (!response.ok) {
      setMessage(data?.error || "Không thể tạo đề test.");
      return;
    }

    dispatchList({ type: "SET_SEARCH_INPUT", value: "" });
    await loadManagedTests({
      page: 1,
      search: "",
      languageId: "",
      kind: "",
      assessmentMode: "",
    });
    reset();
    setMessage(
      kind === "TEACHER_ENTRANCE"
        ? "Đã tạo đề đầu vào giảng viên."
        : "Đã tạo đề luyện tập.",
    );
  }

  async function deleteTest(testId: string) {
    if (!window.confirm("Bạn chắc chắn muốn xóa đề này?")) return;

    try {
      const response = await fetch(`/api/teacher/tests/${testId}`, {
        method: "DELETE",
      });
      const data = await readJsonResponse(response).catch(() => ({}));

      if (!response.ok) {
        setMessage(data?.error || "Không thể xóa đề.");
        return;
      }

      const nextPage =
        listState.tests.length === 1 && listState.page > 1
          ? listState.page - 1
          : listState.page;
      await loadManagedTests(currentQuery({ page: nextPage }));
      setMessage("Đã xóa đề.");
    } catch {
      setMessage("Lỗi khi xóa đề.");
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Quản lý đề test</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tạo đề đầu vào giảng viên và đề luyện tập theo từng ngôn ngữ.
          </p>
        </div>

        <div className="mt-5">
          <ManagedTestForm
            kind={selectedKind}
            form={testForm}
            languages={languages}
            onKindChange={(kind) => {
              setSelectedKind(kind);
              setTestForm((current) => ({
                ...current,
                assessmentMode: DEFAULT_FORM_BY_KIND[kind].assessmentMode,
                timeLimit: DEFAULT_FORM_BY_KIND[kind].timeLimit,
              }));
            }}
            onChange={setTestForm}
            onSubmit={(event) =>
              void createManagedTest(
                event,
                testForm,
                selectedKind,
                () => setTestForm(DEFAULT_FORM_BY_KIND[selectedKind]),
              )
            }
          />
        </div>

        <ManagedTestsBrowser
          state={listState}
          languages={languages}
          onSearchInputChange={(value) =>
            dispatchList({ type: "SET_SEARCH_INPUT", value })
          }
          onSearch={() => {
            const search = listState.searchInput.trim();
            void loadManagedTests(currentQuery({ page: 1, search }));
          }}
          onFilterChange={(filter) =>
            void loadManagedTests(currentQuery({ page: 1, ...filter }))
          }
          onReset={() => {
            dispatchList({ type: "SET_SEARCH_INPUT", value: "" });
            void loadManagedTests({
              page: 1,
              search: "",
              languageId: "",
              kind: "",
              assessmentMode: "",
            });
          }}
          onPageChange={(nextPage) =>
            void loadManagedTests(currentQuery({ page: nextPage }))
          }
          onDelete={(testId) => void deleteTest(testId)}
        />
      </section>
    </div>
  );
}

function ManagedTestsBrowser({
  state,
  languages,
  onSearchInputChange,
  onSearch,
  onFilterChange,
  onReset,
  onPageChange,
  onDelete,
}: {
  state: ManagedTestsListState;
  languages: Language[];
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onFilterChange: (filter: Partial<ManagedTestQuery>) => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
  onDelete: (testId: string) => void;
}) {
  return (
    <div className="mt-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Danh sách các đề</h3>
          <p className="mt-1 text-sm text-slate-500">
            Hiển thị tối đa 10 đề mỗi trang.
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-600">
          {state.total.toLocaleString("vi-VN")} đề
        </p>
      </div>

      <form
        className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,auto))_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label className="text-sm font-semibold text-slate-700">
          Tìm theo tên đề
          <input
            type="search"
            value={state.searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="Ví dụ: English B1, IELTS..."
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Ngôn ngữ
          <select
            value={state.query.languageId}
            disabled={state.loading}
            onChange={(event) =>
              onFilterChange({ languageId: event.target.value })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-60"
          >
            <option value="">Tất cả ngôn ngữ</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name} ({language.code})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Loại đề
          <select
            value={state.query.kind}
            disabled={state.loading}
            onChange={(event) => onFilterChange({ kind: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-60"
          >
            <option value="">Tất cả loại đề</option>
            <option value="TEACHER_ENTRANCE">Đầu vào giảng viên</option>
            <option value="PUBLIC_PRACTICE">Luyện tập công khai</option>
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Hình thức
          <select
            value={state.query.assessmentMode}
            disabled={state.loading}
            onChange={(event) =>
              onFilterChange({ assessmentMode: event.target.value })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-60"
          >
            <option value="">Tất cả hình thức</option>
            <option value="STANDARD">Chấm đáp án</option>
            <option value="WRITING">Writing AI</option>
            <option value="SPEAKING">Speaking AI</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={state.loading}
            className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            disabled={state.loading}
            onClick={onReset}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Xóa lọc
          </button>
        </div>
      </form>

      {state.loading ? (
        <p
          className="mt-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-700"
          role="status"
        >
          Đang tải danh sách đề...
        </p>
      ) : state.tests.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Không tìm thấy đề phù hợp với bộ lọc.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {state.tests.map((test) => (
            <ManagedTestCard key={test.id} test={test} onDelete={onDelete} />
          ))}
        </div>
      )}

      {state.totalPages > 1 ? (
        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
          aria-label="Phân trang danh sách đề"
        >
          <button
            type="button"
            disabled={state.loading || state.page <= 1}
            onClick={() => onPageChange(state.page - 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            Trang trước
          </button>
          <span className="px-2 text-sm font-semibold text-slate-600">
            Trang {state.page}/{state.totalPages}
          </span>
          <button
            type="button"
            disabled={state.loading || state.page >= state.totalPages}
            onClick={() => onPageChange(state.page + 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            Trang sau
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function ManagedTestCard({
  test,
  onDelete,
}: {
  test: AdminManagedTest;
  onDelete: (testId: string) => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-950">{test.name}</p>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {labelForKind(test.kind)}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {test.language?.name || "Chưa gán ngôn ngữ"} -{" "}
          {test._count.questions} câu hỏi - {test._count.attempts} lần thi
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Thời gian:{" "}
          {test.timeLimit ? `${test.timeLimit} phút` : "Không giới hạn"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/teacher/tests/${test.id}/questions`}
          className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
        >
          Thêm câu hỏi
        </Link>
        <Link
          href={`/teacher/tests/${test.id}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Chỉnh sửa
        </Link>
        <button
          type="button"
          onClick={() => onDelete(test.id)}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Xóa
        </button>
      </div>
    </article>
  );
}

function ManagedTestForm({
  kind,
  form,
  languages,
  onKindChange,
  onChange,
  onSubmit,
}: {
  kind: ManagedTestKind;
  form: TestForm;
  languages: Language[];
  onKindChange: (kind: ManagedTestKind) => void;
  onChange: (form: TestForm) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const fieldClass =
    "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const isTeacherEntrance = kind === "TEACHER_ENTRANCE";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
    >
      <div>
        <div>
          <h3 className="font-bold text-slate-900">Tạo đề mới</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {descriptionForKind(kind)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="managed-test-kind"
            className="text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Loại đề
          </label>
          <select
            id="managed-test-kind"
            value={kind}
            onChange={(event) =>
              onKindChange(event.target.value as ManagedTestKind)
            }
            className={`${fieldClass} mt-2 bg-white`}
          >
            <option value="TEACHER_ENTRANCE">Đề đầu vào giảng viên</option>
            <option value="PUBLIC_PRACTICE">Đề luyện tập công khai</option>
          </select>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Tên đề test
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            required
            placeholder="Tên đề test"
            className={`${fieldClass} mt-2 bg-white`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Mô tả hoặc hướng dẫn làm bài
          <textarea
            value={form.description}
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            rows={3}
            placeholder="Mô tả hoặc hướng dẫn làm bài"
            className={`${fieldClass} mt-2 bg-white`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Ngôn ngữ bắt buộc
          <select
            value={form.languageId}
            onChange={(event) =>
              onChange({ ...form, languageId: event.target.value })
            }
            required
            className={`${fieldClass} mt-2 bg-white`}
          >
            <option value="">Chọn ngôn ngữ bắt buộc</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name} ({language.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Giới hạn thời gian
          <div className="relative">
            <input
              type="number"
              min={1}
              value={form.timeLimit}
              onChange={(event) =>
                onChange({ ...form, timeLimit: event.target.value })
              }
              placeholder="Để trống nếu không giới hạn"
              className={`${fieldClass} mt-2 bg-white pr-14`}
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-sm font-normal text-slate-500">
              phút
            </span>
          </div>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Hết giờ, bài sẽ tự động nộp và toàn bộ đáp án bị khóa.
          </span>
        </label>
      </div>

      <button
        type="submit"
        className={`mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
          isTeacherEntrance
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        Tạo {isTeacherEntrance ? "đề đầu vào" : "đề luyện tập"}
      </button>
    </form>
  );
}
