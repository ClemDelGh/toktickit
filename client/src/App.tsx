import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
  try {
      await checkSystem();
      setState("success");
    } catch (err) {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button 
        className="btn btn-success mb-4" 
        onClick={handleCheck} 
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {/* Affichage conditionnel selon l'état */}
      {state === "success" && (
        <div className="p-3 border rounded bg-light">
          <p className="fw-bold mb-0">System Status: <span className="text-success">Online</span></p>
        </div>
      )}

      {state === "error" && (
        <div className="p-3 border rounded bg-light">
          <p className="fw-bold">System Status: <span className="text-danger">Offline</span></p>
          <p className="text-danger mb-0">Unable to connect to TokTickIT API</p>
        </div>
      )}
    </div>
  );
}
