/**
 * История одного источника, разложенная по месяцам для графика.
 *
 * Снимки пишутся когда придётся: в одном месяце их может быть три, в другом
 * ни одного. График же ждёт ровный ряд, поэтому месяц без записи наследует
 * последнюю известную сумму — баланс не менялся, а не обнулился.
 */

import type { BalancePoint, FundBalance } from "@/lib/api";
import { currentMonth, monthFromDate } from "@/lib/format";
import { monthWindow } from "@/lib/monthWindow";

/**
 * Точки в валюте источника, от старых к свежим. Месяцы до первого снимка
 * не попадают в ряд: остатка тогда не знали, и ноль был бы неправдой.
 */
export function monthlyBalances(
  history: FundBalance[],
  months: number,
  today: string = currentMonth(),
): BalancePoint[] {
  const window = monthWindow(today, months);
  const start = window[0];

  // порядок прихода не оговорён, поэтому сортируем сами: в месяце побеждает
  // самый поздний снимок, при совпадении дат — записанный последним
  const sorted = [...history].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );

  const byMonth = new Map<string, string>();
  // остаток на начало окна: снимки старше окна не рисуем, но их сумму помним
  let carried: string | null = null;

  for (const item of sorted) {
    const month = monthFromDate(item.date);
    if (month < start) carried = item.amount_original;
    else if (month <= today) byMonth.set(month, item.amount_original);
  }

  const points: BalancePoint[] = [];
  let last = carried;

  for (const month of window) {
    const amount = byMonth.get(month) ?? last;
    if (amount === null || amount === undefined) continue;
    last = amount;
    points.push({ month, amount });
  }

  return points;
}
