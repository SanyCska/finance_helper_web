/**
 * Высота столбиков на графике по месяцам.
 *
 * Столбик читается как величина, поэтому шкала всегда от нуля: месяц без трат —
 * пустой столбик, и разница между месяцами видна как есть. Остатки столбиками
 * не рисуем вовсе: от нуля они все упираются в потолок, а от урезанной шкалы
 * пятипроцентное изменение выглядит кратным. Для них линия — `lib/trend.ts`.
 */

/** Низ и верх шкалы в величинах ряда. */
export type BarScale = { floor: number; top: number };

export function barScale(values: number[]): BarScale {
  return { floor: 0, top: Math.max(...values, 1) };
}

export function barPercent(value: number, scale: BarScale): number {
  const span = scale.top - scale.floor;
  if (span <= 0) return 100;
  // два процента — минимум, при котором столбик остаётся видимым
  return Math.max(2, Math.min(100, ((value - scale.floor) / span) * 100));
}
