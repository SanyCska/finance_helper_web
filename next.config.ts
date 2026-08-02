import type { NextConfig } from "next";

// Куда проксировать запросы к API. Прокси нужен, чтобы Mini App ходила в бэкенд
// с того же origin: страница отдаётся по https через туннель, а прямой запрос
// на http://localhost браузер заблокировал бы как смешанное содержимое.
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8010";

const config: NextConfig = {
  output: "standalone",
  // в домашней папке лежит чужой yarn.lock, из-за него Next выбирает не тот корень
  outputFileTracingRoot: import.meta.dirname,
  // Mini App открывается через туннель, а не с localhost: без этого списка
  // dev-сервер режет запросы к /_next/* с чужого хоста и ломает подгрузку чанков
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ],
  rewrites: async () => [
    { source: "/api/:path*", destination: `${API_TARGET}/api/:path*` },
  ],
  // Telegram отдаёт Mini App во встроенном вебвью, кэш страниц там только мешает
  headers: async () => [
    {
      source: "/:path*",
      headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
    },
  ],
};

export default config;
