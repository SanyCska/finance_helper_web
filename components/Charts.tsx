"use client";

import { barPercent, barScale } from "@/lib/bars";
import { conicGradient, donutSegments, type DonutInput } from "@/lib/donut";
import { formatMoney, formatMonthShort, toNumber } from "@/lib/format";
import { trendOffset, trendPercent, trendScale } from "@/lib/trend";

/** Донат с подписью в центре — как на мокапах 2b и 2f. */
export function Donut({
  items,
  size = 110,
  hole = 0.6,
  caption,
  value,
}: {
  items: DonutInput[];
  size?: number;
  hole?: number;
  caption: string;
  value: string;
}) {
  const segments = donutSegments(items);
  const holeSize = Math.round(size * hole);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: conicGradient(segments) }}
      role="img"
      aria-label={`${caption}: ${value}`}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full"
        style={{ width: holeSize, height: holeSize, background: "var(--color-bg)" }}
      >
        <span
          className="eyebrow"
          style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--color-neutral-700)" }}
        >
          {caption}
        </span>
        <span className="heading num" style={{ fontSize: size > 130 ? 20 : 16 }}>
          {value}
        </span>
      </div>
    </div>
  );
}

/** Строка категории с полоской — мокап 2b, блок «Топ категорий». */
export function BarRow({
  label,
  amount,
  color,
  widthPct,
  delta,
  currency,
  onClick,
}: {
  label: string;
  amount: string | number;
  color: string;
  widthPct: number;
  delta?: string | null;
  currency?: string;
  onClick?: () => void;
}) {
  const deltaValue = delta === null || delta === undefined ? null : toNumber(delta);
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper className="block w-full text-left" onClick={onClick}>
      <div className="mb-[5px] flex items-center gap-2">
        <span className="size-[9px] shrink-0" style={{ background: color }} />
        <span className="flex-1 truncate text-[13px] font-semibold">{label}</span>
        <span className="num text-[13px] font-semibold">
          {formatMoney(amount, { currency })}
        </span>
        {deltaValue === null ? (
          <span className="w-11" />
        ) : (
          <span
            className="num w-11 text-right text-[11.5px] font-extrabold"
            style={{
              color: deltaValue >= 0 ? "var(--color-accent)" : "var(--color-neutral-600)",
            }}
          >
            {`${deltaValue >= 0 ? "+" : "−"}${Math.abs(Math.round(deltaValue * 100))}%`}
          </span>
        )}
      </div>
      <div className="h-[6px]" style={{ background: "var(--color-neutral-300)" }}>
        <div
          className="h-full"
          style={{ width: `${Math.max(2, Math.min(100, widthPct))}%`, background: color }}
        />
      </div>
    </Wrapper>
  );
}

/** Столбцы по месяцам — мокап 2g. */
export function MonthlyBars({
  points,
  currency,
  average,
  onSelect,
  selected,
}: {
  points: { month: string; amount: string | number }[];
  currency?: string;
  average?: string | number;
  onSelect?: (month: string) => void;
  selected?: string;
}) {
  const values = points.map((point) => toNumber(point.amount));
  const scale = barScale(values);
  const averageValue = average === undefined ? null : toNumber(average);
  // если выбранный месяц вне окна, подсвечиваем последний столбец
  const highlighted = points.some((point) => point.month === selected)
    ? selected
    : points.at(-1)?.month;

  return (
    <div>
      {/* столбики позиционируем от низа кнопки, а не флексом внутри неё:
          в WebKit кнопка не работает как flex-контейнер, и процентная высота
          вложенного столбика схлопывалась в ноль — график выходил пустым */}
      <div className="relative flex gap-[3px]" style={{ height: 150 }}>
        {averageValue !== null && averageValue > 0 ? (
          <div
            className="pointer-events-none absolute right-0 left-0"
            style={{
              bottom: `${barPercent(averageValue, scale)}%`,
              borderTop: "1px dashed var(--color-neutral-500)",
            }}
          />
        ) : null}
        {points.map((point, index) => {
          const value = values[index];
          const isSelected = point.month === highlighted;
          return (
            <button
              key={point.month}
              className="relative flex-1"
              onClick={() => onSelect?.(point.month)}
              aria-label={`${point.month}: ${formatMoney(value, { currency })}`}
            >
              <span
                className="absolute right-0 bottom-0 left-0 block"
                style={{
                  height: `${barPercent(value, scale)}%`,
                  background: isSelected ? "var(--color-accent)" : "var(--color-neutral-400)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px]">
        {points.map((point) => (
          <span
            key={point.month}
            className="flex-1 text-center text-[9px]"
            style={{
              color:
                point.month === highlighted
                  ? "var(--color-text)"
                  : "var(--color-neutral-600)",
            }}
          >
            {formatMonthShort(point.month)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Двусторонняя полоса для сравнения месяцев — мокап 2h. */
export function CompareRow({
  label,
  amountA,
  amountB,
  max,
  currency,
}: {
  label: string;
  amountA: string | number;
  amountB: string | number;
  max: number;
  currency?: string;
}) {
  const a = toNumber(amountA);
  const b = toNumber(amountB);
  const diff = b - a;

  return (
    <div className="rule-thin py-3">
      <div className="mb-[6px] flex items-baseline gap-2">
        <span className="flex-1 truncate text-[13px] font-semibold">{label}</span>
        <span
          className="num text-[11.5px] font-extrabold"
          style={{ color: diff > 0 ? "var(--color-accent)" : "var(--color-neutral-600)" }}
        >
          {diff === 0 ? "—" : `${diff > 0 ? "+" : "−"}${formatMoney(Math.abs(diff), { currency })}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="num w-14 shrink-0 text-right text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
          {formatMoney(a, { currency })}
        </span>
        <div className="flex flex-1 flex-col gap-[3px]">
          <div className="h-[6px]" style={{ background: "var(--color-neutral-200)" }}>
            <div
              className="h-full"
              style={{ width: `${(a / max) * 100}%`, background: "var(--color-neutral-500)" }}
            />
          </div>
          <div className="h-[6px]" style={{ background: "var(--color-neutral-200)" }}>
            <div
              className="h-full"
              style={{ width: `${(b / max) * 100}%`, background: "var(--color-accent)" }}
            />
          </div>
        </div>
        <span className="num w-14 shrink-0 text-[11px] font-semibold">
          {formatMoney(b, { currency })}
        </span>
      </div>
    </div>
  );
}


/**
 * Линия остатка по месяцам.
 *
 * Остаток — это не величина, которую сравнивают с нулём, а уровень, который
 * куда-то движется. Столбиками такое читается неправильно: от нуля они все
 * одинаковой высоты, а от «чуть ниже минимума» изменение в пять процентов
 * выглядит кратным. Линия показывает направление, а подписи по краям шкалы
 * говорят, в каких пределах она гуляет.
 */
export function BalanceTrend({
  points,
  currency,
  selected,
}: {
  points: { month: string; amount: string | number }[];
  currency?: string;
  /** месяц, чью точку подсвечиваем; по умолчанию — последняя */
  selected?: string;
}) {
  const values = points.map((point) => toNumber(point.amount));
  const scale = trendScale(values);
  const highlighted = points.some((point) => point.month === selected)
    ? selected
    : points.at(-1)?.month;

  const height = 120;
  const coords = values.map((value, index) => ({
    x: trendOffset(index, values.length),
    y: 100 - trendPercent(value, scale),
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const startLevel = values.length ? 100 - trendPercent(values[0], scale) : 50;

  return (
    <div>
      {/* пределы окна: шкала у линии не от нуля, и это надо сказать вслух */}
      {values.length > 1 ? (
        <div
          className="num mb-1 text-right text-[9px]"
          style={{ color: "var(--color-neutral-600)" }}
        >
          {formatMoney(Math.min(...values), { currency })} —{" "}
          {formatMoney(Math.max(...values), { currency })}
        </div>
      ) : null}
      <div className="relative" style={{ height }}>
        {/* уровень первого месяца: видно, вернулся остаток к нему или нет */}
        <div
          className="pointer-events-none absolute right-0 left-0"
          style={{ top: `${startLevel}%`, borderTop: "1px dashed var(--color-neutral-400)" }}
        />
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polyline
            points={line}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            // иначе растяжение по ширине раздавило бы линию по вертикали
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((point, index) => {
          const isHighlighted = point.month === highlighted;
          const size = isHighlighted ? 9 : 5;
          return (
            <span
              key={point.month}
              className="absolute block rounded-full"
              title={`${formatMonthShort(point.month)}: ${formatMoney(values[index], { currency })}`}
              style={{
                left: `${coords[index].x}%`,
                top: `${coords[index].y}%`,
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                background: isHighlighted ? "var(--color-accent)" : "var(--color-neutral-500)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex">
        {points.map((point) => (
          <span
            key={point.month}
            className="flex-1 text-center text-[9px]"
            style={{
              color:
                point.month === highlighted ? "var(--color-text)" : "var(--color-neutral-600)",
            }}
          >
            {formatMonthShort(point.month)}
          </span>
        ))}
      </div>
    </div>
  );
}
