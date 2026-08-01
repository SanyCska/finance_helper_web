"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";
import { MonthlyBars } from "@/components/Charts";
import { Screen } from "@/components/Chrome";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { api } from "@/lib/api";
import {
  categoryLabel,
  formatMonthTitle,
  formatMoney,
  formatPercent,
  toNumber,
} from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

const WINDOW_MONTHS = 6;

export function CategoryScreen() {
  const params = useParams<{ name?: string }>();
  const router = useRouter();
  const [month, setMonth] = useMonth();

  const selected = params.name ? decodeURIComponent(params.name) : null;

  const summary = useQuery({
    queryKey: ["month", month],
    queryFn: () => api.monthSummary(month),
  });

  const dynamics = useQuery({
    queryKey: ["dynamics", selected, month],
    queryFn: () => api.categoryDynamics(selected as string, WINDOW_MONTHS, month),
    enabled: Boolean(selected),
  });

  const currency = summary.data?.base_currency ?? "USD";
  const topCategories = (summary.data?.categories ?? []).slice(0, 6);

  const chips = (
    <div className="rule scroll-x flex gap-2 px-4 py-3">
      {topCategories.map((item) => (
        <button
          key={item.category}
          className={
            item.category === selected ? "tag tag-outline shrink-0" : "tag tag-neutral shrink-0"
          }
          onClick={() => {
            haptic();
            router.push(`/category/${encodeURIComponent(item.category)}?month=${month}`);
          }}
        >
          {categoryLabel(item.category)}
        </button>
      ))}
    </div>
  );

  // вкладку открыли без категории — оставляем выбор за пользователем
  if (!selected) {
    return (
      <Screen title="Аналитика" back="/">
        <AnalyticsTabs month={month} />
        {topCategories.length ? chips : null}
        {summary.isPending ? <Loading /> : null}
        {summary.data ? (
          <EmptyState
            title="Выбери категорию"
            hint="Покажу, как траты по ней менялись по месяцам."
          />
        ) : null}
      </Screen>
    );
  }

  const points = dynamics.data?.points ?? [];
  const current = points.at(-1);
  const currentAmount = toNumber(current?.amount);
  const maxAmount = Math.max(...points.map((point) => toNumber(point.amount)), 0);
  const share =
    toNumber(summary.data?.outcome_total) > 0
      ? currentAmount / toNumber(summary.data?.outcome_total)
      : null;

  return (
    <Screen title="Аналитика" back={`/categories?month=${month}`}>
      <AnalyticsTabs month={month} />

      {chips}

      {dynamics.isPending ? <Loading /> : null}
      {dynamics.isError ? (
        <ErrorState error={dynamics.error} onRetry={() => dynamics.refetch()} />
      ) : null}

      {dynamics.data ? (
        <>
          <section className="rule px-4 py-4">
            <div className="flex items-baseline gap-3">
              <span
                className="heading num"
                style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.03em" }}
              >
                {formatMoney(currentAmount, { currency })}
              </span>
              {dynamics.data.delta_pct !== null ? (
                <span
                  className="num text-[13px] font-extrabold"
                  style={{
                    color:
                      toNumber(dynamics.data.delta_pct) >= 0
                        ? "var(--color-accent)"
                        : "var(--color-neutral-600)",
                  }}
                >
                  {toNumber(dynamics.data.delta_pct) >= 0 ? "↗ " : "↘ "}
                  {formatPercent(dynamics.data.delta_pct, { sign: true })}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
              {categoryLabel(selected)} · {formatMonthTitle(month)} · {current?.tx_count ?? 0}{" "}
              {current?.tx_count === 1 ? "операция" : "операций"}
            </div>
          </section>

          <section className="rule px-4 py-4">
            <div
              className="mb-2 text-[11px]"
              style={{ color: "var(--color-neutral-600)" }}
            >
              среднее {formatMoney(dynamics.data.average, { currency })}
            </div>
            <MonthlyBars
              points={points}
              currency={currency}
              average={dynamics.data.average}
              selected={month}
              onSelect={(next) => setMonth(next)}
            />
          </section>

          <section className="rule flex">
            <Stat label="Среднее" value={formatMoney(dynamics.data.average, { currency })} />
            <Stat label="Максимум" value={formatMoney(maxAmount, { currency })} />
            <Stat
              label="Доля"
              value={share === null ? "—" : formatPercent(share)}
              last
            />
          </section>

          <section className="px-4 py-4">
            <div className="text-[12px] leading-[1.5]" style={{ color: "var(--color-neutral-700)" }}>
              За {points.length} {points.length === 1 ? "месяц" : "месяцев"} потрачено{" "}
              {formatMoney(dynamics.data.total, { currency })}.
            </div>
          </section>
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="flex-1 px-4 py-3"
      style={{ borderRight: last ? undefined : "1px solid var(--color-divider)" }}
    >
      <div className="eyebrow mb-1" style={{ color: "var(--color-neutral-700)" }}>
        {label}
      </div>
      <div className="heading num text-[16px]">{value}</div>
    </div>
  );
}
