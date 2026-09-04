import { describe, expect, it } from "vitest";

import { trendOffset, trendPercent, trendScale } from "@/lib/trend";

describe("trendScale", () => {
  it("оставляет воздух сверху и снизу от размаха", () => {
    // размах 100, по 15 в запас с каждой стороны
    expect(trendScale([900, 1000])).toEqual({ floor: 885, top: 1015 });
  });

  it("ряд без изменений кладёт линию посередине", () => {
    const scale = trendScale([500, 500, 500]);

    expect(trendPercent(500, scale)).toBe(50);
  });

  it("пустой ряд не делит на ноль", () => {
    expect(trendPercent(0, trendScale([]))).toBe(0);
  });
});

describe("trendPercent", () => {
  it("минимум и максимум не липнут к краям поля", () => {
    const scale = trendScale([4250.37, 4457.78]);

    // разница остатка в 5% и на графике читается как небольшой сдвиг,
    // а не как разница в разы — ради этого и ушли от столбиков
    expect(Math.round(trendPercent(4250.37, scale))).toBe(12);
    expect(Math.round(trendPercent(4457.78, scale))).toBe(88);
  });

  it("держит значения вне шкалы в пределах поля", () => {
    const scale = trendScale([100, 200]);

    expect(trendPercent(1000, scale)).toBe(100);
    expect(trendPercent(-1000, scale)).toBe(0);
  });
});

describe("trendOffset", () => {
  it("растягивает точки от края до края", () => {
    expect(trendOffset(0, 3)).toBe(0);
    expect(trendOffset(1, 3)).toBe(50);
    expect(trendOffset(2, 3)).toBe(100);
  });

  it("единственную точку ставит по центру", () => {
    expect(trendOffset(0, 1)).toBe(50);
  });
});
