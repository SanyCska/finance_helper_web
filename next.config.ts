import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // в домашней папке лежит чужой yarn.lock, из-за него Next выбирает не тот корень
  outputFileTracingRoot: import.meta.dirname,
  // Telegram отдаёт Mini App во встроенном вебвью, кэш страниц там только мешает
  headers: async () => [
    {
      source: "/:path*",
      headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
    },
  ],
};

export default config;
