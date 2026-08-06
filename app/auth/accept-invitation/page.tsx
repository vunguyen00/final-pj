import { Suspense } from "react";
import AcceptInvitationClient from "./AcceptInvitationClient";

export default function AcceptInvitationPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-slate-600">Đang tải lời mời...</p>}>
        <AcceptInvitationClient />
      </Suspense>
    </main>
  );
}
