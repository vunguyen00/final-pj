import type { AntiCheatSeverity, TeacherCameraStatus } from "../TeacherRegistrationClient";
import type { TeacherEntranceSecurityLabels } from "@/lib/teacher-entrance-labels";

type AntiCheatNotice = { severity: AntiCheatSeverity; message: string } | null;

export default function TeacherAntiCheatOverlays({
  showRules,
  antiCheatConfirmed,
  onConfirmedChange,
  cameraStatus,
  setupError,
  onRequestCamera,
  onStartFullscreen,
  showFullscreenRecovery,
  onReenterFullscreen,
  antiCheatFailed,
  antiCheatNotice,
  labels,
}: {
  showRules: boolean;
  antiCheatConfirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  cameraStatus: TeacherCameraStatus;
  setupError: string;
  onRequestCamera: () => void;
  onStartFullscreen: () => void;
  showFullscreenRecovery: boolean;
  onReenterFullscreen: () => void;
  antiCheatFailed: boolean;
  antiCheatNotice: AntiCheatNotice;
  labels: TeacherEntranceSecurityLabels;
}) {
  return (
    <>
      {showRules ? (
        <dialog open className="fixed inset-0 z-50 flex h-full w-full max-w-none items-center justify-center overflow-y-auto border-0 bg-slate-950/75 p-4" aria-labelledby="anti-cheat-title">
          <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">{labels.mandatory}</p>
            <h2 id="anti-cheat-title" className="mt-2 text-2xl font-bold text-slate-950">{labels.rulesTitle}</h2>
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{labels.failureRule}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              {labels.rules.map((rule) => <li key={rule}>• {rule}</li>)}
            </ul>
            <label className="mt-5 flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={antiCheatConfirmed} onChange={(event) => onConfirmedChange(event.target.checked)} className="mt-0.5 h-4 w-4" />
              {labels.consent}
            </label>
            {cameraStatus === "active" ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">{labels.cameraReady}</p> : null}
            {setupError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{setupError}</p> : null}
            <button type="button" disabled={!antiCheatConfirmed || cameraStatus === "requesting"} onClick={cameraStatus === "active" ? onStartFullscreen : onRequestCamera} className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {cameraStatus === "requesting" ? labels.requestingCamera : cameraStatus === "active" ? labels.startFullscreen : cameraStatus === "unavailable" ? labels.retryCamera : labels.grantCamera}
            </button>
          </section>
        </dialog>
      ) : null}

      {showFullscreenRecovery ? (
        <dialog open className="fixed inset-0 z-[55] flex h-full w-full max-w-none items-center justify-center border-0 bg-slate-950 p-4" aria-labelledby="fullscreen-recovery-title">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h2 id="fullscreen-recovery-title" className="text-2xl font-bold text-amber-700">{labels.lockedTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{labels.lockedBody}</p>
            {setupError ? <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{setupError}</p> : null}
            <button type="button" onClick={onReenterFullscreen} className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">{labels.reenterFullscreen}</button>
          </section>
        </dialog>
      ) : null}

      {antiCheatFailed ? (
        <dialog open className="fixed inset-0 z-[60] flex h-full w-full max-w-none items-center justify-center border-0 bg-slate-950 p-4" aria-labelledby="anti-cheat-failed-title">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h2 id="anti-cheat-failed-title" className="text-2xl font-bold text-red-700">{labels.failedTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{labels.failedBody}</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">{labels.redirecting}</p>
          </section>
        </dialog>
      ) : null}

      {antiCheatNotice ? (
        <div className={`fixed right-4 top-4 z-[70] max-w-md rounded-xl border p-4 text-sm font-semibold shadow-xl ${antiCheatNotice.severity === "VIOLATION" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-800"}`} role="alert" aria-live="assertive">
          {antiCheatNotice.message}
        </div>
      ) : null}
    </>
  );
}
