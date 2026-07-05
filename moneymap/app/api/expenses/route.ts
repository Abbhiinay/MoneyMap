import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const { supabase, user, error: authError } = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, category, description, date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = (data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id,
    amount: Number(e.amount),
    category: e.category ?? "",
    description: e.description ?? "",
    date: e.date,
    created_at: e.created_at,
  }));

  return NextResponse.json({ transactions });
}