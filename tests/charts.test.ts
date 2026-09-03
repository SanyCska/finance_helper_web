import { describe, expect, it } from "vitest";

import { barPercent, barScale } from "@/lib/bars";
import { categoryColor, rankedColor, RANK_PALETTE } from "@/lib/colors";
import { conicGradient, donutSegments } from "@/lib/donut";

describe("donutSegments", () => {
  it("делит круг пропорционально долям", () => {
    const segments = donutSegments([
      { key: "a", value: 75, color: "red" },
      { key: "b", value: 25, color: "blue" },
    ]);

    expect(segments).toHaveLength(2);
    expect(segments[0].from).toBe(0);
    expect(segments[0].to).toBe(75);
    expect(segments[1].from).toBe(75);
    expect(segments[1].to).toBe(100);
  });

  it("замыкает круг ровно на ста процентах при неделимых долях", () => {
    const segments = donutSegments([
      { key: "a", value: 1, color: "red" },
      { key: "b", value: 1, color: "blue" },
      { key: "c", value: 1, color: "green" },
    ]);

    expect(segments.at(-1)?.to).toBe(100);
  });

  it("пропускает нулевые и отрицательные значения", () => {
    const segments = donutSegments([
      { key: "a", value: 10, color: "red" },
      { key: "b", value: 0, color: "blue" },
      { key: "c", value: -5, color: "green" },
    ]);

    expect(segments.map((segment) => segment.key)).toEqual(["a"]);
  });

  it("на пустых данных не рисует ничего", () => {
    expect(donutSegments([])).toEqual([]);
    expect(donutSegments([{ key: "a", value: 0, color: "red" }])).toEqual([]);
  });
});

describe("conicGradient", () => {
  it("собирает градиент из сегментов", () => {
    const gradient = conicGradient([
      { key: "a", color: "red", from: 0, to: 60 },
      { key: "b", color: "blue", from: 60, to: 100 },
    ]);

    expect(gradient).toBe("conic-gradient(red 0% 60%,blue 60% 100%)");
  });

  it("для пустого доната отдаёт нейтральную заливку", () => {
    expect(conicGradient([])).toBe("var(--color-neutral-300)");
  });
});

describe("цвета категорий", () => {
  it("одно имя всегда даёт один цвет", () => {
    expect(categoryColor("Рестики")).toBe(categoryColor("Рестики"));
  });

  it("разные имена обычно получают разные цвета", () => {
    const names = ["Продукты", "Рестики", "Транспорт", "Кофе", "Подписки"];
    const colors = new Set(names.map(categoryColor));

    expect(colors.size).toBeGreaterThan(1);
  });

  it("верхние позиции берут цвета из палитры мокапа", () => {
    expect(rankedColor("Продукты", 0)).toBe(RANK_PALETTE[0]);
    expect(rankedColor("Рестики", 1)).toBe(RANK_PALETTE[1]);
  });

  it("за пределами палитры цвет определяется именем", () => {
    expect(rankedColor("Хвост", 99)).toBe(categoryColor("Хвост"));
  });
});

describe("шкала столбиков от нуля", () => {
  it("делает высоту долей максимума", () => {
    const scale = barScale([0, 50, 100], "zero");

    expect(barPercent(100, scale)).toBe(100);
    expect(barPercent(50, scale)).toBe(50);
  });

  it("оставляет нулю видимую полоску", () => {
    expect(barPercent(0, barScale([0, 100], "zero"))).toBe(2);
  });
});

describe("шкала столбиков от минимума", () => {
  it("растягивает узкий диапазон на всю высоту", () => {
    const scale = barScale([900, 1000, 1100], "min");

    expect(barPercent(1100, scale)).toBe(100);
    expect(barPercent(900, scale)).toBeCloseTo(12, 5);
    expect(barPercent(1000, scale)).toBeCloseTo(56, 5);
  });

  it("ровный ряд рисует ровным, а не в потолок", () => {
    const scale = barScale([500, 500], "min");

    expect(barPercent(500, scale)).toBe(50);
  });

  it("единственная точка тоже не упирается в потолок", () => {
    expect(barPercent(500, barScale([500], "min"))).toBe(50);
  });
});
