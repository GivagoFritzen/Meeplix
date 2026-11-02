import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveTempFile } from "@/lib/storage";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/epub+zip",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const type = (formData.get("type") as string) || "OTHER";

    if (!files.length) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `Arquivo ${file.name} excede 100MB` }, { status: 400 });
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Tipo de arquivo não permitido: ${file.type}` }, { status: 400 });
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      const buffer = Buffer.from(await file.arrayBuffer());
      // Usa STORAGE_PATH/temp (volume /app/storage) em vez de <cwd>/uploads,
      // que não existe no container standalone e causa EACCES para o user nextjs.
      const saved = await saveTempFile(buffer, file.name);

      uploadedFiles.push({
        originalName: file.name,
        displayName: file.name,
        mimeType: file.type,
        extension,
        size: file.size,
        path: saved.path,
        type,
      });
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 });
  }
}