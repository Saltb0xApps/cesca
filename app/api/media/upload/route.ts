import { NextResponse, type NextRequest } from "next/server";
import { uploadFileToNotion } from "../../../../src/notion/file-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  const filename = (file as any).name || "upload";
  try {
    const result = await uploadFileToNotion(file, filename);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
