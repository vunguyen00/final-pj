import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getTeacherExamLocations,
  getTeacherRecruitmentSetting,
  setTeacherExamLocations,
  type TeacherExamLocation,
} from "@/lib/teacher-onboarding";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}

function readLocation(body: unknown) {
  const value = body && typeof body === "object" ? body as Partial<TeacherExamLocation> : {};
  return {
    name: typeof value.name === "string" ? value.name.trim().slice(0, 120) : "",
    address: typeof value.address === "string" ? value.address.trim().slice(0, 500) : "",
    note: typeof value.note === "string" ? value.note.trim().slice(0, 500) : "",
  };
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ locations: await getTeacherExamLocations() });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const input = readLocation(await request.json().catch(() => null));
  if (!input.name || !input.address) {
    return NextResponse.json({ error: "Vui lòng nhập tên địa điểm và địa chỉ đầy đủ." }, { status: 400 });
  }
  const locations = await getTeacherExamLocations();
  const location: TeacherExamLocation = { id: randomUUID(), ...input };
  await setTeacherExamLocations([...locations, location]);
  return NextResponse.json({ location }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const input = readLocation(body);
  if (!id || !input.name || !input.address) {
    return NextResponse.json({ error: "Dữ liệu địa điểm không hợp lệ." }, { status: 400 });
  }
  const locations = await getTeacherExamLocations();
  if (!locations.some((location) => location.id === id)) {
    return NextResponse.json({ error: "Không tìm thấy địa điểm." }, { status: 404 });
  }
  const updated = locations.map((location) => location.id === id ? { id, ...input } : location);
  await setTeacherExamLocations(updated);
  return NextResponse.json({ location: updated.find((location) => location.id === id) });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Thiếu mã địa điểm." }, { status: 400 });
  const [locations, setting] = await Promise.all([
    getTeacherExamLocations(),
    getTeacherRecruitmentSetting(),
  ]);
  if (setting.locationIds.includes(id)) {
    return NextResponse.json(
      { error: "Địa điểm đang được dùng trong thông báo kỳ thi. Hãy bỏ chọn địa điểm trước khi xóa." },
      { status: 409 },
    );
  }
  await setTeacherExamLocations(locations.filter((location) => location.id !== id));
  return NextResponse.json({ success: true });
}
