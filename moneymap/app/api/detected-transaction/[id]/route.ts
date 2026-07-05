import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabaseServer";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error: authError } = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("detected_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
