"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Screen } from "@/components/Chrome";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { ErrorState, Loading } from "@/components/States";
import { api, type PlanSource } from "@/lib/api";
import { formatMonthGenitive, formatMonthTitle, formatMoney, toNumber } from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

/** Валюты, в которых можно расписать план. Итоги всё равно в базовой. */
const PLAN_CURRENCIES = ["USD", "EUR"];

type Line = {
  key: string;
  title: string;
  amount: string;
  currency: string;
  category: string;
};

let counter = 0;
function newLine(title = "", amount = "", currency = "USD", category = ""): Line {
  counter += 1;
  return { key: `line-${counter}`, title, amount, currency, category };
}

export function PlanScreen() {
  const [month, setMonth] = useMonth();
  const queryClient = useQueryClient();

  const plan = useQuery({ queryKey: ["plan", month], queryFn: () => api.plan(month) });
  const income = useQuery({ queryKey: ["income", month], queryFn: () => api.income(month) });
  const suggestions = useQuery({
    queryKey: ["suggestions", month],
    queryFn: () => api.planSuggestions(month, 3),
  });
  const categories = useQuery({
    queryKey: ["categoryList", "all"],
    queryFn: () => api.categoryList(),
  });

  const [lines, setLines] = useState<Line[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!plan.data || dirty) return;
    setLines(
      plan.data.lines.length
        ? plan.data.lines.map((line) =>
            newLine(
              line.title,
              String(Math.round(toNumber(line.amount))),
              line.currency,
              line.category_name ?? "",
            ),
          )
        : [newLine()],
    );
  }, [plan.data, dirty]);

  const save = useMutation({
    mutationFn: () =>
      api.savePlan(
        month,
        lines
          .filter((line) => line.title.trim() || Number(line.amount) > 0)
          .map((line) => ({
            title: line.title.trim(),
            amount: String(Number(line.amount.replace(",", ".")) || 0),
            currency: line.currency,
            category_name: line.category.trim() || null,
          })),
      ),
    onSuccess: () => {
      notify("success");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["plan", month] });
      queryClient.invalidateQueries({ queryKey: ["planVsFact", month] });
    },
    onError: () => notify("error"),
  });

  // до сохранения итог считаем сами: курс берём из уже пересчитанных сервером строк
  const rates = rateMap(plan.data?.lines ?? []);
  const total = lines.reduce((sum, line) => {
    const value = Number(line.amount.replace(",", ".")) || 0;
    return sum + value * (rates[line.currency] ?? 1);
  }, 0);
  const incomeAmount = toNumber(income.data?.amount);
  const expected = incomeAmount - total;
  const hasForeign = lines.some((line) => line.currency !== "USD");

  const update = (key: string, patch: Partial<Line>) => {
    setDirty(true);
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  return (
    <Screen title={`План на ${monthWord(month)}`} back="/">
      <PlanTabs month={month} />

      <div className="rule-thin flex items-center justify-between px-4 py-3">
        <button
          className="text-[12px] font-semibold"
          style={{ color: "var(--color-accent)" }}
          onClick={() => {
            haptic();
            setDirty(false);
            setMonth(previousMonth(month));
          }}
        >
          ‹ {formatMonthTitle(previousMonth(month))}
        </button>
        <button
          className="text-[12px] font-semibold"
          style={{ color: "var(--color-accent)" }}
          onClick={() => {
            haptic();
            setDirty(false);
            setMonth(nextMonth(month));
          }}
        >
          {formatMonthTitle(nextMonth(month))} ›
        </button>
      </div>

      {plan.isPending ? <Loading /> : null}
      {plan.isError ? <ErrorState error={plan.error} onRetry={() => plan.refetch()} /> : null}

      {plan.data ? (
        <>
          <IncomeBlock
            month={month}
            amount={incomeAmount}
            source={income.data?.source}
            fromMonth={income.data?.from_month}
          />

          <DraftNote source={plan.data.source} month={month} dirty={dirty} />

          {suggestions.data && suggestions.data.length > 0 ? (
            <div className="rule flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
                Средние траты за 3 месяца —{" "}
                <span className="num font-semibold" style={{ color: "var(--color-text)" }}>
                  {formatMoney(
                    suggestions.data.reduce((sum, item) => sum + toNumber(item.amount), 0),
                  )}
                </span>
              </span>
              <button
                className="btn btn-secondary shrink-0 text-[12px]"
                onClick={() => {
                  haptic();
                  setDirty(true);
                  setLines(
                    suggestions.data.map((item) =>
                      // подсказка пришла из категории — сразу её и связываем
                      newLine(
                        item.title,
                        String(Math.round(toNumber(item.amount))),
                        "USD",
                        item.title,
                      ),
                    ),
                  );
                }}
              >
                Заполнить
              </button>
            </div>
          ) : null}

          <section className="px-4 pt-3">
            <div className="heading mb-2 text-[12px] tracking-[0.08em] uppercase">
              Строки плана
            </div>
            {lines.map((line) => (
              <PlanLineRow
                key={line.key}
                line={line}
                onChange={(patch) => update(line.key, patch)}
                onRemove={() => {
                  haptic();
                  setDirty(true);
                  setLines((current) =>
                    current.length > 1
                      ? current.filter((item) => item.key !== line.key)
                      : [newLine()],
                  );
                }}
              />
            ))}
            <datalist id="plan-categories">
              {(categories.data ?? []).map((item) => (
                <option key={item.name} value={item.name} />
              ))}
            </datalist>

            <button
              className="py-3 text-[13px] font-semibold"
              style={{ color: "var(--color-accent)" }}
              onClick={() => {
                haptic();
                setDirty(true);
                setLines((current) => [...current, newLine()]);
              }}
            >
              +&nbsp;&nbsp;Добавить строку
            </button>
          </section>

          <section className="rule mt-2 px-4 py-3" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px]">Итого план</span>
              <span className="heading num text-[18px]">{formatMoney(total)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[13px]">Ожидаемое сальдо</span>
              <span
                className="heading num text-[18px]"
                style={{ color: expected >= 0 ? "var(--color-text)" : "var(--color-accent)" }}
              >
                {formatMoney(expected, { sign: "always" })}
              </span>
            </div>
            {hasForeign ? (
              <div className="mt-2 text-[11.5px]" style={{ color: "var(--color-neutral-600)" }}>
                Строки не в долларах пересчитаны по курсу — точная сумма после сохранения.
              </div>
            ) : null}
          </section>

          <div className="px-4 py-4">
            <button
              className="btn btn-primary min-h-[46px] w-full text-[15px]"
              disabled={save.isPending}
              onClick={() => {
                haptic("medium");
                save.mutate();
              }}
            >
              {save.isPending
                ? "Сохраняю…"
                : !dirty && plan.data.source === "saved"
                  ? "План сохранён"
                  : "Сохранить план"}
            </button>
          </div>
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

/**
 * Курсы валют, выведенные из ответа сервера: он присылает и сумму строки,
 * и её эквивалент в базовой валюте. Отдельного запроса за курсами нет —
 * пересчёт нужен только для предварительного итога до сохранения.
 */
function rateMap(
  lines: { amount: string; amount_base: string; currency: string }[],
): Record<string, number> {
  const rates: Record<string, number> = { USD: 1 };
  for (const line of lines) {
    const amount = toNumber(line.amount);
    if (amount > 0) rates[line.currency] = toNumber(line.amount_base) / amount;
  }
  return rates;
}

function PlanLineRow({
  line,
  onChange,
  onRemove,
}: {
  line: Line;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rule-thin py-2">
      <div className="flex items-center gap-2">
        <button
          aria-label="Удалить строку"
          className="shrink-0 text-[16px]"
          style={{ color: "var(--color-neutral-500)" }}
          onClick={onRemove}
        >
          ⊖
        </button>
        <input
          className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none"
          placeholder="Название траты"
          value={line.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <select
          className="num shrink-0 bg-transparent text-[12px] font-semibold outline-none"
          value={line.currency}
          onChange={(event) => onChange({ currency: event.target.value })}
          aria-label="Валюта строки"
        >
          {PLAN_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <input
          className="num w-20 shrink-0 bg-transparent text-right text-[14px] font-semibold outline-none"
          inputMode="numeric"
          placeholder="0"
          value={line.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
        />
      </div>
      <div className="mt-1 flex items-center gap-2 pl-6">
        <span className="shrink-0 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
          категория
        </span>
        <input
          className="min-w-0 flex-1 bg-transparent text-[11.5px] outline-none"
          style={{ color: line.category ? "var(--color-accent)" : "var(--color-neutral-500)" }}
          placeholder="не связана с фактом"
          value={line.category}
          onChange={(event) => onChange({ category: event.target.value })}
          list="plan-categories"
        />
      </div>
    </div>
  );
}

function DraftNote({
  source,
  month,
  dirty,
}: {
  source: PlanSource;
  month: string;
  dirty: boolean;
}) {
  if (source !== "previous" || dirty) return null;
  return (
    <div className="rule px-4 py-3" style={{ background: "var(--color-accent-100)" }}>
      <div className="text-[12px] leading-[1.5]" style={{ color: "var(--color-accent-800)" }}>
        Черновик из плана за {formatMonthTitle(previousMonth(month)).toLowerCase()}. Поправь
        суммы и сохрани — пока план не сохранён, месяц считается нераспланированным.
      </div>
    </div>
  );
}

function IncomeBlock({
  month,
  amount,
  source,
  fromMonth,
}: {
  month: string;
  amount: number;
  source?: "saved" | "carried" | "default";
  fromMonth?: string | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(Math.round(amount) || ""));

  useEffect(() => {
    setValue(String(Math.round(amount) || ""));
  }, [amount]);

  const save = useMutation({
    mutationFn: () =>
      api.setIncome(month, { amount: String(Number(value.replace(",", ".")) || 0) }),
    onSuccess: () => {
      notify("success");
      setEditing(false);
      queryClient.invalidateQueries();
    },
  });

  return (
    <div className="rule px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow mb-1" style={{ color: "var(--color-neutral-700)" }}>
            Зарплата месяца
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <span className="num text-[20px] font-extrabold">$</span>
              <input
                className="num w-28 bg-transparent text-[20px] font-extrabold outline-none"
                inputMode="numeric"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="heading num text-[24px]">{formatMoney(amount)}</div>
          )}
          {!editing && source === "carried" && fromMonth ? (
            <div className="mt-1 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
              перенесена с {formatMonthGenitive(fromMonth)}
            </div>
          ) : null}
          {!editing && source === "default" ? (
            <div className="mt-1 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
              зарплата ещё не вводилась
            </div>
          ) : null}
        </div>
        {editing ? (
          <button
            className="btn btn-primary shrink-0 text-[12px]"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            Сохранить
          </button>
        ) : (
          <button
            className="btn btn-secondary shrink-0 text-[12px]"
            onClick={() => {
              haptic();
              setEditing(true);
            }}
          >
            Изменить
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 text-[11.5px]" style={{ color: "var(--color-neutral-600)" }}>
          Новая сумма пойдёт и в следующие месяцы, пока не введёшь другую.
        </div>
      ) : null}
    </div>
  );
}

function previousMonth(month: string): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = year * 12 + index - 2;
  return `${Math.floor(shifted / 12)}-${String((shifted % 12) + 1).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = year * 12 + index;
  return `${Math.floor(shifted / 12)}-${String((shifted % 12) + 1).padStart(2, "0")}`;
}

function monthWord(month: string): string {
  return formatMonthTitle(month).toLowerCase();
}
