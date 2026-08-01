"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { Screen } from "@/components/Chrome";
import { MonthStepper } from "@/components/MonthTabs";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { api } from "@/lib/api";
import { buildColorMap, colorFor } from "@/lib/colorMap";
import { categoryLabel, formatMoney, formatPercent, toNumber } from "@/lib/format";
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
            <div className="heading mb-2 text-[12px] tracking-[0.08em] uppercase">
              Что планировал
            </div>
            {data.data.lines.map((line) => (
              <div key={line.id} className="rule-thin flex items-baseline justify-between py-2">
                <span className="truncate text-[13px]">{line.title || "Без названия"}</span>
                <span className="num text-[13px] font-semibold">{formatMoney(line.amount)}</span>
              </div>
            ))}
          </section>

          <section className="px-4 pt-4">
            <div className="heading mb-2 text-[12px] tracking-[0.08em] uppercase">
              Куда ушло по факту
            </div>
            {data.data.categories.slice(0, FACT_CATEGORIES).map((item) => (
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

          <Verdict diff={diff} planTotal={planTotal} />
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
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
