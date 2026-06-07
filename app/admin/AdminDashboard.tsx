"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Application, Course, Language, SpeakingAiConfig, UserRow } from "./types";

function statusLabel(status: Course["status"]) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "LOCKED") return "Đã khóa";
  if (status === "PENDING_APPROVAL") return "Chờ duyệt";
  return "Bị từ chối";
}

function statusClass(status: Course["status"]) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700";
  if (status === "LOCKED") return "bg-slate-200 text-slate-700";
  if (status === "PENDING_APPROVAL") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function AdminDashboard({
  initialEnabled,
  initialCourseAutoApproval,
  initialSpeakingConfig,
  initialUsers,
  initialLanguages,
  initialApplications,
  initialCourses,
}: {
  initialEnabled: boolean;
  initialCourseAutoApproval: boolean;
  initialSpeakingConfig: SpeakingAiConfig;
  initialUsers: UserRow[];
  initialLanguages: Language[];
  initialApplications: Application[];
  initialCourses: Course[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [courseAutoApproval, setCourseAutoApproval] = useState(initialCourseAutoApproval);
  const [speakingConfig, setSpeakingConfig] = useState<SpeakingAiConfig>(initialSpeakingConfig);
  const [users, setUsers] = useState(initialUsers);
  const [languages, setLanguages] = useState(initialLanguages);
  const [applications, setApplications] = useState(initialApplications);
  const [courses, setCourses] = useState(initialCourses);
  const [languageForm, setLanguageForm] = useState({ name: "", code: "" });
  const [message, setMessage] = useState("");
  const [currentTs] = useState(() => Date.now());
  const [showCerts, setShowCerts] = useState(false);
  const [selectedCertificates, setSelectedCertificates] = useState<
    { id: string; fileName: string; fileUrl: string; expiryDate: string | null }[]
  >([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const pendingCourses = useMemo(
    () => courses.filter((course) => course.status === "PENDING_APPROVAL"),
    [courses],
  );

  async function toggleTeacherEntrance(nextEnabled: boolean) {
    setMessage("");
    const response = await fetch("/api/admin/teacher-entrance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setEnabled(nextEnabled);
      setMessage(nextEnabled ? `Đã bật đăng ký. Email gửi thành công: ${data.notified ?? 0}.` : "Đã tắt đăng ký.");
    } else {
      setMessage(data?.error || "Không thể cập nhật setting.");
    }
  }

  async function toggleCourseAutoApproval(nextEnabled: boolean) {
    setMessage("");
    const response = await fetch("/api/admin/course-approval", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setCourseAutoApproval(nextEnabled);
      setMessage(nextEnabled ? "Đã bật tự động duyệt khóa học." : "Đã tắt tự động duyệt khóa học.");
    } else {
      setMessage(data?.error || "Không thể cập nhật chế độ auto duyệt.");
    }
  }

  async function saveSpeakingConfig(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/speaking-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(speakingConfig),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setSpeakingConfig({
        examType: data.examType === "HSK" ? "HSK" : "IELTS",
        durationSeconds: Number(data.durationSeconds || speakingConfig.durationSeconds),
      });
      setMessage("Da cap nhat cau hinh speaking AI.");
    } else {
      setMessage(data?.error || "Khong the cap nhat speaking AI setting.");
    }
  }

  async function addLanguage(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(languageForm),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setLanguages((prev) => [...prev, data.language].sort((a, b) => a.name.localeCompare(b.name)));
      setLanguageForm({ name: "", code: "" });
      setMessage("Đã thêm ngôn ngữ.");
    } else {
      setMessage(data?.error || "Không thể thêm ngôn ngữ.");
    }
  }

  async function toggleBan(user: UserRow) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBanned: !user.isBanned }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, isBanned: data.user.isBanned } : item)));
    } else {
      setMessage(data?.error || "Không thể cập nhật user.");
    }
  }

  async function saveRole() {
    if (!selectedUserForRole || !selectedRole) return;
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === selectedUserForRole.id ? { ...u, role: data.user.role } : u)));
        setShowRoleModal(false);
        setSelectedUserForRole(null);
        setSelectedRole(null);
        setMessage("Da cap nhat role.");
      } else {
        setMessage(data?.error || "Khong the cap nhat role.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Loi khi cap nhat role.");
    }
  }

  async function reviewTeacherApplication(application: Application, action: "APPROVE" | "REJECT") {
    const rejectionReason = action === "REJECT" ? window.prompt("Lý do từ chối?") || "" : "";
    const response = await fetch(`/api/admin/teacher-applications/${application.id}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setApplications((prev) =>
        prev.map((item) => (item.id === application.id ? { ...item, status: data.status, rejectionReason } : item)),
      );
      setMessage(action === "APPROVE" ? "Đã duyệt hồ sơ giảng viên." : "Đã từ chối hồ sơ giảng viên.");
    } else {
      setMessage(data?.error || "Không thể review hồ sơ.");
    }
  }

  async function reviewCourse(course: Course, decision: "APPROVE" | "REJECT") {
    const rejectionReason = decision === "REJECT" ? window.prompt("Lý do từ chối khóa học?") || "" : "";
    const response = await fetch(`/api/teacher/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reviewCourse", decision, rejectionReason }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setCourses((prev) => prev.map((item) => (item.id === course.id ? { ...item, status: data.course.status } : item)));
      setMessage(decision === "APPROVE" ? "Đã duyệt khóa học." : "Đã từ chối khóa học.");
    } else {
      setMessage(data?.error || "Không thể duyệt khóa học.");
    }
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">Bật/tắt đăng ký giảng viên</h2>
            <p className="mt-1 text-sm text-slate-500">Bật để student có thể nộp hồ sơ trở thành giảng viên.</p>
            <button
              onClick={() => void toggleTeacherEntrance(!enabled)}
              className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white ${enabled ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {enabled ? "Tắt đăng ký" : "Bật đăng ký"}
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">Tự động duyệt khóa học</h2>
            <p className="mt-1 text-sm text-slate-500">Khi bật, khóa học mới của giảng viên sẽ tự chuyển ACTIVE.</p>
            <button
              onClick={() => void toggleCourseAutoApproval(!courseAutoApproval)}
              className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white ${courseAutoApproval ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {courseAutoApproval ? "Tắt auto duyệt" : "Bật auto duyệt"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-950">Cau hinh Speaking AI</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hoc vien se dung co dinh ky thi va thoi gian theo cau hinh admin.
        </p>
        <form onSubmit={saveSpeakingConfig} className="mt-4 grid gap-3 md:grid-cols-3 md:items-end">
          <label className="text-sm font-semibold text-slate-700">
            Ky thi speaking
            <select
              value={speakingConfig.examType}
              onChange={(event) =>
                setSpeakingConfig((prev) => ({ ...prev, examType: event.target.value === "HSK" ? "HSK" : "IELTS" }))
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="IELTS">IELTS</option>
              <option value="HSK">HSK (HSKK)</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Thoi gian (giay)
            <input
              type="number"
              min={30}
              max={900}
              value={speakingConfig.durationSeconds}
              onChange={(event) =>
                setSpeakingConfig((prev) => ({
                  ...prev,
                  durationSeconds: Number(event.target.value || prev.durationSeconds),
                }))
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Luu cau hinh</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Duyệt khóa học giảng viên</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hiện có <strong>{pendingCourses.length}</strong> khóa học đang chờ duyệt.
        </p>
        <div className="mt-4 space-y-3">
          {pendingCourses.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Không có khóa học chờ duyệt.</p>
          ) : (
            pendingCourses.map((course) => (
              <article key={course.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">{course.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(course.status)}`}>{statusLabel(course.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      GV: {course.instructor?.username || "Không rõ"} - {course.instructor?.email || "Không có email"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{course.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Modules: {course._count.modules} - Tests: {course._count.tests} - Enrollments: {course._count.enrollments}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/teacher/courses/${course.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                      Xem chi tiết
                    </Link>
                    <button
                      onClick={() => void reviewCourse(course, "APPROVE")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => void reviewCourse(course, "REJECT")}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Ngôn ngữ học</h2>
        <form onSubmit={addLanguage} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={languageForm.name}
            onChange={(event) => setLanguageForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="English"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            value={languageForm.code}
            onChange={(event) => setLanguageForm((prev) => ({ ...prev, code: event.target.value }))}
            placeholder="en"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Thêm</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {languages.map((language) => (
            <span key={language.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {language.name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Teacher applications</h2>
        <div className="mt-4 space-y-4">
          {applications.map((application) => {
            const suspicious = application.suspiciousEvents.length > 0 || application.antiCheatLogs.length > 0;
            return (
              <article key={application.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">{application.user.username}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{application.status}</span>
                      {suspicious ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Suspicious Activity</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {application.user.email} - {application.language.name} - lần #{application.attemptNo}
                    </p>
                    {application.entranceAttempt ? (
                      <p className="mt-2 text-sm text-slate-700">
                        Test: {application.entranceAttempt.score.toFixed(1)} / {application.entranceAttempt.maxScore}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {application.status !== "APPROVED" && application.status !== "REJECTED" ? (
                      <>
                        <button
                          onClick={() => void reviewTeacherApplication(application, "APPROVE")}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void reviewTeacherApplication(application, "REJECT")}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{application.status}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">Certificates</p>
                    {application.certificates.map((certificate) => {
                      const expired = certificate.expiryDate ? new Date(certificate.expiryDate).getTime() < currentTs : false;
                      return (
                        <a key={certificate.id} href={certificate.fileUrl} className="mt-2 block text-sm text-blue-700 hover:underline" target="_blank">
                          {certificate.fileName} {expired ? "(expired)" : ""}
                        </a>
                      );
                    })}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">Cheat logs</p>
                    {application.suspiciousEvents.length === 0 ? <p className="mt-2 text-sm text-slate-500">No suspicious events.</p> : null}
                    {application.suspiciousEvents.map((event) => (
                      <p key={event.eventType} className="mt-2 text-sm text-slate-700">
                        {event.eventType}: {event.count} lần, {event.totalDurationSeconds}s
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Người dùng</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2">Username</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-900">{user.username}</td>
                  <td className="py-2 text-slate-600">{user.email}</td>
                  <td className="py-2 text-slate-600">{user.role}</td>
                  <td className="py-2 text-slate-600">{user.isBanned ? "Banned" : "Active"}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.role && (user.role.toLowerCase() === "teacher" || user.role === "TEACHER") ? (
                        <button
                          onClick={() => {
                            const app = applications.find((a) => a.user.email === user.email || a.user.username === user.username);
                            setSelectedCertificates(app?.certificates ?? []);
                            setShowCerts(true);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Xem cert
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          setSelectedUserForRole(user);
                          setSelectedRole(user.role ?? "USER");
                          setShowRoleModal(true);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Chỉnh role
                      </button>
                      <button onClick={() => void toggleBan(user)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {user.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCerts ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Certificates</h3>
              <button onClick={() => setShowCerts(false)} className="ml-4 rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {selectedCertificates.length === 0 ? (
                <p className="text-sm text-slate-500">No certificates found for this user.</p>
              ) : (
                selectedCertificates.map((certificate) => {
                  const expired = certificate.expiryDate ? new Date(certificate.expiryDate).getTime() < currentTs : false;
                  return (
                    <a key={certificate.id} href={certificate.fileUrl} target="_blank" className="block text-sm text-blue-700 hover:underline">
                      {certificate.fileName} {expired ? "(expired)" : ""}
                    </a>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showRoleModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Chỉnh role người dùng</h3>
              <button onClick={() => setShowRoleModal(false)} className="ml-4 rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-700">{selectedUserForRole?.username} — {selectedUserForRole?.email}</p>
              <label className="mt-4 block text-sm font-semibold text-slate-700">Role</label>
              <select
                value={selectedRole ?? "USER"}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="USER">USER</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowRoleModal(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200">Hủy</button>
                <button onClick={() => void saveRole()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Lưu</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
