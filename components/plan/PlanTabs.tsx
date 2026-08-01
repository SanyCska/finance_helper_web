"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/plan", label: "Планирую", exact: true },
  { href: "/plan/vs-fact", label: "План vs факт", exact: false },
];

export function PlanTabs({ month }: { month: string }) {
  const pathname = usePathname();

  return (
    <div className="rule flex">
      {TABS.map((tab, index) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
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
