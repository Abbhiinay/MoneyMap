# MoneyMap Unadjusted Function Points (UFP) Analysis Report

This report provides a detailed breakdown of the **Unadjusted Function Points (UFP)** calculation for the **MoneyMap** project. The analysis is conducted under the context of Albrecht's Function Point (FP) Metric framework to measure the size of the software from a functional perspective.

---

## Formula and Weights

Based on the project's specifications, the formula used for calculating the Unadjusted Function Points (UFP) is:

$$\text{UFP} = (\text{Inputs} \times 4) + (\text{Outputs} \times 5) + (\text{Inquiries} \times 4) + (\text{Files} \times 10) + (\text{Interfaces} \times 10)$$

---

## Component-by-Component Classification

### 1. External Inputs (EI) — Weight: 4
External Inputs are user-driven or data-entry components that write, update, or delete data stored within the application's boundary.

| Index | Functional Element | Description | Associated Code File(s) / DB Actions |
|---|---|---|---|
| **EI-1** | Add Solo Expense | Add personal expense transaction with amount, category, date, and description. | [dashboard/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/dashboard/page.tsx) |
| **EI-2** | Edit Solo Expense | Modify details of an existing personal transaction. | [EditExpenseModal.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/components/EditExpenseModal.tsx) |
| **EI-3** | Delete Solo Expense | Remove a personal expense from the database. | [dashboard/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/dashboard/page.tsx) |
| **EI-4** | Edit & Save Detected Transaction | Confirm or tweak a Gmail-parsed transaction to save it as a permanent expense. | [from-detected/route.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/api/expenses/from-detected/route.ts) |
| **EI-5** | Dismiss/Delete Detected Transaction | Dismiss a parsed email transaction from India Standard Time (IST) detection. | [[id]/route.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/api/detected-transaction/[id]/route.ts) |
| **EI-6** | Create Group | Instantiate a new SplitMap group for splitting shared bills. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L121) |
| **EI-7** | Edit Group Details | Rename a SplitMap group or add/edit its members. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L144) |
| **EI-8** | Delete Group | Delete a group, cascade-deleting expenses, settlements, and invites. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L164) |
| **EI-9** | Add Group Expense | Record a group expense to be split among group members. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L198) |
| **EI-10** | Edit Group Expense | Change splits, amounts, categories, or payers for a group expense. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L331) |
| **EI-11** | Delete Group Expense | Delete a group expense, restoring balances prior to calculation. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L227) |
| **EI-12** | Record Settlement (Settle Up) | Log a payment between two group members to settle up debts. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L240) |
| **EI-13** | Accept Group Invitation | Accept an invitation to join a group, appending user to members list. | [invitationsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/invitationsDb.ts#L127) |
| **EI-14** | Decline Group Invitation | Reject a group split invitation, setting state to declined. | [invitationsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/invitationsDb.ts#L179) |
| **EI-15** | Send Group Invitation | Create dynamic pending invitations for emails to split bills. | [invitationsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/invitationsDb.ts#L36) |
| **EI-16** | Update Currency/Profile Settings | Change personal preferences (e.g., currency to USD/INR). | [useUserCurrency.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/useUserCurrency.ts#L122) |
| **EI-17** | User Log In | Standard email authentication or Google credentials lookup. | [auth/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/auth/page.tsx) |
| **EI-18** | User Sign Up | Create a new account and run idempotent profile bootstrapping. | [auth/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/auth/page.tsx) |

* **Total External Inputs (EI)**: **18**

---

### 2. External Outputs (EO) — Weight: 5
External Outputs are transactions or display screens presenting processed, computed, or aggregated data derived by the system.

| Index | Functional Element | Description / Processing Logic | Associated Code File(s) |
|---|---|---|---|
| **EO-1** | Monthly Spending Summation | Retrieves and filters raw transactions for the current month and calculates the total. | [dashboard/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/dashboard/page.tsx#L145) |
| **EO-2** | Total Overall Expenditure | Summarizes all transactions to calculate historical spending metrics. | [dashboard/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/dashboard/page.tsx#L155) |
| **EO-3** | Category Distribution Pie Chart | Groups monthly expenditures by category, calculates percentages of total, and renders. | [dashboard/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/dashboard/page.tsx#L168) |
| **EO-4** | Transaction Count Aggregation | Computes and lists the count of logged user entries. | [dashboard/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/dashboard/page.tsx#L291) |
| **EO-5** | Last 12 Months Spend Bar Chart | Buckets raw expenses into monthly timestamps, computes totals, and renders Recharts bar graphs. | [analytics/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/analytics/page.tsx#L188) |
| **EO-6** | Monthly Spend Trend Line Graph | Processes daily spending aggregates for the active month, mapping indices, and rendering trends. | [analytics/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/analytics/page.tsx#L139) |
| **EO-7** | Category Trend Bar/Line Matrix | Segregates daily trends by individual category blocks to determine volatility. | [analytics/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/analytics/page.tsx#L161) |
| **EO-8** | SplitMap Debt & Settlement Algorithm | Executes splitting logic based on payer shares and settlements, computing net debt matrix. | [groups/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/groups/page.tsx) |
| **EO-9** | Total Group Spend Accumulator | Calculates the sum of all expenses added in a given group. | [groups/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/groups/page.tsx) |
| **EO-10** | Individual Member Balance Outputs | Computes whether a member is net "owed to", "owes", or "settled" relative to group splits. | [groups/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/groups/page.tsx#L27) |
| **EO-11** | Email Receipt Parser Engine | Scans messages via OAuth, parses subject lines/snippets with regular expressions, and categorizes transactions. | [today-transactions/route.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/api/gmail/today-transactions/route.ts#L69) |

* **Total External Outputs (EO)**: **11**

---

### 3. External Inquiries (EQ) — Weight: 4
External Inquiries consist of retrieval operations that return raw records or lookup configurations without executing mathematical calculations or derived processing.

| Index | Functional Element | Description | Associated Code File(s) |
|---|---|---|---|
| **EQ-1** | Query Recent Activity List | Fetches and renders the raw list of personal expenses (up to limit of 50). | [route.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/api/transactions/recent/route.ts) |
| **EQ-2** | Get Detected Transactions | Pulls today's pending transactions detected from Gmail. | [today-transactions/route.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/api/gmail/today-transactions/route.ts#L232) |
| **EQ-3** | View Transaction Details | Loads single transaction meta data on selection. | [TransactionDetailsPanel.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/components/TransactionDetailsPanel.tsx) |
| **EQ-4** | Fetch Available Years | Queries and maps the unique set of years found in user expenses to populate dropdowns. | [analytics/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/analytics/page.tsx#L221) |
| **EQ-5** | Fetch Available Months | Queries unique year-month combos for query selections. | [analytics/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/(app)/analytics/page.tsx#L124) |
| **EQ-6** | Fetch User Groups List | Retrieves all groups where user is owner or listed in members. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L45) |
| **EQ-7** | Get Group Details by ID | Retrieves a single group details row by its primary UUID. | [groupsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/groupsDb.ts#L263) |
| **EQ-8** | Query Pending Invitations | Queries database for pending invitations belonging to user email. | [invitationsDb.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/invitationsDb.ts#L86) |
| **EQ-9** | Retrieve Currency Preference | Fetch active profile values from Supabase configurations. | [useUserCurrency.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/useUserCurrency.ts#L26) |
| **EQ-10** | Retrieve Auth Session state | Standard token check with Supabase auth instance. | [supabaseClient.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/supabaseClient.ts#L16) |

* **Total External Inquiries (EQ)**: **10**

---

### 4. Internal Logical Files (ILF) — Weight: 10
Internal Logical Files are groups of related data stored and maintained within the boundary of the application (e.g., database tables, local storage objects).

| Index | Storage Entity | Description | Location / Implementation |
|---|---|---|---|
| **ILF-1** | `public.expenses` | Stored personal expense logs. | Supabase / PostgreSQL |
| **ILF-2** | `public.groups` | Group meta details, names, descriptions, and member rosters. | Supabase / [schema.sql](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/supabase/schema.sql#L4) |
| **ILF-3** | `public.group_expenses` | Group splits, currencies, and payer assignments. | Supabase / [schema.sql](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/supabase/schema.sql#L14) |
| **ILF-4** | `public.group_settlements` | Logs of settlements made to adjust group debts. | Supabase / [schema.sql](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/supabase/schema.sql#L27) |
| **ILF-5** | `public.group_invitations` | Invitation tracker with pending/accepted/declined statuses. | Supabase / [schema.sql](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/supabase/schema.sql#L37) |
| **ILF-6** | `public.profiles` | Store default currencies (e.g. USD, INR) linked to user UUID. | Supabase / [schema.sql](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/supabase/schema.sql#L49) |
| **ILF-7** | `public.detected_transactions` | Auto-extracted email transaction logs for review. | Supabase / [schema.sql](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/supabase/schema.sql#L100) |
| **ILF-8** | Local Invitations Storage | Local fallback cache of pending/accepted invitations on failure. | Browser LocalStorage (`moneymap_local_invitations`) |

* **Total Internal Logical Files (ILF)**: **8**

---

### 5. External Interface Files (EIF) — Weight: 10
External Interface Files are integrations with third-party applications, authentication engines, and APIs.

| Index | External System / API | Functional Purpose | Integration File |
|---|---|---|---|
| **EIF-1** | Gmail REST API | Connects to retrieve, search, and parse transaction notification snippets. | [today-transactions/route.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/api/gmail/today-transactions/route.ts#L122) |
| **EIF-2** | Google Identity / OAuth | Logs in users and returns authentication tokens. | [auth/page.tsx](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/app/auth/page.tsx#L58) |
| **EIF-3** | Supabase Auth API | Provides auth hooks, session management, and JWT validation. | [supabaseClient.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/supabaseClient.ts) |
| **EIF-4** | Supabase Database Gateway | Handles transaction operations and executes Row-Level Security policies. | [supabaseServer.ts](file:///c:/Users/ktony/Desktop/HTML/MoneyMap/moneymap/lib/supabaseServer.ts) |

* **Total External Interface Files (EIF)**: **4**

---

## Calculations

By substituting the totals of each category into the formula:

$$\begin{aligned}
\text{UFP} &= (\text{EI} \times 4) + (\text{EO} \times 5) + (\text{EQ} \times 4) + (\text{ILF} \times 10) + (\text{EIF} \times 10) \\
\text{UFP} &= (18 \times 4) + (11 \times 5) + (10 \times 4) + (8 \times 10) + (4 \times 10) \\
\text{UFP} &= 72 + 55 + 40 + 80 + 40 \\
\text{UFP} &= \mathbf{287}
\end{aligned}$$

The **Unadjusted Function Points (UFP)** value for the **MoneyMap** project is **287**.
