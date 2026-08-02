"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { Screen } from "@/components/Chrome";
import { MonthStepper } from "@/components/MonthTabs";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { api, type PlanLineFact } from "@/lib/api";
import { buildColorMap, colorFor } from "@/lib/colorMap";
import {
  categoryLabel,
  formatMoney,
  formatOriginal,
  formatPercent,
  toNumber,
} from "@/lib/format";
import { useMonth } from "@/lib/useMonth";

const FACT_CATEGORIES = 6;

export function PlanVsFactScreen() {
  const [month, setMonth] = useMonth();

  const data = useQuery({
    queryKey: ["planVsFact", month],
    queryFn: () => api.planVsFact(month),
  });

  const colors = useMemo(() => buildColorMap(data.data?.categories ?? []), [data.data]);

  const planTotal = toNumber(data.data?.plan_total);
  const factTotal = toNumber(data.data?.fact_total);
  const diff = factTotal - planTotal;

  return (
    <Screen title="План vs факт" back="/">
      <PlanTabs month={month} />
      <MonthStepper month={month} onChange={setMonth} />

      {data.isPending ? <Loading /> : null}
      {data.isError ? <ErrorState error={data.error} onRetry={() => data.refetch()} /> : null}

      {data.data && !data.data.has_plan ? (
        <EmptyState
          title="На этот месяц плана нет"
          hint="Распиши строки плана — потом покажу, насколько факт от него отклонился."
          action={
            <Link href={`/plan?month=${month}`} className="btn btn-primary">
              Составить план
            </Link>
          }
        />
      ) : null}

      {data.data && data.data.has_plan ? (
        <>
          <section className="rule flex items-center gap-4 px-4 py-4">
            <div>
              <div
                className="heading num"
                style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.03em" }}
              >
                {data.data.fact_share_of_plan === null
                  ? "—"
                  : formatPercent(data.data.fact_share_of_plan)}
              </div>
              <div className="text-[11.5px]" style={{ color: "var(--color-neutral-700)" }}>
                от плана
              </div>
            </div>
            <div className="flex-1 text-right text-[12px] leading-[1.6]">
              <Row label="План" value={formatMoney(planTotal)} />
              <Row label="Факт" value={formatMoney(factTotal)} />
              <Row
                label="Разница"
                value={`${diff >= 0 ? "+" : "−"}${formatMoney(Math.abs(diff))}`}
                accent={diff > 0}
              />
            </div>
          </section>

          <section className="rule flex">
            <Stat label="Сальдо план" value={formatMoney(data.data.plan_saldo, { sign: "always" })} />
            <Stat label="Сальдо факт" value={formatMoney(data.data.fact_saldo, { sign: "always" })} />
            <Stat
              label="Точность"
              value={data.data.accuracy === null ? "—" : formatPercent(data.data.accuracy)}
              last
            />
          </section>

          <section className="px-4 pt-4">
            <div className="heading mb-1 text-[12px] tracking-[0.08em] uppercase">
              Строки плана против факта
            </div>
            <div className="mb-2 flex gap-2 text-[10px]" style={{ color: "var(--color-neutral-600)" }}>
              <span className="flex-1">название</span>
              <span className="w-16 text-right">план</span>
              <span className="w-16 text-right">факт</span>
            </div>
            {data.data.lines.map((line) => (
              <LineRow key={line.id} line={line} />
            ))}
            {data.data.lines.every((line) => line.category_name === null) ? (
              <p
                className="py-2 text-[11.5px] leading-[1.5]"
                style={{ color: "var(--color-neutral-600)" }}
              >
                Ни одна строка не связана с категорией — сравнить с фактом нечем. Категорию
                можно выбрать под названием строки на вкладке «Планирую».
              </p>
            ) : null}
          </section>

          {data.data.unplanned.length ? (
            <section className="px-4 pt-4">
              <div className="heading mb-2 text-[12px] tracking-[0.08em] uppercase">
                Мимо плана
              </div>
              {data.data.unplanned.slice(0, FACT_CATEGORIES).map((item) => (
                <div key={item.category} className="rule-thin flex items-center gap-3 py-2">
                  <span
                    className="size-[9px] shrink-0"
                    style={{ background: colorFor(colors, item.category) }}
                  />
                  <span className="flex-1 truncate text-[13px]">
                    {categoryLabel(item.category)}
                  </span>
                  <span className="num text-[13px] font-semibold">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              ))}
            </section>
          ) : null}

          <Verdict diff={diff} planTotal={planTotal} />
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

/** Строка плана рядом с фактом по связанной категории. */
function LineRow({ line }: { line: PlanLineFact }) {
  const fact = line.fact === null ? null : toNumber(line.fact);
  const planned = toNumber(line.amount_base);
  const over = fact !== null && fact > planned;

  return (
    <div className="rule-thin py-2">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {line.title || "Без названия"}
        </span>
        <span className="num w-16 text-right text-[13px] font-semibold">
          {formatMoney(planned)}
        </span>
        <span
          className="num w-16 text-right text-[13px] font-semibold"
          style={{
            color:
              fact === null
                ? "var(--color-neutral-500)"
                : over
                  ? "var(--color-accent)"
                  : "var(--color-text)",
          }}
        >
          {fact === null ? "—" : formatMoney(fact)}
        </span>
      </div>
      <div className="mt-[2px] flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
          {line.category_name === null
            ? "категория не выбрана"
            : categoryLabel(line.category_name)}
          {line.currency === "USD"
            ? ""
            : ` · ${formatOriginal(line.amount, line.currency)}`}
        </span>
        {/* расхождение меньше доллара после округления показалось бы как «−$0» */}
        {line.diff === null || Math.abs(toNumber(line.diff)) < 0.5 ? null : (
          <span
            className="num text-[11px] font-extrabold"
            style={{ color: over ? "var(--color-accent)" : "var(--color-neutral-600)" }}
          >
            {toNumber(line.diff) >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(toNumber(line.diff)))}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <span style={{ color: "var(--color-neutral-700)" }}>{label} </span>
      <span
        className="num font-semibold"
        style={{ color: accent ? "var(--color-accent)" : "var(--color-text)" }}
      >
        {value}
      </span>
    </div>
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
      <div className="heading num text-[15px]">{value}</div>
    </div>
  );
}

function Verdict({ diff, planTotal }: { diff: number; planTotal: number }) {
  if (planTotal <= 0) return null;
  const share = Math.abs(diff) / planTotal;

  const text =
    share < 0.05
      ? "Факт сошёлся с планом почти точно."
      : diff > 0
        ? `Потрачено на ${formatMoney(diff)} больше плана — это ${formatPercent(share)} перерасхода.`
        : `Потрачено на ${formatMoney(-diff)} меньше плана.`;

  return (
    <div className="mt-3 px-4 py-3" style={{ background: "var(--color-accent-100)" }}>
      <div className="text-[12px] leading-[1.5]" style={{ color: "var(--color-accent-800)" }}>
        {text}
      </div>
    </div>
  );
}
