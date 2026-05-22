import { useState, useContext } from "react";
import type { KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Search, Trash2, CheckCircle } from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Transaction, Category } from "@/features/dashboard/schemas/transaction";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import { formatCurrency, fetchTransactionAndCategories } from "@/features/dashboard/lib/utility";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";
import Shell from "./shared/Shell";
import ModalHeader from "./shared/ModalHeader";
import ErrorBox from "./shared/ErrorBox";
import InfoRow from "./shared/InfoRow";
import { C, inputStyle, labelStyle } from "./shared";
// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeleteTransaction({ onClose }: OnCloseProps) {
  const { user }  = useContext(AuthContext);
  const isAdmin   = user!.role_id === 1;
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const queryClient = useQueryClient(); // ✅ top level
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");
  const [transactionId,    setTransactionId]    = useState("");
  const [transaction,      setTransaction]      = useState<Transaction | null>(null);
  const [categories,       setCategories]       = useState<Category[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [requestSent,      setRequestSent]      = useState(false);
  const [focusedField,     setFocusedField]     = useState<string | null>(null);
  const getCategoryName = (id: number) =>
    categories.find(c => c.id === id)?.name ?? "Unknown";
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
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetch();
  };
  const handleProceed = () => {
    if (!transaction) return;
    setError("");
    isAdmin ? setShowConfirmation(true) : handleRequestDeletion();
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
      const detail = err.response?.data?.detail;
      if (detail?.includes("already requested") || detail?.includes("pending")) {
        setError("A deletion request for this transaction is already pending.");
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
        headers: { Authorization: `${tokenType} ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] }); // ✅ now works
      alert("Transaction deleted.");
      onClose();
    } catch {
      setError("Failed to delete transaction.");
    }
  };
  // ── Step 1 — ID lookup ────────────────────────────────────────────────────
  if (!transaction && !requestSent) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title={isAdmin ? "Delete Transaction" : "Request Deletion"}
          subtitle="Enter the transaction ID to load"
          onClose={onClose}
        />
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}></div>
          <label style={labelStyle}>Transaction ID</label>
          <div style={{ position: "relative" }}>
            <input
              value={transactionId}
              placeholder="e.g. 42"
              onChange={e => {
                const val = e.target.value;
                if (/^\d{0,3}$/.test(val)) setTransactionId(val);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedField("id")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, paddingRight: "2.5rem", borderColor: focusedField === "id" ? C.borderFoc : C.border }}
            />
            <Search style={{
              position: "absolute", right: "0.75rem", top: "50%",
              transform: "translateY(-50%)", width: "0.9rem", height: "0.9rem",
              color: C.fgMuted, pointerEvents: "none",
            }} />
          </div>
        </div>
        <ErrorBox message={error} />
        {loading && <p style={{ color: C.fgMuted, fontSize: "0.8rem", margin: "0 0 1rem" }}>Loading…</p>}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleFetch}
            disabled={loading || !transactionId}
            style={{
              flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
              border: "none",
              background: !transactionId ? C.surfaceEl : C.primary,
              color: !transactionId ? C.fgMuted : "#fff",
              fontSize: "0.875rem", fontWeight: 600,
              cursor: !transactionId ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            Load Transaction <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
          </button>
        </div>
      </div>
    </Shell>
  );
  // ── Step 2 — Review transaction ───────────────────────────────────────────
  if (transaction && !showConfirmation && !requestSent) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title={isAdmin ? "Delete Transaction" : "Request Deletion"}
          subtitle={`ID #${transactionId} · review before proceeding`}
          onClose={onClose}
        />
        <div style={{
          backgroundColor: isAdmin ? "hsl(0 72% 51% / 0.08)" : "hsl(30 90% 56% / 0.08)",
          border:          `1px solid ${isAdmin ? C.expense : C.warning}40`,
          borderRadius:    "0.5rem",
          padding:         "0.6rem 0.75rem",
          marginBottom:    "1.25rem",
          display:         "flex",
          alignItems:      "center",
          gap:             "0.5rem",
        }}>
          <Trash2 style={{ width: "0.9rem", height: "0.9rem", color: isAdmin ? C.expense : C.warning, flexShrink: 0 }} />
          <p style={{ color: isAdmin ? C.expense : C.warning, fontSize: "0.78rem", margin: 0, lineHeight: "1.4" }}>
            {isAdmin
              ? "This will permanently delete the transaction and cannot be undone."
              : "This will submit a deletion request for admin approval."}
          </p>
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <InfoRow label="Amount"      value={formatCurrency(transaction.amount)}
            color={transaction.transaction_type === "Income" ? C.income : C.expense} />
          <InfoRow label="Category"    value={getCategoryName(transaction.category_id)} />
          <InfoRow label="Type"        value={transaction.transaction_type}
            color={transaction.transaction_type === "Income" ? C.income : C.expense} />
          <InfoRow label="Description" value={transaction.description || "—"} />
          <InfoRow label="Date"        value={transaction.transaction_date} />
          {isAdmin && transaction.user_id && (
            <InfoRow label="Created by" value={`User ID ${transaction.user_id}`} />
          )}
        </div>
        <ErrorBox message={error} />
        {loading && <p style={{ color: C.fgMuted, fontSize: "0.8rem", margin: "0 0 1rem" }}>Processing…</p>}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => { setTransaction(null); setError(""); }}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
          </button>
          <button
            onClick={handleProceed}
            style={{
              flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
              border: "none",
              background: isAdmin ? C.expense : C.warning,
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <Trash2 style={{ width: "0.85rem", height: "0.85rem" }} />
            {isAdmin ? "Proceed to Delete" : "Request Deletion"}
          </button>
        </div>
      </div>
    </Shell>
  );
  // ── Step 3 — Admin confirm delete ─────────────────────────────────────────
  if (showConfirmation && transaction) return (
    <Shell>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title="Confirm Deletion"
          subtitle={`You are about to permanently delete ID #${transactionId}`}
          onClose={() => setShowConfirmation(false)}
        />
        <div style={{
          background:   "hsl(0 72% 51% / 0.06)",
          border:       `1px solid ${C.expense}`,
          borderRadius: "0.75rem",
          padding:      "1rem",
          marginBottom: "1.25rem",
        }}>
          <InfoRow label="Amount"      value={formatCurrency(transaction.amount)}
            color={transaction.transaction_type === "Income" ? C.income : C.expense} />
          <InfoRow label="Category"    value={getCategoryName(transaction.category_id)} />
          <InfoRow label="Type"        value={transaction.transaction_type}
            color={transaction.transaction_type === "Income" ? C.income : C.expense} />
          <InfoRow label="Description" value={transaction.description || "—"} />
          <InfoRow label="Date"        value={transaction.transaction_date} />
          {isAdmin && transaction.user_id && (
            <InfoRow label="Created by" value={`User ID ${transaction.user_id}`} />
          )}
        </div>
        <ErrorBox message={error} />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => { setShowConfirmation(false); setError(""); }}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
          </button>
          <button
            onClick={handleConfirmDelete}
            style={{
              flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
              border: `1px solid ${C.expense}`, background: "hsl(0 72% 51% / 0.15)",
              color: C.expense, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <Trash2 style={{ width: "0.85rem", height: "0.85rem" }} /> Confirm Delete
          </button>
        </div>
      </div>
    </Shell>
  );
  // ── Request sent success ──────────────────────────────────────────────────
  if (requestSent) return (
    <Shell>
      <div style={{ padding: "1.75rem" }}>
        <div style={{ textAlign: "center", padding: "0.5rem 0 1.5rem" }}>
          <div style={{
            width:           "3rem",
            height:          "3rem",
            borderRadius:    "50%",
            backgroundColor: "hsl(160 60% 45% / 0.12)",
            border:          `1px solid ${C.income}`,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            margin:          "0 auto 1rem",
          }}>
            <CheckCircle style={{ width: "1.4rem", height: "1.4rem", color: C.income }} />
          </div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: "0 0 0.4rem" }}>
            Request Sent
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.8rem", lineHeight: "1.5", margin: 0 }}>
            Your deletion request has been submitted and is pending admin approval.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: C.primary,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </Shell>
  );
  return null;
}