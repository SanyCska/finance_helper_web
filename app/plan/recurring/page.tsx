import { Suspense } from "react";

import { RecurringScreen } from "@/components/plan/RecurringScreen";
import { Loading } from "@/components/States";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <RecurringScreen />
    </Suspense>
  );
}
