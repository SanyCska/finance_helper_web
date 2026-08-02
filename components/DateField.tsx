"use client";

import { formatDateFull } from "@/lib/format";

/**
 * Нативный date-input показывает дату в формате локали ОС — в англоязычной
 * системе получается месяц/день/год, и `lang="ru"` на это не влияет.
 * Поэтому текст самого инпута прячем (см. `.date-native` в globals.css),
 * а подпись «дд.мм.гггг» рисуем поверх. Инпут остаётся обычным: тап по полю
 * открывает системный календарь, скринридеры видят настоящее поле.
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
  return (
    <div className="relative">
      <input
        id={id}
        type="date"
        className="input date-native"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
      <div
        className="pointer-events-none absolute inset-0 flex items-center px-[10px] text-[16px]"
        aria-hidden
      >
        {formatDateFull(value)}
      </div>
    </div>
  );
}
