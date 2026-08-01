import { Suspense } from "react";

import { Loading } from "@/components/States";
import { CompareScreen } from "@/components/analytics/CompareScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CompareScreen />
    </Suspense>
  );
}
