import { describe, expect, it } from "vitest";

import { monthlyBalances } from "@/lib/fundHistory";
import type { FundBalance } from "@/lib/api";

const TODAY = "2026-09";

function snapshot(date: string, amount: string): FundBalance {
  return {
    id: Number(date.replaceAll("-", "")),
    date,
    amount_original: amount,
    currency: "RSD",
    amount_base: null,
    note: null,
  };
}

describe("monthlyBalances", () => {
  it("тянет последнюю известную сумму в месяцы без записи", () => {
    const points = monthlyBalances([snapshot("2026-07-01", "1000")], 12, TODAY);

    expect(points).toEqual([
      { month: "2026-07", amount: "1000" },
      { month: "2026-08", amount: "1000" },
      { month: "2026-09", amount: "1000" },
    ]);
  });

  it("из нескольких записей месяца берёт самую позднюю", () => {
    const points = monthlyBalances(
      [snapshot("2026-09-20", "1200"), snapshot("2026-09-03", "900")],
      12,
      TODAY,
    );

    expect(points).toEqual([{ month: "2026-09", amount: "1200" }]);
  });

  it("не рисует месяцы до первого снимка", () => {
    const points = monthlyBalances([snapshot("2026-08-31", "500")], 12, TODAY);

    expect(points.map((point) => point.month)).toEqual(["2026-08", "2026-09"]);
  });

  it("окно обрезает историю, но остаток на его начало не теряется", () => {
    const points = monthlyBalances(
      [snapshot("2025-01-10", "700"), snapshot("2026-09-01", "1500")],
      3,
      TODAY,
    );

    expect(points).toEqual([
      { month: "2026-07", amount: "700" },
      { month: "2026-08", amount: "700" },
      { month: "2026-09", amount: "1500" },
    ]);
  });

  it("на пустой истории не даёт ни одной точки", () => {
    expect(monthlyBalances([], 12, TODAY)).toEqual([]);
  });
});
