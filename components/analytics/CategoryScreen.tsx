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
  pluralize,
  toNumber,
} from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { useMonthWindow } from "@/lib/useMonth";

const WINDOW_MONTHS = 6;

export function CategoryScreen() {
  const params = useParams<{ name?: string }>();
  const router = useRouter();
  const { month, anchor, selectMonth, shiftWindow, canGoForward } =
    useMonthWindow(WINDOW_MONTHS);

  const selected = params.name ? decodeURIComponent(params.name) : null;

  const summary = useQuery({
    queryKey: ["month", month],
    queryFn: () => api.monthSummary(month),
  });

  // список категорий берём за всё время, а не за выбранный месяц:
  // иначе в едва начавшемся месяце переключаться было бы не на что
  const categories = useQuery({
    queryKey: ["categoryList", "all"],
    queryFn: () => api.categoryList(),
  });

  // список исключённых категорий приходит с сервера — он же источник правды для агрегатов
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api.settings() });

  const dynamics = useQuery({
    queryKey: ["dynamics", selected, anchor],
    queryFn: () => api.categoryDynamics(selected as string, WINDOW_MONTHS, anchor),
    enabled: Boolean(selected),
  });

  const currency = summary.data?.base_currency ?? "USD";

  const excluded = new Set(
    (settings.data?.excluded_categories ?? []).map((name) => name.trim().toLowerCase()),
  );
  const names = (categories.data ?? [])
    .map((item) => item.name)
    // категории вне подсчётов показывать нечем: график по ним всегда нулевой
    .filter((name) => !excluded.has(name.trim().toLowerCase()));
  // выбранная категория обязана быть в списке, даже если трат по ней давно не было
  const allNames = selected !== null && !names.includes(selected) ? [selected, ...names] : names;
  // категорий за годы накопилось два десятка, поэтому список, а не полоса чипсов
  const options = [...allNames].sort((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b), "ru"),
  );

  const goTo = (name: string) => {
    haptic();
    router.push(`/category/${encodeURIComponent(name)}?month=${month}&until=${anchor}`);
  };

  const picker = (
    <label className="rule block px-4 py-3">
      <span className="eyebrow mb-1 block" style={{ color: "var(--color-neutral-700)" }}>
        Категория
      </span>
      <select
        className="heading w-full bg-transparent text-[16px]"
        value={selected ?? ""}
        onChange={(event) => goTo(event.target.value)}
      >
        {selected === null ? <option value="">Выбери категорию</option> : null}
        {options.map((name) => (
          <option key={name} value={name}>
            {categoryLabel(name)}
          </option>
        ))}
      </select>
    </label>
  );

  if (!selected) {
    return (
      <Screen title="Аналитика" back="/">
        <AnalyticsTabs month={month} />
        {options.length ? picker : null}
        {categories.isPending ? <Loading /> : null}
        {categories.data ? (
          <EmptyState
            title="Выбери категорию"
            hint="Покажу, как траты по ней менялись по месяцам."
          />
        ) : null}
      </Screen>
    );
  }

  const points = dynamics.data?.points ?? [];
  const index = points.findIndex((point) => point.month === month);
  const current = index >= 0 ? points[index] : points.at(-1);
  const currentAmount = toNumber(current?.amount);
  // дельту считаем от выбранного столбца, а не от конца окна:
  // с бэка она приходит только для последнего месяца
  const previousAmount = index > 0 ? toNumber(points[index - 1].amount) : null;
  const delta =
    previousAmount !== null && previousAmount > 0
      ? (currentAmount - previousAmount) / previousAmount
      : null;
  const maxAmount = Math.max(...points.map((point) => toNumber(point.amount)), 0);
  const share =
    toNumber(summary.data?.outcome_total) > 0
      ? currentAmount / toNumber(summary.data?.outcome_total)
      : null;

  return (
    <Screen title="Аналитика" back={`/categories?month=${month}`}>
      <AnalyticsTabs month={month} />

      {picker}

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
              {delta !== null ? (
                <span
                  className="num text-[13px] font-extrabold"
                  style={{
                    color:
                      delta >= 0 ? "var(--color-accent)" : "var(--color-neutral-600)",
                  }}
                >
                  {delta >= 0 ? "↗ " : "↘ "}
                  {formatPercent(delta, { sign: true })}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
              {categoryLabel(selected)} · {formatMonthTitle(month)} ·{" "}
              {pluralize(current?.tx_count ?? 0, "операция", "операции", "операций")}
            </div>
          </section>

          <section className="rule px-4 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
                среднее {formatMoney(dynamics.data.average, { currency })}
              </span>
              <span className="flex items-center gap-3">
                <button
                  aria-label="Более ранние месяцы"
                  className="px-1 text-[15px]"
                  style={{ color: "var(--color-accent)" }}
                  onClick={() => {
                    haptic();
                    shiftWindow(-WINDOW_MONTHS);
                  }}
                >
                  ‹
                </button>
                <button
                  aria-label="Более поздние месяцы"
                  className="px-1 text-[15px]"
                  style={{
                    color: canGoForward ? "var(--color-accent)" : "var(--color-neutral-400)",
                  }}
                  disabled={!canGoForward}
                  onClick={() => {
                    haptic();
                    shiftWindow(WINDOW_MONTHS);
                  }}
                >
                  ›
                </button>
              </span>
            </div>
            <MonthlyBars
              points={points}
              currency={currency}
              average={dynamics.data.average}
              selected={month}
              onSelect={(next) => {
                haptic();
                selectMonth(next);
              }}
            />
          </section>

          <section className="rule flex">
            <Stat label="Среднее" value={formatMoney(dynamics.data.average, { currency })} />
            <Stat label="Максимум" value={formatMoney(maxAmount, { currency })} />
            <Stat label="Доля" value={share === null ? "—" : formatPercent(share)} last />
          </section>

          <section className="px-4 py-4">
            <div className="text-[12px] leading-[1.5]" style={{ color: "var(--color-neutral-700)" }}>
              За {pluralize(points.length, "месяц", "месяца", "месяцев")} потрачено{" "}
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
