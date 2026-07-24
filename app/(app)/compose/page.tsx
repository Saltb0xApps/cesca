import Composer from "../_components/composer";
import { ToastProvider } from "../_components/toast";

export const dynamic = "force-dynamic";

export default function ComposePage() {
  return (
    <ToastProvider>
      <div className="main-header">
        <h1 className="page-title">New post</h1>
      </div>
      <div className="main-content">
        <Composer />
      </div>
    </ToastProvider>
  );
}
