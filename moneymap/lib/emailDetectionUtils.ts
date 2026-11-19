export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istParts(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

export function istDateKey(d: Date) {
  const { year, month, day } = istParts(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function istGmailDateQuery(d: Date) {
  const { year, month, day } = istParts(d);
  return `${year}/${String(month + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

export function isSameIstDay(a: Date, b: Date) {
  const pa = istParts(a);
  const pb = istParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function predictCategory(merchant: string): string {
  const name = merchant.toLowerCase();

  // Food & Dining
  if (
    name.includes("swiggy") ||
    name.includes("zomato") ||
    name.includes("mcdonald") ||
    name.includes("kfc") ||
    name.includes("domino") ||
    name.includes("pizza") ||
    name.includes("burger") ||
    name.includes("starbucks") ||
    name.includes("cafe") ||
    name.includes("coffee") ||
    name.includes("restaurant") ||
    name.includes("diner") ||
    name.includes("subway") ||
    name.includes("eatclub") ||
    name.includes("behrouz") ||
    name.includes("faasos") ||
    name.includes("chaayos") ||
    name.includes("chai point") ||
    name.includes("bakery") ||
    name.includes("bakingo") ||
    name.includes("barbeque") ||
    name.includes("haldiram")
  ) {
    return "Food";
  }

  // Grocery & Daily Needs
  if (
    name.includes("blinkit") ||
    name.includes("zepto") ||
    name.includes("instamart") ||
    name.includes("bigbasket") ||
    name.includes("bb daily") ||
    name.includes("dmart") ||
    name.includes("supermarket") ||
    name.includes("grocery") ||
    name.includes("groceries") ||
    name.includes("spencer") ||
    name.includes("milk") ||
    name.includes("country delight") ||
    name.includes("nature's basket")
  ) {
    return "Grocery";
  }

  // Transport & Travel
  if (
    name.includes("uber") ||
    name.includes("ola") ||
    name.includes("rapido") ||
    name.includes("irctc") ||
    name.includes("makemytrip") ||
    name.includes("goibibo") ||
    name.includes("indigo") ||
    name.includes("air india") ||
    name.includes("spicejet") ||
    name.includes("cleartrip") ||
    name.includes("redbus") ||
    name.includes("yulu") ||
    name.includes("metro") ||
    name.includes("toll") ||
    name.includes("fastag") ||
    name.includes("flight") ||
    name.includes("airline") ||
    name.includes("cab") ||
    name.includes("taxi") ||
    name.includes("railway") ||
    name.includes("train")
  ) {
    return "Transport";
  }

  // Shopping & E-Commerce
  if (
    name.includes("amazon") ||
    name.includes("flipkart") ||
    name.includes("myntra") ||
    name.includes("ajio") ||
    name.includes("meesho") ||
    name.includes("nykaa") ||
    name.includes("tata cliq") ||
    name.includes("zara") ||
    name.includes("h&m") ||
    name.includes("uniqlo") ||
    name.includes("ikea") ||
    name.includes("croma") ||
    name.includes("reliance digital") ||
    name.includes("apple store") ||
    name.includes("decathlon") ||
    name.includes("retail") ||
    name.includes("clothing") ||
    name.includes("mall")
  ) {
    return "Shopping";
  }

  // Subscriptions & Digital Services
  if (
    name.includes("netflix") ||
    name.includes("spotify") ||
    name.includes("hotstar") ||
    name.includes("prime video") ||
    name.includes("youtube") ||
    name.includes("disney") ||
    name.includes("apple music") ||
    name.includes("audible") ||
    name.includes("patreon") ||
    name.includes("github") ||
    name.includes("chatgpt") ||
    name.includes("openai") ||
    name.includes("cloud") ||
    name.includes("icloud") ||
    name.includes("dropbox") ||
    name.includes("google one") ||
    name.includes("medium") ||
    name.includes("substack")
  ) {
    return "Subscription";
  }

  // Utility Bills & Recharges
  if (
    name.includes("airtel") ||
    name.includes("jio") ||
    name.includes("vodafone") ||
    name.includes("vi ") ||
    name.includes("bescom") ||
    name.includes("tneb") ||
    name.includes("cesc") ||
    name.includes("electricity") ||
    name.includes("broadband") ||
    name.includes("wifi") ||
    name.includes("water") ||
    name.includes("gas") ||
    name.includes("cylinder") ||
    name.includes("indane") ||
    name.includes("hpcl") ||
    name.includes("bpcl") ||
    name.includes("recharge") ||
    name.includes("utility") ||
    name.includes("billdesk") ||
    name.includes("bbps")
  ) {
    return "Bills";
  }

  // Entertainment & Outings
  if (
    name.includes("bookmyshow") ||
    name.includes("pvr") ||
    name.includes("inox") ||
    name.includes("cinepolis") ||
    name.includes("movie") ||
    name.includes("cinema") ||
    name.includes("theater") ||
    name.includes("theatre") ||
    name.includes("gaming") ||
    name.includes("steam") ||
    name.includes("playstation") ||
    name.includes("xbox") ||
    name.includes("nintendo")
  ) {
    return "Entertainment";
  }

  // Health, Medical & Pharmacy
  if (
    name.includes("apollo") ||
    name.includes("1mg") ||
    name.includes("pharmeasy") ||
    name.includes("netmeds") ||
    name.includes("medplus") ||
    name.includes("practo") ||
    name.includes("hospital") ||
    name.includes("pharmacy") ||
    name.includes("clinic") ||
    name.includes("diagnostics") ||
    name.includes("dental") ||
    name.includes("pathology") ||
    name.includes("medical")
  ) {
    return "Health";
  }

  return "Uncategorized";
}

function cleanMerchant(raw: string): string | null {
  if (!raw) return null;
  const filtered = raw.replace(/[^A-Za-z0-9 &.-]/g, " ").replace(/\s+/g, " ").trim();
  const invalid = /^(your account|your card|a\/c|account|bank|savings a\/c|credit card|debit card)$/i;
  if (invalid.test(filtered) || filtered.length < 2) return null;
  return filtered;
}

export function extractAmountAndMerchant(text: string): {
  amount: number | null;
  merchant: string | null;
} {
  const cleaned = text.replace(/\s+/g, " ");

  // Support Indian (₹, Rs, INR) and International ($, USD, €, EUR, £, GBP, CAD, AUD, SGD, AED) currencies
  const amountMatch =
    cleaned.match(/(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp|cad|aud|sgd|aed)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    cleaned.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|USD|\$|EUR|€|GBP|£|CAD|AUD|SGD|AED)/i) ??
    cleaned.match(/(?:amount|spent|debited|paid|charged|total)(?:\s+of)?\s*(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp)?\s*([\d,]+(?:\.\d{1,2})?)/i);

  const amount = amountMatch
    ? Number(amountMatch[1].replace(/,/g, ""))
    : null;

  let merchant: string | null = null;

  // 1. Direct "to <Merchant>" match
  const toMatch = cleaned.match(/\bto\s+([A-Za-z][A-Za-z0-9 &.-]{2,40})/i);
  if (toMatch) {
    const candidate = cleanMerchant(toMatch[1]);
    if (candidate) merchant = candidate;
  }

  // 2. Prepositions "at <Merchant>" or "from <Merchant>"
  if (!merchant) {
    const atMatch = cleaned.match(/\b(?:at|from)\s+([A-Za-z][A-Za-z0-9 &.-]{2,40})/i);
    if (atMatch) {
      const candidate = cleanMerchant(atMatch[1]);
      if (candidate) merchant = candidate;
    }
  }

  // 3. Structured bank tags: "merchant:", "vpa:", "payee:", "info:", "towards", "spent on"
  if (!merchant) {
    const otherMatch =
      cleaned.match(/\b(?:merchant|vendor|vpa|payee|biller|info)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 &.-]{2,40})/i) ??
      cleaned.match(/\b(?:towards|with|spent on|purchase at|order at)\s+([A-Za-z][A-Za-z0-9 &.-]{2,40})/i);
    if (otherMatch) {
      const candidate = cleanMerchant(otherMatch[1]);
      if (candidate) merchant = candidate;
    }
  }

  return { amount, merchant: merchant || null };
}
