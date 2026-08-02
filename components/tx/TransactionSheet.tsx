"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CURRENCIES } from "@/components/tx/AddScreen";
import { api, ApiError, type Transaction } from "@/lib/api";
import { categoryLabel, formatDayTitle, formatOriginal, toNumber } from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Шторка поверх списка: правка ручной операции или карточка импортированной.
 * Операции из выгрузки бэкенд менять запрещает — их правят в Дзен-мани,
 * поэтому для них форма не показывается вовсе.
 */
export function TransactionSheet({
  item,
  onClose,
}: {
  item: Transaction;
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
        {item.source === "manual" ? (
          <EditForm item={item} onClose={onClose} />
        ) : (
          <ImportedCard item={item} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function EditForm({ item, onClose }: { item: Transaction; onClose: () => void }) {
  const queryClient = useQueryClient();

  // бэкенд отдаёт сумму с хвостом нулей («10.0000») — в поле ей делать нечего
  const [amount, setAmount] = useState(String(toNumber(item.amount_original)));
  const [currency, setCurrency] = useState(item.currency);
  const [category, setCategory] = useState(item.category_name);
  const [account, setAccount] = useState(item.account_name);
  const [date, setDate] = useState(item.date);
  const [comment, setComment] = useState(item.comment ?? "");
  const [direction, setDirection] = useState(item.direction);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categories = useQuery({
    queryKey: ["categoryList", "all"],
    queryFn: () => api.categoryList(),
  });

  const save = useMutation({
    mutationFn: () =>
      api.updateTransaction(item.id, {
        date,
        category_name: category,
        account_name: account,
        amount_original: amount.replace(",", "."),
        currency,
        direction,
        comment: comment || null,
      }),
    onSuccess: () => {
      notify("success");
      queryClient.invalidateQueries();
      onClose();
    },
    onError: () => notify("error"),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteTransaction(item.id),
    onSuccess: () => {
      notify("success");
      queryClient.invalidateQueries();
      onClose();
    },
    onError: () => notify("error"),
  });

  const parsedAmount = Number(amount.replace(",", "."));
  const busy = save.isPending || remove.isPending;
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy;
  const error = save.error ?? remove.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="heading text-[15px]">Редактировать операцию</span>
        <button
          className="text-[12px] font-semibold"
          style={{ color: "var(--color-neutral-700)" }}
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>

      <div className="field">
        <label htmlFor="edit-amount">Сумма</label>
        <div className="flex gap-2">
          <input
            id="edit-amount"
            className="input num"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <select
            className="input"
            style={{ width: 100 }}
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            aria-label="Валюта"
          >
            {/* импорт мог принести валюту вне стандартного списка — не теряем её */}
            {(CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES]).map(
              (code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="edit-category">Категория</label>
        <input
          id="edit-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          list="edit-categories"
        />
        <datalist id="edit-categories">
          {(categories.data ?? []).map((option) => (
            <option key={option.name} value={option.name} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="edit-account">Счёт</label>
        <input
          id="edit-account"
          className="input"
          value={account}
          onChange={(event) => setAccount(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="edit-date">Дата</label>
        <input
          id="edit-date"
          type="date"
          className="input"
          value={date}
          max={today()}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="edit-comment">Комментарий</label>
        <input
          id="edit-comment"
          className="input"
          placeholder="Необязательно"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>

      <div className="field">
        <label>Тип</label>
        <div className="flex" style={{ border: "1px solid var(--color-divider)" }}>
          {(["outcome", "income"] as const).map((value) => (
            <button
              key={value}
              className="flex-1 py-2 text-[13px]"
              style={{
                background: direction === value ? "var(--color-accent)" : undefined,
                color: direction === value ? "var(--color-bg)" : undefined,
                fontWeight: direction === value ? 800 : 400,
              }}
              onClick={() => {
                haptic();
                setDirection(value);
              }}
            >
              {value === "outcome" ? "Трата" : "Доход"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="text-[12px]" style={{ color: "var(--color-accent-700)" }}>
          {error instanceof ApiError ? error.message : "Не удалось сохранить"}
        </div>
      ) : null}

      <button
        className="btn btn-primary min-h-[46px] w-full text-[15px]"
        disabled={!canSubmit}
        onClick={() => {
          haptic("medium");
          save.mutate();
        }}
      >
        {save.isPending ? "Сохраняю…" : "Сохранить"}
      </button>

      <button
        className="btn btn-secondary min-h-[42px] w-full text-[14px]"
        style={{ color: "var(--color-accent-700)" }}
        disabled={busy}
        onClick={() => {
          haptic("medium");
          if (confirmDelete) remove.mutate();
          else setConfirmDelete(true);
        }}
      >
        {remove.isPending
          ? "Удаляю…"
          : confirmDelete
            ? "Точно удалить?"
            : "Удалить операцию"}
      </button>
    </div>
  );
}

function ImportedCard({ item, onClose }: { item: Transaction; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="heading text-[15px]">{categoryLabel(item.category_name)}</span>
        <button
          className="text-[12px] font-semibold"
          style={{ color: "var(--color-neutral-700)" }}
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
      <div className="num text-[20px] font-semibold">
        {formatOriginal(item.amount_original, item.currency)}
      </div>
      <div className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
        {formatDayTitle(item.date)} · {item.account_name.trim()}
        {item.payee?.trim() ? ` · ${item.payee.trim()}` : ""}
      </div>
      {item.comment?.trim() ? <div className="text-[13px]">{item.comment.trim()}</div> : null}
      <p className="text-[11.5px]" style={{ color: "var(--color-neutral-600)" }}>
        Операция пришла из выгрузки Дзен-мани: правьте её там, иначе следующий
        импорт вернёт прежнее значение.
      </p>
    </div>
  );
}
