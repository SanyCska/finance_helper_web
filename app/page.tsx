import { Suspense } from "react";

import { HomeScreen } from "@/components/home/HomeScreen";
import { Loading } from "@/components/States";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeScreen />
    </Suspense>
  );
}
