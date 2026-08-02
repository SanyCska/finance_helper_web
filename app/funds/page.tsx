import { Suspense } from "react";

import { FundsScreen } from "@/components/funds/FundsScreen";
import { Loading } from "@/components/States";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <FundsScreen />
    </Suspense>
  );
}
