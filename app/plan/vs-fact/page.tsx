import { Suspense } from "react";

import { Loading } from "@/components/States";
import { PlanVsFactScreen } from "@/components/plan/PlanVsFactScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PlanVsFactScreen />
    </Suspense>
  );
}
