import { Suspense } from "react";
import { RoomScreen } from "@/components/RoomScreen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="page center">
          <p className="muted">Abrindo a sala…</p>
        </main>
      }
    >
      <RoomScreen />
    </Suspense>
  );
}
