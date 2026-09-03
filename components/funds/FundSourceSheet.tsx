"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { MonthlyBars } from "@/components/Charts";
import { DateField } from "@/components/DateField";
import { api, ApiError, type FundBalance, type FundSource } from "@/lib/api";
import { monthlyBalances } from "@/lib/fundHistory";
import {
  formatDateFull,
  formatMonthGenitive,
  formatMoney,
  formatOriginal,
  parseAmount,
  toIsoDate,
  toNumber,
} from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";

// местная дата, а не UTC: вечером восточнее Гринвича `toISOString` даёт
// завтрашний день, и сервер отказывал бы в дате из будущего
function today(): string {
  return toIsoDate(new Date());
}

const HISTORY_MONTHS = 12;

/**
 * Карточка источника: имя, история записей баланса и удаление.
 *
 * Правка суммы на самом экране добавляет новый снимок — так и надо, когда
 * баланс просто изменился. Здесь же чинят прошлое: опечатку в сумме, не ту
 * дату, лишнюю запись. Это отдельная операция, поэтому и место отдельное.
 */
export function FundSourceSheet({
  source,
  baseCurrency,
  onClose,
}: {
  source: FundSource;
  baseCurrency: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Закрыть"
        className="flex-1"
        style={{ background: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}
        onClick={onClose}
      />
      <div
        className="max-h-[85dvh] overflow-y-auto overscroll-contain px-4 py-4"
        style={{
          background: "var(--color-bg)",
          borderTop: "2px solid var(--color-divider)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <Body source={source} baseCurrency={baseCurrency} onClose={onClose} />
      </div>
    </div>
  );
}

function Body({
  source,
  baseCurrency,
  onClose,
}: {
  source: FundSource;
  baseCurrency: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(source.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const history = useQuery({
    queryKey: ["balanceHistory", source.id],
    queryFn: () => api.balanceHistory(source.id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["funds"] });
    queryClient.invalidateQueries({ queryKey: ["balanceHistory", source.id] });
    queryClient.invalidateQueries({ queryKey: ["check"] });
    queryClient.invalidateQueries({ queryKey: ["checks"] });
  };

  const rename = useMutation({
    mutationFn: () => api.updateFundSource(source.id, { title: title.trim() }),
    onSuccess: () => {
      notify("success");
      refresh();
    },
    onError: () => notify("error"),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteFundSource(source.id),
    onSuccess: () => {
      notify("success");
      refresh();
      onClose();
    },
    onError: () => notify("error"),
  });

  const archive = useMutation({
    mutationFn: () => api.updateFundSource(source.id, { archived: true }),
    onSuccess: () => {
      notify("success");
      refresh();
      onClose();
    },
  });

  const renamed = title.trim() !== source.title && title.trim() !== "";

  // столбики от нуля почти не отличаются друг от друга, когда баланс гуляет
  // в узком диапазоне, поэтому изменение за окно подписываем числом
  const points = monthlyBalances(history.data ?? [], HISTORY_MONTHS);
  const change =
    points.length > 1
      ? toNumber(points[points.length - 1].amount) - toNumber(points[0].amount)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="heading text-[15px]">Источник</span>
        <button
          className="text-[12px] font-semibold"
          style={{ color: "var(--color-neutral-700)" }}
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>

      <div className="field">
        <label htmlFor="source-title">Название</label>
        <div className="flex gap-2">
          <input
            id="source-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            className="btn btn-primary shrink-0 text-[12px]"
            disabled={!renamed || rename.isPending}
            onClick={() => {
              haptic("medium");
              rename.mutate();
            }}
          >
            {rename.isPending ? "…" : "ОК"}
          </button>
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
          Валюта источника — {source.currency}. Сменить её нельзя: прошлые записи
          остались бы в старой валюте, и итог поехал бы. Заведи новый источник.
        </div>
      </div>

      {points.length > 1 ? (
        <div>
          <div className="heading mb-3 text-[12px] tracking-[0.08em] uppercase">
            Как менялся баланс
          </div>
          <MonthlyBars points={points} currency={source.currency} baseline="min" />
          <div className="mt-2 text-[11.5px]" style={{ color: "var(--color-neutral-700)" }}>
            {`с ${formatMonthGenitive(points[0].month)}: `}
            <span
              className="num font-semibold"
              style={{
                color: change > 0 ? "var(--color-accent)" : "var(--color-text)",
              }}
            >
              {change === 0
                ? "без изменений"
                : `${change > 0 ? "+" : "−"}${formatOriginal(Math.abs(change), source.currency)}`}
            </span>
          </div>
        </div>
      ) : null}

      <div>
        <div className="heading mb-2 text-[12px] tracking-[0.08em] uppercase">
          История баланса
        </div>
        {history.isPending ? (
          <div className="text-[12px]" style={{ color: "var(--color-neutral-600)" }}>
            Загружаю…
          </div>
        ) : null}
        {history.data?.length === 0 ? (
          <div className="text-[12px]" style={{ color: "var(--color-neutral-600)" }}>
            Сумма ещё не вводилась.
          </div>
        ) : null}
        {(history.data ?? []).map((item, index) => (
          <BalanceRow
            key={item.id}
            sourceId={source.id}
            item={item}
            baseCurrency={baseCurrency}
            isLatest={index === 0}
            onDone={refresh}
          />
        ))}
      </div>

      <button
        className="btn btn-secondary min-h-[42px] w-full text-[14px]"
        disabled={archive.isPending}
        onClick={() => {
          haptic();
          archive.mutate();
        }}
      >
        Убрать из списка, сохранив историю
      </button>

      <button
        className="btn btn-secondary min-h-[42px] w-full text-[14px]"
        style={{ color: "var(--color-accent-700)" }}
        disabled={remove.isPending}
        onClick={() => {
          haptic("medium");
          if (confirmDelete) remove.mutate();
          else setConfirmDelete(true);
        }}
      >
        {remove.isPending
          ? "Удаляю…"
          : confirmDelete
            ? "Точно удалить вместе со всей историей?"
            : "Удалить источник"}
      </button>
    </div>
  );
}

function BalanceRow({
  sourceId,
  item,
  baseCurrency,
  isLatest,
  onDone,
}: {
  sourceId: number;
  item: FundBalance;
  baseCurrency: string;
  isLatest: boolean;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(toNumber(item.amount_original)));
  const [date, setDate] = useState(item.date);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      api.updateBalance(sourceId, item.id, { amount: String(parseAmount(amount)), date }),
    onSuccess: () => {
      notify("success");
      setEditing(false);
      onDone();
    },
    onError: () => notify("error"),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteBalance(sourceId, item.id),
    onSuccess: () => {
      notify("success");
      onDone();
    },
    onError: () => notify("error"),
  });

  const parsed = parseAmount(amount);
  const busy = save.isPending || remove.isPending;
  const error = save.error ?? remove.error;

  if (!editing) {
    return (
      <button
        className="rule-thin flex w-full items-center gap-3 py-2 text-left"
        onClick={() => {
          haptic();
          setEditing(true);
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="num text-[13px] font-semibold">
            {formatOriginal(item.amount_original, item.currency)}
          </div>
          <div className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
            {formatDateFull(item.date)}
            {isLatest ? " · текущий" : ""}
            {item.note?.trim() ? ` · ${item.note.trim()}` : ""}
          </div>
        </div>
        <span className="num text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
          {item.amount_base === null
            ? "курс не найден"
            : formatMoney(item.amount_base, { currency: baseCurrency })}
        </span>
      </button>
    );
  }

  return (
    <div className="rule-thin flex flex-col gap-2 py-3">
      <div className="flex items-center gap-2">
        <input
          className="input num"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          autoFocus
        />
        <span className="shrink-0 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
          {item.currency}
        </span>
      </div>
      <DateField value={date} max={today()} onChange={setDate} />

      {error ? (
        <div className="text-[12px]" style={{ color: "var(--color-accent-700)" }}>
          {error instanceof ApiError ? error.message : "Не удалось сохранить"}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          className="btn btn-primary flex-1 text-[13px]"
          disabled={Number.isNaN(parsed) || parsed < 0 || busy}
          onClick={() => {
            haptic("medium");
            save.mutate();
          }}
        >
          {save.isPending ? "Сохраняю…" : "Сохранить"}
        </button>
        <button
          className="text-[11.5px]"
          style={{ color: "var(--color-neutral-700)" }}
          onClick={() => {
            setAmount(String(toNumber(item.amount_original)));
            setDate(item.date);
            setConfirmDelete(false);
            setEditing(false);
          }}
        >
          Отмена
        </button>
        <button
          className="text-[11.5px]"
          style={{ color: "var(--color-accent)" }}
          disabled={busy}
          onClick={() => {
            haptic();
            if (confirmDelete) remove.mutate();
            else setConfirmDelete(true);
          }}
        >
          {confirmDelete ? "Точно удалить?" : "Удалить"}
        </button>
      </div>
    </div>
  );
}
