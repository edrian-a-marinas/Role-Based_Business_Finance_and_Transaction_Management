import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import { GenerateReport } from "../components/modals";
import type { ReportMode } from "../schemas/report"

export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [activeMode, setActiveMode] = useState<ReportMode | null>(null);

  return (
    <div>
      <title>Reports</title>
      <h1>Reports</h1>

      <h3>
        {userRole === 1
          ? "Admin Report (All Users)"
          : "Your Personal Report"}
      </h3>

      <button onClick={() => setActiveMode("income")}>
        Income Report
      </button>

      <button onClick={() => setActiveMode("expense")}>
        Expense Report
      </button>

      <button onClick={() => setActiveMode("combined")}>
        Combined Report
      </button>

      {activeMode && (
        <GenerateReport
          reportMode={activeMode}
          onClose={() => setActiveMode(null)}
        />
      )}
    </div>
  );
}