import { rankedColor } from "@/lib/colors";

/**
 * Цвета категорий месяца: порядок задаётся убыванием суммы, поэтому один
 * и тот же цвет достаётся категории во всех блоках экрана.
 */
export function buildColorMap(categories: { category: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  categories.forEach((item, index) => {
    map.set(item.category, rankedColor(item.category, index));
  });
  return map;
}

export function colorFor(map: Map<string, string>, category: string): string {
  return map.get(category) ?? "var(--color-neutral-400)";
}
