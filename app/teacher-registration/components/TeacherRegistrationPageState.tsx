import Link from "next/link";

type TeacherRegistrationPageStateProps =
  | { type: "loading" }
  | { type: "error"; loadError: string; onRetry: () => void }
  | { type: "disabled" };

export default function TeacherRegistrationPageState(
  props: TeacherRegistrationPageStateProps,
) {
  if (props.type === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Đang tải thông tin đăng ký giảng viên...
          </p>
        </div>
      </main>
    );
  }

  if (props.type === "error") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">
            Không thể tải trang đăng ký
          </h1>
          <p className="mt-2 text-sm text-red-700">{props.loadError}</p>
          <button
            type="button"
            onClick={props.onRetry}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Đăng ký giảng viên</h1>
        <p className="mt-3 text-slate-600">
          Chức năng đăng ký giảng viên đang tạm tắt.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
