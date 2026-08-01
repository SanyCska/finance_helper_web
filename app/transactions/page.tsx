import { Suspense } from "react";

import { Loading } from "@/components/States";
import { TransactionsScreen } from "@/components/tx/TransactionsScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <TransactionsScreen />
    </Suspense>
  );
}
