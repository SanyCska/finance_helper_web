import { Suspense } from "react";

import { CategoryScreen } from "@/components/analytics/CategoryScreen";
import { Loading } from "@/components/States";

// вкладка «Динамика» ведёт сюда без категории: экран сам предложит выбрать
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CategoryScreen />
    </Suspense>
  );
}
