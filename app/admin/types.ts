export type UserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
};

export type Language = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type Application = {
  id: string;
  status: string;
  attemptNo: number;
  rejectionReason: string | null;
  user: { username: string; email: string; phoneNumber: string | null; role: string };
  language: { name: string };
  certificates: { id: string; fileName: string; fileUrl: string; expiryDate: string | null }[];
  suspiciousEvents: { eventType: string; count: number; totalDurationSeconds: number; severity: number }[];
  antiCheatLogs: { id: string; eventType: string; detail: string | null; serverTimestamp: string | null }[];
  entranceAttempt: { score: number; maxScore: number; isPassed: boolean } | null;
};

export type Course = {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "LOCKED" | "PENDING_APPROVAL" | "REJECTED";
  createdAt: string;
  instructor: { id: string; username: string; email: string } | null;
  _count: { modules: number; tests: number; enrollments: number };
};

export type AdminManagedTest = {
  id: string;
  name: string;
  kind: "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE";
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  language: { id: string; name: string; code: string } | null;
  createdAt: string;
  _count: { questions: number; attempts: number };
};

export type SpeakingAiConfig = {
  examType: "IELTS" | "HSK";
  durationSeconds: number;
};
