"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/http-response";
import type { TeacherExamLocation, TeacherRecruitmentSetting } from "@/lib/teacher-onboarding";
import AdminWorkspace from "./AdminWorkspace";
import AdminRecruitmentRounds, { type AdminRecruitmentRound } from "./AdminRecruitmentRounds";
import AdminTeacherAccountUpdates from "./AdminTeacherAccountUpdates";

type RecruitmentView = "rounds" | "create-round" | "accounts" | "locations";

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function emptyRecruitmentRoundForm() {
  return {
    title: "",
    description: "",
    locationIds: [] as string[],
    registrationOpensAt: "",
    registrationClosesAt: "",
    examStartsAt: "",
    examEndsAt: "",
    notifyUsers: false,
  };
}

function CreateRoundForm({
  locations,
  onSaved,
  onOpenLocations,
}: {
  locations: TeacherExamLocation[];
  onSaved: (setting: TeacherRecruitmentSetting) => void;
  onOpenLocations: () => void;
}) {
  const [form, setForm] = useState(emptyRecruitmentRoundForm);
  const [status, setStatus] = useState({ saving: false, message: "", error: false });
  const [renderedAt] = useState(() => Date.now());

  const registrationState = !form.registrationOpensAt || !form.registrationClosesAt
    ? "Cần nhập đủ thời gian mở và đóng đăng ký."
    : renderedAt < new Date(form.registrationOpensAt).getTime()
      ? "Chưa đến thời gian — cổng sẽ tự mở đúng giờ bắt đầu."
      : renderedAt >= new Date(form.registrationClosesAt).getTime()
        ? "Đã hết hạn — cổng đã tự đóng và không nhận thêm hồ sơ."
        : "Cổng đang tự động mở — người dùng có thể nộp hồ sơ.";

  async function saveNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.saving) return;
    setStatus({ saving: true, message: "", error: false });
    try {
      const response = await fetch("/api/admin/teacher-recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          registrationOpensAt: toIsoOrNull(form.registrationOpensAt),
          registrationClosesAt: toIsoOrNull(form.registrationClosesAt),
          examStartsAt: toIsoOrNull(form.examStartsAt),
          examEndsAt: toIsoOrNull(form.examEndsAt),
        }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setStatus({ saving: false, message: data.error ?? "Không thể lưu thông báo.", error: true });
        return;
      }
      onSaved(data as TeacherRecruitmentSetting);
      const createdRoundName = form.title;
      setForm(emptyRecruitmentRoundForm());
      const notifiedText = form.notifyUsers ? ` Đã gửi email thành công cho ${data.notified ?? 0} học viên.` : "";
      setStatus({ saving: false, message: `Đã tạo và mở đợt tuyển “${createdRoundName}”. Đợt đang mở trước đó đã được đóng và giữ nguyên dữ liệu.${notifiedText}`, error: false });
    } catch {
      setStatus({ saving: false, message: "Không thể kết nối máy chủ.", error: true });
    }
  }

  return (
    <section id="teacher-exam-locations" className="scroll-mt-24 rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Tạo mới</p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">Tạo đợt tuyển mới</h2>
        <p className="mt-1 text-sm text-muted-foreground">Đây là biểu mẫu duy nhất để tạo đợt tuyển. Mỗi đợt lưu độc lập thông báo, lịch đăng ký, lịch thi, địa điểm và ứng viên.</p>
      </header>

      <form onSubmit={saveNotice} className="space-y-6 p-6">
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="font-bold text-foreground">Tự động mở và đóng theo lịch đăng ký</p>
          <p className="mt-1 text-sm text-muted-foreground">Sau khi đợt tuyển được mở, hệ thống tự nhận hồ sơ từ thời điểm “Mở đăng ký” và tự ngừng nhận ngay khi qua thời điểm “Đóng đăng ký”. Admin không cần bật hoặc tắt cổng thủ công.</p>
          <p className="mt-3 rounded-lg bg-background/70 px-3 py-2 text-sm font-semibold text-foreground">Trạng thái: {registrationState}</p>
        </div>

        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Tên đợt tuyển
            <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-xl border border-border bg-background px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Nội dung
            <textarea required rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="rounded-xl border border-border bg-background px-4 py-3" />
          </label>
        </div>

        <fieldset aria-labelledby="exam-locations-label" className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="exam-locations-label" className="font-bold text-foreground">Địa điểm thi</h3>
              <p className="mt-1 text-sm text-muted-foreground">Có thể chọn nhiều địa điểm; tất cả địa chỉ đã chọn sẽ được gửi kèm thông báo.</p>
            </div>
            <button type="button" onClick={onOpenLocations} className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-primary hover:bg-muted">Quản lý địa điểm</button>
          </div>
          {locations.length === 0 ? (
            <button type="button" onClick={onOpenLocations} className="mt-4 w-full rounded-xl border border-dashed border-border p-5 text-left text-sm text-muted-foreground hover:bg-muted">
              Chưa có địa điểm cố định. Nhấn để thêm địa chỉ đầu tiên.
            </button>
          ) : (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {locations.map((location) => {
                const checked = form.locationIds.includes(location.id);
                return (
                  <label key={location.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        locationIds: event.target.checked
                          ? [...current.locationIds, location.id]
                          : current.locationIds.filter((id) => id !== location.id),
                      }))}
                      className="mt-1 size-4"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-foreground">{location.name}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{location.address}</span>
                      {location.note ? <span className="mt-1 block text-xs text-muted-foreground">{location.note}</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-foreground">Mở đăng ký<input required type="datetime-local" value={form.registrationOpensAt} onChange={(event) => setForm((current) => ({ ...current, registrationOpensAt: event.target.value }))} className="rounded-xl border border-border bg-background px-4 py-3" /></label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">Đóng đăng ký<input required type="datetime-local" value={form.registrationClosesAt} onChange={(event) => setForm((current) => ({ ...current, registrationClosesAt: event.target.value }))} className="rounded-xl border border-border bg-background px-4 py-3" /></label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">Bắt đầu kỳ thi<input required type="datetime-local" value={form.examStartsAt} onChange={(event) => setForm((current) => ({ ...current, examStartsAt: event.target.value }))} className="rounded-xl border border-border bg-background px-4 py-3" /></label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">Kết thúc kỳ thi<input required type="datetime-local" value={form.examEndsAt} onChange={(event) => setForm((current) => ({ ...current, examEndsAt: event.target.value }))} className="rounded-xl border border-border bg-background px-4 py-3" /></label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <input type="checkbox" checked={form.notifyUsers} onChange={(event) => setForm((current) => ({ ...current, notifyUsers: event.target.checked }))} className="mt-1 size-4" />
          <span><span className="block font-bold text-foreground">Gửi thông báo và email ngay sau khi lưu</span><span className="mt-1 block text-sm text-muted-foreground">Email sẽ chứa lịch đăng ký, lịch thi và đầy đủ địa chỉ của mọi địa điểm đã chọn.</span></span>
        </label>

        {status.message ? <p role="status" className={`rounded-xl p-4 text-sm font-semibold ${status.error ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}`}>{status.message}</p> : null}
        <button type="submit" disabled={status.saving} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60">{status.saving ? "Đang tạo..." : "Tạo và mở đợt tuyển mới"}</button>
      </form>
    </section>
  );
}

function LocationsForm({
  locations,
  usedLocationIds,
  onChange,
}: {
  locations: TeacherExamLocation[];
  usedLocationIds: string[];
  onChange: (locations: TeacherExamLocation[]) => void;
}) {
  const [form, setForm] = useState({ id: "", name: "", address: "", note: "" });
  const [status, setStatus] = useState({ busy: false, message: "", error: false });

  function resetForm() {
    setForm({ id: "", name: "", address: "", note: "" });
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.busy) return;
    setStatus({ busy: true, message: "", error: false });
    try {
      const response = await fetch("/api/admin/teacher-exam-locations", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setStatus({ busy: false, message: data.error ?? "Không thể lưu địa điểm.", error: true });
        return;
      }
      const location = data.location as TeacherExamLocation;
      onChange(form.id ? locations.map((item) => item.id === form.id ? location : item) : [...locations, location]);
      resetForm();
      setStatus({ busy: false, message: form.id ? "Đã cập nhật địa điểm." : "Đã thêm địa điểm cố định.", error: false });
    } catch {
      setStatus({ busy: false, message: "Không thể kết nối máy chủ.", error: true });
    }
  }

  async function removeLocation(location: TeacherExamLocation) {
    if (status.busy || usedLocationIds.includes(location.id)) return;
    if (!window.confirm(`Xóa địa điểm “${location.name}”?`)) return;
    setStatus({ busy: true, message: "", error: false });
    try {
      const response = await fetch("/api/admin/teacher-exam-locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: location.id }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setStatus({ busy: false, message: data.error ?? "Không thể xóa địa điểm.", error: true });
        return;
      }
      onChange(locations.filter((item) => item.id !== location.id));
      setStatus({ busy: false, message: "Đã xóa địa điểm.", error: false });
    } catch {
      setStatus({ busy: false, message: "Không thể kết nối máy chủ.", error: true });
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Danh mục dùng lại</p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">Địa điểm thi cố định</h2>
        <p className="mt-1 text-sm text-muted-foreground">Lưu địa chỉ một lần, sau đó chọn lại cho các kỳ thi và tự động đưa vào email thông báo.</p>
      </header>
      <div className="space-y-6 p-6">
        <form onSubmit={saveLocation} className="space-y-4 rounded-xl border border-border p-5">
          <h3 className="font-bold text-foreground">{form.id ? "Chỉnh sửa địa điểm" : "Thêm địa điểm mới"}</h3>
          <label className="grid gap-2 text-sm font-semibold text-foreground">Tên địa điểm<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Cơ sở Quận 1" className="rounded-xl border border-border bg-background px-4 py-3" /></label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">Địa chỉ đầy đủ<textarea required rows={3} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" className="rounded-xl border border-border bg-background px-4 py-3" /></label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">Thông tin thêm<textarea rows={3} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Phòng thi, tầng, hướng dẫn gửi xe..." className="rounded-xl border border-border bg-background px-4 py-3" /></label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={status.busy} className="rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground disabled:opacity-60">{status.busy ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm địa điểm"}</button>
            {form.id ? <button type="button" onClick={resetForm} className="rounded-xl border border-border px-4 py-2.5 font-bold text-foreground hover:bg-muted">Hủy sửa</button> : null}
          </div>
          {status.message ? <p role="status" className={`rounded-lg p-3 text-sm font-semibold ${status.error ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}`}>{status.message}</p> : null}
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-bold text-foreground">Địa điểm đã lưu</h3><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{locations.length} địa điểm</span></div>
          {locations.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Chưa có địa điểm cố định.</p> : locations.map((location) => {
            const inUse = usedLocationIds.includes(location.id);
            return (
              <article key={location.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><h4 className="font-bold text-foreground">{location.name}</h4><p className="mt-1 text-sm text-muted-foreground">{location.address}</p>{location.note ? <p className="mt-2 text-xs text-muted-foreground">{location.note}</p> : null}{inUse ? <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Đang dùng trong thông báo</span> : null}</div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setForm(location)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted">Sửa</button>
                    <button type="button" disabled={inUse || status.busy} title={inUse ? "Bỏ chọn địa điểm trong thông báo trước khi xóa" : undefined} onClick={() => void removeLocation(location)} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">Xóa</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function AdminTeacherRecruitment({
  initialSetting,
  initialLocations,
  initialRounds,
}: {
  initialSetting: TeacherRecruitmentSetting;
  initialLocations: TeacherExamLocation[];
  initialRounds: AdminRecruitmentRound[];
}) {
  const router = useRouter();
  const [data, setData] = useState({
    setting: initialSetting,
    locations: initialLocations,
  });
  const workspaceItems: { id: RecruitmentView; label: string; description: string }[] = [
    { id: "rounds", label: "Chọn đợt tuyển", description: "Quản lý ứng viên, lịch thi và link chấm" },
    { id: "create-round", label: "Tạo đợt tuyển mới", description: "Tạo thông báo, lịch và địa điểm thi" },
    { id: "accounts", label: "Cập nhật tài khoản giảng viên", description: "Chọn ứng viên đạt để chuyển Teacher" },
    { id: "locations", label: "Địa điểm thi cố định", description: "Lưu địa chỉ dùng lại cho kỳ thi" },
  ];

  return (
    <AdminWorkspace
      items={workspaceItems}
      initialActiveId="rounds"
      ariaLabel="Chức năng tuyển giảng viên"
      renderContent={(activeView, select) => activeView === "rounds" ? (
        <AdminRecruitmentRounds initialRounds={initialRounds} />
      ) : activeView === "create-round" ? (
        <CreateRoundForm
          locations={data.locations}
          onSaved={(setting) => {
            setData((current) => ({ ...current, setting }));
            router.refresh();
          }}
          onOpenLocations={() => select("locations")}
        />
      ) : activeView === "accounts" ? (
        <AdminTeacherAccountUpdates initialRounds={initialRounds} />
      ) : (
        <LocationsForm
          locations={data.locations}
          usedLocationIds={data.setting.locationIds}
          onChange={(locations) => setData((current) => ({ ...current, locations }))}
        />
      )}
    />
  );
}
