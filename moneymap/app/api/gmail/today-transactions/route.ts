import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabaseServer";

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

// "Today" is computed in India Standard Time (UTC+5:30) rather than the
// server's runtime timezone, since a serverless host is typically UTC and
// that misclassifies transactions near midnight IST.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istParts(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function istDateKey(d: Date) {
  const { year, month, day } = istParts(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function istGmailDateQuery(d: Date) {
  const { year, month, day } = istParts(d);
  return `${year}/${String(month + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

function isSameIstDay(a: Date, b: Date) {
  const pa = istParts(a);
  const pb = istParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function predictCategory(merchant: string): string {
  const name = merchant.toLowerCase();
  if (name.includes("swiggy") || name.includes("zomato")) return "Food";
  if (name.includes("uber") || name.includes("ola")) return "Transport";
  if (name.includes("amazon") || name.includes("flipkart")) return "Shopping";
  if (name.includes("netflix") || name.includes("spotify") || name.includes("hotstar")) {
    return "Subscription";
  }
  return "Uncategorized";
}

function extractAmountAndMerchant(text: string): {
  amount: number | null;
  merchant: string | null;
} {
  const cleaned = text.replace(/\s+/g, " ");

  const amountMatch =
    cleaned.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    cleaned.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?)/i);

  const amount = amountMatch
    ? Number(amountMatch[1].replace(/,/g, ""))
    : null;

  let merchant: string | null = null;

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

  if (merchant) {
    merchant = merchant.replace(/[^A-Za-z0-9 &.-]/g, "").trim();
  }

  return { amount, merchant: merchant || null };
}

export async function GET(request: NextRequest) {
  const { supabase, user, error: authError } = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const gmailAccessTokenHeader = request.headers.get("authorization");
  const gmailAccessToken = gmailAccessTokenHeader
    ? gmailAccessTokenHeader.replace(/Bearer\s+/i, "")
    : "";

  if (gmailAccessToken) {
    try {
      const now = new Date();
      const keywords = ["debited", "credited", "spent", "paid", "UPI", "transaction", "payment"];
      const query = `after:${istGmailDateQuery(now)} (${keywords.join(" OR ")})`;

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
          query
        )}&maxResults=20`,
        { headers: { Authorization: `Bearer ${gmailAccessToken}` } }
      );

      if (!listRes.ok) {
        const errorBody = await listRes.text();
        const isAuthError = listRes.status === 401;
        return NextResponse.json(
          {
            error: isAuthError ? "gmail_token_expired" : "Failed to fetch Gmail messages",
            details: errorBody,
          },
          { status: isAuthError ? 401 : 400 }
        );
      }

      const listJson = (await listRes.json()) as { messages?: { id: string }[] };

      const messageIds = listJson.messages?.map((m) => m.id) ?? [];

      if (messageIds.length > 0) {
        const { data: existingRows } = await supabase
          .from("detected_transactions")
          .select("email_id")
          .eq("user_id", user.id)
          .in("email_id", messageIds);

        const existingEmailIds = new Set(
          (existingRows ?? []).map((r: { email_id: string }) => r.email_id)
        );

        const newIds = messageIds.filter((id) => !existingEmailIds.has(id));

        const detectedToInsert: Omit<DetectedRow, "id" | "created_at">[] = [];

        for (const id of newIds) {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
            { headers: { Authorization: `Bearer ${gmailAccessToken}` } }
          );

          if (!msgRes.ok) continue;

          const msgJson = (await msgRes.json()) as {
            snippet?: string;
            internalDate?: string;
            payload?: {
              headers?: { name: string; value: string }[];
            };
          };
          const snippet: string = msgJson.snippet ?? "";
          const internalDateMs = Number(msgJson.internalDate ?? 0);
          const internalDate = new Date(internalDateMs || Date.now());

          if (!isSameIstDay(internalDate, now)) {
            continue;
          }

          let subject = "";
          let dateHeader = "";
          const headers = msgJson.payload?.headers ?? [];
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
          const dateIso = istDateKey(parsedDate);

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
          const { error: insertError } = await supabase
            .from("detected_transactions")
            .insert(detectedToInsert);
          if (insertError) {
            return NextResponse.json(
              { error: "Failed to store detected transactions", details: insertError.message },
              { status: 500 }
            );
          }
        }
      }
    } catch (e) {
      return NextResponse.json(
        {
          error: "Failed to sync with Gmail",
          details: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      );
    }
  }

  const todayIso = istDateKey(new Date());

  const { data, error } = await supabase
    .from("detected_transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "detected")
    .eq("date", todayIso)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const detected: DetectedTransactionDto[] = (data as DetectedRow[]).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    merchant: row.merchant,
    predictedCategory: row.predicted_category ?? "Uncategorized",
    emailId: row.email_id,
    source: row.source,
    status: row.status,
    date: row.date,
  }));

  return NextResponse.json({ detected });
}

