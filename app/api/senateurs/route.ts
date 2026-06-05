import { NextRequest, NextResponse } from "next/server";
import { getSenateurs } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const result = await getSenateurs({ page: Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1")), pageSize: 50, groupe: req.nextUrl.searchParams.get("groupe") ?? undefined, q: req.nextUrl.searchParams.get("q") ?? undefined });
    return NextResponse.json(result);
  } catch (err) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}