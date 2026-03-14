import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type DetectedRow = {
  id: string;
  user_id: string;
  amount: number;
  merchant: string;
  predicted_category: string | null;
  email_id: string;
  source: string;
  status: string;
  date: string;
  created_at?: string;
};

type DetectedTransactionDto = {
  id: string;
  amount: number;
  merchant: string;
  predictedCategory: string;
  emailId: string;
  source: string;
  status: string;
  date: string;
};

function predictCategory(merchant: string): string {
  const name = merchant.toLowerCase();
  if (name.includes("swiggy") || name.includes("zomato")) return "Food";
  if (name.includes("uber")) return "Transport";
  if (name.includes("amazon") || name.includes("flipkart")) return "Shopping";
  return "Uncategorized";
}

function extractAmountAndMerchant(text: string): {
  amount: number | null;
  merchant: string | null;
} {
  const cleaned = text.replace(/\s+/g, " ");

  // Try to find amount in different formats (INR, $, etc.)
  let amount: number | null = null;

  // INR format (₹ or Rs.)
  const inrMatch =
    cleaned.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    cleaned.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?)/i);

  if (inrMatch) {
    amount = Number(inrMatch[1].replace(/,/g, ""));
  } else {
    // USD format or generic currency
    const currencyMatch = cleaned.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    if (currencyMatch) {
      amount = Number(currencyMatch[1].replace(/,/g, ""));
    } else {
      // Try to find "Order total", "Amount", "Total" patterns
      const totalMatch = cleaned.match(
        /(?:order\s+total|amount|total|price|cost)[\s:]*₹?\$?\s*([\d,]+(?:\.\d{1,2})?)/i
      );
      if (totalMatch) {
        amount = Number(totalMatch[1].replace(/,/g, ""));
      }
    }
  }

  let merchant: string | null = null;

  // Check for Amazon order
  if (cleaned.toLowerCase().includes("amazon")) {
    merchant = "Amazon";
  } else if (cleaned.toLowerCase().includes("flipkart")) {
    merchant = "Flipkart";
  } else if (cleaned.toLowerCase().includes("myntra")) {
    merchant = "Myntra";
  } else {
    // Try to extract merchant from "to" or "at" patterns
    const toMatch = cleaned.match(/\bto\s+([A-Za-z][A-Za-z0-9 &.-]{2,40})/i);
    if (toMatch) {
      merchant = toMatch[1].trim();
    } else {
      const atMatch = cleaned.match(
        /\b(?:at|from)\s+([A-Za-z][A-Za-z0-9 &.-]{2,40})/i
      );
      if (atMatch) {
        merchant = atMatch[1].trim();
      }
    }
  }

  if (merchant) {
    merchant = merchant.replace(/[^A-Za-z0-9 &.-]/g, "").trim();
  }

  return { amount, merchant: merchant || null };
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export async function GET(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gmailAccessTokenHeader = request.headers.get("authorization");
  const gmailAccessToken = gmailAccessTokenHeader
    ? gmailAccessTokenHeader.replace(/Bearer\s+/i, "")
    : "";

  if (gmailAccessToken) {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");

      const keywords = [
        "debited",
        "credited",
        "spent",
        "paid",
        "UPI",
        "transaction",
        "payment",
        "order confirmation",
        "order placed",
        "purchase",
        "invoice",
        "receipt",
        "amazon",
        "flipkart",
        "shopping",
      ];
      const query = `after:${yyyy}/${mm}/${dd} (${keywords.join(" OR ")})`;

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
          query
        )}&maxResults=20`,
        {
          headers: {
            Authorization: `Bearer ${gmailAccessToken}`,
          },
        }
      );

      if (!listRes.ok) {
        const errorBody = await listRes.text();
        return NextResponse.json(
          {
            error: "Failed to fetch Gmail messages",
            details: errorBody,
          },
          { status: 400 }
        );
      }

      const listJson = (await listRes.json()) as {
        messages?: { id: string }[];
      };

      const messageIds = listJson.messages?.map((m) => m.id) ?? [];

      if (messageIds.length > 0) {
        const { data: existingRows } = await supabase
          .from("detected_transactions")
          .select("email_id")
          .eq("user_id", user.id)
          .in("email_id", messageIds);

        const existingEmailIds = new Set(
          (existingRows ?? []).map((r: any) => r.email_id as string)
        );

        const newIds = messageIds.filter((id) => !existingEmailIds.has(id));

        const detectedToInsert: Omit<
          DetectedRow,
          "id" | "created_at"
        >[] = [];

        for (const id of newIds) {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${gmailAccessToken}`,
              },
            }
          );

          if (!msgRes.ok) continue;

          const msgJson = (await msgRes.json()) as any;
          const snippet: string = msgJson.snippet ?? "";
          const internalDateMs = Number(msgJson.internalDate ?? 0);
          const internalDate = new Date(internalDateMs || Date.now());

          if (!isToday(internalDate)) {
            continue;
          }

          let subject = "";
          let dateHeader = "";
          const headers: any[] = msgJson.payload?.headers ?? [];
          for (const h of headers) {
            if (h.name === "Subject") subject = h.value ?? subject;
            if (h.name === "Date") dateHeader = h.value ?? dateHeader;
          }

          const textForParsing = `${subject} ${snippet}`;

          const { amount, merchant } = extractAmountAndMerchant(textForParsing);
          if (!amount || !merchant) {
            continue;
          }

          const parsedDate = dateHeader ? new Date(dateHeader) : internalDate;
          const dateIso = parsedDate.toISOString().slice(0, 10);

          detectedToInsert.push({
            user_id: user.id,
            amount,
            merchant,
            predicted_category: predictCategory(merchant),
            email_id: id,
            source: "gmail",
            status: "detected",
            date: dateIso,
          });
        }

        if (detectedToInsert.length > 0) {
          await supabase.from("detected_transactions").insert(detectedToInsert);
        }
      }
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to sync with Gmail" },
        { status: 500 }
      );
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("detected_transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "detected")
    .eq("date", todayIso)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const detected: DetectedTransactionDto[] = (data as DetectedRow[]).map(
    (row) => ({
      id: row.id,
      amount: Number(row.amount),
      merchant: row.merchant,
      predictedCategory: row.predicted_category ?? "Uncategorized",
      emailId: row.email_id,
      source: row.source,
      status: row.status,
      date: row.date,
    })
  );

  return NextResponse.json({ detected });
}
