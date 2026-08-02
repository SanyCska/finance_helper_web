"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { currentMonth } from "@/lib/format";
import {
  canGoForward as canMoveForward,
  monthWindow,
  selectMonthState,
  shiftWindowState,
} from "@/lib/monthWindow";

/**
 * Выбранный месяц живёт в строке запроса: так он переживает переход
 * на соседний экран и возврат по кнопке «назад».
 */
export function useMonth(): [string, (month: string) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const month = params.get("month") ?? currentMonth();

  const setMonth = useCallback(
    (next: string) => {
      const query = new URLSearchParams(params.toString());
      query.set("month", next);
      router.replace(`?${query.toString()}`, { scroll: false });
    },
    [params, router],
  );

  return [month, setMonth];
}

export type MonthWindow = {
  /** месяц, по которому показаны цифры */
  month: string;
  /** последний месяц на графике */
  anchor: string;
  /** все месяцы окна, от старых к свежим */
  window: string[];
  /** выбрать месяц, не сдвигая окно */
  selectMonth: (month: string) => void;
  /** сдвинуть окно на `delta` месяцев */
  shiftWindow: (delta: number) => void;
  canGoForward: boolean;
};

/**
 * Окно графика по месяцам.
 *
 * Конец окна хранится отдельным параметром `until`. Без него клик по столбцу
 * двигал бы и выбранный месяц, и границу окна разом — окно уползало бы назад,
 * и вернуться к свежим месяцам было бы уже нечем.
 */
export function useMonthWindow(size: number): MonthWindow {
  const params = useSearchParams();
  const router = useRouter();

  const month = params.get("month") ?? currentMonth();
  const anchor = params.get("until") ?? month;

  const update = useCallback(
    (next: { month: string; anchor: string }) => {
      const query = new URLSearchParams(params.toString());
      query.set("month", next.month);
      query.set("until", next.anchor);
      router.replace(`?${query.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const selectMonth = useCallback(
    (next: string) => update(selectMonthState({ month, anchor }, next)),
    [anchor, month, update],
  );

  const shiftWindow = useCallback(
    (delta: number) => update(shiftWindowState({ month, anchor }, delta, size)),
    [anchor, month, size, update],
  );

  return {
    month,
    anchor,
    window: monthWindow(anchor, size),
    selectMonth,
    shiftWindow,
    canGoForward: canMoveForward(anchor),
  };
}
