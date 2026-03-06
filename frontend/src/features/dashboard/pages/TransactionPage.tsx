import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import {
  Plus, Eye, Pencil, Trash2, Clock,
  ArrowLeftRight, History,
} from "lucide-react";
import {
  CreateTransaction,
  ReadTransactions,
  UpdateTransaction,
  DeleteTransaction,
  HistoryTransaction,
  DeletionRequestHistory,  
} from "../components/modals";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:  "hsl(199,89%,38%)",
  income:   "hsl(160,60%,45%)",
  expense:  "hsl(0,72%,51%)",
  muted:    "hsl(220,10%,46%)",
  surface:  "hsl(220,14%,96%)",
  border:   "hsl(220,13%,89%)",
  fg:       "hsl(220,14%,15%)",
  fgLight:  "hsl(220,10%,46%)",
};

interface ActionCard {
  label:       string;
  description: string;
  icon:        typeof Plus;
  color:       string;
  bgColor:     string;
  onClick:     () => void;
}

export default function Transactions() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;
  const isAdmin  = userRole === 1;

  const [showCreateModal,          setShowCreateModal]          = useState(false);
  const [showReadModal,            setShowReadModal]            = useState(false);
  const [showUpdateModal,          setShowUpdateModal]          = useState(false);
  const [showDeleteModal,          setShowDeleteModal]          = useState(false);
  const [showHistoryModal,         setShowHistoryModal]         = useState(false);
  const [showDeletionHistoryModal, setShowDeletionHistoryModal] = useState(false);
  const [hoveredCard,              setHoveredCard]              = useState<string | null>(null);

  // ── Section 1: CRUD actions ───────────────────────────────────────────────
  const crudActions: ActionCard[] = [
    {
      label:       "Create Transaction",
      description: "Record a new income or expense entry",
      icon:        Plus,
      color:       C.income,
      bgColor:     "hsl(160 60% 45% / 0.08)",
      onClick:     () => setShowCreateModal(true),
    },
    {
      label:       "View Transactions",
      description: "Browse and search all transaction records",
      icon:        Eye,
      color:       C.primary,
      bgColor:     "hsl(199 89% 38% / 0.08)",
      onClick:     () => setShowReadModal(true),
    },
    {
      label:       "Edit Transaction",
      description: "Update details on an existing transaction",
      icon:        Pencil,
      color:       "hsl(45,85%,50%)",
      bgColor:     "hsl(45 85% 50% / 0.08)",
      onClick:     () => setShowUpdateModal(true),
    },
    {
      label:       isAdmin ? "Delete Transaction" : "Request Deletion",
      description: isAdmin
        ? "Permanently remove a transaction record"
        : "Submit a deletion request for admin approval",
      icon:        Trash2,
      color:       C.expense,
      bgColor:     "hsl(0 72% 51% / 0.08)",
      onClick:     () => setShowDeleteModal(true),
    },
  ];

  // ── Section 2: History actions ────────────────────────────────────────────
  const historyActions: ActionCard[] = [
    {
      label:       "Transaction History",
      description: "View the full audit trail of edits and changes",
      icon:        Clock,
      color:       "hsl(280,60%,55%)",
      bgColor:     "hsl(280 60% 55% / 0.08)",
      onClick:     () => setShowHistoryModal(true),
    },
    {
      label:       isAdmin ? "Deletion Review History" : "My Deletion Requests",
      description: isAdmin
        ? "View all deletion requests you have approved or rejected"
        : "Track your pending, approved, and rejected deletion requests",
      icon:        History,
      color:       C.primary,
      bgColor:     "hsl(199 89% 38% / 0.08)",
      onClick:     () => setShowDeletionHistoryModal(true),
    },
  ];

  return (
    <>
      <title>Transactions</title>
      <div className="space-y-8">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.fg }}>
              Transactions
            </h1>
          </div>
          <p className="text-sm" style={{ color: C.fgLight }}>
            {isAdmin
              ? "Manage all business transactions"
              : "Manage your personal transactions"}
          </p>
        </div>

        {/* ── Section 1: Manage ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: C.fg }}>
              Manage
            </h2>
            <p className="text-xs" style={{ color: C.fgLight }}>
              Create, view, edit, and delete transactions
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {crudActions.map((action, idx) => (
              <ActionButton
                key={idx}
                id={`crud-${idx}`}
                action={action}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
              />
            ))}
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ height: "1px", background: C.border }} />

        {/* ── Section 2: History & Requests ────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: C.fg }}>
              History & Requests
            </h2>
            <p className="text-xs" style={{ color: C.fgLight }}>
              {isAdmin
                ? "Audit trail and deletion requests you've reviewed"
                : "Audit trail and your deletion request history"}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {historyActions.map((action, idx) => (
              <ActionButton
                key={idx}
                id={`hist-${idx}`}
                action={action}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showCreateModal          && <CreateTransaction       onClose={() => setShowCreateModal(false)}          />}
      {showReadModal            && <ReadTransactions        onClose={() => setShowReadModal(false)}            />}
      {showUpdateModal          && <UpdateTransaction       onClose={() => setShowUpdateModal(false)}          />}
      {showDeleteModal          && <DeleteTransaction       onClose={() => setShowDeleteModal(false)}          />}
      {showHistoryModal         && <HistoryTransaction      onClose={() => setShowHistoryModal(false)}         />}
      {showDeletionHistoryModal && <DeletionRequestHistory  onClose={() => setShowDeletionHistoryModal(false)} />}
    </>
  );
}

// ── Shared card button component ──────────────────────────────────────────────
function ActionButton({
  id, action, hoveredCard, setHoveredCard,
}: {
  id:             string;
  action:         ActionCard;
  hoveredCard:    string | null;
  setHoveredCard: (id: string | null) => void;
}) {
  const Icon    = action.icon;
  const hovered = hoveredCard === id;
  return (
    <button
      onClick={action.onClick}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
      style={{
        background:    "hsl(0,0%,100%)",
        border:        `1px solid ${hovered ? action.color : "hsl(220,13%,89%)"}`,
        borderRadius:  "0.75rem",
        padding:       "1.25rem 1.5rem",
        cursor:        "pointer",
        textAlign:     "left",
        transition:    "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
        boxShadow:     hovered
          ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${action.color}1a`
          : "0 1px 3px hsl(0 0% 0% / 0.06)",
        transform:     hovered ? "translateY(-2px)" : "none",
        display:       "flex",
        flexDirection: "column",
        gap:           "0.75rem",
      }}
    >
      <div style={{
        width:           "2.5rem",
        height:          "2.5rem",
        borderRadius:    "0.5rem",
        backgroundColor: hovered ? action.color : action.bgColor,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        transition:      "background-color 0.15s",
        flexShrink:      0,
      }}>
        <Icon style={{
          width:      "1.1rem",
          height:     "1.1rem",
          color:      hovered ? "hsl(0,0%,100%)" : action.color,
          transition: "color 0.15s",
        }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "hsl(220,14%,15%)", marginBottom: "0.2rem" }}>
          {action.label}
        </p>
        <p className="text-xs" style={{ color: "hsl(220,10%,46%)", lineHeight: "1.4" }}>
          {action.description}
        </p>
      </div>
    </button>
  );
}