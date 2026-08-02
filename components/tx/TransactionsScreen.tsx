"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Screen } from "@/components/Chrome";
import { MonthStepper } from "@/components/MonthTabs";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { groupByDay, TransactionRows } from "@/components/tx/TransactionList";
import { TransactionSheet } from "@/components/tx/TransactionSheet";
import { api, type Transaction } from "@/lib/api";
import { buildColorMap } from "@/lib/colorMap";
import { categoryLabel, formatMoney, toNumber } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

const PAGE_SIZE = 300;

export function TransactionsScreen() {
  const [month, setMonth] = useMonth();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openedTx, setOpenedTx] = useState<Transaction | null>(null);

  const transactions = useQuery({
    queryKey: ["transactions", month, selected, query],
    queryFn: () =>
      api.transactions({
        month,
        categories: selected.length ? selected : undefined,
        q: query || undefined,
        limit: PAGE_SIZE,
      }),
  });

  const summary = useQuery({
    queryKey: ["month", month],
    queryFn: () => api.monthSummary(month),
  });

  const currency = summary.data?.base_currency ?? "USD";
  const colors = useMemo(
    () => buildColorMap(summary.data?.categories ?? []),
    [summary.data],
  );

  const groups = useMemo(
    () => groupByDay(transactions.data?.items ?? []),
    [transactions.data],
  );

  const shown = transactions.data?.items ?? [];
  const shownTotal = shown
    .filter((item) => item.direction === "outcome")
    .reduce((sum, item) => sum + toNumber(item.amount_base), 0);

  return (
    <Screen title="Транзакции" back="/">
      <MonthStepper
        month={month}
        onChange={setMonth}
        right={
          <button
            className={filtersOpen || selected.length ? "tag tag-outline" : "tag tag-neutral"}
            onClick={() => {
              haptic();
              setFiltersOpen((open) => !open);
            }}
          >
            Фильтры{selected.length ? ` · ${selected.length}` : ""}
          </button>
        }
      />

      {filtersOpen ? (
        <Filters
          month={month}
          selected={selected}
          onToggle={(name) =>
            setSelected((current) =>
              current.includes(name)
                ? current.filter((item) => item !== name)
                : [...current, name],
            )
          }
          onReset={() => setSelected([])}
          query={query}
          onQuery={setQuery}
        />
      ) : null}

      <div
        className="rule flex items-baseline justify-between px-4 py-2"
        style={{ background: "var(--color-surface)" }}
      >
        <span className="text-[11.5px]" style={{ color: "var(--color-neutral-700)" }}>
          {transactions.data ? `Показано ${shown.length} из ${transactions.data.total}` : "…"}
        </span>
        <span className="num text-[12px] font-semibold">
          {formatMoney(shownTotal, { currency })}
        </span>
      </div>

      {transactions.isPending ? <Loading /> : null}
      {transactions.isError ? (
        <ErrorState error={transactions.error} onRetry={() => transactions.refetch()} />
      ) : null}
      {transactions.data && groups.length === 0 ? (
        <EmptyState
          title="Ничего не нашлось"
          hint="Попробуй снять фильтры или выбрать другой месяц."
        />
      ) : null}

      <TransactionRows
        groups={groups}
        colors={colors}
        currency={currency}
        onSelect={(item) => {
          haptic();
          setOpenedTx(item);
        }}
      />
      <div className="h-6" />

      {openedTx ? (
        <TransactionSheet item={openedTx} onClose={() => setOpenedTx(null)} />
      ) : null}
    </Screen>
  );
}

function Filters({
  month,
  selected,
  onToggle,
  onReset,
  query,
  onQuery,
}: {
  month: string;
  selected: string[];
  onToggle: (name: string) => void;
  onReset: () => void;
  query: string;
  onQuery: (value: string) => void;
}) {
  const categories = useQuery({
    queryKey: ["categoryList", month],
    queryFn: () => api.categoryList(month),
  });

  return (
    <div className="rule px-4 py-3" style={{ background: "var(--color-surface)" }}>
      <input
        className="input mb-3"
        placeholder="Поиск по комментарию, счёту, категории"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {(categories.data ?? []).map((item) => {
          const isActive = selected.includes(item.name);
          return (
            <button
              key={item.name}
              className={isActive ? "tag tag-outline" : "tag tag-neutral"}
              onClick={() => {
                haptic();
                onToggle(item.name);
              }}
            >
              {categoryLabel(item.name)} · {item.tx_count}
            </button>
          );
        })}
      </div>
      {selected.length ? (
        <button
          className="mt-3 text-[12px] font-semibold"
          style={{ color: "var(--color-accent)" }}
          onClick={onReset}
        >
          Сбросить фильтры
        </button>
      ) : null}
    </div>
  );
}
