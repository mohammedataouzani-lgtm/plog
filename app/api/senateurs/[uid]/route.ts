import { NextRequest, NextResponse } from "next/server";
import { getSenateur } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, { params }: { params: { uid: string } }) {
  const s = await getSenateur(params.uid);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(s);
}