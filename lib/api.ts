/** Типизированный клиент бэкенда. */

import { getInitData } from "@/lib/telegram";

/**
 * Пусто — значит запрос идёт на тот же origin, а Next проксирует `/api/*`
 * в бэкенд (см. `next.config.ts`). Так Mini App работает из-под https-туннеля
 * без смешанного содержимого и без CORS. Переменная нужна, только если фронт
 * и API живут на разных доменах.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    // пустая строка — осмысленное значение: так называется категория «Без категории»
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return `${API_BASE}${path}${search ? `?${search}` : ""}`;
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

export type Dynamics = {
  points: MonthPoint[];
  average: string;
  total: string;
  delta_pct: string | null;
};

export type CategoryDynamics = Dynamics & { category: string };

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
  /** `saved` — задан на месяц, `carried` — перенесён с прошлого, `default` — из настроек */
  source: "saved" | "carried" | "default";
  from_month: string | null;
};

export type UserSettings = {
  base_currency: string;
  default_monthly_income: string | null;
  excluded_categories: string[];
};

export type PlanLine = {
  id: number;
  title: string;
  /** сумма в валюте строки */
  amount: string;
  currency: string;
  /** та же сумма в базовой валюте — по ней подводятся итоги */
  amount_base: string;
  /** категории трат, по которым строка сверяется с фактом; пусто — связи нет */
  category_names: string[];
  position: number;
};

/** Откуда взялись строки: сохранённый план, черновик прошлого месяца или пусто. */
export type PlanSource = "saved" | "previous" | "empty";

export type Plan = {
  month: string;
  lines: PlanLine[];
  total: string;
  income: string;
  expected_saldo: string;
  base_currency: string;
  source: PlanSource;
};

export type PlanLineFact = PlanLine & {
  /** сумма трат по всем связанным категориям; `null` — категории не выбраны */
  fact: string | null;
  diff: string | null;
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
  lines: PlanLineFact[];
  categories: CategorySlice[];
  /** факт по категориям, которых в плане не было */
  unplanned: CategorySlice[];
  has_plan: boolean;
};

export type Category = { name: string; tx_count: number };

// --- средства -------------------------------------------------------------

export type FundSource = {
  id: number;
  title: string;
  currency: string;
  position: number;
  archived: boolean;
  /** последняя записанная сумма в валюте источника */
  amount_original: string;
  amount_base: string | null;
  updated_on: string | null;
};

export type BalancePoint = { month: string; amount: string };

export type Funds = {
  base_currency: string;
  total_base: string;
  sources: FundSource[];
  /** итог на конец каждого месяца окна */
  history: BalancePoint[];
  /** месяц, который пора сверить */
  pending_check: string | null;
};

export type FundBalance = {
  id: number;
  date: string;
  amount_original: string;
  currency: string;
  amount_base: string | null;
  note: string | null;
};

export type MonthCheck = {
  month: string;
  /** насколько изменилась сумма всех источников за месяц */
  real_saldo: string;
  /** сальдо по введённым доходам и тратам */
  tracked_saldo: string;
  /** погрешность ведения: реальное минус учтённое */
  discrepancy: string;
  opening: string | null;
  closing: string | null;
  is_saved: boolean;
  note: string | null;
};

// --- подписки -------------------------------------------------------------

export type RecurringKind = "subscription" | "rent";

export type Recurring = {
  id: number;
  kind: RecurringKind;
  title: string;
  amount: string;
  currency: string;
  period_months: number;
  charge_day: number;
  category_name: string;
  active: boolean;
  starts_on: string;
  /** доля списания, попадающая в траты каждого месяца */
  monthly_amount: string;
  monthly_amount_base: string | null;
};

export type RecurringList = {
  items: Recurring[];
  base_currency: string;
  monthly_total_base: string;
  generated: number;
};

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

  totalDynamics: (months: number, until?: string) =>
    request<Dynamics>("/api/stats/dynamics", { query: { months, until } }),

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

  updateTransaction: (
    id: number,
    body: {
      date?: string;
      category_name?: string;
      account_name?: string;
      amount_original?: string;
      currency?: string;
      direction?: "outcome" | "income";
      comment?: string | null;
    },
  ) => request<Transaction>(`/api/transactions/${id}`, { method: "PATCH", body }),

  deleteTransaction: (id: number) =>
    request<void>(`/api/transactions/${id}`, { method: "DELETE" }),

  income: (month: string) => request<Income>(`/api/income/${month}`),

  setIncome: (month: string, body: { amount: string; save_as_default?: boolean }) =>
    request<Income>(`/api/income/${month}`, { method: "PUT", body }),

  settings: () => request<UserSettings>("/api/settings"),

  plan: (month: string) => request<Plan>(`/api/plans/${month}`),

  savePlan: (
    month: string,
    lines: {
      title: string;
      amount: string;
      currency?: string;
      category_names?: string[];
    }[],
  ) => request<Plan>(`/api/plans/${month}`, { method: "PUT", body: { lines } }),

  planSuggestions: (month: string, window = 3) =>
    request<Suggestion[]>(`/api/plans/${month}/suggestions`, { query: { window } }),

  planVsFact: (month: string) => request<PlanVsFact>(`/api/plans/${month}/vs-fact`),

  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ImportReport>("/api/import/csv", { method: "POST", form });
  },

  backfillRates: () => request<Backfill>("/api/fx/backfill", { method: "POST" }),

  // --- средства -----------------------------------------------------------

  funds: (months = 12) => request<Funds>("/api/funds", { query: { months } }),

  createFundSource: (body: { title: string; currency: string; amount?: string }) =>
    request<FundSource>("/api/funds", { method: "POST", body }),

  updateFundSource: (
    id: number,
    body: { title?: string; currency?: string; archived?: boolean },
  ) => request<FundSource>(`/api/funds/${id}`, { method: "PATCH", body }),

  deleteFundSource: (id: number) =>
    request<void>(`/api/funds/${id}`, { method: "DELETE" }),

  setBalance: (id: number, body: { amount: string; date?: string; note?: string | null }) =>
    request<FundSource>(`/api/funds/${id}/balance`, { method: "PUT", body }),

  balanceHistory: (id: number) => request<FundBalance[]>(`/api/funds/${id}/history`),

  checks: () => request<MonthCheck[]>("/api/funds/checks"),

  check: (month: string) => request<MonthCheck>(`/api/funds/checks/${month}`),

  saveCheck: (month: string, note?: string | null) =>
    request<MonthCheck>(`/api/funds/checks/${month}`, { method: "POST", body: { note } }),

  // --- подписки -----------------------------------------------------------

  recurring: () => request<RecurringList>("/api/recurring"),

  createRecurring: (body: {
    kind: RecurringKind;
    title: string;
    amount: string;
    currency: string;
    period_months: number;
    charge_day: number;
    category_name?: string | null;
  }) => request<Recurring>("/api/recurring", { method: "POST", body }),

  updateRecurring: (
    id: number,
    body: {
      title?: string;
      amount?: string;
      currency?: string;
      period_months?: number;
      charge_day?: number;
      category_name?: string;
      active?: boolean;
    },
  ) => request<Recurring>(`/api/recurring/${id}`, { method: "PATCH", body }),

  deleteRecurring: (id: number) =>
    request<void>(`/api/recurring/${id}`, { method: "DELETE" }),

  runRecurring: () =>
    request<{ generated: number }>("/api/recurring/run", { method: "POST" }),
};

export { buildUrl as buildApiUrl };
