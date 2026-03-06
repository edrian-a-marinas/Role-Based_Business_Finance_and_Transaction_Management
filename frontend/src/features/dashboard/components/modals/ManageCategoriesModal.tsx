import { useEffect, useState, useContext } from "react";
import type { ChangeEvent } from "react";
import { X, Plus, Pencil, Trash2, ChevronLeft, Tag, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../../../../services/apiClient";
import { AuthContext } from "../../../auth/AuthContext";
import type { CategoryCreate, CategoryRead, ModalStep } from "../../schemas/category";
import { categorySchema } from "../../schemas/category";
import type { OnCloseProps } from "../../lib/utility";
import { diffHighlight } from "../../lib/utility";
import { useOutsideClickStrict } from "../../lib/utilityHooks";

// ── Design tokens (same as all other modals) ─────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  muted:      "hsl(220,10%,46%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  borderFoc:  "hsl(199,89%,38%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  error:      "hsl(0,72%,60%)",
  overlay:    "rgba(0,0,0,0.6)",
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
  fontSize:      "0.7rem",
  fontWeight:    600,
  color:         C.fgMuted,
  marginBottom:  "0.35rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

// ── Reusable sub-components ───────────────────────────────────────────────────
function Shell({ children, onBackdropDown, onBackdropUp, wide }: {
  children: React.ReactNode;
  onBackdropDown: (e: React.MouseEvent) => void;
  onBackdropUp:   (e: React.MouseEvent) => void;
  wide?: boolean;
}) {
  return (
    <div
      onMouseDown={onBackdropDown}
      onMouseUp={onBackdropUp}
      style={{
        position:        "fixed", inset: 0,
        backgroundColor: C.overlay,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          1000,
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:    C.surface,
          borderRadius:  "0.75rem",
          border:        `1px solid ${C.border}`,
          width:         wide ? "min(900px, 95vw)" : "min(720px, 95vw)",
          maxHeight:     "90vh",
          display:       "flex",
          flexDirection: "column",
          boxShadow:     "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const thHead: React.CSSProperties = {
  padding:       "0.5rem 0.75rem",
  textAlign:     "left",
  fontSize:      "0.68rem",
  fontWeight:    600,
  color:         "hsl(220,10%,55%)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom:  "1px solid hsl(220,16%,22%)",
  background:    "hsl(220,18%,16%)",
  whiteSpace:    "nowrap",
};

function ModalHeader({ title, subtitle, onClose, onBack }: {
  title:     string;
  subtitle?: string;
  onClose:   () => void;
  onBack?:   () => void;
}) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "1.25rem 1.5rem",
      borderBottom:   `1px solid ${C.border}`,
      flexShrink:     0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "transparent", border: `1px solid ${C.border}`,
              borderRadius: "0.4rem", color: C.fgMuted, cursor: "pointer",
              padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem",
              fontSize: "0.75rem",
            }}
          >
            <ChevronLeft style={{ width: "0.8rem", height: "0.8rem" }} /> Back
          </button>
        )}
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.15rem 0 0" }}>{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent", border: `1px solid ${C.border}`,
          borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer",
          padding: "0.3rem", display: "flex", alignItems: "center",
        }}
      >
        <X style={{ width: "1rem", height: "1rem" }} />
      </button>
    </div>
  );
}

function ErrorBox({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <div style={{
      backgroundColor: "hsl(0 72% 51% / 0.1)",
      border:          `1px solid ${C.error}`,
      borderRadius:    "0.5rem",
      padding:         "0.6rem 0.75rem",
      marginBottom:    "1rem",
    }}>
      {messages.map((e, i) => (
        <p key={i} style={{ color: C.error, fontSize: "0.8rem", margin: i > 0 ? "0.25rem 0 0" : 0 }}>{e}</p>
      ))}
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display:       "flex",
      justifyContent:"space-between",
      alignItems:    "center",
      padding:       "0.45rem 0",
      borderBottom:  `1px solid ${C.border}`,
      fontSize:      "0.85rem",
    }}>
      <span style={{ color: C.fgMuted, fontWeight: 500 }}>{label}</span>
      <span style={{ color: valueColor ?? C.fg, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isIncome = type === "Income";
  return (
    <span style={{
      display:      "inline-block",
      padding:      "0.15rem 0.55rem",
      borderRadius: "999px",
      fontSize:     "0.72rem",
      fontWeight:   700,
      color:        isIncome ? C.income : C.expense,
      background:   isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)",
      border:       `1px solid ${isIncome ? C.income : C.expense}40`,
    }}>
      {type}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManageCategories({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [deleteLoading,          setDeleteLoading]          = useState(false);
  const [transactionUsageCount,  setTransactionUsageCount]  = useState<number | null>(null);
  const [showUsageCheck,         setShowUsageCheck]         = useState(false);
  const [categories,             setCategories]             = useState<CategoryRead[]>([]);
  const [loading,                setLoading]                = useState(true);
  const [step,                   setStep]                   = useState<ModalStep>("list");
  const [selectedCategory,       setSelectedCategory]       = useState<CategoryRead | null>(null);
  const [formData,               setFormData]               = useState<CategoryCreate>({ name: "", description: "", type: "" as any });
  const [errors,                 setErrors]                 = useState<string[]>([]);
  const [showEditConfirmation,   setShowEditConfirmation]   = useState(false);
  const [focusedField,           setFocusedField]           = useState<string | null>(null);
  const [typeFilter,             setTypeFilter]             = useState<"all" | "Income" | "Expense">("all");

  useEffect(() => {
    const fetchCategories = async () => {
      if (!token || !tokenType) return;
      try {
        const res = await api.get("api/categories/", {
          headers: { Authorization: `${tokenType} ${token}` }
        });
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [token, tokenType]);

  // ── Handlers (untouched logic) ────────────────────────────────────────────
  const handleOpenAdd = () => {
    setFormData({ name: "", description: "", type: "" as any });
    setErrors([]);
    setStep("add");
  };
  const handleOpenEdit = (cat: CategoryRead) => {
    setSelectedCategory(cat);
    setFormData({ name: cat.name, description: cat.description || "", type: cat.type });
    setErrors([]);
    setStep("edit");
  };
  const handleOpenDelete = (cat: CategoryRead) => {
    setSelectedCategory(cat);
    setStep("deleteConfirm");
  };
  const handleAddNext = () => {
    if (!user || userRole !== 1) return alert("Not authorized");
    const result = categorySchema.safeParse(formData);
    if (!result.success) { setErrors(result.error.issues.map(i => i.message)); return; }
    setErrors([]);
    setStep("confirmAdd");
  };
  const handleConfirmAdd = async () => {
    if (!user || userRole !== 1) return alert("Not authorized");
    try {
      const res = await api.post("api/categories/", formData, {
        headers: { Authorization: `${tokenType} ${token}` }
      });
      setCategories([...categories, res.data]);
      alert("Category successfully added!");
      setStep("list");
      setFormData({ name: "", description: "", type: "" as any });
    } catch (err: any) {
      setErrors([err?.response?.data?.message || "Failed to add category"]);
      setStep("add");
    }
  };
  const handleDelete = async () => {
    if (!user || userRole !== 1) return alert("Not authorized");
    if (!selectedCategory) return;
    setDeleteLoading(true);
    try {
      const res = await api.get(`api/transactions/count-by-category/${selectedCategory.id}`, {
        headers: { Authorization: `${tokenType} ${token}` }
      });
      setTransactionUsageCount(res.data.count);
      setShowUsageCheck(true);
    } catch (err) { console.error(err); }
    finally { setDeleteLoading(false); }
  };
  const handleFinalDelete = async () => {
    if (!selectedCategory || !user || userRole !== 1) return;
    try {
      await api.delete(`api/categories/${selectedCategory.id}`, {
        headers: { Authorization: `${tokenType} ${token}` }
      });
      setCategories(categories.filter(c => c.id !== selectedCategory.id));
      setStep("list");
      setSelectedCategory(null);
      setTransactionUsageCount(null);
      setShowUsageCheck(false);
    } catch (err) { console.error(err); }
  };
  const handleBack = () => { setStep("list"); setSelectedCategory(null); setErrors([]); };
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleConfirmEdit = async () => {
    if (!selectedCategory || !user || userRole !== 1) return alert("Not authorized");
    try {
      const parsed = categorySchema.parse(formData);
      await api.put(`api/categories/${selectedCategory.id}`, parsed, {
        headers: { Authorization: `${tokenType} ${token}` }
      });
      setCategories(categories.map(c => c.id === selectedCategory.id ? { ...c, ...parsed } : c));
      setStep("list");
      setSelectedCategory(null);
      setShowEditConfirmation(false);
      alert("Successfully updated category!");
    } catch (err: any) {
      setErrors(err?.message ? [err.message] : ["Validation error"]);
      setShowEditConfirmation(false);
    }
  };
  const handleBackToEditForm = () => setShowEditConfirmation(false);

  // ── Shared form (Add / Edit) ──────────────────────────────────────────────
  const renderForm = () => (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <ModalHeader
        title={step === "add" ? "Add Category" : "Edit Category"}
        subtitle={step === "add" ? "Create a new transaction category" : `Editing: ${selectedCategory?.name}`}
        onClose={onClose}
        onBack={handleBack}
      />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        <ErrorBox messages={errors} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              onFocus={() => setFocusedField("type")}
              onBlur={() => setFocusedField(null)}
              style={{
                ...inputStyle,
                borderColor:  focusedField === "type" ? C.borderFoc : C.border,
                colorScheme:  "dark",
              }}
            >
              <option value="" style={{ background: C.surface }}>Select Type</option>
              <option value="Income"  style={{ background: C.surface }}>Income</option>
              <option value="Expense" style={{ background: C.surface }}>Expense</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Salary, Food & Beverage"
              value={formData.name}
              onChange={handleChange}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, borderColor: focusedField === "name" ? C.borderFoc : C.border }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              name="description"
              placeholder="Brief description of this category"
              value={formData.description}
              onChange={handleChange}
              onFocus={() => setFocusedField("description")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, borderColor: focusedField === "description" ? C.borderFoc : C.border }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        {step === "add" ? (
          <button
            onClick={handleAddNext}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
              border: "none", background: C.primary, color: "#fff",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <Plus style={{ width: "0.9rem", height: "0.9rem" }} /> Continue
          </button>
        ) : (
          <button
            onClick={() => {
              if (!selectedCategory) return;
              const noChanges =
                formData.name === selectedCategory.name &&
                formData.description === (selectedCategory.description || "") &&
                formData.type === selectedCategory.type;
              if (noChanges) { setErrors(["Nothing to update."]); return; }
              setErrors([]);
              setShowEditConfirmation(true);
            }}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
              border: "none", background: C.primary, color: "#fff",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            <Pencil style={{ width: "0.9rem", height: "0.9rem" }} /> Review Changes
          </button>
        )}
      </div>
    </Shell>
  );


  // ── Step: List ────────────────────────────────────────────────────────────
  if (step === "list") {
    const incomeCategories  = categories.filter(c => c.type === "Income");
    const expenseCategories = categories.filter(c => c.type === "Expense");

    const visibleIncome  = typeFilter === "Expense" ? [] : incomeCategories;
    const visibleExpense = typeFilter === "Income"  ? [] : expenseCategories;

    const CategoryRow = ({ cat, idx }: { cat: CategoryRead; idx: number }) => (
      <tr
        key={cat.id}
        style={{ backgroundColor: idx % 2 === 0 ? "transparent" : "hsl(220,14%,14%)" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHov)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "transparent" : "hsl(220,14%,14%)")}
      >
        <td style={{ padding: "0.6rem 0.75rem", color: C.fg, fontWeight: 600, whiteSpace: "nowrap" }}>{cat.name}</td>
        <td style={{ padding: "0.6rem 0.75rem", color: C.fgMuted, wordBreak: "break-word" }}>
          {cat.description || <span style={{ fontStyle: "italic" }}>—</span>}
        </td>
        {userRole === 1 && (
          <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => handleOpenEdit(cat)}
                style={{
                  padding: "0.25rem 0.6rem", borderRadius: "0.375rem",
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.primary, fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem",
                }}
              >
                <Pencil style={{ width: "0.7rem", height: "0.7rem" }} /> Edit
              </button>
              <button
                onClick={() => handleOpenDelete(cat)}
                style={{
                  padding: "0.25rem 0.6rem", borderRadius: "0.375rem",
                  border: `1px solid ${C.expense}60`, background: "transparent",
                  color: C.expense, fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem",
                }}
              >
                <Trash2 style={{ width: "0.7rem", height: "0.7rem" }} /> Delete
              </button>
            </div>
          </td>
        )}
      </tr>
    );

    const SectionTable = ({ items, type }: { items: CategoryRead[]; type: "Income" | "Expense" }) => {
      if (items.length === 0) return null;
      const color = type === "Income" ? C.income : C.expense;
      const bg    = type === "Income" ? "hsl(160 60% 45% / 0.08)" : "hsl(0 72% 51% / 0.08)";
      const border= type === "Income" ? `1px solid ${C.income}30` : `1px solid ${C.expense}30`;
      return (
        <div style={{ marginBottom: "1.25rem", borderRadius: "0.625rem", overflow: "hidden", border }}>
          {/* Section header */}
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "0.5rem",
            padding:      "0.5rem 0.75rem",
            background:   bg,
            borderBottom: border,
          }}>
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, color,
              textTransform: "uppercase", letterSpacing: "0.07em",
            }}>
              {type}
            </span>
            <span style={{
              fontSize: "0.68rem", color: C.fgMuted,
              background: C.surfaceEl, border: `1px solid ${C.border}`,
              borderRadius: "999px", padding: "0.05rem 0.45rem",
            }}>
              {items.length}
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr>
                <th style={thHead}>Name</th>
                <th style={{ ...thHead, width: "99%" }}>Description</th>
                {userRole === 1 && <th style={thHead}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((cat, idx) => <CategoryRow key={cat.id} cat={cat} idx={idx} />)}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <Shell wide onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
        <ModalHeader
          title="Manage Categories"
          subtitle={`${categories.length} categories total`}
          onClose={onClose}
        />

        {/* Toolbar: Add + Type filter */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          padding:      "0.75rem 1.5rem",
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
          gap:          "0.75rem",
        }}>
          {userRole === 1 ? (
            <button
              onClick={handleOpenAdd}
              style={{
                padding: "0.45rem 1rem", borderRadius: "0.5rem",
                border: "none", background: C.primary, color: "#fff",
                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              <Plus style={{ width: "0.85rem", height: "0.85rem" }} /> Add Category
            </button>
          ) : <div />}

          {/* Type filter pills */}
          <div style={{
            display: "flex", gap: "0.25rem",
            background: C.surfaceEl, borderRadius: "0.5rem",
            padding: "0.25rem", border: `1px solid ${C.border}`,
          }}>
            {(["all", "Income", "Expense"] as const).map(f => {
              const isActive = typeFilter === f;
              const fColor = f === "Income" ? C.income : f === "Expense" ? C.expense : C.fgMuted;
              return (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  style={{
                    padding: "0.2rem 0.65rem", borderRadius: "0.35rem",
                    border: "none", cursor: "pointer",
                    fontSize: "0.72rem", fontWeight: 600,
                    transition: "background 0.15s, color 0.15s",
                    background: isActive
                      ? f === "Income"  ? "hsl(160 60% 45% / 0.15)"
                      : f === "Expense" ? "hsl(0 72% 51% / 0.15)"
                      : C.surfaceHov
                      : "transparent",
                    color: isActive ? fColor : C.fgMuted,
                  }}
                >
                  {f === "all" ? "All" : f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1.25rem 1.5rem" }}>
          {loading && <p style={{ color: C.fgMuted, textAlign: "center", padding: "2rem" }}>Loading categories…</p>}
          {!loading && categories.length === 0 && (
            <p style={{ color: C.fgMuted, textAlign: "center", padding: "2rem" }}>No categories found.</p>
          )}
          {!loading && categories.length > 0 && (
            <>
              <SectionTable items={visibleIncome}  type="Income"  />
              <SectionTable items={visibleExpense} type="Expense" />
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ── Step: Add / Edit form ─────────────────────────────────────────────────
  if (step === "add" || step === "edit") return renderForm();

  // ── Step: Confirm Add ─────────────────────────────────────────────────────
  if (step === "confirmAdd") return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <ModalHeader title="Confirm New Category" subtitle="Review before saving" onClose={onClose} onBack={() => setStep("add")} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        <div style={{
          background: C.surfaceEl, border: `1px solid ${C.border}`,
          borderRadius: "0.625rem", padding: "1rem", marginBottom: "1rem",
        }}>
          <InfoRow label="Type"        value={formData.type}        valueColor={formData.type === "Income" ? C.income : C.expense} />
          <InfoRow label="Name"        value={formData.name} />
          <InfoRow label="Description" value={formData.description || "—"} />
        </div>
      </div>
      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={handleConfirmAdd}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: C.primary, color: "#fff",
            fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Confirm & Save
        </button>
      </div>
    </Shell>
  );

  // ── Step: Delete confirm — initial ────────────────────────────────────────
  if (step === "deleteConfirm" && selectedCategory && !showUsageCheck) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <ModalHeader title="Delete Category" subtitle="Review before deleting" onClose={onClose} onBack={handleBack} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        {/* Warning banner */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "0.6rem",
          background: "hsl(0 72% 51% / 0.08)", border: `1px solid ${C.expense}50`,
          borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.25rem",
        }}>
          <AlertTriangle style={{ width: "1rem", height: "1rem", color: C.expense, flexShrink: 0, marginTop: "0.05rem" }} />
          <p style={{ color: C.expense, fontSize: "0.82rem", margin: 0, lineHeight: 1.5 }}>
            This will permanently delete the category. Transactions using it will <strong>not</strong> be deleted, but will lose their category reference.
          </p>
        </div>

        <div style={{ background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.625rem", padding: "1rem" }}>
          <InfoRow label="Name"        value={selectedCategory.name} />
          <InfoRow label="Type"        value={selectedCategory.type} valueColor={selectedCategory.type === "Income" ? C.income : C.expense} />
          <InfoRow label="Description" value={selectedCategory.description || "—"} />
        </div>
      </div>
      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={handleBack}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteLoading}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.expense}`, background: "hsl(0 72% 51% / 0.1)",
            color: C.expense, fontSize: "0.875rem", fontWeight: 600,
            cursor: deleteLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          <Trash2 style={{ width: "0.9rem", height: "0.9rem" }} />
          {deleteLoading ? "Checking usage…" : "Check & Delete"}
        </button>
      </div>
    </Shell>
  );

  // ── Step: Delete confirm — usage check result ─────────────────────────────
  if (step === "deleteConfirm" && selectedCategory && showUsageCheck) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <ModalHeader title="Delete Category" subtitle={selectedCategory.name} onClose={onClose} onBack={handleBack} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>

        {transactionUsageCount && transactionUsageCount > 0 ? (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.6rem",
            background: "hsl(45 85% 50% / 0.08)", border: "1px solid hsl(45 85% 50% / 0.4)",
            borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.25rem",
          }}>
            <AlertTriangle style={{ width: "1rem", height: "1rem", color: C.warning, flexShrink: 0, marginTop: "0.05rem" }} />
            <div>
              <p style={{ color: C.warning, fontWeight: 700, fontSize: "0.85rem", margin: "0 0 0.25rem" }}>
                Used by {transactionUsageCount} transaction{transactionUsageCount !== 1 ? "s" : ""}
              </p>
              <p style={{ color: "hsl(45,85%,70%)", fontSize: "0.8rem", margin: 0 }}>
                Those transactions will <strong>not</strong> be deleted — only this category will be removed.
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            background: "hsl(160 60% 45% / 0.08)", border: `1px solid ${C.income}40`,
            borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.25rem",
          }}>
            <CheckCircle style={{ width: "1rem", height: "1rem", color: C.income, flexShrink: 0 }} />
            <p style={{ color: C.income, fontSize: "0.82rem", margin: 0, fontWeight: 600 }}>
              No transactions use this category. Safe to delete.
            </p>
          </div>
        )}

        <div style={{ background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.625rem", padding: "1rem" }}>
          <InfoRow label="Name" value={selectedCategory.name} />
          <InfoRow label="Type" value={selectedCategory.type} valueColor={selectedCategory.type === "Income" ? C.income : C.expense} />
        </div>
      </div>

      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={handleBack}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleFinalDelete}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.expense}`, background: "hsl(0 72% 51% / 0.1)",
            color: C.expense, fontSize: "0.875rem", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          <Trash2 style={{ width: "0.9rem", height: "0.9rem" }} /> Confirm Delete
        </button>
      </div>
    </Shell>
  );

  // ── Edit confirmation overlay (shown on top of edit form) ─────────────────
  if (showEditConfirmation && selectedCategory) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <ModalHeader title="Confirm Edit" subtitle="Review changes before saving" onClose={onClose} onBack={handleBackToEditForm} />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Before */}
          <div style={{ background: C.surfaceEl, border: `1px solid ${C.expense}40`, borderRadius: "0.625rem", padding: "1rem" }}>
            <p style={{
              fontSize: "0.68rem", fontWeight: 700, color: C.expense,
              textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem",
            }}>Before</p>
            {[
              { label: "Name",        before: selectedCategory.name,              after: formData.name },
              { label: "Description", before: selectedCategory.description || "", after: formData.description },
              { label: "Type",        before: selectedCategory.type,              after: formData.type },
            ].map(({ label, before, after }) => (
              <div key={label} style={{ marginBottom: "0.6rem" }}>
                <p style={{ fontSize: "0.68rem", color: C.fgMuted, margin: "0 0 0.15rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                <p style={{
                  fontSize: "0.82rem", margin: 0,
                  background: before !== after ? "hsl(0 72% 51% / 0.1)" : "transparent",
                  borderRadius: "0.25rem", padding: before !== after ? "0.1rem 0.3rem" : "0",
                }}>
                  <span
                    style={{ color: C.fg }}
                    dangerouslySetInnerHTML={{ __html: diffHighlight(before, after).before }}
                  />
                </p>
              </div>
            ))}
          </div>

          {/* After */}
          <div style={{ background: C.surfaceEl, border: `1px solid ${C.income}40`, borderRadius: "0.625rem", padding: "1rem" }}>
            <p style={{
              fontSize: "0.68rem", fontWeight: 700, color: C.income,
              textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem",
            }}>After</p>
            {[
              { label: "Name",        before: selectedCategory.name,              after: formData.name },
              { label: "Description", before: selectedCategory.description || "", after: formData.description },
              { label: "Type",        before: selectedCategory.type,              after: formData.type },
            ].map(({ label, before, after }) => (
              <div key={label} style={{ marginBottom: "0.6rem" }}>
                <p style={{ fontSize: "0.68rem", color: C.fgMuted, margin: "0 0 0.15rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                <p style={{
                  fontSize: "0.82rem", margin: 0,
                  background: before !== after ? "hsl(160 60% 45% / 0.1)" : "transparent",
                  borderRadius: "0.25rem", padding: before !== after ? "0.1rem 0.3rem" : "0",
                }}>
                  <span
                    style={{ color: C.fg }}
                    dangerouslySetInnerHTML={{ __html: diffHighlight(before, after).after }}
                  />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={handleBackToEditForm}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          Go Back
        </button>
        <button
          onClick={handleConfirmEdit}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: C.primary, color: "#fff",
            fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Confirm Update
        </button>
      </div>
    </Shell>
  );

  return null;
}