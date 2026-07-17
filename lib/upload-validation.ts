export type UploadKind = "image" | "pdf" | "audio" | "video";

export type AllowedUpload = {
  kind: UploadKind;
  extension: string;
};

export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_TEST_MATERIAL_UPLOAD_BYTES = 50 * 1024 * 1024;

export function formatUploadLimit(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
};

const AUDIO_EXTENSION_SIGNATURE_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  m4a: "audio/mp4",
  aac: "audio/aac",
};

const IMAGE_EXTENSION_SIGNATURE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const VIDEO_EXTENSION_SIGNATURE_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
};

function hasImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/gif") {
    const signature = buffer.toString("ascii", 0, 6);
    return signature === "GIF87a" || signature === "GIF89a";
  }
  return false;
}

function hasMp4FamilySignature(buffer: Buffer) {
  return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
}

function normalizeMimeType(mimeType: string) {
  return mimeType.toLowerCase().split(";")[0]?.trim() || "";
}

function getFileExtension(filename?: string | null) {
  const extension = filename?.split(".").pop()?.toLowerCase().trim() || "";
  return extension && extension !== filename?.toLowerCase() ? extension : "";
}

function hasUploadSignature(buffer: Buffer, mimeType: string) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (normalizedMimeType in IMAGE_TYPES) return hasImageSignature(buffer, normalizedMimeType);
  if (normalizedMimeType === "application/pdf") return buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-";
  if (normalizedMimeType === "audio/mpeg" || normalizedMimeType === "audio/mp3") {
    return buffer.length >= 3 && (buffer.toString("ascii", 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0));
  }
  if (normalizedMimeType === "audio/wav" || normalizedMimeType === "audio/x-wav") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE";
  }
  if (normalizedMimeType === "audio/ogg") return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS";
  if (normalizedMimeType === "audio/webm" || normalizedMimeType === "video/webm") return buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  if (normalizedMimeType === "audio/mp4" || normalizedMimeType === "audio/m4a" || normalizedMimeType === "audio/x-m4a" || normalizedMimeType === "video/mp4" || normalizedMimeType === "video/quicktime") return hasMp4FamilySignature(buffer);
  if (normalizedMimeType === "audio/aac") return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0;
  if (normalizedMimeType === "video/x-msvideo") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "AVI ";
  }
  return false;
}

export function getAllowedUpload(mimeType: string, kinds: UploadKind[], filename?: string | null): AllowedUpload | null {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (kinds.includes("image") && normalizedMimeType in IMAGE_TYPES) {
    return { kind: "image", extension: IMAGE_TYPES[normalizedMimeType] };
  }
  if (kinds.includes("pdf") && normalizedMimeType === "application/pdf") {
    return { kind: "pdf", extension: "pdf" };
  }
  if (kinds.includes("audio") && normalizedMimeType in AUDIO_TYPES) {
    return { kind: "audio", extension: AUDIO_TYPES[normalizedMimeType] };
  }
  if (kinds.includes("video") && normalizedMimeType in VIDEO_TYPES) {
    return { kind: "video", extension: VIDEO_TYPES[normalizedMimeType] };
  }
  const extension = getFileExtension(filename);
  if (kinds.includes("image") && extension in IMAGE_EXTENSION_SIGNATURE_TYPES) {
    return { kind: "image", extension: extension === "jpeg" ? "jpg" : extension };
  }
  if (kinds.includes("pdf") && extension === "pdf") {
    return { kind: "pdf", extension: "pdf" };
  }
  if (kinds.includes("audio") && extension in AUDIO_EXTENSION_SIGNATURE_TYPES) {
    return { kind: "audio", extension };
  }
  if (kinds.includes("video") && extension in VIDEO_EXTENSION_SIGNATURE_TYPES) {
    return { kind: "video", extension };
  }
  return null;
}

export function validateUploadSignature(buffer: Buffer, mimeType: string, filename?: string | null) {
  if (hasUploadSignature(buffer, mimeType)) return true;
  const extension = getFileExtension(filename);
  const signatureMimeType =
    AUDIO_EXTENSION_SIGNATURE_TYPES[extension] ||
    IMAGE_EXTENSION_SIGNATURE_TYPES[extension] ||
    (extension === "pdf" ? "application/pdf" : "") ||
    VIDEO_EXTENSION_SIGNATURE_TYPES[extension];
  return signatureMimeType ? hasUploadSignature(buffer, signatureMimeType) : false;
}
