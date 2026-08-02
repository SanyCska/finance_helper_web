import { Suspense } from "react";

import { CheckScreen } from "@/components/funds/CheckScreen";
import { Loading } from "@/components/States";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckScreen />
    </Suspense>
  );
}
