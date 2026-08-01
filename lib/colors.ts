/**
 * Цвет категории.
 *
 * Первые места в месяце получают фиксированные цвета из мокапа, чтобы главный
 * экран выглядел как в макете. Остальным цвет назначается по хешу имени —
 * так категория не меняет цвет при переходе между экранами.
 */

/** Порядок повторяет легенду на мокапе 2b. */
export const RANK_PALETTE = [
  "var(--color-accent)",
  "var(--color-text)",
  "var(--color-accent-400)",
  "var(--color-neutral-600)",
  "var(--color-accent-700)",
  "var(--color-neutral-400)",
  "var(--color-neutral-300)",
];

const HASH_PALETTE = [
  "var(--color-accent)",
  "var(--color-text)",
  "var(--color-accent-400)",
  "var(--color-neutral-600)",
  "var(--color-accent-700)",
  "var(--color-neutral-400)",
  "var(--color-accent-600)",
  "var(--color-neutral-800)",
  "var(--color-accent-300)",
  "var(--color-neutral-500)",
];

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(result);
}

/** Стабильный цвет по имени категории. */
export function categoryColor(name: string): string {
  return HASH_PALETTE[hash(name) % HASH_PALETTE.length];
}

/**
 * Цвет для позиции в отсортированном списке: топ идёт по палитре мокапа,
 * хвост — по хешу, чтобы соседние мелкие категории не сливались.
 */
export function rankedColor(name: string, rank: number): string {
  if (rank < RANK_PALETTE.length) return RANK_PALETTE[rank];
  return categoryColor(name);
}
