/**
 * Attachment storage.
 *
 * Upstream required Vercel Blob, which made file uploads impossible to
 * self-host. Storage is now a driver chosen by `STORAGE_DRIVER`, defaulting to
 * one that needs no external service at all.
 */

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type StoredFile = {
  url: string;
  pathname: string;
  contentType: string;
};

export function getMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES?.trim();

  if (!raw) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_UPLOAD_BYTES;
}

function getDriver(): "inline" | "vercel-blob" {
  return process.env.STORAGE_DRIVER?.trim() === "vercel-blob"
    ? "vercel-blob"
    : "inline";
}

/**
 * Data URLs are understood by every AI provider and by the browser, so an
 * attachment works identically on a laptop, an air-gapped server and a hosted
 * deployment - with no object store to run. The trade-off is that the bytes
 * live in Postgres alongside the message, which is why `vercel-blob` exists
 * for deployments with heavy upload volume.
 */
function storeInline(
  filename: string,
  bytes: ArrayBuffer,
  contentType: string
): StoredFile {
  const base64 = Buffer.from(bytes).toString("base64");

  return {
    url: `data:${contentType};base64,${base64}`,
    pathname: filename,
    contentType,
  };
}

async function storeInVercelBlob(
  filename: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<StoredFile> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "STORAGE_DRIVER=vercel-blob requires BLOB_READ_WRITE_TOKEN to be set."
    );
  }

  const { put } = await import("@vercel/blob");
  const result = await put(filename, bytes, {
    access: "public",
    contentType,
  });

  return {
    url: result.url,
    pathname: result.pathname,
    contentType,
  };
}

export async function storeAttachment(
  filename: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<StoredFile> {
  if (getDriver() === "vercel-blob") {
    return await storeInVercelBlob(filename, bytes, contentType);
  }

  return storeInline(filename, bytes, contentType);
}
