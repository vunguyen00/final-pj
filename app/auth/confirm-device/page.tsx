import { Suspense } from "react";
import ConfirmDeviceClient from "./ConfirmDeviceClient";

export default function ConfirmDevicePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-slate-600">Đang tải...</p>}>
        <ConfirmDeviceClient />
      </Suspense>
    </main>
  );
}
