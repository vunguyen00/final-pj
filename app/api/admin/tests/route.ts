import { NextRequest, NextResponse } from "next/server";
import { getAdminManagedTestsPage } from "@/lib/admin-managed-tests";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const result = await getAdminManagedTestsPage({
      page: Number(params.get("page") ?? 1),
      search: params.get("search") ?? "",
      languageId: params.get("languageId") ?? "",
      kind: params.get("kind") ?? "",
      assessmentMode: params.get("assessmentMode") ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ADMIN_TESTS] Failed to load managed tests", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách đề." },
      { status: 500 },
    );
  }
}
