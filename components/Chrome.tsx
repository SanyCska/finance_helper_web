"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { bindBackButton, haptic } from "@/lib/telegram";

/** Шапка экрана: заголовок и, при необходимости, кнопка «назад». */
export function Header({
  title,
  back,
  action,
}: {
  title: string;
  back?: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!back) return;
    return bindBackButton(() => router.push(back));
  }, [back, router]);

  return (
    <header
      className="rule flex shrink-0 items-center gap-3 px-4 py-3"
      style={{ background: "var(--color-bg)" }}
    >
      {back ? (
        <Link
          href={back}
          aria-label="Назад"
          className="text-xl leading-none"
          style={{ color: "var(--color-neutral-700)" }}
          onClick={() => haptic()}
        >
          ‹
        </Link>
      ) : null}
      <span className="heading flex-1 text-[17px]">{title}</span>
      {action}
    </header>
  );
}

const TABS = [
  { href: "/", label: "Лента" },
  { href: "/categories", label: "Аналитика" },
  { href: "/plan", label: "План" },
  { href: "/funds", label: "Средства" },
  { href: "/more", label: "Ещё" },
];

const SECTION_BY_PREFIX: { prefix: string; href: string }[] = [
  { prefix: "/categories", href: "/categories" },
  { prefix: "/category", href: "/categories" },
  { prefix: "/compare", href: "/categories" },
  { prefix: "/plan", href: "/plan" },
  { prefix: "/funds", href: "/funds" },
  { prefix: "/more", href: "/more" },
  { prefix: "/transactions", href: "/" },
  { prefix: "/add", href: "/" },
];

function activeTab(pathname: string): string {
  const match = SECTION_BY_PREFIX.find((item) => pathname.startsWith(item.prefix));
  return match ? match.href : "/";
}

export function TabBar() {
  const pathname = usePathname();
  const active = activeTab(pathname);

  return (
    <nav
      className="flex shrink-0"
      style={{ borderTop: "2px solid var(--color-divider)", background: "var(--color-bg)" }}
    >
      {TABS.map((tab, index) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => haptic()}
            className="eyebrow flex-1 pt-3 pb-4 text-center"
            style={{
              // пять вкладок: широкий трекинг «Аналитики» уже не помещается
              letterSpacing: "0.04em",
              fontWeight: isActive ? 800 : 600,
              color: isActive ? "var(--color-accent)" : "var(--color-neutral-700)",
              borderRight:
                index < TABS.length - 1 ? "1px solid var(--color-divider)" : undefined,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Каркас экрана: шапка, прокручиваемое содержимое, таб-бар. */
export function Screen({
  title,
  back,
  action,
  children,
  footer,
}: {
  title: string;
  back?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // высота фиксирована, прокручивается только содержимое:
  // так нижняя панель и кнопка действия всегда остаются на экране
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header title={title} back={back} action={action} />
      <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>
      {footer ? <div className="shrink-0">{footer}</div> : null}
      <TabBar />
    </div>
  );
}
