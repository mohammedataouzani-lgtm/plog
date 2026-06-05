import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ deputes: [], senateurs: [], archives: [], scrutins: [] });
  try { return NextResponse.json(await globalSearch(q.trim(), 10)); }
  catch (err) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}