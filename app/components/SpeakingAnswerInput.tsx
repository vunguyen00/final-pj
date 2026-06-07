"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function SpeakingAnswerInput({
  value,
  onChange,
  languageLocale,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  languageLocale: string;
  disabled?: boolean;
}) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const keepAliveRef = useRef(false);
  const valueRef = useRef(value);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supportError, setSupportError] = useState("");

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  function resolveRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function stopListening() {
    keepAliveRef.current = false;
    const recognizer = recognitionRef.current;
    recognitionRef.current = null;
    if (recognizer) {
      recognizer.onend = null;
      try {
        recognizer.stop();
      } catch {
        // noop
      }
    }
    setListening(false);
    setInterim("");
  }

  function startListening() {
    if (disabled) return;

    const Constructor = resolveRecognitionConstructor();
    if (!Constructor) {
      setSupportError("Trinh duyet chua ho tro nhan dien giong noi. Ban van co the nhap transcript thu cong.");
      return;
    }

    setSupportError("");
    const recognizer = new Constructor();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = languageLocale;

    recognizer.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) {
          finalChunk += `${transcript} `;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk.trim()) {
        const currentValue = valueRef.current;
        onChange(`${currentValue}${currentValue.trim() ? " " : ""}${finalChunk.trim()}`.trim());
      }
      setInterim(interimChunk);
    };

    recognizer.onerror = (event) => {
      if (event.error !== "no-speech") {
        setSupportError(`SpeechRecognition loi: ${event.error}`);
      }
    };

    recognizer.onend = () => {
      if (keepAliveRef.current) {
        try {
          recognizer.start();
        } catch {
          setListening(false);
        }
      }
    };

    recognitionRef.current = recognizer;
    keepAliveRef.current = true;
    try {
      recognizer.start();
      setListening(true);
    } catch {
      setListening(false);
      setSupportError("Khong the bat nhan dien giong noi.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!listening ? (
          <button
            type="button"
            onClick={startListening}
            disabled={disabled}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            Bat dau noi
          </button>
        ) : (
          <button
            type="button"
            onClick={stopListening}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Dung ghi transcript
          </button>
        )}
        <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${listening ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {listening ? "Dang nghe..." : "San sang"}
        </span>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        disabled={disabled}
        placeholder="Noi de tu dong nhap transcript, hoac nhap thu cong neu can..."
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
      />

      {interim ? <p className="text-xs text-slate-500">Realtime: {interim}</p> : null}
      {supportError ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{supportError}</p> : null}
    </div>
  );
}
