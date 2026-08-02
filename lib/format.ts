/** Форматирование сумм и дат в стиле мокапа. */

const NBSP = " ";
const MINUS = "−";

const MONTHS_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const MONTHS_SHORT = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

const CURRENCY_SIGNS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  RUB: "₽",
};

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/**
 * Итоги и сальдо в мокапе округлены до доллара («+$586», «$1 180»),
 * а отдельные операции показаны с копейками («−$13.89»), поэтому точность
 * задаёт вызывающий код, а не величина суммы.
 */
export function formatMoney(
  value: string | number | null | undefined,
  options: { currency?: string; sign?: "auto" | "always"; decimals?: number } = {},
): string {
  const { currency = "USD", sign = "auto", decimals = 0 } = options;
  const amount = toNumber(value);
  const magnitude = Math.abs(amount);

  const [whole, fraction] = magnitude.toFixed(decimals).split(".");
  const symbol = CURRENCY_SIGNS[currency] ?? `${currency}${NBSP}`;
  const body = `${symbol}${groupDigits(whole)}${fraction ? `.${fraction}` : ""}`;

  if (amount < 0) return `${MINUS}${body}`;
  if (sign === "always") return `+${body}`;
  return body;
}

/** Сумма в исходной валюте под основной строкой: «1 500 RSD». */
export function formatOriginal(
  value: string | number | null | undefined,
  currency: string,
): string {
  const amount = toNumber(value);
  const magnitude = Math.abs(amount);
  const fractionDigits = Number.isInteger(magnitude) ? 0 : 2;
  return `${groupDigits(magnitude.toFixed(fractionDigits).split(".")[0])}${
    fractionDigits ? `.${magnitude.toFixed(2).split(".")[1]}` : ""
  }${NBSP}${currency}`;
}

export function formatPercent(
  value: string | number | null | undefined,
  options: { sign?: boolean; decimals?: number } = {},
): string {
  const { sign = false, decimals = 0 } = options;
  const ratio = toNumber(value) * 100;
  const text = `${Math.abs(ratio).toFixed(decimals)}%`;
  if (ratio < 0) return `${MINUS}${text}`;
  return sign ? `+${text}` : text;
}

/** `'2026-07'` → `'Июль 2026'`. */
export function formatMonthTitle(month: string): string {
  const [year, index] = month.split("-");
  const name = MONTHS_NOMINATIVE[Number(index) - 1];
  return name ? `${name} ${year}` : month;
}

/** `'2026-07'` → `'Июль'`. */
export function formatMonthName(month: string): string {
  const index = Number(month.split("-")[1]);
  return MONTHS_NOMINATIVE[index - 1] ?? month;
}

/** `'2026-07'` → `'Июл'` для подписей на графиках. */
export function formatMonthShort(month: string): string {
  const index = Number(month.split("-")[1]);
  return MONTHS_SHORT[index - 1] ?? month;
}

/** `'2026-07-31'` → `'31 июля'`. */
export function formatDayTitle(date: string): string {
  const [, month, day] = date.split("-");
  const name = MONTHS_GENITIVE[Number(month) - 1];
  return name ? `${Number(day)} ${name}` : date;
}

/** `'2026-07-31'` → `'31.07'` для компактных мест. */
export function formatDayShort(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

export function currentMonth(today: Date = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = year * 12 + (index - 1) + delta;
  return `${Math.floor(shifted / 12)}-${String((shifted % 12) + 1).padStart(2, "0")}`;
}

export function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

/** Пустое имя категории в интерфейсе показывается явной подписью. */
export function categoryLabel(name: string): string {
  return name.trim() === "" ? "Без категории" : name.trim();
}

/** Русское склонение: 1 операция, 2 операции, 5 операций. */
export function plural(count: number, one: string, few: string, many: string): string {
  const tens = Math.abs(count) % 100;
  const units = Math.abs(count) % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
}

/** «2 операции» — число вместе со склонённым словом. */
export function pluralize(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`;
}
