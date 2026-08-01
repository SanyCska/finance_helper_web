"use client";

import { type Transaction } from "@/lib/api";
import { colorFor } from "@/lib/colorMap";
import { categoryLabel, formatDayTitle, formatMoney, formatOriginal, toNumber } from "@/lib/format";

export type DayGroup = { date: string; total: number; items: Transaction[] };

/** Группировка по дням с суммой дня — мокап 2d. */
export function groupByDay(items: Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>();
  for (const item of items) {
    const bucket = groups.get(item.date);
    if (bucket) bucket.push(item);
    else groups.set(item.date, [item]);
  }

  return [...groups.entries()]
    .map(([date, dayItems]) => ({
      date,
      items: dayItems,
      total: dayItems
        .filter((item) => item.direction === "outcome")
        .reduce((sum, item) => sum + toNumber(item.amount_base), 0),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function TransactionRows({
  groups,
  colors,
  currency,
  onSelect,
}: {
  groups: DayGroup[];
  colors: Map<string, string>;
  currency: string;
  onSelect?: (item: Transaction) => void;
}) {
  return (
    <div className="px-4">
      {groups.map((group) => (
        <div key={group.date}>
          <div className="rule flex items-baseline justify-between pt-3 pb-2">
            <span className="eyebrow" style={{ color: "var(--color-neutral-700)" }}>
              {formatDayTitle(group.date)}
            </span>
            <span
              className="num text-[11px]"
              style={{ color: "var(--color-neutral-700)" }}
            >
              {formatMoney(group.total, { currency, decimals: 2 })}
            </span>
          </div>
          {group.items.map((item) => (
            <TransactionRow
              key={item.id}
              item={item}
              color={colorFor(colors, item.category_name)}
              currency={currency}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function TransactionRow({
  item,
  color,
  currency,
  onSelect,
}: {
  item: Transaction;
  color: string;
  currency: string;
  onSelect?: (item: Transaction) => void;
}) {
  const isIncome = item.direction === "income";
  const base = item.amount_base === null ? null : toNumber(item.amount_base);

  return (
    <button
      className="rule-thin flex w-full items-center gap-3 py-3 text-left"
      onClick={() => onSelect?.(item)}
    >
      <span className="size-[10px] shrink-0" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">
          {categoryLabel(item.category_name)}
        </div>
        <div className="truncate text-[11.5px]" style={{ color: "var(--color-neutral-700)" }}>
          {item.comment?.trim() || item.account_name.trim()}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className="num text-[14px] font-semibold"
          style={{ color: isIncome ? "var(--color-accent-700)" : undefined }}
        >
          {base === null
            ? "курс не найден"
            : formatMoney(isIncome ? base : -base, { currency, decimals: 2 })}
        </div>
        {item.currency !== currency ? (
          <div className="num text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
            {formatOriginal(item.amount_original, item.currency)}
          </div>
        ) : null}
      </div>
    </button>
  );
}
