import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    detectedId?: string;
    category?: string;
    description?: string;
  };

  if (!body.detectedId) {
    return NextResponse.json(
      { error: "Missing detectedId" },
      { status: 400 }
    );
  }

  const { data: detectedRows, error: detectedError } = await supabase
    .from("detected_transactions")
    .select("*")
    .eq("id", body.detectedId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (detectedError) {
    return NextResponse.json(
      { error: detectedError.message },
      { status: 500 }
    );
  }

  if (!detectedRows) {
    return NextResponse.json(
      { error: "Detected transaction not found" },
      { status: 404 }
    );
  }

  const detected: any = detectedRows;

  const category =
    body.category && body.category.trim().length > 0
      ? body.category
      : detected.predicted_category ?? "Uncategorized";

  const description =
    body.description && body.description.trim().length > 0
      ? body.description
      : detected.merchant ?? "Gmail transaction";

  const date =
    detected.date ??
    new Date().toISOString().slice(0, 10);

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
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  await supabase
    .from("detected_transactions")
    .update({ status: "saved" })
    .eq("id", body.detectedId)
    .eq("user_id", user.id);

  return NextResponse.json({ expense: inserted });
}

