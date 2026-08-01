"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";
import { CompareRow } from "@/components/Charts";
import { Screen } from "@/components/Chrome";
import { ErrorState, Loading } from "@/components/States";
import { api } from "@/lib/api";
import {
  categoryLabel,
  formatMonthTitle,
  formatMoney,
  formatPercent,
  shiftMonth,
  toNumber,
} from "@/lib/format";
import { useMonth } from "@/lib/useMonth";

const VISIBLE_CATEGORIES = 12;

export function CompareScreen() {
  const [month, setMonth] = useMonth();
  const [base, setBase] = useState(() => shiftMonth(month, -1));

  const months = useQuery({ queryKey: ["months"], queryFn: () => api.months() });
  const compare = useQuery({
    queryKey: ["compare", base, month],
    queryFn: () => api.compare(base, month),
  });

  const options = months.data?.months ?? [base, month];
  const currency = "USD";

  const totalA = toNumber(compare.data?.total_a);
  const totalB = toNumber(compare.data?.total_b);
  const diff = totalB - totalA;
  const diffPct = totalA > 0 ? diff / totalA : null;

  const categories = (compare.data?.categories ?? []).slice(0, VISIBLE_CATEGORIES);
  const max = Math.max(
    ...categories.map((item) => Math.max(toNumber(item.amount_a), toNumber(item.amount_b))),
    1,
  );

  return (
    <Screen title="Аналитика" back="/">
      <AnalyticsTabs month={month} />

      <div className="rule flex">
        <MonthPicker label="База" value={base} options={options} onChange={setBase} />
        <MonthPicker
          label="Сравнить с"
          value={month}
          options={options}
          onChange={setMonth}
          last
        />
      </div>

      {compare.isPending ? <Loading /> : null}
      {compare.isError ? (
        <ErrorState error={compare.error} onRetry={() => compare.refetch()} />
      ) : null}

      {compare.data ? (
        <>
          <section className="rule px-4 py-4">
            <div className="eyebrow mb-2" style={{ color: "var(--color-accent)" }}>
              Всего трат
            </div>
            <div className="flex items-baseline gap-2">
              <span className="num text-[20px]" style={{ color: "var(--color-neutral-700)" }}>
                {formatMoney(totalA, { currency })}
              </span>
              <span style={{ color: "var(--color-neutral-600)" }}>→</span>
              <span
                className="heading num"
                style={{ fontSize: 30, letterSpacing: "-0.03em" }}
              >
                {formatMoney(totalB, { currency })}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-3 text-[12px]">
              <span
                className="num font-extrabold"
                style={{ color: diff > 0 ? "var(--color-accent)" : "var(--color-neutral-600)" }}
              >
                {diff >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(diff), { currency })}
              </span>
              {diffPct !== null ? (
                <span className="num" style={{ color: "var(--color-neutral-700)" }}>
                  {formatPercent(diffPct, { sign: true })}
                </span>
              ) : null}
            </div>
            <div className="mt-3 text-[11.5px]" style={{ color: "var(--color-neutral-700)" }}>
              {formatMonthTitle(compare.data.month_a)} · сальдо{" "}
              {formatMoney(compare.data.saldo_a, { currency, sign: "always" })}
              <br />
              {formatMonthTitle(compare.data.month_b)} · сальдо{" "}
              {formatMoney(compare.data.saldo_b, { currency, sign: "always" })}
            </div>
          </section>

          <section className="px-4 pt-3">
            <div className="heading mb-1 text-[12px] tracking-[0.08em] uppercase">
              По категориям
            </div>
            {categories.map((item) => (
              <CompareRow
                key={item.category}
                label={categoryLabel(item.category)}
                amountA={item.amount_a}
                amountB={item.amount_b}
                max={max}
                currency={currency}
              />
            ))}
          </section>
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

function MonthPicker({
  label,
  value,
  options,
  onChange,
  last,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (month: string) => void;
  last?: boolean;
}) {
  return (
    <label
      className="flex-1 px-4 py-3"
      style={{ borderRight: last ? undefined : "1px solid var(--color-divider)" }}
    >
      <span className="eyebrow block mb-1" style={{ color: "var(--color-neutral-700)" }}>
        {label}
      </span>
      <select
        className="heading w-full bg-transparent text-[15px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {formatMonthTitle(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
