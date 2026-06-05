import { NextRequest, NextResponse } from "next/server";
import { getDepute } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, { params }: { params: { uid: string } }) {
  const d = await getDepute(params.uid);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(d);
}