import { useState, useContext } from "react";
import type { KeyboardEvent } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { Transaction, Category } from "../schemas/transaction";
import type { OnCloseProps } from "../../../../utility";
import { formatCurrency, fetchTransactionAndCategories } from "../../../../utility";
import { useOutsideClickStrict } from "../../../../utilityHooks";

export default function DeleteTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [transactionId, setTransactionId] = useState<string>("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleFetch = async () => {
    setError("");
    setTransaction(null);

    const idNum = Number(transactionId);
    if (!idNum || idNum <= 0 || idNum > 999) {
      setError("Enter a valid ID between 1 and 999.");
      return;
    }

    try {
      setLoading(true);
      const { transaction, categories } = await fetchTransactionAndCategories(idNum);
      setTransaction(transaction);
      setCategories(categories);
    } catch {
      setError("Transaction not found.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id: number) => {
    const found = categories.find((c) => c.id === id);
    return found ? found.name : "Unknown";
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetch();
  };

  const handleProceed = () => {
    if (!transaction) return;
    setError("");
    if (userRole !== 1) {
      handleRequestDeletion();
    } else {
      setShowConfirmation(true);
    }
  };

  const handleRequestDeletion = async () => {
    if (!transaction || !token || !tokenType) return;
    try {
      setLoading(true);
      setError("");

      await api.post(
        "api/transactions/request-deletion",
        { transaction_id: transactionId },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );

      setRequestSent(true);

    } catch (err: any) {
      // Check if backend returns already requested error
      const detail = err.response?.data?.detail;
      if (detail?.includes("already requested") || detail?.includes("pending")) {
        setError("Deletion request for this transaction has already been submitted and is pending.");
      } else {
        setError(detail || "Failed to request deletion.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!transaction || !token || !tokenType) return;
    try {
      await api.delete(`api/transactions/${transactionId}`, {
        headers: { Authorization: `${tokenType} ${token}` }
      });
      alert("Transaction deleted.");
      onClose();
    } catch {
      setError("Failed to delete transaction.");
    }
  };

  return (
    <>
      {!showConfirmation && !requestSent && (
        <div onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1c1414",
            padding: "1.5rem",
            borderRadius: "8px",
            minWidth: "320px",
            position: "relative"
          }}>
            <button onClick={onClose} style={{
              position: "absolute",
              top: "8px",
              right: "12px",
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: "22px",
              fontWeight: "bold",
              cursor: "pointer"
            }}>×</button>

            <h2 style={{ textAlign: "center" }}>
              {userRole === 1 ? "Delete Transaction" : "Request Delete Transaction"}
            </h2>

            {!transaction && (
              <>
                <input
                  type="number"
                  value={transactionId}
                  placeholder="Enter Transaction ID"
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d{0,3}$/.test(val)) setTransactionId(val);
                  }}
                  onKeyDown={handleKeyPress}
                  style={{ width: "100%", marginBottom: "1rem" }}
                />
                <button onClick={handleFetch}>Load Transaction</button>
              </>
            )}

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {transaction && (
              <div style={{ marginBottom: "1rem" }}>
                <p><strong>ID:</strong> {transactionId}</p>
                <p><strong>Amount:</strong> {formatCurrency(transaction.amount)}</p>
                <p><strong>Category:</strong> {getCategoryName(transaction.category_id)}</p>
                <p><strong>Type:</strong> {transaction.transaction_type}</p>
                <p><strong>Description:</strong> {transaction.description}</p>
                <p><strong>Date:</strong> {transaction.transaction_date}</p>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setTransaction(null);
                      setError("");
                    }}
                  >
                    Back
                  </button>
                  <button onClick={handleProceed}>
                    {userRole === 1 ? "Delete" : "Request Deletion"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmation && transaction && (
        <div onClick={() => setShowConfirmation(false)} style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1c1414",
            padding: "1.5rem",
            borderRadius: "8px",
            minWidth: "320px",
            position: "relative"
          }}>
            <button onClick={() => setShowConfirmation(false)} style={{
              position: "absolute",
              top: "8px",
              right: "12px",
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: "22px",
              fontWeight: "bold",
              cursor: "pointer"
            }}>×</button>

            {/* <-- Conditional Title -->
                If admin: "Confirm Delete", else: "Request Deletion" */}
            <h2 style={{ textAlign: "center" }}>
              {userRole === 1 ? "Confirm Delete" : "Request Deletion"}
            </h2>

            <p><strong>ID:</strong> {transactionId}</p>
            <p><strong>Amount:</strong> {formatCurrency(transaction.amount)}</p>
            <p><strong>Category:</strong> {getCategoryName(transaction.category_id)}</p>
            <p><strong>Type:</strong> {transaction.transaction_type}</p>
            <p><strong>Description:</strong> {transaction.description}</p>
            <p><strong>Date:</strong> {transaction.transaction_date}</p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setError("");
                }}
              >
                Back
              </button>
              <button onClick={userRole === 1 ? handleConfirmDelete : handleRequestDeletion}>
                {userRole === 1 ? "Confirm Deletion" : "Request Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {requestSent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{
            background: "#1c1414",
            padding: "1.5rem",
            borderRadius: "8px",
            minWidth: "320px",
            position: "relative"
          }}>
            <button onClick={onClose} style={{
              position: "absolute",
              top: "8px",
              right: "12px",
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: "22px",
              fontWeight: "bold",
              cursor: "pointer"
            }}>×</button>

            <h2 style={{ textAlign: "center" }}>Request Sent</h2>
            <p>Your deletion request has been submitted and is pending admin approval.</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}