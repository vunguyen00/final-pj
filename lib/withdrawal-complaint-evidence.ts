import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatUploadLimit, getAllowedUpload, validateUploadSignature } from "@/lib/upload-validation";

export const MAX_WITHDRAWAL_COMPLAINT_EVIDENCE_BYTES = 5 * 1024 * 1024;

export type ComplaintEvidenceUpload = {
  evidenceImageUrl: string;
  evidenceImageName: string;
};

export async function saveWithdrawalComplaintEvidence(file: File | null): Promise<ComplaintEvidenceUpload | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_WITHDRAWAL_COMPLAINT_EVIDENCE_BYTES) {
    throw new Error(`INVALID_EVIDENCE:Ảnh minh chứng không được vượt quá ${formatUploadLimit(MAX_WITHDRAWAL_COMPLAINT_EVIDENCE_BYTES)}.`);
  }

  const allowed = getAllowedUpload(file.type, ["image"], file.name);
  if (!allowed) {
    throw new Error("INVALID_EVIDENCE:Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateUploadSignature(buffer, file.type, file.name)) {
    throw new Error("INVALID_EVIDENCE:Tệp ảnh minh chứng không hợp lệ.");
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "withdrawal-complaints");
  await mkdir(uploadDirectory, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${allowed.extension}`;
  await writeFile(path.join(uploadDirectory, filename), buffer);

  return {
    evidenceImageUrl: `/uploads/withdrawal-complaints/${filename}`,
    evidenceImageName: file.name.slice(0, 200),
  };
}
