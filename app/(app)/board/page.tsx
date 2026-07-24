import Board from "../_components/board";
import { ToastProvider } from "../_components/toast";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  return (
    <ToastProvider>
      <Board />
    </ToastProvider>
  );
}
