import { NextRequest, NextResponse } from "next/server";
import { getFileBuffer, getMimeType, fileExists } from "@/lib/storage";
import path from "path";
import { promises as fs } from "fs";

const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function getLegacyBuffer(basename: string): Promise<Buffer | null> {
  try {
    if (basename.includes("..") || basename.includes("/") || basename.includes("\\")) return null;
    const fullPath = path.join(LEGACY_UPLOAD_DIR, basename);
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const relativePath = pathSegments.join("/");

    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }

    const exists = await fileExists(relativePath);
    let buffer: Buffer | null = null;
    if (exists) {
      buffer = await getFileBuffer(relativePath);
    } else {
      // Fallback: registros antigos salvaram path absoluto em uploads/
      // Tenta servir pelo basename a partir de <cwd>/uploads
      const basename = path.basename(relativePath);
      buffer = await getLegacyBuffer(basename);
    }
    if (!buffer) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    const mimeType = getMimeType(relativePath);
    const filename = path.basename(relativePath);

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", buffer.length.toString());

    const isInlineViewable = mimeType.startsWith("image/") || mimeType === "application/pdf";
    const disposition = isInlineViewable ? "inline" : "attachment";
    headers.set("Content-Disposition", `${disposition}; filename="${encodeURIComponent(filename)}"`);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", "bytes");

    const range = request.headers.get("range");
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
      const chunkSize = end - start + 1;

      headers.set("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
      headers.set("Content-Length", chunkSize.toString());

      const chunk = new Uint8Array(buffer.subarray(start, end + 1));
      return new NextResponse(chunk, { status: 206, headers });
    }

    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}