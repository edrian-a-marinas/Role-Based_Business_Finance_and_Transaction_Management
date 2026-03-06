// TransactionPage.tsx
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

// ── Only domain/accent colors remain inline — layout colors use CSS vars ──────
const C = {
  primary: "hsl(var(--primary))",
  income:  "hsl(var(--income))",
  expense: "hsl(var(--expense))",
  warning: "hsl(var(--warning))",
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

  const crudActions: ActionCard[] = [
    {
      label:       "Create Transaction",
      description: "Record a new income or expense entry",
      icon:        Plus,
      color:       C.income,
      bgColor:     "hsl(var(--income) / 0.08)",
      onClick:     () => setShowCreateModal(true),
    },
    {
      label:       "View Transactions",
      description: "Browse and search all transaction records",
      icon:        Eye,
      color:       C.primary,
      bgColor:     "hsl(var(--primary) / 0.08)",
      onClick:     () => setShowReadModal(true),
    },
    {
      label:       "Edit Transaction",
      description: "Update details on an existing transaction",
      icon:        Pencil,
      color:       C.warning,
      bgColor:     "hsl(var(--warning) / 0.08)",
      onClick:     () => setShowUpdateModal(true),
    },
    {
      label:       isAdmin ? "Delete Transaction" : "Request Deletion",
      description: isAdmin
        ? "Permanently remove a transaction record"
        : "Submit a deletion request for admin approval",
      icon:        Trash2,
      color:       C.expense,
      bgColor:     "hsl(var(--expense) / 0.08)",
      onClick:     () => setShowDeleteModal(true),
    },
  ];

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
      bgColor:     "hsl(var(--primary) / 0.08)",
      onClick:     () => setShowDeletionHistoryModal(true),
    },
  ];

  return (
    <>
      <title>Transactions</title>
      <div className="space-y-8">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight ts-page-fg">
              Transactions
            </h1>
          </div>
          <p className="text-sm ts-page-fg-light">
            {isAdmin
              ? "Manage all business transactions"
              : "Manage your personal transactions"}
          </p>
        </div>

        {/* Section: Manage */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold ts-page-fg">Manage</h2>
            <p className="text-xs ts-page-fg-light">
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

        {/* Divider */}
        <div className="ts-divider" />

        {/* Section: History */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold ts-page-fg">History & Requests</h2>
            <p className="text-xs ts-page-fg-light">
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

      {showCreateModal          && <CreateTransaction       onClose={() => setShowCreateModal(false)}          />}
      {showReadModal            && <ReadTransactions        onClose={() => setShowReadModal(false)}            />}
      {showUpdateModal          && <UpdateTransaction       onClose={() => setShowUpdateModal(false)}          />}
      {showDeleteModal          && <DeleteTransaction       onClose={() => setShowDeleteModal(false)}          />}
      {showHistoryModal         && <HistoryTransaction      onClose={() => setShowHistoryModal(false)}         />}
      {showDeletionHistoryModal && <DeletionRequestHistory  onClose={() => setShowDeletionHistoryModal(false)} />}
    </>
  );
}

// ── Shared card button ────────────────────────────────────────────────────────
// .ts-action-card handles: bg, border, radius, padding, transition for theme.
// Only accent color (hover border + icon fill) stays as inline prop.
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
      className="ts-action-card"
      style={{
        border:    `1px solid ${hovered ? action.color : "hsl(var(--page-border))"}`,
        boxShadow: hovered
          ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${action.color}1a`
          : "0 1px 3px hsl(0 0% 0% / 0.06)",
        transform: hovered ? "translateY(-2px)" : "none",
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
        <p className="text-sm font-semibold ts-page-fg" style={{ marginBottom: "0.2rem" }}>
          {action.label}
        </p>
        <p className="text-xs ts-page-fg-light" style={{ lineHeight: "1.4" }}>
          {action.description}
        </p>
      </div>
    </button>
  );
}