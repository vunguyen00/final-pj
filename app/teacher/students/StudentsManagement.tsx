"use client";

import { useEffect, useMemo, useState } from "react";

type CourseEnrollment = {
  id: string;
  name: string;
  enrolledAt: string;
};

type Certificate = {
  id: string;
  fileName: string;
  fileUrl: string;
  expiryDate: string;
};

type ManagedUser = {
  id: string;
  username: string;
  email: string;
  role?: string;
  isBanned?: boolean;
  balance?: number;
  points?: number;
  courses: CourseEnrollment[];
  certificates?: Certificate[];
};

export default function StudentsManagement() {
  const [viewerRole, setViewerRole] = useState<"TEACHER" | "ADMIN" | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ email: "", role: "STUDENT" });
  const [selectedCertificates, setSelectedCertificates] = useState<Certificate[] | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    fetch("/api/teacher/students", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Không thể tải danh sách học viên.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setViewerRole(data.viewerRole);
        setUsers(data.users ?? []);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể kết nối đến máy chủ.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return users;

    return users.filter((user) =>
      `${user.username} ${user.email} ${user.courses.map((course) => course.name).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }, [search, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      students: users.filter((user) => user.role === "STUDENT").length,
      teachers: users.filter((user) => user.role === "TEACHER").length,
    }),
    [users],
  );

  async function patchUser(
    user: ManagedUser,
    changes: { isBanned?: boolean; email?: string; role?: string },
  ) {
    setMessage("");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data?.error || "Không thể cập nhật người dùng.");
      return false;
    }

    setUsers((previous) =>
      previous.map((item) =>
        item.id === user.id
          ? {
              ...item,
              email: data.user.email,
              role: data.user.role,
              isBanned: data.user.isBanned,
            }
          : item,
      ),
    );
    setMessage("Đã cập nhật thông tin người dùng.");
    return true;
  }

  async function saveUser() {
    if (!editingUser) return;

    const saved = await patchUser(editingUser, {
      email: editForm.email,
      role: editForm.role,
    });
    if (saved) setEditingUser(null);
  }

  function openEdit(user: ManagedUser) {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      role: user.role ?? "STUDENT",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-10">
        <p className="text-center text-sm text-slate-500">Đang tải danh sách...</p>
      </main>
    );
  }

  const isAdmin = viewerRole === "ADMIN";

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              {isAdmin ? "Quản lý người dùng và học viên" : "Học viên của tôi"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? "Xem tài khoản, khóa học, số dư, điểm tích lũy và chỉnh sửa quyền."
                : "Chỉ hiển thị học viên tham gia các khóa học do bạn phụ trách."}
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, email hoặc khóa học..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
          />
        </div>

        {isAdmin ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Tổng tài khoản</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Học viên</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{summary.students}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Giảng viên</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{summary.teachers}</p>
            </div>
          </section>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Người dùng</th>
                  {isAdmin ? <th className="px-4 py-3">Vai trò</th> : null}
                  <th className="px-4 py-3">Khóa học tham gia</th>
                  {isAdmin ? <th className="px-4 py-3">Số dư</th> : null}
                  {isAdmin ? <th className="px-4 py-3">Điểm</th> : null}
                  {isAdmin ? <th className="px-4 py-3">Trạng thái</th> : null}
                  {isAdmin ? <th className="px-4 py-3 text-right">Thao tác</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{user.username}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-4 font-medium text-slate-700">{user.role}</td>
                    ) : null}
                    <td className="max-w-sm px-4 py-4">
                      {user.courses.length === 0 ? (
                        <span className="text-slate-400">Chưa tham gia khóa học</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {user.courses.map((course) => (
                            <span
                              key={`${user.id}-${course.id}`}
                              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                            >
                              {course.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {isAdmin ? (
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                        {Math.round(user.balance ?? 0).toLocaleString("vi-VN")}đ
                      </td>
                    ) : null}
                    {isAdmin ? (
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-amber-700">
                        {(user.points ?? 0).toLocaleString("vi-VN")}
                      </td>
                    ) : null}
                    {isAdmin ? (
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isBanned
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {user.isBanned ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>
                    ) : null}
                    {isAdmin ? (
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {user.role === "TEACHER" ? (
                            <button
                              onClick={() =>
                                setSelectedCertificates(user.certificates ?? [])
                              }
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Chứng chỉ
                            </button>
                          ) : null}
                          <button
                            onClick={() => openEdit(user)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={() =>
                              void patchUser(user, { isBanned: !user.isBanned })
                            }
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                              user.isBanned
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-red-600 text-white hover:bg-red-700"
                            }`}
                          >
                            {user.isBanned ? "Mở khóa" : "Khóa"}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Không tìm thấy người dùng phù hợp.
            </p>
          ) : null}
        </section>
      </div>

      {editingUser ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Chỉnh sửa người dùng</h2>
                <p className="mt-1 text-sm text-slate-500">{editingUser.username}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, email: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Vai trò
              <select
                value={editForm.role}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, role: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={() => void saveUser()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCertificates ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-slate-950">Chứng chỉ giảng viên</h2>
              <button
                onClick={() => setSelectedCertificates(null)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {selectedCertificates.length === 0 ? (
                <p className="text-sm text-slate-500">Không có chứng chỉ.</p>
              ) : (
                selectedCertificates.map((certificate) => (
                  <a
                    key={certificate.id}
                    href={certificate.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-blue-700 hover:underline"
                  >
                    {certificate.fileName}
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
