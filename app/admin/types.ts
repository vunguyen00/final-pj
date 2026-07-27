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
  failureReason?: string | null;
  submittedAt?: string | null;
  user: { username: string; email: string; phoneNumber: string | null; role: string };
  language: { name: string };
  certificates: { id: string; fileName: string; fileUrl: string; expiryDate: string | null }[];
  suspiciousEvents: { eventType: string; count: number; totalDurationSeconds: number; severity: number }[];
  antiCheatLogs: { id: string; eventType: string; detail: string | null; severity?: number; serverTimestamp: string | null }[];
  entranceAttempt: { score: number; maxScore: number; isPassed: boolean } | null;
};

export type Course = {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "LOCKED" | "PENDING_APPROVAL" | "PENDING_DELETE" | "REJECTED";
  deleteRequestedFromStatus: "ACTIVE" | "LOCKED" | "PENDING_APPROVAL" | "PENDING_DELETE" | "REJECTED" | null;
  createdAt: string;
  instructor: { id: string; username: string; email: string } | null;
  language: { id: string; name: string; code: string } | null;
  registeredLanguage: { id: string; name: string; code: string } | null;
  _count: { modules: number; tests: number; enrollments: number };
};

export type AdminManagedTest = {
  id: string;
  name: string;
  kind: "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE";
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  timeLimit: number | null;
  language: { id: string; name: string; code: string } | null;
  createdAt: string;
  _count: { questions: number; attempts: number };
};

export type AdminCourseRefund = {
  id: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  student: { id: string; username: string; email: string };
  course: { id: string; name: string };
};
