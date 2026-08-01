"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Screen } from "@/components/Chrome";
import { api, ApiError } from "@/lib/api";
import { categoryLabel } from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

const CURRENCIES = ["USD", "EUR", "RSD", "RUB", "ARS", "USDT"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [month] = useMonth();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [date, setDate] = useState(today());
  const [comment, setComment] = useState("");
  const [direction, setDirection] = useState<"outcome" | "income">("outcome");

  const categories = useQuery({
    queryKey: ["categoryList", "all"],
    queryFn: () => api.categoryList(),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createTransaction({
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
      router.push(`/?month=${date.slice(0, 7)}`);
    },
    onError: () => notify("error"),
  });

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0 && !create.isPending;

  // пустую категорию из подсказок убираем: чтобы её выбрать, достаточно
  // оставить поле незаполненным, а подсвеченной она выглядела бы выбранной
  const suggestions = (categories.data ?? []).filter((item) => item.name.trim() !== "").slice(0, 12);

  return (
    <Screen title="Добавить трату" back={`/?month=${month}`}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="field">
          <label htmlFor="amount">Сумма</label>
          <div className="flex gap-2">
            <input
              id="amount"
              className="input num"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
            />
            <select
              className="input"
              style={{ width: 100 }}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              aria-label="Валюта"
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="category">Категория</label>
          <input
            id="category"
            className="input"
            placeholder="Например, Продукты в магазинах"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            list="categories"
          />
          <datalist id="categories">
            {(categories.data ?? []).map((item) => (
              <option key={item.name} value={item.name} />
            ))}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item.name}
                className={category === item.name ? "tag tag-outline" : "tag tag-neutral"}
                onClick={() => {
                  haptic();
                  setCategory(item.name);
                }}
              >
                {categoryLabel(item.name)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="account">Счёт</label>
          <input
            id="account"
            className="input"
            placeholder="Например, Сербия"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="date">Дата</label>
          <input
            id="date"
            type="date"
            className="input"
            value={date}
            max={today()}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="comment">Комментарий</label>
          <input
            id="comment"
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

        {create.isError ? (
          <div className="text-[12px]" style={{ color: "var(--color-accent-700)" }}>
            {create.error instanceof ApiError ? create.error.message : "Не удалось сохранить"}
          </div>
        ) : null}

        <button
          className="btn btn-primary min-h-[46px] w-full text-[15px]"
          disabled={!canSubmit}
          onClick={() => {
            haptic("medium");
            create.mutate();
          }}
        >
          {create.isPending ? "Сохраняю…" : "Сохранить"}
        </button>

        <p className="text-[11.5px]" style={{ color: "var(--color-neutral-600)" }}>
          Ручные траты живут только здесь: импорт из Дзен-мани их не трогает и не перезаписывает.
        </p>
      </div>
    </Screen>
  );
}
