/**
 * MoneyMap • Daily Spending Heatmap (modular, no framework)
 *
 * Transactions structure:
 * { id: number, amount: number, category: string, date: "YYYY-MM-DD" }
 */

// ---- Sample transaction dataset (edit freely) ----
const sampleTransactions = [
  { id: 1, amount: 120, category: "Food", date: "2026-03-01" },
  { id: 2, amount: 330, category: "Food", date: "2026-03-02" },
  { id: 3, amount: 90, category: "Transport", date: "2026-03-02" },
  { id: 4, amount: 0, category: "Other", date: "2026-03-03" },
  { id: 5, amount: 650, category: "Shopping", date: "2026-03-05" },
  { id: 6, amount: 180, category: "Bills", date: "2026-03-08" },
  { id: 7, amount: 220, category: "Bills", date: "2026-03-10" },
  { id: 8, amount: 480, category: "Travel", date: "2026-03-12" },
  { id: 9, amount: 50, category: "Coffee", date: "2026-03-12" },
  { id: 10, amount: 780, category: "Rent", date: "2026-03-15" },
  { id: 11, amount: 140, category: "Food", date: "2026-03-18" },
  { id: 12, amount: 210, category: "Groceries", date: "2026-03-20" },
  { id: 13, amount: 510, category: "Shopping", date: "2026-03-22" },
  { id: 14, amount: 30, category: "Other", date: "2026-03-25" },
  { id: 15, amount: 410, category: "Transport", date: "2026-03-27" },
];

// ---- Utilities ----
function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatISODate(dateObj) {
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(
    dateObj.getDate()
  )}`;
}

function parseISODate(iso) {
  // Expect "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatTooltipDate(dateObj) {
  return dateObj.toLocaleString("default", { month: "short", day: "numeric" });
}

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function spendingLevel(amount) {
  if (!amount || amount <= 0) return 0; // ₹0
  if (amount <= 200) return 1; // ₹1–₹200
  if (amount < 500) return 2; // ₹201–₹499 (keeps 500+ in dark bucket)
  return 3; // ₹500+
}

// ---- Required functions ----

/**
 * Aggregate transactions by date.
 * @param {Array<{id:number,amount:number,category:string,date:string}>} transactions
 * @returns {Record<string, number>} map: "YYYY-MM-DD" -> total spend
 */
function aggregateDailySpending(transactions) {
  return transactions.reduce((acc, tx) => {
    if (!tx || typeof tx.date !== "string") return acc;
    const amt = Number(tx.amount) || 0;
    acc[tx.date] = (acc[tx.date] || 0) + amt;
    return acc;
  }, {});
}

/**
 * Render GitHub-style calendar grid for the current month.
 * @param {Record<string, number>} dailyData map: "YYYY-MM-DD" -> total spend
 */
function renderHeatmap(dailyData) {
  const heatmapEl = document.getElementById("heatmap");
  const tooltipEl = document.getElementById("tooltip");
  const monthTitleEl = document.getElementById("monthTitle");
  const monthMetaEl = document.getElementById("monthMeta");

  if (!heatmapEl || !tooltipEl || !monthTitleEl || !monthMetaEl) return;

  heatmapEl.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const daysInMonth = monthEnd.getDate();

  monthTitleEl.textContent = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const totalThisMonth = Array.from({ length: daysInMonth }, (_, i) => {
    const iso = formatISODate(new Date(year, monthIndex, i + 1));
    return dailyData[iso] || 0;
  }).reduce((a, b) => a + b, 0);

  monthMetaEl.textContent = `${daysInMonth} days • ${formatINR(
    totalThisMonth
  )} spent`;

  // GitHub style: columns are weeks, rows are weekdays (Sun=0..Sat=6).
  // We'll align the first day to its weekday by inserting empty cells.
  const startWeekday = monthStart.getDay(); // 0 (Sun) .. 6 (Sat)

  // Add leading blanks
  for (let i = 0; i < startWeekday; i++) {
    const blank = document.createElement("div");
    blank.className = "day";
    blank.style.visibility = "hidden";
    blank.setAttribute("aria-hidden", "true");
    heatmapEl.appendChild(blank);
  }

  // Add all days in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, monthIndex, day);
    const iso = formatISODate(dateObj);
    const total = dailyData[iso] || 0;
    const level = spendingLevel(total);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.dataset.date = iso;
    cell.dataset.total = String(total);
    cell.dataset.level = String(level);
    cell.setAttribute(
      "aria-label",
      `${iso}: ${formatINR(total)} spent`
    );

    cell.addEventListener("mouseenter", (e) => {
      const d = parseISODate(iso);
      tooltipEl.innerHTML = `
        <div class="tt-date">${formatTooltipDate(d)}</div>
        <div class="tt-amount">${formatINR(total)} spent</div>
      `;
      tooltipEl.setAttribute("aria-hidden", "false");
      positionTooltip(e, tooltipEl);
    });

    cell.addEventListener("mousemove", (e) => {
      positionTooltip(e, tooltipEl);
    });

    cell.addEventListener("mouseleave", () => {
      tooltipEl.setAttribute("aria-hidden", "true");
    });

    heatmapEl.appendChild(cell);
  }

  function positionTooltip(mouseEvent, el) {
    const offset = 12;
    let x = mouseEvent.clientX + offset;
    let y = mouseEvent.clientY + offset;

    // Keep within viewport
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (x + rect.width + 8 > vw) x = vw - rect.width - 8;
    if (y + rect.height + 8 > vh) y = vh - rect.height - 8;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}

// ---- Boot ----
const daily = aggregateDailySpending(sampleTransactions);
renderHeatmap(daily);

// Show sample data in the UI
const samplePreview = document.getElementById("samplePreview");
if (samplePreview) {
  samplePreview.textContent = JSON.stringify(sampleTransactions, null, 2);
}

// Expose for easy reuse / migration to React later
window.MoneyMapHeatmap = {
  aggregateDailySpending,
  renderHeatmap,
};

