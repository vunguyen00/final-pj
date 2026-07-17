"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ModalDialog({ children, labelledBy, onClose, className = "" }: { children: ReactNode; labelledBy: string; onClose: () => void; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      className={`m-auto grid w-full max-w-none place-items-center bg-transparent p-4 backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm ${className}`}
    >
      {children}
    </dialog>
  );
}
