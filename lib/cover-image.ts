import type { Maybe } from "@/lib/types";

export function parseCoverImage(data: Maybe<string>) {
  if (!data) return null;

  const dataUriMatch = data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (dataUriMatch) {
    const [, mimeType, base64] = dataUriMatch;
    return { base64, mimeType };
  }

  return null;
}

export function stringifyCoverImage(
  coverImage: Maybe<string>,
  data: Maybe<{ base64: string; mimeType: string }>
) {
  if (data && typeof data === "object" && data.base64 && data.mimeType) {
    return `data:${data.mimeType};base64,${data.base64}`;
  }
  if (coverImage) return coverImage;
  return null;
}

export function buildCoverImageData(
  coverImage: Maybe<string>
): {
  coverImage: string | null;
  coverImageData: { base64: string; mimeType: string } | null;
} {
  const parsed = parseCoverImage(coverImage);
  const resolved = stringifyCoverImage(
    coverImage?.startsWith("data:") ? undefined : coverImage ?? null,
    parsed
  );
  return {
    coverImage: resolved ?? null,
    coverImageData: parsed ?? null,
  };
}
