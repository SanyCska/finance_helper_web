/**
 * Геометрия линии остатка по месяцам.
 *
 * Остаток гуляет вокруг своей величины: от нуля все точки сливаются в одну
 * прямую под потолком, а столбиками от «чуть ниже минимума» разница в пять
 * процентов выглядит разницей в восемь раз. Линия так не врёт — она про
 * направление, а не про величину, и шкалу под ней можно честно подписать
 * минимумом и максимумом окна.
 */

export type TrendScale = { floor: number; top: number };

/** Сколько от размаха ряда оставляем воздухом сверху и снизу. */
const PADDING = 0.15;

export function trendScale(values: number[]): TrendScale {
  if (!values.length) return { floor: 0, top: 1 };

  const max = Math.max(...values);
  const min = Math.min(...values);
  // ряд без изменений: линия должна лечь посередине, а не по краю
  if (max === min) return { floor: min - 1, top: max + 1 };

  const padding = (max - min) * PADDING;
  return { floor: min - padding, top: max + padding };
}

/** Высота точки в процентах от низа поля. */
export function trendPercent(value: number, scale: TrendScale): number {
  const span = scale.top - scale.floor;
  if (span <= 0) return 50;
  return Math.max(0, Math.min(100, ((value - scale.floor) / span) * 100));
}

/** Доля ширины для точки: первая слева у края, последняя — у правого. */
export function trendOffset(index: number, count: number): number {
  if (count <= 1) return 50;
  return (index / (count - 1)) * 100;
}
