"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/categories", label: "Категории" },
  { href: "/category", label: "Динамика" },
  { href: "/compare", label: "Сравнение" },
];

/** Переключатель разделов аналитики — общий для мокапов 2f, 2g, 2h. */
export function AnalyticsTabs({ month }: { month: string }) {
  const pathname = usePathname();

  return (
    <div className="rule flex">
      {TABS.map((tab, index) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={`${tab.href}?month=${month}`}
            className="flex-1 py-[9px] text-center text-[12.5px]"
            style={{
              fontWeight: isActive ? 800 : 600,
              background: isActive ? "var(--color-accent)" : undefined,
              color: isActive ? "var(--color-bg)" : "var(--color-neutral-700)",
              borderRight: index < TABS.length - 1 ? "1px solid var(--color-divider)" : undefined,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
