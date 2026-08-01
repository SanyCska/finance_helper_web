import { Suspense } from "react";

import { Loading } from "@/components/States";
import { PlanScreen } from "@/components/plan/PlanScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PlanScreen />
    </Suspense>
  );
}
