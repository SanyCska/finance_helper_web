"use client";

import { formatMonthName, shiftMonth } from "@/lib/format";
import { haptic } from "@/lib/telegram";

/** Три месяца вкладками — мокап 2b. */
export function MonthTabs({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const months = [shiftMonth(month, -2), shiftMonth(month, -1), month];

  return (
    <div className="rule flex">
      {months.map((item, index) => {
        const isActive = item === month;
        return (
          <button
            key={item}
            className="flex-1 py-[9px] text-center text-[12.5px]"
            style={{
              fontWeight: isActive ? 800 : 600,
              background: isActive ? "var(--color-accent)" : undefined,
              color: isActive ? "var(--color-bg)" : "var(--color-neutral-700)",
              borderRight: index < months.length - 1 ? "1px solid var(--color-divider)" : undefined,
            }}
            onClick={() => {
              haptic();
              onChange(item);
            }}
          >
            {formatMonthName(item)}
          </button>
        );
      })}
    </div>
  );
}

/** Стрелки «предыдущий / следующий месяц» — мокап 2d. */
export function MonthStepper({
  month,
  onChange,
  right,
}: {
  month: string;
  onChange: (month: string) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="rule-thin flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          aria-label="Предыдущий месяц"
          className="text-base"
          style={{ color: "var(--color-neutral-600)" }}
          onClick={() => {
            haptic();
            onChange(shiftMonth(month, -1));
          }}
        >
          ‹
        </button>
        <span className="heading text-[15px]">{monthTitle(month)}</span>
        <button
          aria-label="Следующий месяц"
          className="text-base"
          style={{ color: "var(--color-neutral-600)" }}
          onClick={() => {
            haptic();
            onChange(shiftMonth(month, 1));
          }}
        >
          ›
        </button>
      </div>
      {right}
    </div>
  );
}

function monthTitle(month: string): string {
  const [year] = month.split("-");
  return `${formatMonthName(month)} ${year}`;
}
