import { useState, useEffect, useContext } from "react";
import type { ChangeEvent } from "react";
import { X, ChevronRight, ChevronLeft, Info } from "lucide-react";

import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { Transaction } from "@/features/dashboard/schemas/transaction";
import { transactionSchema } from "@/features/dashboard/schemas/transaction";
import type { CategoryRead } from "@/features/dashboard/schemas/category";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";

// Same tokens as DashboardPage / DashboardOverview
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  muted:      "hsl(220,10%,46%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  border:     "hsl(220,16%,22%)",
  borderFoc:  "hsl(199,89%,38%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  error:      "hsl(0,72%,60%)",
  overlay:    "rgba(0,0,0,0.55)",
  tooltip:    "hsl(220,20%,8%)",
};

const inputStyle: React.CSSProperties = {
  width:           "100%",
  backgroundColor: C.surfaceEl,
  border:          `1px solid ${C.border}`,
  borderRadius:    "0.5rem",
  color:           C.fg,
  fontSize:        "0.875rem",
  padding:         "0.5rem 0.75rem",
  outline:         "none",
  transition:      "border-color 0.15s",
  boxSizing:       "border-box",
};

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "0.75rem",
  fontWeight:    500,
  color:         C.fgMuted,
  marginBottom:  "0.35rem",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

// ── Tooltip component ─────────────────────────────────────────────────────────
function CategoryTooltip({ description }: { description: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          background:   "transparent",
          border:       "none",
          padding:      "0 0 0 0.3rem",
          cursor:       "help",
          display:      "inline-flex",
          alignItems:   "center",
          color:        description ? C.primary : C.muted,
          opacity:      description ? 1 : 0.4,
          lineHeight:   1,
        }}
        aria-label="Category description"
      >
        <Info style={{ width: "0.85rem", height: "0.85rem" }} />
      </button>

      {visible && description && (
        <div
          role="tooltip"
          style={{
            position:      "absolute",
            bottom:        "calc(100% + 8px)",
            left:          "50%",
            transform:     "translateX(-50%)",
            backgroundColor: C.tooltip,
            border:        `1px solid ${C.border}`,
            borderRadius:  "0.5rem",
            padding:       "0.6rem 0.75rem",
            width:         "220px",
            zIndex:        100,
            pointerEvents: "none",
            boxShadow:     "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {/* Arrow */}
          <div style={{
            position:    "absolute",
            bottom:      "-5px",
            left:        "50%",
            transform:   "translateX(-50%) rotate(45deg)",
            width:       "8px",
            height:      "8px",
            background:  C.tooltip,
            borderRight: `1px solid ${C.border}`,
            borderBottom:`1px solid ${C.border}`,
          }} />
          <p style={{
            color:      C.fg,
            fontSize:   "0.75rem",
            lineHeight: "1.45",
            margin:     0,
          }}>
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Shell lives OUTSIDE the main component so React never remounts it on re-render
// (defining a component inside another component gives it a new identity every render,
//  which unmounts/remounts the DOM and kills input focus after every keystroke)
interface ShellProps {
  children:        React.ReactNode;
  onBackdropDown?: React.MouseEventHandler;
  onBackdropUp?:   React.MouseEventHandler;
}
function Shell({ children, onBackdropDown, onBackdropUp }: ShellProps) {
  return (
    <div
      onMouseDown={onBackdropDown}
      onMouseUp={onBackdropUp}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: C.overlay,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          50,
        padding:         "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:   C.surface,
          border:       `1px solid ${C.border}`,
          borderRadius: "1rem",
          width:        "100%",
          maxWidth:     "420px",
          padding:      "1.75rem",
          position:     "relative",
          boxShadow:    "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [categories,       setCategories]       = useState<CategoryRead[]>([]);
  const [errors,           setErrors]           = useState<string[]>([]);
  const [focusedField,     setFocusedField]     = useState<string | null>(null);
  const [amountInput,      setAmountInput]      = useState("");

  const [form, setForm] = useState<Transaction>({
    amount:           0,
    description:      "",
    category_id:      0,
    transaction_type: "",
    transaction_date: "",
  });

  // Fetch categories whenever transaction type changes
  useEffect(() => {
    if (!form.transaction_type) { setCategories([]); return; }
    const endpoint =
      form.transaction_type === "Expense"
        ? "api/categories/expense"
        : "api/categories/income";
    api.get<CategoryRead[]>(endpoint).then(res => {
      setCategories(res.data);
      setForm(prev => ({ ...prev, category_id: 0 }));
    });
  }, [form.transaction_type]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "category_id" ? Number(value) : value }));
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*\.?\d*$/.test(value)) return;
    const parts = value.split(".");
    if (parts[1]?.length > 2) parts[1] = parts[1].slice(0, 2);
    setAmountInput(parts.join("."));
  };

  const handleSubmit = () => {
    const updatedForm = { ...form, amount: Number(amountInput) };
    const result = transactionSchema.safeParse(updatedForm);
    if (!result.success) {
      setErrors(result.error.issues.map(i => i.message));
      return;
    }
    setErrors([]);
    setForm(updatedForm);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      if (!user) return;
      if (!token || !tokenType) return alert("Not authorized");
      await api.post("api/transactions/", form, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      alert("Successfully created!");
      setForm({ amount: 0, description: "", category_id: 0, transaction_type: "", transaction_date: "" });
      setAmountInput("");
      setShowConfirmation(false);
      onClose();
    } catch (err: any) {
      console.error(err?.response?.data);
    }
  };

  // Derive selected category for tooltip + confirm screen
  const selectedCategory = categories.find(c => c.id === form.category_id) ?? null;

  // ── Form view ────────────────────────────────────────────────────────────────
  if (!showConfirmation) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Add Transaction
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            Fill in the details below
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background:   "transparent",
            border:       `1px solid ${C.border}`,
            borderRadius: "0.5rem",
            color:        C.fgMuted,
            cursor:       "pointer",
            padding:      "0.3rem",
            display:      "flex",
            alignItems:   "center",
            lineHeight:   1,
          }}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          backgroundColor: "hsl(0 72% 51% / 0.1)",
          border:          `1px solid ${C.error}`,
          borderRadius:    "0.5rem",
          padding:         "0.75rem",
          marginBottom:    "1rem",
        }}>
          {errors.map((err, i) => (
            <p key={i} style={{ color: C.error, fontSize: "0.8rem", margin: "0.15rem 0" }}>• {err}</p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Type */}
        <div>
          <label style={labelStyle}>Type</label>
          <select
            name="transaction_type"
            value={form.transaction_type}
            onChange={handleChange}
            onFocus={() => setFocusedField("transaction_type")}
            onBlur={() => setFocusedField(null)}
            style={{ ...inputStyle, borderColor: focusedField === "transaction_type" ? C.borderFoc : C.border }}
          >
            <option value=""       style={{ background: C.surface }}>Select type…</option>
            <option value="Income" style={{ background: C.surface }}>Income</option>
            <option value="Expense"style={{ background: C.surface }}>Expense</option>
          </select>
        </div>

        {/* Category — with tooltip */}
        <div>
          {/* Label row: "CATEGORY" + Info icon tooltip */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "0.35rem" }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>Category</span>
            <CategoryTooltip description={selectedCategory?.description ?? ""} />
          </div>

          <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            disabled={!form.transaction_type}
            onFocus={() => setFocusedField("category_id")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              borderColor: focusedField === "category_id" ? C.borderFoc : C.border,
              opacity: !form.transaction_type ? 0.45 : 1,
              cursor:  !form.transaction_type ? "not-allowed" : "auto",
            }}
          >
            <option value={0} style={{ background: C.surface }}>Select category…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id} style={{ background: C.surface }}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Inline hint: shows description text below the select when a category is chosen */}
          {selectedCategory?.description && (
            <p style={{
              marginTop:  "0.4rem",
              fontSize:   "0.72rem",
              color:      C.fgMuted,
              lineHeight: "1.4",
              paddingLeft:"0.1rem",
            }}>
              {selectedCategory.description}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            name="transaction_date"
            value={form.transaction_date}
            onChange={handleChange}
            onFocus={() => setFocusedField("transaction_date")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              borderColor: focusedField === "transaction_date" ? C.borderFoc : C.border,
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Amount */}
        <div>
          <label style={labelStyle}>Amount</label>
          <div style={{ position: "relative" }}>
            <span style={{
              position:      "absolute",
              left:          "0.75rem",
              top:           "50%",
              transform:     "translateY(-50%)",
              color:         C.fgMuted,
              fontSize:      "0.875rem",
              pointerEvents: "none",
            }}>₱</span>
            <input
              type="text"
              value={amountInput}
              onChange={handleAmountChange}
              placeholder="0.00"
              onFocus={() => setFocusedField("amount")}
              onBlur={() => setFocusedField(null)}
              style={{
                ...inputStyle,
                paddingLeft: "1.75rem",
                borderColor: focusedField === "amount" ? C.borderFoc : C.border,
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Optional note…"
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              borderColor: focusedField === "description" ? C.borderFoc : C.border,
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
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
            onClick={handleSubmit}
            style={{
              flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
              border: "none", background: C.primary,
              color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            Review <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
          </button>
        </div>
      </div>
    </Shell>
  );

  // ── Confirmation view ────────────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
          Confirm Transaction
        </h2>
        <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
          Please review before submitting
        </p>
      </div>

      {/* Type badge */}
      <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <span style={{
          display:         "inline-block",
          padding:         "0.3rem 1rem",
          borderRadius:    "999px",
          fontSize:        "0.8rem",
          fontWeight:      600,
          backgroundColor: form.transaction_type === "Income"
            ? "hsl(160 60% 45% / 0.15)"
            : "hsl(0 72% 51% / 0.15)",
          color:  form.transaction_type === "Income" ? C.income : C.expense,
          border: `1px solid ${form.transaction_type === "Income" ? C.income : C.expense}`,
        }}>
          {form.transaction_type}
        </span>
      </div>

      {/* Detail rows */}
      {[
        { label: "Category",    value: selectedCategory?.name ?? "—" },
        { label: "Date",        value: form.transaction_date || "—" },
        { label: "Amount",      value: `₱${Number(form.amount).toLocaleString()}` },
        { label: "Description", value: form.description || "—" },
      ].map(({ label, value }) => (
        <div
          key={label}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0.6rem 0", borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: "0.8rem", color: C.fgMuted }}>{label}</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: C.fg }}>{value}</span>
        </div>
      ))}

      {/* Category description hint on confirm screen */}
      {selectedCategory?.description && (
        <p style={{
          marginTop:       "0.75rem",
          fontSize:        "0.72rem",
          color:           C.fgMuted,
          backgroundColor: "hsl(220,18%,16%)",
          border:          `1px solid ${C.border}`,
          borderRadius:    "0.5rem",
          padding:         "0.5rem 0.75rem",
          lineHeight:      "1.45",
        }}>
          <Info style={{ width: "0.7rem", height: "0.7rem", display: "inline", marginRight: "0.3rem", verticalAlign: "middle" }} />
          {selectedCategory.description}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button
          onClick={() => setShowConfirmation(false)}
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
          onClick={handleConfirm}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: C.income,
            color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Confirm & Save
        </button>
      </div>
    </Shell>
  );
}