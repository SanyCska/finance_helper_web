import { Suspense } from "react";

import { Loading } from "@/components/States";
import { CategoryScreen } from "@/components/analytics/CategoryScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CategoryScreen />
    </Suspense>
  );
}
