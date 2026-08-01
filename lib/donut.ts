/** Геометрия доната: доли → сегменты для `conic-gradient`, как в мокапе. */

export type DonutSegment = {
  key: string;
  color: string;
  /** начало сегмента в процентах круга */
  from: number;
  /** конец сегмента в процентах круга */
  to: number;
};

export type DonutInput = {
  key: string;
  value: number;
  color: string;
};

/**
 * Считает границы сегментов. Доли нормируются по сумме, последний сегмент
 * дотягивается ровно до 100%, чтобы в круге не оставалось щели от округлений.
 */
export function donutSegments(items: DonutInput[]): DonutSegment[] {
  const positive = items.filter((item) => item.value > 0);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return [];

  const segments: DonutSegment[] = [];
  let cursor = 0;

  positive.forEach((item, index) => {
    const isLast = index === positive.length - 1;
    const width = (item.value / total) * 100;
    const to = isLast ? 100 : cursor + width;
    segments.push({ key: item.key, color: item.color, from: cursor, to });
    cursor = to;
  });

  return segments;
}

/** Строка для `background: conic-gradient(...)`. */
export function conicGradient(segments: DonutSegment[]): string {
  if (segments.length === 0) return "var(--color-neutral-300)";
  const stops = segments
    .map((segment) => `${segment.color} ${segment.from}% ${segment.to}%`)
    .join(",");
  return `conic-gradient(${stops})`;
}
