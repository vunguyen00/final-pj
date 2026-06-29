"use client";

import { useState } from "react";

type ProfileUser = {
  username: string;
  email: string;
  phoneNumber: string | null;
  learningLanguageId: string | null;
};

export default function ProfileSettings({
  user,
}: {
  user: ProfileUser;
}) {
  const [username, setUsername] = useState(user.username);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, phoneNumber }),
    });
    const data = await response.json().catch(() => ({}));
    setProfileMessage(response.ok ? "Đã cập nhật hồ sơ." : data?.error || "Không thể cập nhật.");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    const response = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordForm),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setPasswordMessage("Đã đổi mật khẩu.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPasswordMessage(data?.error || "Không thể đổi mật khẩu.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Thông tin cá nhân</h2>
        <div className="mt-4 space-y-4">
          <Field label="Tên hiển thị">
            <input
              aria-label="Tên hiển thị"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
          <Field label="Email">
            <input
              aria-label="Email"
              value={user.email}
              disabled
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600"
            />
          </Field>
          <Field label="Số điện thoại">
            <input
              aria-label="Số điện thoại"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
          {/* Removed language selection per requirements */}
        </div>
        {profileMessage ? <p className="mt-3 text-sm text-blue-700">{profileMessage}</p> : null}
        <button type="submit" className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Lưu thay đổi
        </button>
      </form>

      <form onSubmit={changePassword} className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Đổi mật khẩu</h2>
        <div className="mt-4 space-y-4">
          <Field label="Mật khẩu cũ">
            <input
              aria-label="Mật khẩu cũ"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
          <Field label="Mật khẩu mới">
            <input
              aria-label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
          <Field label="Xác nhận mật khẩu mới">
            <input
              aria-label="Xác nhận mật khẩu mới"
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>
        {passwordMessage ? <p className="mt-3 text-sm text-blue-700">{passwordMessage}</p> : null}
        <button type="submit" className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Đổi mật khẩu
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
