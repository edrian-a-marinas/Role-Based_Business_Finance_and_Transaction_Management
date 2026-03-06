// ManageUserPage.tsx
import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import { Users, Eye, ShieldCheck, Trash2, UserCircle } from "lucide-react";
import {
  ReadUsers,
  PromoteUser,
  UserDetails,
  HandleDeletionRequest
} from "../components/modals";

// ── Domain/accent colors only ─────────────────────────────────────────────────
const C = {
  primary: "hsl(var(--primary))",
  income:  "hsl(var(--income))",
  expense: "hsl(var(--expense))",
  purple:  "hsl(280,60%,55%)",
};

interface ActionCard {
  label:       string;
  description: string;
  icon:        typeof Eye;
  color:       string;
  bgColor:     string;
  onClick:     () => void;
}

export default function ManageUsersPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;
  const userID   = user!.id;
  const isSuperAdmin = userID === 1 && userRole === 1;
  const isAdmin      = userRole === 1 || userRole === 2;

  const [showReadModal,          setShowReadModal]          = useState(false);
  const [showPromoteModal,       setShowPromoteModal]       = useState(false);
  const [showDetailsModal,       setShowDetailsModal]       = useState(false);
  const [showHandleRequestModal, setShowHandleRequestModal] = useState(false);
  const [hoveredCard,            setHoveredCard]            = useState<number | null>(null);

  const actions: ActionCard[] = [
    {
      label:       "View Users",
      description: "Browse all registered user accounts",
      icon:        Eye,
      color:       C.primary,
      bgColor:     "hsl(var(--primary) / 0.08)",
      onClick:     () => setShowReadModal(true),
    },
    {
      label:       isSuperAdmin ? "Manage User Details" : "View User Details",
      description: isSuperAdmin
        ? "Inspect profiles and manage account status"
        : "Inspect profile and account information",
      icon:        UserCircle,
      color:       C.purple,
      bgColor:     "hsl(280 60% 55% / 0.08)",
      onClick:     () => setShowDetailsModal(true),
    },
    ...(isSuperAdmin ? [{
      label:       "Promote / Demote User",
      description: "Change a user's role or access level",
      icon:        ShieldCheck,
      color:       C.income,
      bgColor:     "hsl(var(--income) / 0.08)",
      onClick:     () => setShowPromoteModal(true),
    }] : []),
    ...(isAdmin ? [{
      label:       "Handle Deletion Requests",
      description: "Review and approve transaction deletion requests",
      icon:        Trash2,
      color:       C.expense,
      bgColor:     "hsl(var(--expense) / 0.08)",
      onClick:     () => setShowHandleRequestModal(true),
    }] : []),
  ];

  return (
    <>
      <title>Manage Users</title>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight ts-page-fg">
              Manage Users
            </h1>
          </div>
          <p className="text-sm ts-page-fg-light">
            {isSuperAdmin
              ? "Super admin controls — users, roles, and deletion requests"
              : isAdmin
              ? "Manage users and handle deletion requests"
              : "View users and your account details"}
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, idx) => {
            const Icon    = action.icon;
            const hovered = hoveredCard === idx;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                onMouseEnter={() => setHoveredCard(idx)}
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
          })}
        </div>
      </div>

      {showReadModal          && <ReadUsers            onClose={() => setShowReadModal(false)}          />}
      {showPromoteModal       && <PromoteUser           onClose={() => setShowPromoteModal(false)}       />}
      {showHandleRequestModal && <HandleDeletionRequest onClose={() => setShowHandleRequestModal(false)} />}
      {showDetailsModal       && <UserDetails           onClose={() => setShowDetailsModal(false)}       />}
    </>
  );
}