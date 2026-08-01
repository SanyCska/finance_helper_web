import { Suspense } from "react";

import { Loading } from "@/components/States";
import { MoreScreen } from "@/components/MoreScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MoreScreen />
    </Suspense>
  );
}
