"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { initTelegram } from "@/lib/telegram";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // данные меняются только при импорте, лишние перезапросы ни к чему
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    initTelegram();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
