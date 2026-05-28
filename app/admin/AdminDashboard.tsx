"use client";

import { useState } from "react";

type UserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
};
type Language = { id: string; name: string; code: string; isActive: boolean };
type Application = {
  id: string;
  status: string;
  attemptNo: number;
  rejectionReason: string | null;
  user: { username: string; email: string; phoneNumber: string | null; role: string };
  language: { name: string };
  certificates: { id: string; fileName: string; fileUrl: string; expiryDate: string }[];
  suspiciousEvents: { eventType: string; count: number; totalDurationSeconds: number; severity: number }[];
  antiCheatLogs: { id: string; eventType: string; detail: string | null; serverTimestamp: string }[];
  entranceAttempt: { score: number; maxScore: number; isPassed: boolean } | null;
};

export default function AdminDashboard({
  initialEnabled,
  initialUsers,
  initialLanguages,
  initialApplications,
}: {
  initialEnabled: boolean;
  initialUsers: UserRow[];
  initialLanguages: Language[];
  initialApplications: Application[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [users, setUsers] = useState(initialUsers);
  const [languages, setLanguages] = useState(initialLanguages);
  const [applications, setApplications] = useState(initialApplications);
  const [languageForm, setLanguageForm] = useState({ name: "", code: "" });
  const [message, setMessage] = useState("");
  const [showCerts, setShowCerts] = useState(false);
  const [selectedCertificates, setSelectedCertificates] = useState<{ id: string; fileName: string; fileUrl: string; expiryDate: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

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
      setMessage(nextEnabled ? `Da bat dang ky. Email gui thanh cong: ${data.notified ?? 0}.` : "Da tat dang ky.");
    } else {
      setMessage(data?.error || "Khong the cap nhat setting.");
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
      setMessage("Da them ngon ngu.");
    } else {
      setMessage(data?.error || "Khong the them ngon ngu.");
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
      setMessage(data?.error || "Khong the cap nhat user.");
    }
  }

  async function review(application: Application, action: "APPROVE" | "REJECT") {
    const rejectionReason = action === "REJECT" ? window.prompt("Ly do reject?") || "" : "";
    const response = await fetch(`/api/admin/teacher-applications/${application.id}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setApplications((prev) => prev.map((item) => (item.id === application.id ? { ...item, status: data.status, rejectionReason } : item)));
      setMessage(action === "APPROVE" ? "Da approve ho so." : "Da reject ho so.");
    } else {
      setMessage(data?.error || "Khong the review ho so.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-700 hover:bg-slate-100 transition duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75zM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12zM3.75 17.25a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
          </div>
          <div className="text-sm text-slate-500">Manage site settings and users</div>
        </div>
        {menuOpen ? (
          <nav className="mt-3 rounded-md border border-slate-100 bg-white p-2 shadow-sm">
            <ul className="flex gap-2">
              <li>
                <button onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-1 text-sm rounded-md hover:bg-slate-50">Overview</button>
              </li>
              <li>
                <button onClick={() => { setMenuOpen(false); document.getElementById('teacher-applications')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1 text-sm rounded-md hover:bg-slate-50">Applications</button>
              </li>
              <li>
                <button onClick={() => { setMenuOpen(false); document.getElementById('users-section')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1 text-sm rounded-md hover:bg-slate-50">Users</button>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>
      {message ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Teacher Entrance Registration</h2>
            <p className="mt-1 text-sm text-slate-500">Bat/tat menu dang ky giang vien cho Student.</p>
          </div>
          <button
            onClick={() => void toggleTeacherEntrance(!enabled)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition duration-150 ease-in-out transform ${enabled ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} active:scale-95`}
          >
            {enabled ? "Tat" : "Bat"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Ngon ngu hoc</h2>
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
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition duration-150 ease-in-out transform hover:-translate-y-0.5 active:scale-95">Them</button>
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
                      {suspicious ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">! Suspicious Activity Detected</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{application.user.email} - {application.language.name} - lan #{application.attemptNo}</p>
                    {application.entranceAttempt ? (
                      <p className="mt-2 text-sm text-slate-700">
                        Test: {application.entranceAttempt.score.toFixed(1)} / {application.entranceAttempt.maxScore}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {application.status !== "APPROVED" && application.status !== "REJECTED" ? (
                      <>
                        <button onClick={() => void review(application, "APPROVE")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition duration-150 ease-in-out transform hover:-translate-y-0.5 active:scale-95">
                          Approve
                        </button>
                        <button onClick={() => void review(application, "REJECT")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition duration-150 ease-in-out transform hover:-translate-y-0.5 active:scale-95">
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
                      const expired = new Date(certificate.expiryDate).getTime() < Date.now();
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
                        {event.eventType}: {event.count} lan, {event.totalDurationSeconds}s
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
        <h2 className="text-xl font-bold text-slate-950">Nguoi dung</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2">Username</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Trang thai</th>
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
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-150 ease-in-out transform hover:-translate-y-0.5 active:scale-95"
                        >
                          Xem cert
                        </button>
                      ) : null}
                      <button onClick={() => void toggleBan(user)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-150 ease-in-out transform hover:-translate-y-0.5 active:scale-95">
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
          <div className="max-w-lg w-full rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Certificates</h3>
              <button onClick={() => setShowCerts(false)} className="ml-4 rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-4 space-y-2">
              {selectedCertificates.length === 0 ? (
                <p className="text-sm text-slate-500">No certificates found for this user.</p>
              ) : (
                selectedCertificates.map((c) => {
                  const expired = new Date(c.expiryDate).getTime() < Date.now();
                  return (
                    <a key={c.id} href={c.fileUrl} target="_blank" className="block text-sm text-blue-700 hover:underline">
                      {c.fileName} {expired ? "(expired)" : ""}
                    </a>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
