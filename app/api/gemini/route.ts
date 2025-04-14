// app/api/gemini/route.ts
import { generateWithPrompt } from "../../lib/gemini";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  try {
    const result = await generateWithPrompt(prompt);
    return Response.json({ result });
  } catch (error: any) {
    return Response.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
