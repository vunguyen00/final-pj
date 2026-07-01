"use client";

import { useMemo, useReducer } from "react";
import type { CertificateSummary, ManagedUser, StudentsManagementData } from "@/lib/teacher-students";

type EditForm = {
  email: string;
  role: string;
};

type StudentsState = {
  users: ManagedUser[];
  message: string;
  search: string;
  editingUser: ManagedUser | null;
  editForm: EditForm;
  selectedCertificates: CertificateSummary[] | null;
  selectedCoursesUser: Pick<ManagedUser, "username" | "courses"> | null;
};

type StudentsAction =
  | { type: "SET_SEARCH"; search: string }
  | { type: "SET_MESSAGE"; message: string }
  | { type: "OPEN_EDIT"; user: ManagedUser }
  | { type: "CLOSE_EDIT" }
  | { type: "UPDATE_EDIT_FORM"; form: Partial<EditForm> }
  | { type: "SET_CERTIFICATES"; certificates: CertificateSummary[] | null }
  | { type: "SET_COURSES_USER"; user: Pick<ManagedUser, "username" | "courses"> | null }
  | { type: "APPLY_USER_UPDATE"; user: Pick<ManagedUser, "id" | "email" | "role" | "isBanned"> };

type Summary = {
  total: number;
  students: number;
  teachers: number;
};

function createInitialState(initialData: StudentsManagementData): StudentsState {
  return {
    users: initialData.users,
    message: "",
    search: "",
    editingUser: null,
    editForm: { email: "", role: "STUDENT" },
    selectedCertificates: null,
    selectedCoursesUser: null,
  };
}

function studentsReducer(state: StudentsState, action: StudentsAction): StudentsState {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, search: action.search };
    case "SET_MESSAGE":
      return { ...state, message: action.message };
    case "OPEN_EDIT":
      return {
        ...state,
        editingUser: action.user,
        editForm: {
          email: action.user.email,
          role: action.user.role ?? "STUDENT",
        },
      };
    case "CLOSE_EDIT":
      return { ...state, editingUser: null };
    case "UPDATE_EDIT_FORM":
      return { ...state, editForm: { ...state.editForm, ...action.form } };
    case "SET_CERTIFICATES":
      return { ...state, selectedCertificates: action.certificates };
    case "SET_COURSES_USER":
      return { ...state, selectedCoursesUser: action.user };
    case "APPLY_USER_UPDATE":
      return {
        ...state,
        users: state.users.map((item) =>
          item.id === action.user.id
            ? {
                ...item,
                email: action.user.email ?? item.email,
                role: action.user.role ?? item.role,
                isBanned: action.user.isBanned ?? item.isBanned,
              }
            : item,
        ),
      };
    default:
      return state;
  }
}

function filterUsers(users: ManagedUser[], search: string) {
  const keyword = search.trim().toLocaleLowerCase("vi");
  if (!keyword) return users;

  return users.filter((user) =>
    `${user.username} ${user.email} ${user.courses.map((course) => course.name).join(" ")}`
      .toLocaleLowerCase("vi")
      .includes(keyword),
  );
}

function buildSummary(users: ManagedUser[]): Summary {
  return {
    total: users.length,
    students: users.filter((user) => user.role === "STUDENT").length,
    teachers: users.filter((user) => user.role === "TEACHER").length,
  };
}

export default function StudentsManagement({ initialData }: { initialData: StudentsManagementData }) {
  const [state, dispatch] = useReducer(studentsReducer, initialData, createInitialState);
  const { users, message, search, editingUser, editForm, selectedCertificates, selectedCoursesUser } = state;
  const isAdmin = initialData.viewerRole === "ADMIN";
  const filteredUsers = useMemo(() => filterUsers(users, search), [search, users]);
  const summary = useMemo(() => buildSummary(users), [users]);

  async function patchUser(user: ManagedUser, changes: { isBanned?: boolean; email?: string; role?: string }) {
    dispatch({ type: "SET_MESSAGE", message: "" });
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      dispatch({ type: "SET_MESSAGE", message: data?.error || "Không thể cập nhật người dùng." });
      return false;
    }

    dispatch({
      type: "APPLY_USER_UPDATE",
      user: {
        id: user.id,
        email: data.user.email,
        role: data.user.role,
        isBanned: data.user.isBanned,
      },
    });
    dispatch({ type: "SET_MESSAGE", message: "Đã cập nhật thông tin người dùng." });
    return true;
  }

  async function saveUser() {
    if (!editingUser) return;

    const saved = await patchUser(editingUser, {
      email: editForm.email,
      role: editForm.role,
    });
    if (saved) dispatch({ type: "CLOSE_EDIT" });
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <StudentsHeader
          isAdmin={isAdmin}
          search={search}
          onSearchChange={(nextSearch) => dispatch({ type: "SET_SEARCH", search: nextSearch })}
        />
        {isAdmin ? <SummaryCards summary={summary} /> : null}
        {message ? <StatusMessage message={message} /> : null}
        <UsersTable
          users={filteredUsers}
          isAdmin={isAdmin}
          onEdit={(user) => dispatch({ type: "OPEN_EDIT", user })}
          onShowCertificates={(certificates) => dispatch({ type: "SET_CERTIFICATES", certificates })}
          onShowCourses={(user) => dispatch({ type: "SET_COURSES_USER", user })}
          onToggleBan={(user) => void patchUser(user, { isBanned: !user.isBanned })}
        />
      </div>

      {editingUser ? (
        <EditUserModal
          user={editingUser}
          form={editForm}
          onClose={() => dispatch({ type: "CLOSE_EDIT" })}
          onChange={(form) => dispatch({ type: "UPDATE_EDIT_FORM", form })}
          onSave={() => void saveUser()}
        />
      ) : null}

      {selectedCertificates ? (
        <CertificatesModal
          certificates={selectedCertificates}
          onClose={() => dispatch({ type: "SET_CERTIFICATES", certificates: null })}
        />
      ) : null}

      {selectedCoursesUser ? (
        <CoursesModal
          user={selectedCoursesUser}
          onClose={() => dispatch({ type: "SET_COURSES_USER", user: null })}
        />
      ) : null}
    </main>
  );
}

function StudentsHeader({
  isAdmin,
  search,
  onSearchChange,
}: {
  isAdmin: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          {isAdmin ? "Quản lý người dùng và học viên" : "Học viên của tôi"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Xem tài khoản, khóa học, số dư, điểm đậu và chỉnh sửa quyền."
            : "Chỉ hiển thị học viên tham gia các khóa học do bạn phụ trách."}
        </p>
      </div>
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Tìm tên, email hoặc khóa học..."
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
      />
    </div>
  );
}

function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <section className="mt-5 grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Tổng tài khoản" value={summary.total} />
      <SummaryCard label="Học viên" value={summary.students} />
      <SummaryCard label="Giảng viên" value={summary.teachers} />
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function StatusMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      {message}
    </div>
  );
}

function UsersTable({
  users,
  isAdmin,
  onEdit,
  onShowCertificates,
  onShowCourses,
  onToggleBan,
}: {
  users: ManagedUser[];
  isAdmin: boolean;
  onEdit: (user: ManagedUser) => void;
  onShowCertificates: (certificates: CertificateSummary[]) => void;
  onShowCourses: (user: Pick<ManagedUser, "username" | "courses">) => void;
  onToggleBan: (user: ManagedUser) => void;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              {isAdmin ? <th className="px-4 py-3">Vai trò</th> : null}
              <th className="px-4 py-3">Khóa học tham gia</th>
              {isAdmin ? <th className="px-4 py-3">Số dư</th> : null}
              {isAdmin ? <th className="px-4 py-3">Hạt đậu</th> : null}
              {isAdmin ? <th className="px-4 py-3">Trạng thái</th> : null}
              {isAdmin ? <th className="px-4 py-3 text-right">Thao tác</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onShowCertificates={onShowCertificates}
                onShowCourses={onShowCourses}
                onToggleBan={onToggleBan}
              />
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</p>
      ) : null}
    </section>
  );
}

function UserRow({
  user,
  isAdmin,
  onEdit,
  onShowCertificates,
  onShowCourses,
  onToggleBan,
}: {
  user: ManagedUser;
  isAdmin: boolean;
  onEdit: (user: ManagedUser) => void;
  onShowCertificates: (certificates: CertificateSummary[]) => void;
  onShowCourses: (user: Pick<ManagedUser, "username" | "courses">) => void;
  onToggleBan: (user: ManagedUser) => void;
}) {
  return (
    <tr className="align-top hover:bg-slate-50/70">
      <td className="px-4 py-4">
        <p className="font-semibold text-slate-950">{user.username}</p>
        <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
      </td>
      {isAdmin ? <td className="px-4 py-4 font-medium text-slate-700">{user.role}</td> : null}
      <td className="max-w-sm px-4 py-4">
        {user.courses.length === 0 ? (
          <span className="text-slate-400">Chưa tham gia khóa học</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onShowCourses({ username: user.username, courses: user.courses })}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Xem chi tiết
            </button>
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
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {user.isBanned ? "Đã khóa" : "Hoạt động"}
          </span>
        </td>
      ) : null}
      {isAdmin ? (
        <td className="px-4 py-4">
          <div className="flex justify-end gap-2">
            {user.role === "TEACHER" ? (
              <button
                type="button"
                onClick={() => onShowCertificates(user.certificates ?? [])}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Chứng chỉ
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => onToggleBan(user)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${user.isBanned ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"}`}
            >
              {user.isBanned ? "Mở khóa" : "Khóa"}
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function EditUserModal({
  user,
  form,
  onClose,
  onChange,
  onSave,
}: {
  user: ManagedUser;
  form: EditForm;
  onClose: () => void;
  onChange: (form: Partial<EditForm>) => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Chỉnh sửa người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">{user.username}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
            Đóng
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange({ email: event.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Vai trò
          <select
            value={form.role}
            onChange={(event) => onChange({ role: event.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="STUDENT">STUDENT</option>
            <option value="TEACHER">TEACHER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Hủy
          </button>
          <button type="button" onClick={onSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

function CertificatesModal({
  certificates,
  onClose,
}: {
  certificates: CertificateSummary[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-950">Chứng chỉ giảng viên</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
            Đóng
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {certificates.length === 0 ? (
            <p className="text-sm text-slate-500">Không có chứng chỉ.</p>
          ) : (
            certificates.map((certificate) => (
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
  );
}

function CoursesModal({
  user,
  onClose,
}: {
  user: Pick<ManagedUser, "username" | "courses">;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Khóa học tham gia</h2>
            <p className="mt-1 text-sm text-slate-500">{user.username}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
            Đóng
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
          {user.courses.map((course) => (
            <div key={course.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-950">{course.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Tham gia ngày {new Date(course.enrolledAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
