import { Suspense } from "react";

import { Loading } from "@/components/States";
import { CategoriesScreen } from "@/components/analytics/CategoriesScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CategoriesScreen />
    </Suspense>
  );
}
