import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const { supabase, user, error: authError } = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    detectedId?: string;
    category?: string;
    description?: string;
  };

  if (!body.detectedId) {
    return NextResponse.json({ error: "Missing detectedId" }, { status: 400 });
  }

  const { data: detectedRows, error: detectedError } = await supabase
    .from("detected_transactions")
    .select("*")
    .eq("id", body.detectedId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (detectedError) {
    return NextResponse.json({ error: detectedError.message }, { status: 500 });
  }

  if (!detectedRows) {
    return NextResponse.json({ error: "Detected transaction not found" }, { status: 404 });
  }

  const detected = detectedRows as {
    predicted_category?: string | null;
    merchant?: string | null;
    date?: string | null;
    amount: number;
  };

  const category =
    body.category && body.category.trim().length > 0
      ? body.category
      : detected.predicted_category ?? "Uncategorized";

  const description =
    body.description && body.description.trim().length > 0
      ? body.description
      : detected.merchant ?? "Gmail transaction";

  const date = detected.date ?? new Date().toISOString().slice(0, 10);

  const insertPayload = {
    user_id: user.id,
    amount: Number(detected.amount),
    category,
    description,
    date,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("expenses")
    .insert([insertPayload])
    .select()
    .limit(1)
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase
    .from("detected_transactions")
    .update({ status: "saved" })
    .eq("id", body.detectedId)
    .eq("user_id", user.id);

  return NextResponse.json({ expense: inserted });
}

