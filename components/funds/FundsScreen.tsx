"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { MonthlyBars } from "@/components/Charts";
import { Screen } from "@/components/Chrome";
import { CURRENCIES } from "@/components/tx/AddScreen";
import { FundSourceSheet } from "@/components/funds/FundSourceSheet";
import { FundsTabs } from "@/components/funds/FundsTabs";
import { EmptyState, ErrorState, FxBanner, Loading } from "@/components/States";
import { api, type BalancePoint, type FundSource } from "@/lib/api";
import {
  formatDateFull,
  formatMoney,
  formatMonthName,
  formatMonthTitle,
  formatOriginal,
  monthFromDate,
  parseAmount,
  pluralize,
  suggestedBalanceDate,
  toIsoDate,
  toNumber,
} from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

const HISTORY_MONTHS = 12;

export function FundsScreen() {
  const [month] = useMonth();
  const [adding, setAdding] = useState(false);
  const [openSource, setOpenSource] = useState<number | null>(null);

  const funds = useQuery({
    queryKey: ["funds", HISTORY_MONTHS],
    queryFn: () => api.funds(HISTORY_MONTHS),
  });

  const currency = funds.data?.base_currency ?? "USD";
  const total = toNumber(funds.data?.total_base);
  // месяцы до первого снимка — не нули, а отсутствие данных: их не рисуем
  const history = trimLeadingEmpty(funds.data?.history ?? []);
  const hasHistory = history.length > 1;
  const opened = funds.data?.sources.find((item) => item.id === openSource) ?? null;

  return (
    <Screen title="Средства">
      <FundsTabs month={month} />

      {funds.isPending ? <Loading /> : null}
      {funds.isError ? <ErrorState error={funds.error} onRetry={() => funds.refetch()} /> : null}

      {funds.data ? (
        <>
          {funds.data.pending_check ? (
            <Link
              href={`/funds/check?month=${funds.data.pending_check}`}
              className="rule flex items-center gap-3 px-4 py-3"
              style={{ background: "var(--color-accent-100)" }}
            >
              <span
                className="flex-1 text-[11.5px] leading-[1.5]"
                style={{ color: "var(--color-accent-800)" }}
              >
                {formatMonthTitle(funds.data.pending_check)} закрыт. Обнови суммы по счетам
                и сверь — покажу расхождение с учётом.
              </span>
              <span className="text-[16px]" style={{ color: "var(--color-accent-800)" }}>
                ›
              </span>
            </Link>
          ) : null}

          <FxBanner
            count={funds.data.pending_fx}
            subject={(count) =>
              `Для ${pluralize(count, "источника", "источников", "источников")} ` +
              "не нашлись курсы валют — они не попадают в итог."
            }
          />

          <section className="rule px-4 py-4">
            <div className="eyebrow mb-2" style={{ color: "var(--color-accent)" }}>
              Всего на счетах
            </div>
            <div
              className="heading num"
              style={{ fontSize: 46, lineHeight: 0.94, letterSpacing: "-0.04em" }}
            >
              {formatMoney(total, { currency })}
            </div>
            {funds.data.sources.length ? (
              <div className="mt-1 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
                {pluralize(funds.data.sources.length, "источник", "источника", "источников")}
              </div>
            ) : null}
          </section>

          {hasHistory ? (
            <section className="rule px-4 py-4">
              <div className="heading mb-3 text-[12px] tracking-[0.08em] uppercase">
                Как менялся баланс
              </div>
              <MonthlyBars points={history} currency={currency} selected={month} baseline="min" />
            </section>
          ) : null}

          <section className="px-4 pt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="heading text-[12px] tracking-[0.08em] uppercase">Источники</span>
              <button
                className="text-[11.5px] font-semibold"
                style={{ color: "var(--color-accent)" }}
                onClick={() => {
                  haptic();
                  setAdding((value) => !value);
                }}
              >
                {adding ? "Отмена" : "+ Добавить"}
              </button>
            </div>

            {adding ? <AddSource onDone={() => setAdding(false)} /> : null}

            {funds.data.sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                baseCurrency={currency}
                onOpen={() => setOpenSource(source.id)}
              />
            ))}
          </section>

          {!funds.data.sources.length && !adding ? (
            <EmptyState
              title="Пока не заведено ни одного источника"
              hint="Добавь счета, карты и наличные — покажу общий итог в долларах и его динамику."
              action={
                <button className="btn btn-primary" onClick={() => setAdding(true)}>
                  Добавить источник
                </button>
              }
            />
          ) : null}
        </>
      ) : null}
      <div className="h-6" />

      {opened ? (
        <FundSourceSheet
          source={opened}
          baseCurrency={currency}
          onClose={() => setOpenSource(null)}
        />
      ) : null}
    </Screen>
  );
}

function trimLeadingEmpty(points: BalancePoint[]): BalancePoint[] {
  const first = points.findIndex((point) => toNumber(point.amount) > 0);
  return first < 0 ? [] : points.slice(first);
}

function AddSource({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");

  // пустое поле — источник заводится без суммы; набранный мусор сохранять нельзя,
  // иначе он молча превратится в ноль
  const parsedAmount = parseAmount(amount);
  const amountBroken = amount.trim() !== "" && Number.isNaN(parsedAmount);

  const create = useMutation({
    mutationFn: () =>
      api.createFundSource({
        title: title.trim(),
        currency,
        amount: String(Number.isNaN(parsedAmount) ? 0 : parsedAmount),
      }),
    onSuccess: () => {
      notify("success");
      queryClient.invalidateQueries({ queryKey: ["funds"] });
      onDone();
    },
    onError: () => notify("error"),
  });

  return (
    <div className="rule-thin flex flex-col gap-3 py-3">
      <input
        className="input"
        placeholder="Название: Сербия, наличные, брокер"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <input
          className="input num"
          inputMode="decimal"
          placeholder="Сумма сейчас"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <select
          className="input"
          style={{ width: 100 }}
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          aria-label="Валюта источника"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      {amountBroken ? (
        <div className="text-[12px]" style={{ color: "var(--color-accent-700)" }}>
          Не разобрал сумму. Можно с пробелами и запятой: 250 000 или 1 250,50.
        </div>
      ) : null}
      <button
        className="btn btn-primary w-full"
        disabled={!title.trim() || amountBroken || create.isPending}
        onClick={() => {
          haptic("medium");
          create.mutate();
        }}
      >
        {create.isPending ? "Сохраняю…" : "Добавить"}
      </button>
    </div>
  );
}

function SourceRow({
  source,
  baseCurrency,
  onOpen,
}: {
  source: FundSource;
  baseCurrency: string;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(toNumber(source.amount_original) || ""));
  // в первых числах введённая сумма — это остаток на конец прошлого месяца
  const suggested = suggestedBalanceDate();
  const now = toIsoDate(new Date());
  const [date, setDate] = useState(suggested);

  const save = useMutation({
    mutationFn: () =>
      api.setBalance(source.id, { amount: String(parseAmount(value)), date }),
    onSuccess: () => {
      notify("success");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["funds"] });
      queryClient.invalidateQueries({ queryKey: ["check"] });
    },
    onError: () => notify("error"),
  });

  const isBase = source.currency === baseCurrency;

  return (
    <div className="rule-thin py-3">
      <div className="flex items-center gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => { haptic(); onOpen(); }}>
          <div className="truncate text-[14px] font-semibold">{source.title}</div>
          <div className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
            {source.updated_on
              ? `обновлено ${formatDateFull(source.updated_on)} · правка и история →`
              : "сумма ещё не введена · правка и история →"}
          </div>
        </button>
        {editing ? (
          <div className="flex shrink-0 items-center gap-2">
            <input
              className="num w-24 bg-transparent text-right text-[15px] font-semibold outline-none"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
            <span className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
              {source.currency}
            </span>
            <button
              className="btn btn-primary shrink-0 text-[12px]"
              disabled={save.isPending}
              onClick={() => {
                haptic("medium");
                save.mutate();
              }}
            >
              ОК
            </button>
          </div>
        ) : (
          <button
            className="shrink-0 text-right"
            onClick={() => {
              haptic();
              setEditing(true);
            }}
          >
            {source.amount_base === null ? (
              <>
                <div className="num text-[13px] font-semibold">
                  {formatOriginal(source.amount_original, source.currency)}
                </div>
                <div className="text-[11px]" style={{ color: "var(--color-accent-700)" }}>
                  курс не найден
                </div>
              </>
            ) : (
              <>
                <div className="heading num text-[16px]">
                  {formatMoney(source.amount_base, { currency: baseCurrency })}
                </div>
                {isBase ? null : (
                  <div className="num text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
                    {formatOriginal(source.amount_original, source.currency)}
                  </div>
                )}
              </>
            )}
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 flex items-center gap-4 text-[11.5px]">
          <button
            style={{ color: "var(--color-neutral-700)" }}
            onClick={() => {
              setValue(String(toNumber(source.amount_original) || ""));
              setEditing(false);
            }}
          >
            Отмена
          </button>
          {suggested === now ? (
            <span style={{ color: "var(--color-neutral-600)" }}>
              запишется новой строкой в историю
            </span>
          ) : (
            <button
              className="min-w-0 flex-1 text-left"
              style={{ color: "var(--color-neutral-600)" }}
              onClick={() => {
                haptic();
                setDate(date === suggested ? now : suggested);
              }}
            >
              {date === suggested
                ? `остаток на ${formatDateFull(suggested)} — им сверится ${formatMonthName(
                    monthFromDate(suggested),
                  )}`
                : `остаток на сегодня, ${formatDateFull(now)}`}
              <span className="ml-1" style={{ color: "var(--color-accent)" }}>
                поменять
              </span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
