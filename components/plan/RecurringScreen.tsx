"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CategoryPicker } from "@/components/CategoryPicker";
import { Screen } from "@/components/Chrome";
import { DateField } from "@/components/DateField";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { ErrorState, Loading } from "@/components/States";
import { CURRENCIES } from "@/components/tx/AddScreen";
import { api, type Recurring, type RecurringKind } from "@/lib/api";
import {
  categoryLabel,
  formatDayTitle,
  formatMoney,
  formatOriginal,
  parseAmount,
  toNumber,
} from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

/** Периодичность списания в месяцах — то, на что делится сумма. */
const PERIODS = [
  { months: 1, label: "Каждый месяц" },
  { months: 3, label: "Раз в квартал" },
  { months: 6, label: "Раз в полгода" },
  { months: 12, label: "Раз в год" },
];

function periodLabel(months: number): string {
  return PERIODS.find((item) => item.months === months)?.label ?? `Раз в ${months} мес.`;
}

/** Подпись под месячной долей: из чего она получилась. */
function chargeNote(item: Recurring, baseCurrency: string): string {
  const original = formatOriginal(item.amount, item.currency);
  if (item.period_months > 1) return `${original} за ${item.period_months} мес.`;
  return item.currency === baseCurrency ? "в месяц" : `${original} в месяц`;
}

/** Группы экрана. Категория подставляется сама, кроме прочих трат. */
const GROUPS: {
  kind: RecurringKind;
  title: string;
  category: string;
  hint?: string;
  titlePlaceholder: string;
}[] = [
  {
    kind: "rent",
    title: "Аренда",
    category: "Аренда квартиры",
    titlePlaceholder: "Например, Квартира",
    hint: "Постоянная трата, которая начисляется сама. Поменяешь сумму — новая пойдёт с текущего месяца, прошлые останутся как были.",
  },
  {
    kind: "subscription",
    title: "Подписки",
    category: "Подписки",
    titlePlaceholder: "Например, Netflix",
  },
  {
    kind: "other",
    title: "Другие постоянные траты",
    category: "",
    titlePlaceholder: "Например, Страховка",
    hint: "Всё остальное, что списывается регулярно. Категорию выбери сам — без неё трата попадёт в «Без категории».",
  },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecurringScreen() {
  const [month] = useMonth();
  const [adding, setAdding] = useState<RecurringKind | null>(null);

  const list = useQuery({ queryKey: ["recurring"], queryFn: () => api.recurring() });

  const items = list.data?.items ?? [];
  const currency = list.data?.base_currency ?? "USD";

  return (
    <Screen title="Постоянные траты" back="/">
      <PlanTabs month={month} />

      {list.isPending ? <Loading /> : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}

      {list.data ? (
        <>
          <section className="rule px-4 py-4">
            <div className="eyebrow mb-2" style={{ color: "var(--color-accent)" }}>
              Уходит каждый месяц
            </div>
            <div
              className="heading num"
              style={{ fontSize: 42, lineHeight: 0.94, letterSpacing: "-0.04em" }}
            >
              {formatMoney(list.data.monthly_total_base, { currency })}
            </div>
            <p
              className="mt-2 text-[12px] leading-[1.5]"
              style={{ color: "var(--color-neutral-700)" }}
            >
              Сумма списывается в траты последним днём каждого месяца. Годовая подписка
              делится на двенадцать, чтобы месяц оплаты не выглядел провальным.
            </p>
          </section>

          {GROUPS.map((group) => (
            <Group
              key={group.kind}
              group={group}
              items={items.filter((item) => item.kind === group.kind)}
              currency={currency}
              adding={adding === group.kind}
              onToggleAdd={() =>
                setAdding(adding === group.kind ? null : group.kind)
              }
            />
          ))}
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

function Group({
  group,
  items,
  currency,
  adding,
  onToggleAdd,
}: {
  group: (typeof GROUPS)[number];
  items: Recurring[];
  currency: string;
  adding: boolean;
  onToggleAdd: () => void;
}) {
  return (
    <section className="px-4 pt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="heading text-[12px] tracking-[0.08em] uppercase">{group.title}</span>
        <button
          className="text-[11.5px] font-semibold"
          style={{ color: "var(--color-accent)" }}
          onClick={() => {
            haptic();
            onToggleAdd();
          }}
        >
          {adding ? "Отмена" : "+ Добавить"}
        </button>
      </div>

      {group.hint && !items.length ? (
        <p className="mb-2 text-[12px] leading-[1.5]" style={{ color: "var(--color-neutral-700)" }}>
          {group.hint}
        </p>
      ) : null}

      {adding ? <AddForm group={group} onDone={onToggleAdd} /> : null}

      {items.map((item) => (
        <Row key={item.id} item={item} currency={currency} />
      ))}

      {!items.length && !adding ? (
        <div className="rule-thin py-3 text-[12px]" style={{ color: "var(--color-neutral-600)" }}>
          Пока пусто.
        </div>
      ) : null}
    </section>
  );
}

function AddForm({
  group,
  onDone,
}: {
  group: (typeof GROUPS)[number];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [period, setPeriod] = useState(1);
  const [chargeOn, setChargeOn] = useState(today());
  const [category, setCategory] = useState(group.category);

  const categories = useQuery({
    queryKey: ["categoryList", "all"],
    queryFn: () => api.categoryList(),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createRecurring({
        kind: group.kind,
        title: title.trim(),
        amount: String(parsed),
        currency,
        period_months: period,
        charge_on: chargeOn,
        category_name: category.trim() || null,
      }),
    onSuccess: () => {
      notify("success");
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      onDone();
    },
    onError: () => notify("error"),
  });

  const parsed = parseAmount(amount);

  return (
    <div className="rule-thin flex flex-col gap-3 py-3">
      <input
        className="input"
        placeholder={group.titlePlaceholder}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <input
          className="input num"
          inputMode="decimal"
          placeholder="Сумма списания"
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
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Как часто списывают</label>
        <select
          className="input"
          value={period}
          onChange={(event) => setPeriod(Number(event.target.value))}
        >
          {PERIODS.map((item) => (
            <option key={item.months} value={item.months}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`charge-${group.kind}`}>Дата списания</label>
        <DateField id={`charge-${group.kind}`} value={chargeOn} onChange={setChargeOn} />
        <div className="mt-1 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
          {period > 1
            ? "У годовой подписки важен и месяц: по этой дате считается следующее списание."
            : "Значим только день месяца."}
        </div>
      </div>
      <div className="field">
        <label>Категория трат</label>
        <CategoryPicker
          selected={category ? [category] : []}
          options={(categories.data ?? []).map((item) => item.name)}
          onChange={(next) => setCategory(next[0] ?? "")}
          placeholder="без категории"
          multiple={false}
        />
      </div>

      {period > 1 && parsed > 0 ? (
        <div className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
          В месяц —{" "}
          <span className="num font-semibold" style={{ color: "var(--color-text)" }}>
            {formatOriginal(parsed / period, currency)}
          </span>
        </div>
      ) : null}

      <button
        className="btn btn-primary w-full"
        disabled={!title.trim() || !(parsed > 0) || create.isPending}
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

function Row({ item, currency }: { item: Recurring; currency: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(toNumber(item.amount)));
  // удаление уносит и прошлые начисления, поэтому спрашиваем вторым нажатием
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring"] });
    // начисления меняют траты месяца
    queryClient.invalidateQueries({ queryKey: ["month"] });
  };

  const save = useMutation({
    mutationFn: () =>
      api.updateRecurring(item.id, {
        amount: String(parseAmount(amount)),
      }),
    onSuccess: () => {
      notify("success");
      setEditing(false);
      invalidate();
    },
    onError: () => notify("error"),
  });

  const toggle = useMutation({
    mutationFn: () => api.updateRecurring(item.id, { active: !item.active }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => api.deleteRecurring(item.id),
    onSuccess: invalidate,
  });

  return (
    <div className="rule-thin py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-[14px] font-semibold"
            style={{ color: item.active ? undefined : "var(--color-neutral-600)" }}
          >
            {item.title}
          </div>
          <div className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
            {periodLabel(item.period_months)} · спишут {formatDayTitle(item.next_charge)} ·{" "}
            {categoryLabel(item.category_name)}
            {item.active ? "" : " · на паузе"}
          </div>
        </div>
        {editing ? (
          <div className="flex shrink-0 items-center gap-2">
            <input
              className="num w-20 bg-transparent text-right text-[15px] font-semibold outline-none"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
            />
            <span className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
              {item.currency}
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
            {item.monthly_amount_base === null ? (
              <>
                <div className="num text-[13px] font-semibold">
                  {formatOriginal(item.monthly_amount, item.currency)}
                </div>
                <div className="text-[11px]" style={{ color: "var(--color-accent-700)" }}>
                  курс не найден
                </div>
              </>
            ) : (
              <>
                <div className="heading num text-[16px]">
                  {formatMoney(item.monthly_amount_base, { currency })}
                </div>
                <div className="num text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
                  {chargeNote(item, currency)}
                </div>
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
              setAmount(String(toNumber(item.amount)));
              setConfirmingDelete(false);
              setEditing(false);
            }}
          >
            Отмена
          </button>
          <button
            style={{ color: "var(--color-neutral-700)" }}
            onClick={() => {
              haptic();
              toggle.mutate();
            }}
          >
            {item.active ? "На паузу" : "Возобновить"}
          </button>
          <button
            style={{ color: "var(--color-accent)" }}
            onClick={() => {
              haptic();
              if (confirmingDelete) remove.mutate();
              else setConfirmingDelete(true);
            }}
          >
            {confirmingDelete ? "Удалить вместе с начислениями?" : "Удалить"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
