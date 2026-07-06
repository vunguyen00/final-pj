const IMAGE_URL_PARAM_KEYS = ["imgurl", "mediaurl", "url"];

export function normalizeCourseThumbnailUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    for (const key of IMAGE_URL_PARAM_KEYS) {
      const nestedUrl = url.searchParams.get(key);
      if (nestedUrl) return nestedUrl.trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function isLikelyImageSearchUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.hostname.includes("google.") && (url.pathname.includes("/imgres") || url.pathname.includes("/search"));
  } catch {
    return false;
  }
}
