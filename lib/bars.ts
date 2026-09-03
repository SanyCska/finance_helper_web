/**
 * Высота столбиков на графике по месяцам.
 *
 * Траты считаем от нуля: месяц без трат — это пустой столбик, и разница между
 * месяцами читается как есть. Остатки так рисовать нельзя: баланс гуляет вокруг
 * своей величины, и от нуля все столбики упираются в потолок одинаково. Для них
 * шкала начинается чуть ниже минимума окна, и видно именно изменение.
 */

export type BarBaseline = "zero" | "min";

/** Низ и верх шкалы в величинах ряда. */
export type BarScale = { floor: number; top: number };

/** Самый низкий столбик занимает столько процентов высоты — иначе он исчезнет. */
const FLOOR_PERCENT = 12;

export function barScale(values: number[], baseline: BarBaseline = "zero"): BarScale {
  if (!values.length) return { floor: 0, top: 1 };
  if (baseline === "zero") return { floor: 0, top: Math.max(...values, 1) };

  const max = Math.max(...values);
  const min = Math.min(...values);
  // ряд без изменений: расширяем шкалу в обе стороны, чтобы столбики встали
  // на половину высоты — ровно, а не под потолок
  if (max === min) return { floor: min - 1, top: max + 1 };

  return { floor: min - ((max - min) * FLOOR_PERCENT) / (100 - FLOOR_PERCENT), top: max };
}

export function barPercent(value: number, scale: BarScale): number {
  const span = scale.top - scale.floor;
  if (span <= 0) return 100;
  // два процента — минимум, при котором столбик остаётся видимым
  return Math.max(2, Math.min(100, ((value - scale.floor) / span) * 100));
}
