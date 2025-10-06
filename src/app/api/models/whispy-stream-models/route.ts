import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DEFAULT_DATA_DIR = process.env.WHISPY_MODELS_DIR || path.join(process.cwd(), "var", "models");
// Guardaremos SIEMPRE aquí y lo serviremos vía el GET de abajo
const FILE_NAME = "whispy-stream-models.json";
const FILE_PATH = path.join(DEFAULT_DATA_DIR, FILE_NAME);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }
    await ensureDir(DEFAULT_DATA_DIR);
    const content = JSON.stringify(body, null, 2);
    await fs.writeFile(FILE_PATH, content, "utf-8");
    return NextResponse.json({ ok: true, path: FILE_PATH });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error guardando JSON" }, { status: 500 });
  }
}
