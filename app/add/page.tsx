import { Suspense } from "react";

import { Loading } from "@/components/States";
import { AddScreen } from "@/components/tx/AddScreen";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AddScreen />
    </Suspense>
  );
}
