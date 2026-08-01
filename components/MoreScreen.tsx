"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";

import { Screen } from "@/components/Chrome";
import { api, type ImportReport } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { isInsideTelegram, notify } from "@/lib/telegram";
import { useMonth } from "@/lib/useMonth";

export function MoreScreen() {
  const [month] = useMonth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api.settings() });

  const upload = useMutation({
    mutationFn: (file: File) => api.importCsv(file),
    onSuccess: (result) => {
      notify("success");
      setReport(result);
      queryClient.invalidateQueries();
    },
    onError: () => notify("error"),
  });

  const backfill = useMutation({
    mutationFn: () => api.backfillRates(),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Screen title="Ещё" back="/">
      <section className="rule px-4 py-4">
        <div className="heading mb-2 text-[14px]">Загрузить выгрузку</div>
        <p className="mb-3 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
          Обычный путь — прислать CSV боту в Telegram. Здесь то же самое, если файл уже на
          устройстве. Повторная заливка того же дампа дублей не создаёт.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
          }}
        />
        <button
          className="btn btn-secondary w-full"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? "Загружаю…" : "Выбрать файл"}
        </button>

        {upload.isError ? (
          <div className="mt-3 text-[12px]" style={{ color: "var(--color-accent-700)" }}>
            {upload.error instanceof Error ? upload.error.message : "Не получилось"}
          </div>
        ) : null}

        {report ? (
          <div className="mt-3 text-[12px] leading-[1.6]">
            <div>
              Новых: <span className="num font-semibold">{report.rows_new}</span>, дублей:{" "}
              <span className="num font-semibold">{report.rows_duplicate}</span>
            </div>
            {report.rows_error ? <div>Не разобрано строк: {report.rows_error}</div> : null}
            {report.pending_fx ? (
              <div style={{ color: "var(--color-accent-700)" }}>
                Без курса: {report.pending_fx}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rule px-4 py-4">
        <div className="heading mb-2 text-[14px]">Курсы валют</div>
        <p className="mb-3 text-[12px]" style={{ color: "var(--color-neutral-700)" }}>
          Если у части операций не нашлись курсы, их можно догрузить.
        </p>
        <button
          className="btn btn-secondary w-full"
          onClick={() => backfill.mutate()}
          disabled={backfill.isPending}
        >
          {backfill.isPending ? "Гружу…" : "Догрузить курсы"}
        </button>
        {backfill.data ? (
          <div className="mt-3 text-[12px]">
            Догружено: {backfill.data.filled}. Осталось без курса: {backfill.data.pending_left}.
          </div>
        ) : null}
      </section>

      <section className="rule px-4 py-4">
        <div className="heading mb-2 text-[14px]">Настройки</div>
        <div className="text-[12px] leading-[1.7]" style={{ color: "var(--color-neutral-700)" }}>
          <div>
            Базовая валюта:{" "}
            <span className="font-semibold" style={{ color: "var(--color-text)" }}>
              {settings.data?.base_currency ?? "…"}
            </span>
          </div>
          <div>
            Доход по умолчанию:{" "}
            <span className="num font-semibold" style={{ color: "var(--color-text)" }}>
              {settings.data?.default_monthly_income
                ? formatMoney(settings.data.default_monthly_income)
                : "не задан"}
            </span>
          </div>
          <div>
            Не учитываются категории:{" "}
            <span className="font-semibold" style={{ color: "var(--color-text)" }}>
              {settings.data?.excluded_categories.join(", ") || "—"}
            </span>
          </div>
        </div>
        <Link
          href={`/plan?month=${month}`}
          className="btn btn-secondary mt-3 w-full"
        >
          Изменить доход месяца
        </Link>
      </section>

      <section className="px-4 py-4">
        <div className="text-[11.5px]" style={{ color: "var(--color-neutral-600)" }}>
          {isInsideTelegram()
            ? "Запущено внутри Telegram."
            : "Открыто в обычном браузере: часть возможностей Telegram недоступна."}
        </div>
      </section>
      <div className="h-6" />
    </Screen>
  );
}
