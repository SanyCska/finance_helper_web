import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  currentMonth,
  formatDateFull,
  formatDayTitle,
  formatMonthGenitive,
  parseAmount,
  formatMoney,
  formatMonthName,
  formatMonthTitle,
  formatOriginal,
  formatPercent,
  pluralize,
  shiftMonth,
  toNumber,
} from "@/lib/format";

const NBSP = " ";

describe("formatMoney", () => {
  it("группирует тысячи неразрывным пробелом как в мокапе", () => {
    expect(formatMoney(4000)).toBe(`$4${NBSP}000`);
  });

  it("показывает копейки, когда их просят", () => {
    expect(formatMoney(13.89, { decimals: 2 })).toBe("$13.89");
  });

  it("по умолчанию округляет до целых", () => {
    expect(formatMoney(3414.27)).toBe(`$3${NBSP}414`);
  });

  it("рисует минус типографским знаком", () => {
    expect(formatMoney(-13.89, { decimals: 2 })).toBe("−$13.89");
  });

  it("ставит плюс, когда просят знак", () => {
    expect(formatMoney(586, { sign: "always" })).toBe("+$586");
  });

  it("не ставит плюс у отрицательной суммы даже в режиме always", () => {
    expect(formatMoney(-586, { sign: "always" })).toBe("−$586");
  });

  it("понимает строки из API", () => {
    expect(formatMoney("3406.7739")).toBe(`$3${NBSP}407`);
  });

  it("нулю не приписывает копейки", () => {
    expect(formatMoney(0)).toBe("$0");
  });

  it("копейки округляются, а не обрезаются", () => {
    expect(formatMoney(10.005, { decimals: 2 })).toBe("$10.01");
  });

  it("для валюты без своего знака ставит код", () => {
    expect(formatMoney(100, { currency: "RSD" })).toBe(`RSD${NBSP}100`);
  });
});

describe("formatOriginal", () => {
  it("показывает сумму в валюте операции", () => {
    expect(formatOriginal(1500, "RSD")).toBe(`1${NBSP}500${NBSP}RSD`);
  });

  it("сохраняет копейки, если они есть", () => {
    expect(formatOriginal(12.5, "EUR")).toBe(`12.50${NBSP}EUR`);
  });
});

describe("formatPercent", () => {
  it("округляет долю до процентов", () => {
    expect(formatPercent(0.854)).toBe("85%");
  });

  it("ставит знак у дельты", () => {
    expect(formatPercent(0.41, { sign: true })).toBe("+41%");
  });

  it("отрицательную дельту рисует минусом", () => {
    expect(formatPercent(-0.12, { sign: true })).toBe("−12%");
  });
});

describe("даты", () => {
  it("формирует заголовок месяца", () => {
    expect(formatMonthTitle("2026-07")).toBe("Июль 2026");
  });

  it("даёт короткое имя месяца для табов", () => {
    expect(formatMonthName("2026-05")).toBe("Май");
  });

  it("формирует заголовок дня в родительном падеже", () => {
    expect(formatDayTitle("2026-07-31")).toBe("31 июля");
  });

  it("склоняет месяц для оборота «на конец …»", () => {
    expect(formatMonthGenitive("2026-07")).toBe("июля 2026");
    expect(formatMonthGenitive("2026-01")).toBe("января 2026");
  });

  it("показывает полную дату как день.месяц.год", () => {
    expect(formatDateFull("2026-07-31")).toBe("31.07.2026");
  });

  it("не ломается на неполной дате", () => {
    expect(formatDateFull("2026-07")).toBe("2026-07");
  });

  it("сдвигает месяц через границу года", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("определяет текущий месяц с ведущим нулём", () => {
    expect(currentMonth(new Date(2026, 7, 2))).toBe("2026-08");
  });
});

describe("pluralize", () => {
  it("склоняет единицу", () => {
    expect(pluralize(1, "операция", "операции", "операций")).toBe("1 операция");
  });

  it("склоняет двойку-четвёрку", () => {
    expect(pluralize(2, "операция", "операции", "операций")).toBe("2 операции");
    expect(pluralize(4, "операция", "операции", "операций")).toBe("4 операции");
  });

  it("склоняет пятёрку и дальше", () => {
    expect(pluralize(5, "операция", "операции", "операций")).toBe("5 операций");
    expect(pluralize(0, "операция", "операции", "операций")).toBe("0 операций");
  });

  it("подростковые числа идут в форму множественного числа", () => {
    expect(pluralize(11, "операция", "операции", "операций")).toBe("11 операций");
    expect(pluralize(14, "операция", "операции", "операций")).toBe("14 операций");
  });

  it("составные числа склоняются по последней цифре", () => {
    expect(pluralize(21, "операция", "операции", "операций")).toBe("21 операция");
    expect(pluralize(102, "операция", "операции", "операций")).toBe("102 операции");
    expect(pluralize(111, "операция", "операции", "операций")).toBe("111 операций");
  });
});

describe("вспомогательное", () => {
  it("пустую категорию подписывает явно", () => {
    expect(categoryLabel("")).toBe("Без категории");
  });

  it("хвостовые пробелы в имени категории не показываются", () => {
    expect(categoryLabel("Продукты в магазинах ")).toBe("Продукты в магазинах");
  });

  it("нечисловое значение превращает в ноль", () => {
    expect(toNumber("не число")).toBe(0);
    expect(toNumber(null)).toBe(0);
  });
});

describe("parseAmount", () => {
  it("разбирает число с разделителем разрядов", () => {
    expect(parseAmount("250 000")).toBe(250000);
    // неразрывный пробел вставляет наш же форматтер сумм
    expect(parseAmount("1\u00a0250,50")).toBe(1250.5);
  });

  it("принимает запятую как десятичный разделитель", () => {
    expect(parseAmount("13,89")).toBe(13.89);
    expect(parseAmount("13.89")).toBe(13.89);
  });

  it("на пустой строке и мусоре возвращает NaN, а не ноль", () => {
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("   ")).toBeNaN();
    expect(parseAmount("сто рублей")).toBeNaN();
  });

  it("держит отрицательные и дробные", () => {
    expect(parseAmount("-50")).toBe(-50);
    expect(parseAmount("0,5")).toBe(0.5);
  });
});
