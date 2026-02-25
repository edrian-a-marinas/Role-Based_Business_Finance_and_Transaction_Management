import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import GenerateReportModal from "../components/GenerateReportModal";

export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  return (
    <div>
      <title>Reports</title>
      <h1>Reports</h1>

      <h3>
        {userRole === 1
          ? "Admin Report (All Users)"
          : "Your Personal Report"}
      </h3>

      <button onClick={() => setShowGenerateModal(true)}>Generate Report</button>

      {showGenerateModal && <GenerateReportModal onClose={() => setShowGenerateModal(false)} />}
    </div>
  );
}