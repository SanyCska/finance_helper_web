"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Screen } from "@/components/Chrome";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { ErrorState, Loading } from "@/components/States";
import { api } from "@/lib/api";
import { formatMonthTitle, formatMoney, toNumber } from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

type Line = { key: string; title: string; amount: string };

let counter = 0;
function newLine(title = "", amount = ""): Line {
  counter += 1;
  return { key: `line-${counter}`, title, amount };
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

  const [lines, setLines] = useState<Line[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!plan.data || dirty) return;
    setLines(
      plan.data.lines.length
        ? plan.data.lines.map((line) => newLine(line.title, String(Math.round(toNumber(line.amount)))))
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
          })),
      ),
    onSuccess: () => {
      notify("success");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["plan", month] });
    },
    onError: () => notify("error"),
  });

  const total = lines.reduce((sum, line) => sum + (Number(line.amount.replace(",", ".")) || 0), 0);
  const incomeAmount = toNumber(income.data?.amount);
  const expected = incomeAmount - total;

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
          <IncomeBlock month={month} amount={incomeAmount} isDefault={income.data?.is_default} />

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
                      newLine(item.title, String(Math.round(toNumber(item.amount)))),
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
              <div key={line.key} className="rule-thin flex items-center gap-2 py-2">
                <button
                  aria-label="Удалить строку"
                  className="shrink-0 text-[16px]"
                  style={{ color: "var(--color-neutral-500)" }}
                  onClick={() => {
                    haptic();
                    setDirty(true);
                    setLines((current) =>
                      current.length > 1
                        ? current.filter((item) => item.key !== line.key)
                        : [newLine()],
                    );
                  }}
                >
                  ⊖
                </button>
                <input
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none"
                  placeholder="Название траты"
                  value={line.title}
                  onChange={(event) => update(line.key, { title: event.target.value })}
                />
                <div className="flex shrink-0 items-baseline">
                  <span className="num text-[14px] font-semibold">$</span>
                  <input
                    className="num w-20 bg-transparent text-right text-[14px] font-semibold outline-none"
                    inputMode="numeric"
                    placeholder="0"
                    value={line.amount}
                    onChange={(event) => update(line.key, { amount: event.target.value })}
                  />
                </div>
              </div>
            ))}

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
                : !dirty && plan.data.lines.length > 0
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

function IncomeBlock({
  month,
  amount,
  isDefault,
}: {
  month: string;
  amount: number;
  isDefault?: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(Math.round(amount) || ""));
  const [asDefault, setAsDefault] = useState(false);

  useEffect(() => {
    setValue(String(Math.round(amount) || ""));
  }, [amount]);

  const save = useMutation({
    mutationFn: () =>
      api.setIncome(month, {
        amount: String(Number(value.replace(",", ".")) || 0),
        save_as_default: asDefault,
      }),
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
            Доход месяца
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
          {isDefault && !editing ? (
            <div className="mt-1 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
              значение по умолчанию
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
        <label className="mt-2 flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={asDefault}
            onChange={(event) => setAsDefault(event.target.checked)}
          />
          подставлять этот доход в новые месяцы
        </label>
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
