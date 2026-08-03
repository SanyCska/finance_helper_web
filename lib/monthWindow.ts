/**
 * Арифметика окна месяцев на графике динамики.
 *
 * Вынесено из хука, чтобы поведение — особенно движение окна вперёд и назад —
 * проверялось тестами без роутера.
 */

import { currentMonth, shiftMonth } from "@/lib/format";

/** Месяцы окна, от старых к свежим, последний — `anchor`. */
export function monthWindow(anchor: string, size: number): string[] {
  return Array.from({ length: size }, (_, index) => shiftMonth(anchor, index - size + 1));
}

/**
 * Три месяца для переключателя на ленте.
 *
 * Пока выбран текущий месяц, показываем его и два прошлых — вперёд идти некуда.
 * Как только пользователь ушёл в прошлое, выбранный месяц встаёт в середину,
 * и справа появляется месяц, которым можно вернуться: иначе уход назад был бы
 * дорогой в один конец.
 */
export function monthTabs(month: string, today: string = currentMonth()): string[] {
  const next = shiftMonth(month, 1);
  if (next > today) return [shiftMonth(month, -2), shiftMonth(month, -1), month];
  return [shiftMonth(month, -1), month, next];
}

/** Можно ли двигать окно вперёд: за текущий месяц данных нет. */
export function canGoForward(anchor: string, today: string = currentMonth()): boolean {
  return anchor < today;
}

/**
 * Сдвиг окна. Возвращает новый конец окна и выбранный месяц: если выбранный
 * выпал за пределы окна, он переезжает на его конец, иначе остаётся на месте.
 */
export function shiftWindowState(
  state: { month: string; anchor: string },
  delta: number,
  size: number,
  today: string = currentMonth(),
): { month: string; anchor: string } {
  const raw = shiftMonth(state.anchor, delta);
  // вперёд дальше текущего месяца окно не пускаем
  const anchor = raw > today ? today : raw;
  const window = monthWindow(anchor, size);
  return { anchor, month: window.includes(state.month) ? state.month : anchor };
}

/** Выбор столбца меняет месяц, но не двигает окно. */
export function selectMonthState(
  state: { month: string; anchor: string },
  month: string,
): { month: string; anchor: string } {
  return { month, anchor: state.anchor };
}
