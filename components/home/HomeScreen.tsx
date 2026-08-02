"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { BarRow, Donut } from "@/components/Charts";
import { Screen } from "@/components/Chrome";
import { MonthTabs } from "@/components/MonthTabs";
import { EmptyMonth, ErrorState, FxBanner, Loading } from "@/components/States";
import { api, type MonthSummary } from "@/lib/api";
import { buildColorMap, colorFor } from "@/lib/colorMap";
import {
  categoryLabel,
  formatDayTitle,
  formatMoney,
  formatPercent,
  toNumber,
} from "@/lib/format";
import { useMonth } from "@/lib/useMonth";

const TOP_CATEGORIES = 3;

export function HomeScreen() {
  const [month, setMonth] = useMonth();
  const summary = useQuery({
    queryKey: ["month", month],
    queryFn: () => api.monthSummary(month),
  });

  return (
    <Screen
      title="Бюджет"
      footer={
        <div className="px-4 pb-2">
          <Link href={`/add?month=${month}`} className="btn btn-primary w-full min-h-[46px] text-[15px]">
            +&nbsp;&nbsp;Добавить трату
          </Link>
        </div>
      }
    >
      <MonthTabs month={month} onChange={setMonth} />

      {summary.isPending ? <Loading /> : null}
      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : null}

      {summary.data ? <HomeBody data={summary.data} month={month} /> : null}
    </Screen>
  );
}

function HomeBody({ data, month }: { data: MonthSummary; month: string }) {
  const currency = data.base_currency;
  const outcome = toNumber(data.outcome_total);
  const income = toNumber(data.income_total);
  const saldo = toNumber(data.saldo);
  const isEmpty = data.tx_count === 0 && data.pending_count === 0;

  const colors = buildColorMap(data.categories);
  const top = data.categories.slice(0, TOP_CATEGORIES);
  const maxAmount = top.length ? toNumber(top[0].amount) : 1;
  // без заданной зарплаты доля «сколько осталось» смысла не имеет
  const hasIncome = toNumber(data.income_manual) > 0;

  return (
    <>
      <FxBanner count={data.pending_count} />

      <section className="rule px-4 py-4">
        <div className="eyebrow mb-2" style={{ color: "var(--color-accent)" }}>
          Сальдо с зарплаты
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="heading num mb-2"
              style={{ fontSize: 50, lineHeight: 0.92, letterSpacing: "-0.04em" }}
            >
              {formatMoney(saldo, { currency, sign: "always" })}
            </div>
            {hasIncome ? (
              <div
                className="text-[12px] leading-[1.5]"
                style={{ color: "var(--color-neutral-700)" }}
              >
                из {formatMoney(income, { currency })} дохода
                <br />
                осталось {formatPercent(saldo / income, { decimals: 1 })}
              </div>
            ) : (
              <div
                className="text-[12px] leading-[1.5]"
                style={{ color: "var(--color-neutral-700)" }}
              >
                доход месяца не задан
                <br />
                <Link
                  href={`/plan?month=${month}`}
                  className="font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Указать доход →
                </Link>
              </div>
            )}
          </div>
          <Donut
            items={data.categories.map((item) => ({
              key: item.category,
              value: toNumber(item.amount),
              color: colorFor(colors, item.category),
            }))}
            caption="Траты"
            value={formatMoney(outcome, { currency })}
          />
        </div>
      </section>

      {isEmpty ? <EmptyMonth /> : null}

      {top.length ? (
        <section className="px-4 pt-3 pb-2">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="heading text-[12px] tracking-[0.08em] uppercase">Топ категорий</span>
            <Link
              href={`/categories?month=${month}`}
              className="text-[11.5px] font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Все {data.categories.length} →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {top.map((item) => (
              <BarRow
                key={item.category}
                label={categoryLabel(item.category)}
                amount={item.amount}
                currency={currency}
                color={colorFor(colors, item.category)}
                widthPct={(toNumber(item.amount) / maxAmount) * 100}
                delta={item.delta_pct}
              />
            ))}
          </div>
        </section>
      ) : null}

      {data.recent.length ? (
        <section className="mt-3 px-4 pt-3" style={{ borderTop: "2px solid var(--color-divider)" }}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="heading text-[12px] tracking-[0.08em] uppercase">Последние траты</span>
            <Link
              href={`/transactions?month=${month}`}
              className="text-[11.5px] font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Все →
            </Link>
          </div>
          {data.recent.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 py-3 ${
                index < data.recent.length - 1 ? "rule-thin" : ""
              }`}
            >
              <span
                className="size-[9px] shrink-0"
                style={{ background: colorFor(colors, item.category_name) }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">
                  {categoryLabel(item.category_name)}
                </div>
                <div className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
                  {formatDayTitle(item.date)} ·{" "}
                  {item.comment?.trim() || item.account_name.trim()}
                </div>
              </div>
              <div className="num text-[13px] font-semibold">
                {item.amount_base === null
                  ? "—"
                  : formatMoney(-toNumber(item.amount_base), { currency, decimals: 2 })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <div className="h-4" />
    </>
  );
}
