"use client";

import { useMemo, useState } from "react";

import { categoryLabel } from "@/lib/format";
import { haptic } from "@/lib/telegram";

/** Сколько подсказок показываем, пока пользователь не сузил поиск. */
const VISIBLE = 8;

/**
 * Выбор категорий трат.
 *
 * Нативный `datalist` не подошёл: он ищет с учётом регистра и только по началу
 * строки, поэтому «путешествия» не находили «Путешествия». Здесь поиск идёт
 * по вхождению без учёта регистра, а список отсортирован по алфавиту —
 * в полусотне имён иначе не найти нужное.
 *
 * Выбранное показывается чипами: одной строке плана вроде «еда» отвечают
 * сразу несколько категорий выгрузки, поэтому выбор множественный.
 */
export function CategoryPicker({
  selected,
  options,
  onChange,
  placeholder = "не связаны с фактом",
  multiple = true,
}: {
  selected: string[];
  options: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  multiple?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...new Set(options.filter((name) => name.trim() !== ""))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    [options],
  );

  const needle = query.trim().toLocaleLowerCase("ru");
  const matches = sorted.filter(
    (name) =>
      !selected.includes(name) && (!needle || name.toLocaleLowerCase("ru").includes(needle)),
  );
  const shown = needle ? matches : matches.slice(0, VISIBLE);

  const add = (name: string) => {
    haptic();
    onChange(multiple ? [...selected, name] : [name]);
    setQuery("");
    if (!multiple) setOpen(false);
  };

  const remove = (name: string) => {
    haptic();
    onChange(selected.filter((item) => item !== name));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((name) => (
          <button
            key={name}
            className="tag tag-accent"
            onClick={() => remove(name)}
            aria-label={`Убрать категорию ${categoryLabel(name)}`}
          >
            {categoryLabel(name)}
            <span className="ml-1 opacity-60">×</span>
          </button>
        ))}
        <input
          className="min-w-[120px] flex-1 bg-transparent text-[11.5px] outline-none"
          style={{ color: "var(--color-neutral-700)" }}
          placeholder={selected.length ? "добавить ещё" : placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // закрываем с задержкой: иначе blur съедает нажатие на подсказку
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && shown.length ? (
        <div
          className="mt-1 flex flex-wrap gap-1.5 py-1"
          style={{ borderTop: "1px solid var(--color-divider)" }}
        >
          {shown.map((name) => (
            <button
              key={name}
              className="tag tag-neutral"
              // mousedown срабатывает до blur — иначе список успел бы закрыться
              onMouseDown={(event) => {
                event.preventDefault();
                add(name);
              }}
            >
              {categoryLabel(name)}
            </button>
          ))}
        </div>
      ) : null}

      {open && needle && !shown.length ? (
        <div className="mt-1 text-[11px]" style={{ color: "var(--color-neutral-600)" }}>
          Ничего не нашлось
        </div>
      ) : null}
    </div>
  );
}
