import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DEFAULT_DATA_DIR = process.env.WHISPY_MODELS_DIR || path.join(process.cwd(), "var", "models");
const FILE_PATH = path.join(DEFAULT_DATA_DIR, "whispy-stream-models.json");

export async function GET() {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Si aún no existe, devolvemos objeto vacío (o 404 si prefieres)
    return NextResponse.json({}, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
