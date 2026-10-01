"use client";

import { toggleSign } from "@/lib/format";
import { haptic } from "@/lib/telegram";

/**
 * Кнопка «±» у поля суммы: `inputMode="decimal"` показывает на телефоне
 * клавиатуру без минуса, а долг иначе не записать.
 */
export function SignToggle({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn btn-secondary num shrink-0 px-3 text-[15px]"
      aria-label="Сменить знак суммы"
      disabled={disabled || value.trim() === ""}
      onClick={() => {
        haptic();
        onChange(toggleSign(value));
      }}
    >
      ±
    </button>
  );
}
