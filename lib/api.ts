/** Типизированный клиент бэкенда. */

import { getInitData } from "@/lib/telegram";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  options: { method?: string; query?: Query; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const { method = "GET", query, body, form } = options;

  const headers: Record<string, string> = {};
  const initData = getInitData();
  if (initData) headers.Authorization = `tma ${initData}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  if (!response.ok) {
    let message = `Ошибка ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") message = payload.detail;
    } catch {
      // тело может быть пустым — оставляем сообщение по коду
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --- типы ответов ---------------------------------------------------------

export type Transaction = {
  id: number;
  date: string;
  category_name: string;
  account_name: string;
  payee: string | null;
  comment: string | null;
  direction: "outcome" | "income";
  amount_original: string;
  currency: string;
  amount_base: string | null;
  fx_status: "ok" | "approx" | "pending";
  source: "csv" | "manual";
};

export type CategorySlice = {
  category: string;
  amount: string;
  share: string;
  delta_pct: string | null;
  tx_count: number;
};

export type MonthSummary = {
  month: string;
  income_manual: string;
  income_from_transactions: string;
  income_total: string;
  outcome_total: string;
  saldo: string;
  spent_share: string | null;
  tx_count: number;
  pending_count: number;
  base_currency: string;
  categories: CategorySlice[];
  recent: Transaction[];
};

export type MonthPoint = { month: string; amount: string; tx_count: number };

export type CategoryDynamics = {
  category: string;
  points: MonthPoint[];
  average: string;
  total: string;
  delta_pct: string | null;
};

export type CategoryDiff = {
  category: string;
  amount_a: string;
  amount_b: string;
  diff: string;
  diff_pct: string | null;
};

export type Compare = {
  month_a: string;
  month_b: string;
  total_a: string;
  total_b: string;
  saldo_a: string;
  saldo_b: string;
  categories: CategoryDiff[];
};

export type TransactionPage = {
  items: Transaction[];
  total: number;
  has_more: boolean;
};

export type Months = { months: string[]; current: string };

export type Income = {
  month: string;
  amount: string;
  note: string | null;
  is_default: boolean;
};

export type UserSettings = {
  base_currency: string;
  default_monthly_income: string | null;
  excluded_categories: string[];
};

export type PlanLine = { id: number; title: string; amount: string; position: number };

export type Plan = {
  month: string;
  lines: PlanLine[];
  total: string;
  income: string;
  expected_saldo: string;
};

export type PlanVsFact = {
  month: string;
  plan_total: string;
  fact_total: string;
  diff: string;
  fact_share_of_plan: string | null;
  plan_saldo: string;
  fact_saldo: string;
  accuracy: string | null;
  lines: PlanLine[];
  categories: CategorySlice[];
  has_plan: boolean;
};

export type Category = { name: string; tx_count: number };

export type Suggestion = { title: string; amount: string };

export type ImportReport = {
  rows_total: number;
  rows_new: number;
  rows_duplicate: number;
  rows_error: number;
  skipped_transfers: number;
  pending_fx: number;
  errors: string[];
};

export type Backfill = { filled: number; pending_left: number };

// --- ручки ----------------------------------------------------------------

export const api = {
  months: () => request<Months>("/api/meta/months"),

  monthSummary: (month: string) =>
    request<MonthSummary>("/api/stats/month", { query: { month } }),

  categories: (month: string) =>
    request<CategorySlice[]>("/api/stats/categories", { query: { month } }),

  categoryDynamics: (category: string, months: number, until?: string) =>
    request<CategoryDynamics>("/api/stats/category-dynamics", {
      query: { category, months, until },
    }),

  compare: (a: string, b: string) =>
    request<Compare>("/api/stats/compare", { query: { a, b } }),

  transactions: (params: {
    month?: string;
    categories?: string[];
    accounts?: string[];
    q?: string;
    limit?: number;
    offset?: number;
  }) => request<TransactionPage>("/api/transactions", { query: params }),

  categoryList: (month?: string) =>
    request<Category[]>("/api/categories", { query: { month } }),

  createTransaction: (body: {
    date: string;
    category_name: string;
    account_name: string;
    amount_original: string;
    currency: string;
    direction: "outcome" | "income";
    comment?: string | null;
  }) => request<Transaction>("/api/transactions", { method: "POST", body }),

  deleteTransaction: (id: number) =>
    request<void>(`/api/transactions/${id}`, { method: "DELETE" }),

  income: (month: string) => request<Income>(`/api/income/${month}`),

  setIncome: (month: string, body: { amount: string; save_as_default?: boolean }) =>
    request<Income>(`/api/income/${month}`, { method: "PUT", body }),

  settings: () => request<UserSettings>("/api/settings"),

  plan: (month: string) => request<Plan>(`/api/plans/${month}`),

  savePlan: (month: string, lines: { title: string; amount: string }[]) =>
    request<Plan>(`/api/plans/${month}`, { method: "PUT", body: { lines } }),

  planSuggestions: (month: string, window = 3) =>
    request<Suggestion[]>(`/api/plans/${month}/suggestions`, { query: { window } }),

  planVsFact: (month: string) => request<PlanVsFact>(`/api/plans/${month}/vs-fact`),

  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ImportReport>("/api/import/csv", { method: "POST", form });
  },

  backfillRates: () => request<Backfill>("/api/fx/backfill", { method: "POST" }),
};

export { buildUrl as buildApiUrl };
