/** Обёртка над Telegram WebApp. Вне Telegram всё вырождается в no-op. */

type BackButton = {
  show: () => void;
  hide: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
};

type HapticFeedback = {
  impactOccurred: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
};

type TelegramWebApp = {
  initData: string;
  colorScheme: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  BackButton: BackButton;
  HapticFeedback?: HapticFeedback;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function webApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isInsideTelegram(): boolean {
  const app = webApp();
  return Boolean(app && app.initData);
}

export function getInitData(): string {
  return webApp()?.initData ?? "";
}

/** Вызывается один раз при монтировании приложения. */
export function initTelegram(): void {
  const app = webApp();
  if (!app) return;
  app.ready();
  app.expand();
  app.setHeaderColor?.("#f3f2f2");
  app.setBackgroundColor?.("#f3f2f2");
}

export function haptic(style: "light" | "medium" | "heavy" = "light"): void {
  webApp()?.HapticFeedback?.impactOccurred(style);
}

export function notify(type: "error" | "success" | "warning"): void {
  webApp()?.HapticFeedback?.notificationOccurred(type);
}

/**
 * Показывает системную кнопку «назад» и вешает обработчик.
 * Возвращает функцию отписки. Это не хук — вызывать внутри `useEffect`.
 */
export function bindBackButton(handler: () => void): () => void {
  const app = webApp();
  if (!app) return () => {};
  app.BackButton.show();
  app.BackButton.onClick(handler);
  return () => {
    app.BackButton.offClick(handler);
    app.BackButton.hide();
  };
}
