"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { currentMonth } from "@/lib/format";

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
