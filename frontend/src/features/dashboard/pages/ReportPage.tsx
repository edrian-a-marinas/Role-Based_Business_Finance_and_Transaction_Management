import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import GenerateReportModal from "../components/GenerateReportModal";
import type { ReportResult } from "../schemas/report";

export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [showModal, setShowModal] = useState(false);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);

  return (
    <div>
      <title>Reports</title>
      <h1>Reports</h1>

      <h3>{userRole === 1 ? "Admin Report (All Users)" : "Your Personal Report"}</h3>

      <button onClick={() => setShowModal(true)}>Generate Report</button>

      {showModal && (
        <GenerateReportModal
          onClose={() => setShowModal(false)}
          onReportGenerated={(data) => setReportResult(data)}
        />
      )}

      {reportResult && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Report Summary</h2>

          <p><strong>Type:</strong> {reportResult.report.report_type}</p>
          <p><strong>Range:</strong> {reportResult.report.start_date} → {reportResult.report.end_date}</p>
          <p><strong>Generated At:</strong> {reportResult.report.created_at}</p>

          <hr />

          {reportResult.summary.length === 0 ? (
            <p>No transactions found in this period.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {reportResult.summary.map((item, index) => (
                <li key={index} style={{ marginBottom: "0.75rem" }}>
                  <strong>{item.category_name}</strong>: ₱{item.total_amount.toFixed(2)}
                  {"week_start" in item && item.week_start && item.week_end && (
                    <div style={{ fontSize: "0.85rem" }}>
                      Week: {item.week_start} → {item.week_end}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}