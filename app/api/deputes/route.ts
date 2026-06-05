import { NextRequest, NextResponse } from "next/server";
import { getDeputes } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  try {
    const result = await getDeputes({ page: Math.max(1, parseInt(searchParams.get("page") ?? "1")), pageSize: Math.min(100, parseInt(searchParams.get("pageSize") ?? "50")), groupe: searchParams.get("groupe") ?? undefined, departement: searchParams.get("departement") ?? undefined, statut: searchParams.get("statut") ?? undefined, q: searchParams.get("q") ?? undefined });
    return NextResponse.json(result);
  } catch (err) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}