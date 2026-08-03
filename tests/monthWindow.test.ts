import { describe, expect, it } from "vitest";

import {
  canGoForward,
  monthTabs,
  monthWindow,
  selectMonthState,
  shiftWindowState,
} from "@/lib/monthWindow";

const SIZE = 6;
const TODAY = "2026-08";

describe("monthWindow", () => {
  it("строит окно, оканчивающееся якорем", () => {
    expect(monthWindow("2026-08", SIZE)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("переходит через границу года", () => {
    expect(monthWindow("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("выбор столбца", () => {
  it("меняет месяц и не двигает окно", () => {
    const next = selectMonthState({ month: "2026-08", anchor: "2026-08" }, "2026-05");

    expect(next).toEqual({ month: "2026-05", anchor: "2026-08" });
  });

  it("после выбора раннего месяца окно остаётся прежним и вперёд ещё можно", () => {
    const state = selectMonthState({ month: "2026-08", anchor: "2026-08" }, "2026-03");
    const back = shiftWindowState(state, -SIZE, SIZE, TODAY);

    expect(back.anchor).toBe("2026-02");
    expect(canGoForward(back.anchor, TODAY)).toBe(true);
  });
});

describe("сдвиг окна", () => {
  it("уводит окно назад", () => {
    const next = shiftWindowState({ month: "2026-08", anchor: "2026-08" }, -SIZE, SIZE, TODAY);

    expect(next.anchor).toBe("2026-02");
  });

  it("возвращает окно вперёд на то же место", () => {
    const back = shiftWindowState({ month: "2026-08", anchor: "2026-08" }, -SIZE, SIZE, TODAY);
    const forward = shiftWindowState(back, SIZE, SIZE, TODAY);

    expect(forward.anchor).toBe("2026-08");
  });

  it("не пускает окно за текущий месяц", () => {
    const next = shiftWindowState({ month: "2026-07", anchor: "2026-07" }, SIZE, SIZE, TODAY);

    expect(next.anchor).toBe(TODAY);
  });

  it("переносит выбранный месяц на конец окна, если он выпал из него", () => {
    const next = shiftWindowState({ month: "2026-08", anchor: "2026-08" }, -SIZE, SIZE, TODAY);

    expect(next.month).toBe("2026-02");
  });

  it("оставляет выбранный месяц, если он остался в окне", () => {
    const next = shiftWindowState({ month: "2026-05", anchor: "2026-08" }, -1, SIZE, TODAY);

    expect(next.anchor).toBe("2026-07");
    expect(next.month).toBe("2026-05");
  });
});

describe("canGoForward", () => {
  it("запрещает движение вперёд на текущем месяце", () => {
    expect(canGoForward("2026-08", TODAY)).toBe(false);
  });

  it("разрешает движение вперёд в прошлом", () => {
    expect(canGoForward("2026-02", TODAY)).toBe(true);
  });
});

describe("monthTabs", () => {
  it("на текущем месяце показывает его и два прошлых", () => {
    expect(monthTabs("2026-08", TODAY)).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("в прошлом ставит выбранный месяц в середину, чтобы можно было вернуться", () => {
    expect(monthTabs("2026-06", TODAY)).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("шаг назад и шаг вперёд возвращают на исходный месяц", () => {
    const back = monthTabs("2026-08", TODAY)[0];
    expect(monthTabs(back, TODAY)).toContain("2026-07");
    expect(monthTabs("2026-07", TODAY)).toContain("2026-08");
  });

  it("не предлагает месяцев после текущего", () => {
    for (const month of monthTabs("2026-08", TODAY)) {
      expect(month <= TODAY).toBe(true);
    }
  });

  it("переходит через границу года", () => {
    expect(monthTabs("2025-12", "2026-08")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});
