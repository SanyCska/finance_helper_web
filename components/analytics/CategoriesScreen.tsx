"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";
import { Donut } from "@/components/Charts";
import { Screen } from "@/components/Chrome";
import { MonthStepper } from "@/components/MonthTabs";
import { EmptyMonth, ErrorState, FxBanner, Loading } from "@/components/States";
import { api, type CategorySlice } from "@/lib/api";
import { buildColorMap, colorFor } from "@/lib/colorMap";
import {
  categoryLabel,
  formatMoney,
  formatPercent,
  pluralize,
  shiftMonth,
  toNumber,
} from "@/lib/format";
import { useMonth } from "@/lib/useMonth";

export function CategoriesScreen() {
  const [month, setMonth] = useMonth();

  const summary = useQuery({
    queryKey: ["month", month],
    queryFn: () => api.monthSummary(month),
  });
  const previous = useQuery({
    queryKey: ["month", shiftMonth(month, -1)],
    queryFn: () => api.monthSummary(shiftMonth(month, -1)),
  });

  const colors = useMemo(
    () => buildColorMap(summary.data?.categories ?? []),
    [summary.data],
  );

  const currency = summary.data?.base_currency ?? "USD";
  const total = toNumber(summary.data?.outcome_total);
  const previousTotal = toNumber(previous.data?.outcome_total);
  const totalDelta = previousTotal > 0 ? (total - previousTotal) / previousTotal : null;

  return (
    <Screen title="Аналитика" back="/">
      <AnalyticsTabs month={month} />
      <MonthStepper month={month} onChange={setMonth} />

      {summary.isPending ? <Loading /> : null}
      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : null}

      {summary.data ? (
        <>
          <FxBanner count={summary.data.pending_count} />

          <section className="rule flex items-center gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <div className="eyebrow mb-1" style={{ color: "var(--color-accent)" }}>
                Всего
              </div>
              <div
                className="heading num"
                style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.03em" }}
              >
                {formatMoney(total, { currency })}
              </div>
              {totalDelta !== null ? (
                <div className="mt-2 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
                  {formatPercent(totalDelta, { sign: true })} к прошлому месяцу
                </div>
              ) : null}
            </div>
            <Donut
              items={summary.data.categories.map((item) => ({
                key: item.category,
                value: toNumber(item.amount),
                color: colorFor(colors, item.category),
              }))}
              size={120}
              caption="Всего"
              value={formatMoney(total, { currency })}
            />
          </section>

          {summary.data.categories.length === 0 ? <EmptyMonth /> : null}

          <div className="px-4">
            {summary.data.categories.map((item) => (
              <LegendRow
                key={item.category}
                item={item}
                color={colorFor(colors, item.category)}
                currency={currency}
                month={month}
                previousAmount={findPrevious(previous.data?.categories, item.category)}
              />
            ))}
          </div>

          <Insight categories={summary.data.categories} currency={currency} />
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

function findPrevious(categories: CategorySlice[] | undefined, name: string): number | null {
  const match = categories?.find((item) => item.category === name);
  return match ? toNumber(match.amount) : null;
}

function LegendRow({
  item,
  color,
  currency,
  month,
  previousAmount,
}: {
  item: CategorySlice;
  color: string;
  currency: string;
  month: string;
  previousAmount: number | null;
}) {
  const amount = toNumber(item.amount);
  const diff = previousAmount === null ? null : amount - previousAmount;

  return (
    <Link
      href={`/category/${encodeURIComponent(item.category)}?month=${month}`}
      className="rule-thin flex items-center gap-3 py-3"
    >
      <span className="size-[10px] shrink-0" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{categoryLabel(item.category)}</div>
        <div className="text-[11.5px]" style={{ color: "var(--color-neutral-700)" }}>
          {formatPercent(item.share)} · {pluralize(item.tx_count, "операция", "операции", "операций")}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="num text-[14px] font-semibold">{formatMoney(amount, { currency })}</div>
        {diff === null || Math.round(diff) === 0 ? (
          <div className="text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
            {diff === null ? "новая" : "без изменений"}
          </div>
        ) : (
          <div
            className="num text-[11px] font-semibold"
            style={{
              color: diff > 0 ? "var(--color-accent)" : "var(--color-neutral-600)",
            }}
          >
            {diff > 0 ? "+" : "−"}
            {formatMoney(Math.abs(diff), { currency })}
          </div>
        )}
      </div>
    </Link>
  );
}

/** Короткий факт о месяце: какие категории выросли сильнее всего в деньгах. */
function Insight({
  categories,
  currency,
}: {
  categories: CategorySlice[];
  currency: string;
}) {
  const growing = categories
    .filter((item) => item.delta_pct !== null && toNumber(item.delta_pct) > 0)
    .map((item) => ({
      name: item.category,
      growth: toNumber(item.amount) - toNumber(item.amount) / (1 + toNumber(item.delta_pct)),
    }))
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 2);

  if (growing.length === 0) return null;

  const totalGrowth = growing.reduce((sum, item) => sum + item.growth, 0);

  return (
    <div className="mt-3 px-4 py-3" style={{ background: "var(--color-accent-100)" }}>
      <div
        className="heading mb-1 text-[13px]"
        style={{ color: "var(--color-accent-900)" }}
      >
        Сильнее всего выросли: {growing.map((item) => categoryLabel(item.name)).join(", ")}
      </div>
      <div className="text-[11.5px] leading-[1.4]" style={{ color: "var(--color-accent-800)" }}>
        Вместе они прибавили {formatMoney(totalGrowth, { currency })} к прошлому месяцу.
      </div>
    </div>
  );
}
