"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function Loading({ label = "Загружаю…" }: { label?: string }) {
  return (
    <div
      className="px-4 py-10 text-center text-[13px]"
      style={{ color: "var(--color-neutral-600)" }}
    >
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : "Что-то пошло не так";
  return (
    <div className="px-4 py-10 text-center">
      <div className="heading mb-2 text-[15px]">Не удалось загрузить</div>
      <div className="mb-4 text-[13px]" style={{ color: "var(--color-neutral-700)" }}>
        {message}
      </div>
      {onRetry ? (
        <button className="btn btn-secondary" onClick={onRetry}>
          Повторить
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="heading mb-2 text-[15px]">{title}</div>
      {hint ? (
        <div className="mb-4 text-[13px]" style={{ color: "var(--color-neutral-700)" }}>
          {hint}
        </div>
      ) : null}
      {action}
    </div>
  );
}

/** Пустой месяц: подсказываем загрузить выгрузку через бота. */
export function EmptyMonth() {
  return (
    <EmptyState
      title="В этом месяце пусто"
      hint="Пришли боту выгрузку CSV из Дзен-мани или добавь трату вручную."
      action={
        <Link href="/add" className="btn btn-primary">
          Добавить трату
        </Link>
      }
    />
  );
}

function defaultSubject(count: number): string {
  const word = count === 1 ? "операции" : "операций";
  return `Для ${count} ${word} не нашлись курсы валют — они не попадают в итоги.`;
}

/**
 * Баннер о ненайденных курсах: без них суммы в долларах неизвестны.
 * `subject` описывает, что именно осталось без курса — операции или источники.
 */
export function FxBanner({
  count,
  subject,
}: {
  count: number;
  subject?: (count: number) => string;
}) {
  const queryClient = useQueryClient();
  const backfill = useMutation({
    mutationFn: () => api.backfillRates(),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (count <= 0) return null;

  return (
    <div
      className="rule flex items-center gap-3 px-4 py-3"
      style={{ background: "var(--color-accent-100)" }}
    >
      <div className="flex-1 text-[11.5px]" style={{ color: "var(--color-accent-800)" }}>
        {backfill.isSuccess
          ? `Догружено курсов: ${backfill.data.filled}. Осталось без курса: ${backfill.data.pending_left}.`
          : (subject ?? defaultSubject)(count)}
      </div>
      <button
        className="btn btn-secondary shrink-0 text-[12px]"
        onClick={() => backfill.mutate()}
        disabled={backfill.isPending}
      >
        {backfill.isPending ? "Гружу…" : "Загрузить"}
      </button>
    </div>
  );
}
