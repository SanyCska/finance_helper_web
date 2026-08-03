"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Screen } from "@/components/Chrome";
import { MonthStepper } from "@/components/MonthTabs";
import { FundsTabs } from "@/components/funds/FundsTabs";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { api } from "@/lib/api";
import { formatMoney, formatMonthGenitive, formatMonthTitle, toNumber } from "@/lib/format";
import { haptic, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

/** Расхождение меньше этой доли месячных трат считаем нормальным. */
const TOLERANCE = 25;

export function CheckScreen() {
  const [month, setMonth] = useMonth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const check = useQuery({ queryKey: ["check", month], queryFn: () => api.check(month) });
  const history = useQuery({ queryKey: ["checks"], queryFn: () => api.checks() });
  const funds = useQuery({ queryKey: ["funds", 12], queryFn: () => api.funds(12) });

  const save = useMutation({
    mutationFn: () => api.saveCheck(month, note.trim() || null),
    onSuccess: () => {
      notify("success");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["check"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["funds"] });
    },
    onError: () => notify("error"),
  });

  const hasSources = (funds.data?.sources.length ?? 0) > 0;
  const real = toNumber(check.data?.real_saldo);
  const tracked = toNumber(check.data?.tracked_saldo);
  const gap = toNumber(check.data?.discrepancy);

  return (
    <Screen title="Сверка месяца">
      <FundsTabs month={month} />
      <MonthStepper month={month} onChange={setMonth} />

      {check.isPending ? <Loading /> : null}
      {check.isError ? <ErrorState error={check.error} onRetry={() => check.refetch()} /> : null}

      {funds.data && !hasSources ? (
        <EmptyState
          title="Сверять пока не с чем"
          hint="Заведи источники средств и введи по ним суммы — тогда смогу сравнить реальное движение денег с учтённым."
          action={
            <Link href="/funds" className="btn btn-primary">
              К источникам
            </Link>
          }
        />
      ) : null}

      {check.data && hasSources && !check.data.comparable ? (
        <EmptyState
          title="Это первый месяц учёта"
          hint="Сверять не с чем: остатка на начало месяца нет, и вся сумма на счетах выглядела бы незаписанным доходом. Сверка появится со следующего месяца."
          action={
            <Link href="/funds" className="btn btn-secondary">
              К источникам
            </Link>
          }
        />
      ) : null}

      {check.data && hasSources && check.data.comparable ? (
        <>
          <section className="rule px-4 py-4">
            <div className="eyebrow mb-2" style={{ color: "var(--color-accent)" }}>
              Погрешность ведения
            </div>
            <div
              className="heading num"
              style={{
                fontSize: 44,
                lineHeight: 0.94,
                letterSpacing: "-0.04em",
                color:
                  Math.abs(gap) <= TOLERANCE ? "var(--color-text)" : "var(--color-accent)",
              }}
            >
              {formatMoney(gap, { sign: "always" })}
            </div>
            <div
              className="mt-2 text-[12px] leading-[1.5]"
              style={{ color: "var(--color-neutral-700)" }}
            >
              {verdict(gap, check.data.is_saved)}
            </div>
          </section>

          <section className="rule flex">
            <Stat label="По счетам" value={formatMoney(real, { sign: "always" })} />
            <Stat label="По учёту" value={formatMoney(tracked, { sign: "always" })} last />
          </section>

          {check.data.opening !== null && check.data.closing !== null ? (
            <section className="rule px-4 py-3 text-[12px] leading-[1.7]">
              <Row label="Было на начало месяца" value={formatMoney(check.data.opening)} />
              <Row label="Стало на конец месяца" value={formatMoney(check.data.closing)} />
            </section>
          ) : null}

          {check.data.is_saved ? (
            <div className="px-4 py-4">
              <div className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
                Месяц сведён{check.data.note ? `: ${check.data.note}` : ""}. Дальнейшие
                изменения балансов эту сверку не трогают.
              </div>
              <button
                className="btn btn-secondary mt-3 w-full"
                disabled={save.isPending}
                onClick={() => {
                  haptic();
                  save.mutate();
                }}
              >
                Пересчитать заново
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="text-[12px] leading-[1.5]" style={{ color: "var(--color-neutral-700)" }}>
                Проверь, что суммы по всем счетам актуальны на конец{" "}
                {formatMonthGenitive(month)}, и зафиксируй результат — он попадёт в историю
                погрешности.
              </p>
              <input
                className="input"
                placeholder="Заметка, необязательно"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button
                className="btn btn-primary min-h-[46px] w-full text-[15px]"
                disabled={save.isPending}
                onClick={() => {
                  haptic("medium");
                  save.mutate();
                }}
              >
                {save.isPending ? "Сохраняю…" : "Сверить месяц"}
              </button>
            </div>
          )}

          {history.data && history.data.length ? (
            <section className="px-4 pt-2">
              <div className="heading mb-2 text-[12px] tracking-[0.08em] uppercase">
                История сверок
              </div>
              {history.data.map((item) => {
                const value = toNumber(item.discrepancy);
                return (
                  <button
                    key={item.month}
                    className="rule-thin flex w-full items-baseline gap-3 py-2 text-left"
                    onClick={() => {
                      haptic();
                      setMonth(item.month);
                    }}
                  >
                    <span className="flex-1 truncate text-[13px]">
                      {formatMonthTitle(item.month)}
                      {item.note ? (
                        <span
                          className="ml-2 text-[11px]"
                          style={{ color: "var(--color-neutral-600)" }}
                        >
                          {item.note}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="num text-[13px] font-semibold"
                      style={{
                        color:
                          Math.abs(value) <= TOLERANCE
                            ? "var(--color-neutral-700)"
                            : "var(--color-accent)",
                      }}
                    >
                      {formatMoney(value, { sign: "always" })}
                    </span>
                  </button>
                );
              })}
            </section>
          ) : null}
        </>
      ) : null}
      <div className="h-6" />
    </Screen>
  );
}

function verdict(gap: number, saved: boolean): string {
  if (Math.abs(gap) <= TOLERANCE) {
    return saved
      ? "Учёт сошёлся с реальными счетами."
      : "Учёт почти сходится с реальными счетами.";
  }
  return gap < 0
    ? "Денег на счетах прибавилось меньше, чем следует из учёта: похоже, часть трат не записана."
    : "Денег на счетах прибавилось больше, чем следует из учёта: похоже, не записан какой-то доход.";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ color: "var(--color-neutral-700)" }}>{label}</span>
      <span className="num font-semibold">{value}</span>
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
