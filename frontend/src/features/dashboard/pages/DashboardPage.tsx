// DashboardPage.tsx
import { useState, useContext } from "react";
import { cn } from "@/features/dashboard/lib/utils";
import {
  LayoutDashboard, ArrowLeftRight, FileText,
  FolderOpen, Users, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { AuthContext } from "../../auth/AuthContext";
import Transactions   from "./TransactionPage";
import Reports        from "./ReportPage";
import ManageUsers    from "./ManageUserPage";
import ManageCategories   from "../components/modals/ManageCategoriesModal";
import DashboardOverview  from "@/features/dashboard/components/overview/DashBoardOverview";
import HandleDeletionRequest from "../components/modals/HandleDeletionRequestModal";
import NotificationPanel     from "../components/ui/NotificationPanel";

// ── Sidebar tokens ────────────────────────────────────────────────────────────
const S = {
  bg:         "hsl(220,25%,10%)",
  accent:     "hsl(220,20%,16%)",
  accentFg:   "hsl(220,14%,90%)",
  primary:    "hsl(199,89%,48%)",
  muted:      "hsl(220,10%,46%)",
  border:     "hsl(220,20%,18%)",
  foreground: "hsl(220,14%,85%)",
  expense:    "hsl(0,72%,51%)",
};

type MenuKey = "dashboard" | "transactions" | "reports" | "manageCategories" | "manageUsers";

interface NavItem {
  key:        MenuKey;
  label:      string;
  icon:       typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: "dashboard",        label: "Dashboard",    icon: LayoutDashboard },
  { key: "transactions",     label: "Transactions", icon: ArrowLeftRight },
  { key: "reports",          label: "Reports",      icon: FileText },
  { key: "manageCategories", label: "Categories",   icon: FolderOpen, adminOnly: true },
  { key: "manageUsers",      label: "Users",        icon: Users,      adminOnly: true },
];

export default function DashboardPage() {
  const { logout, user } = useContext(AuthContext);

  const [selectedMenu,  setSelectedMenu]  = useState<MenuKey>("dashboard");
  const [collapsed,     setCollapsed]     = useState(false);
  const [hoveredMenu,   setHoveredMenu]   = useState<MenuKey | null>(null);
  const [hoveredLogout, setHoveredLogout] = useState(false);

  // Deep-link: notification → deletion modal at a specific request
  const [deepLinkRequestId,      setDeepLinkRequestId]      = useState<number | undefined>();
  const [showDeletionModalDirect, setShowDeletionModalDirect] = useState(false);

  if (!user) return <p>Loading...</p>;

  const userID   = user.id;
  const userRole = user.role_id;
  const isAdmin  = userRole === 1;

  const roleLabel =
    userRole === 1 && userID === 1 ? "Super Admin"
    : userRole === 1               ? "Admin"
    :                                "Standard User";

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");
  const authHeader = token && tokenType
    ? { Authorization: `${tokenType} ${token}` }
    : {};

  const handleDeepLink = (requestId: number) => {
    setDeepLinkRequestId(requestId);
    setShowDeletionModalDirect(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <title>TransacScope Overview</title>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        style={{ backgroundColor: S.bg, borderRight: `1px solid ${S.border}` }}
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4" style={{ borderBottom: `1px solid ${S.border}` }}>
          <img
            src="../../../../../src/assets/vite.svg"
            alt="TransacScope"
            className="h-8 w-8 shrink-0 cursor-pointer"
            onClick={() => setSelectedMenu("dashboard")}
          />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight" style={{ color: S.foreground }}>
              TransacScope
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems
            .filter(item => !item.adminOnly || isAdmin)
            .map(item => {
              const active  = selectedMenu === item.key;
              const hovered = hoveredMenu === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedMenu(item.key)}
                  onMouseEnter={() => setHoveredMenu(item.key)}
                  onMouseLeave={() => setHoveredMenu(null)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active || hovered ? S.accent : "transparent",
                    color:  active ? S.primary : hovered ? S.accentFg : S.muted,
                    border: "none", cursor: "pointer",
                  }}
                >
                  <item.icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: active ? S.primary : hovered ? S.accentFg : S.muted }}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: `1px solid ${S.border}` }}>
          {!collapsed && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: S.accent }}>
              <p className="text-xs font-semibold" style={{ color: S.accentFg }}>{user.first_name}</p>
              <p className="text-[10px]" style={{ color: S.muted }}>{roleLabel}</p>
            </div>
          )}
          <button
            onClick={logout}
            onMouseEnter={() => setHoveredLogout(true)}
            onMouseLeave={() => setHoveredLogout(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: hoveredLogout ? S.accent : "transparent",
              color:  hoveredLogout ? S.expense : S.muted,
              border: "none", cursor: "pointer",
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" style={{ color: hoveredLogout ? S.expense : S.muted }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors"
          style={{ border: `1px solid ${S.border}`, backgroundColor: S.bg, color: S.muted, cursor: "pointer" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-[68px]" : "ml-[220px]")}>

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          display: "flex", justifyContent: "flex-end", alignItems: "center",
          padding: "0.75rem 1.5rem",
          background: "hsl(220,14%,97%)",
          borderBottom: "1px solid hsl(220,13%,89%)",
        }}>
          <NotificationPanel
            isAdmin={isAdmin}
            authHeader={authHeader}
            onDeepLink={handleDeepLink}
          />
        </div>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          {selectedMenu === "dashboard"        && <DashboardOverview userRole={userRole} userId={userID} />}
          {selectedMenu === "transactions"     && <Transactions />}
          {selectedMenu === "reports"          && <Reports />}
          {selectedMenu === "manageCategories" && isAdmin && (
            <ManageCategories onClose={() => setSelectedMenu("dashboard")} />
          )}
          {selectedMenu === "manageUsers" && isAdmin && <ManageUsers />}
        </div>
      </main>

      {/* Deep-link deletion modal */}
      {showDeletionModalDirect && (
        <HandleDeletionRequest
          initialRequestId={deepLinkRequestId}
          onClose={() => {
            setShowDeletionModalDirect(false);
            setDeepLinkRequestId(undefined);
          }}
        />
      )}
    </div>
  );
}