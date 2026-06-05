import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(20, parseInt(req.nextUrl.searchParams.get("limit") ?? "8"));

  if (q.trim().length < 2) {
    return NextResponse.json({ deputes: [], senateurs: [], archives: [], scrutins: [] });
  }

  try {
    const results = await globalSearch(q.trim(), limit);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
