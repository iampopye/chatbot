import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { getMaxUploadBytes, storeAttachment } from "@/lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BYTES_PER_MB = 1024 * 1024;

// Blob rather than File, because File is not available in every Node runtime.
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= getMaxUploadBytes(), {
      message: `File size should be less than ${Math.floor(
        getMaxUploadBytes() / BYTES_PER_MB
      )}MB`,
    })
    .refine((file) => ALLOWED_TYPES.includes(file.type), {
      message: `File type should be one of: ${ALLOWED_TYPES.join(", ")}`,
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Blob has no name; the original File does.
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const stored = await storeAttachment(
        filename,
        fileBuffer,
        file.type || "application/octet-stream"
      );

      return NextResponse.json(stored);
    } catch (error) {
      // Surface the reason: a misconfigured storage driver is otherwise
      // indistinguishable from a broken upload.
      console.error("Attachment storage failed:", error);

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to store the file",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to process upload request:", error);

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
