"use client";

import { useRef } from "react";

import { formatDateFull } from "@/lib/format";

/**
 * Поле даты в формате дд.мм.гггг.
 *
 * Нативный date-input показывает дату по локали ОС — в англоязычной системе
 * получается месяц/день/год, и `lang="ru"` на это не влияет. Раньше мы прятали
 * только текст инпута, но браузер продолжал рисовать подсветку выбранного куска
 * даты, и она ложилась синим пятном поверх нашей подписи. Поэтому инпут
 * прозрачный целиком и растянут поверх поля.
 *
 * Инпут остаётся настоящим: тап открывает системный календарь, скринридеры
 * видят обычное поле даты.
 */
export function DateField({
  id,
  value,
  max,
  onChange,
}: {
  id?: string;
  value: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className="input relative flex items-center gap-2"
      onClick={() => {
        // на десктопе клик по полю сам календарь не открывает
        input.current?.showPicker?.();
      }}
    >
      <span className="num flex-1">{formatDateFull(value)}</span>
      <span aria-hidden className="text-[14px]" style={{ color: "var(--color-neutral-600)" }}>
        📅
      </span>
      <input
        ref={input}
        id={id}
        type="date"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
