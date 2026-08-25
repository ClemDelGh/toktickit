import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function CheckSystem() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
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

      <button className="btn btn-success mb-4" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <div className="p-3 border rounded bg-light">
          <p className="fw-bold text-success mb-2">System Status: Online</p>
          <ul className="list-group">
            {categories.map((cat) => (
              <li key={cat.id} className="list-group-item">
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === "error" && (
        <div className="p-3 border rounded bg-light">
          <p className="fw-bold text-danger mb-1">System Status: Offline</p>
          <p className="text-danger mb-0">Unable to connect to TokTickIT API, try better :3</p>
        </div>
      )}
    </div>
  );
}