import { useMemo, useState, useEffect, useContext, lazy, Suspense } from "react";

import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

import KpiCard from "./KpiCard";
import RecentTransactions from "./RecentTransactions";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { ReadTransaction } from "@/features/dashboard/schemas/transaction";
import type { CategoryRead } from "@/features/dashboard/schemas/category";
import ReadTransactions from "../modals/ReadTransactionModal";

// Lazy-load heavy Recharts components — won't block first paint
const IncomeExpenseChart     = lazy(() => import("../charts/IncomeExpenseChart"));
const NetProfitChart         = lazy(() => import("../charts/NetProfitChart"));
const CategoryBreakdownChart = lazy(() => import("../charts/CategoryBreakdownChart"));

const CHART_COLORS = [
  "hsl(199, 89%, 38%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 90%, 56%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(45, 85%, 50%)",
  "hsl(200, 70%, 55%)",
];

const PRIMARY = "hsl(var(--primary))";
const INCOME  = "hsl(var(--income))";

// "all" is always present; other keys are dynamic "YYYY-MM" strings
type Period = "all" | string;

interface DashboardOverviewProps {
  userRole: number;
  userId:   number;
}

// Shimmer skeleton shown while charts lazy-load
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: "0.5rem",
        border: "1px solid hsl(var(--page-border))",
        background: "linear-gradient(90deg, hsl(var(--page-surface-sub)) 25%, hsl(var(--page-surface)) 50%, hsl(var(--page-surface-sub)) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

// Format "YYYY-MM" → "Feb 2026"
function formatPeriodLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function DashboardOverview({ userRole, userId }: DashboardOverviewProps) {
  const { user } = useContext(AuthContext);
  const userID   = user.id;

  const roleLabel =
    userRole === 1 && userID === 1 ? "Super Admin"
    : userRole === 1               ? "Admin"
    :                                "Standard User";

  const [transactions, setTransactions]   = useState<ReadTransaction[]>([]);
  const [categories,   setCategories]     = useState<CategoryRead[]>([]);
  const [loading,      setLoading]        = useState(true);
  const [chartsReady,  setChartsReady]    = useState(false);
  const [period,       setPeriod]         = useState<Period>("all");
  const [hoveredPeriod, setHoveredPeriod] = useState<Period | null>(null);

  const [openTransactionsModal, setOpenTransactionsModal] = useState(false);
  const [transactionTypeFilter,  setTransactionTypeFilter]  = useState<"all" | "Income" | "Expense">("all");
  const [transactionMonthFilter, setTransactionMonthFilter] = useState<string>("all");

  const openModal = (filter: "all" | "Income" | "Expense" = "all") => {
    setTransactionTypeFilter(filter);
    setTransactionMonthFilter(period !== "all" ? period : "all");
    setOpenTransactionsModal(true);
  };

  const isAdmin   = userRole === 1;
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !tokenType) return;
      setLoading(true);
      try {
        const [txRes, catRes] = await Promise.all([
          api.get<ReadTransaction[]>("api/transactions/", {
            headers: { Authorization: `${tokenType} ${token}` },
          }),
          api.get<CategoryRead[]>("api/categories/", {
            headers: { Authorization: `${tokenType} ${token}` },
          }),
        ]);

        const activeTx = txRes.data
          .filter((t) => !t.deleted_at)
          .map((t) => ({ ...t, amount: parseFloat(String(t.amount)) }));

        setTransactions(activeTx);
        setCategories(catRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setChartsReady(true));
        });
      }
    };

    fetchData();
  }, [token, tokenType]);

  // ── Derive dynamic period list from actual transaction dates ──────────────
  const availablePeriods = useMemo(() => {
    const visibleTx = isAdmin
      ? transactions
      : transactions.filter(t => t.user_id === userId);

    const monthSet = new Set<string>();
    visibleTx.forEach(t => {
      const ym = t.transaction_date.slice(0, 7);
      if (ym) monthSet.add(ym);
    });

    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return [
      ...sorted.map(ym => ({ key: ym, label: formatPeriodLabel(ym) })),
      { key: "all", label: "All Time" },
    ];
  }, [transactions, isAdmin, userId]);

  useEffect(() => {
    if (availablePeriods.length === 0) return;
    const currentYM = new Date().toISOString().slice(0, 7);
    const hasCurrentMonth = availablePeriods.some(p => p.key === currentYM);
    if (hasCurrentMonth) {
      setPeriod(currentYM);
    } else {
      const pastMonths = availablePeriods.filter(p => p.key !== "all" && p.key <= currentYM);
      if (pastMonths.length > 0) {
        setPeriod(pastMonths[0].key);
      } else {
        setPeriod("all");
      }
    }
  }, [availablePeriods]);

  const getCategoryName = (id: number | null) => {
    if (!id) return "Uncategorized";
    return categories.find((c) => c.id === id)?.name ?? "Unknown";
  };

  const filteredTransactions = useMemo(() => {
    if (loading) return [];
    let txs = [...transactions];
    if (!isAdmin) txs = txs.filter((t) => t.user_id === userId);
    if (period !== "all") txs = txs.filter(t => t.transaction_date.startsWith(period));
    return txs;
  }, [transactions, isAdmin, userId, period, loading]);

  const summary = useMemo(() => {
    const incomeTx  = filteredTransactions.filter((t) => t.transaction_type === "Income");
    const expenseTx = filteredTransactions.filter((t) => t.transaction_type === "Expense");
    const totalIncome  = incomeTx.reduce((sum, t)  => sum + t.amount, 0);
    const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome,
      totalExpense,
      netProfit:        totalIncome - totalExpense,
      transactionCount: filteredTransactions.length,
      incomeCount:      incomeTx.length,
      expenseCount:     expenseTx.length,
    };
  }, [filteredTransactions]);

  const dailyTrends = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredTransactions.forEach((t) => {
      const date = t.transaction_date;
      if (!map.has(date)) map.set(date, { income: 0, expense: 0 });
      const entry = map.get(date)!;
      if (t.transaction_type === "Income") entry.income += t.amount;
      else entry.expense += t.amount;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date:    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        income:  val.income,
        expense: val.expense,
        net:     val.income - val.expense,
      }));
  }, [filteredTransactions]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredTransactions.filter((t) => t.transaction_type === "Expense").forEach((t) => {
      const name = getCategoryName(t.category_id);
      const prev = map.get(name) || { amount: 0, count: 0 };
      map.set(name, { amount: prev.amount + t.amount, count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([name, v], i) => ({
      name, amount: v.amount, count: v.count, fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredTransactions]);

  const incomeBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredTransactions.filter((t) => t.transaction_type === "Income").forEach((t) => {
      const name = getCategoryName(t.category_id);
      const prev = map.get(name) || { amount: 0, count: 0 };
      map.set(name, { amount: prev.amount + t.amount, count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([name, v], i) => ({
      name, amount: v.amount, count: v.count, fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredTransactions]);

  const profitMargin = summary.totalIncome > 0
    ? (summary.netProfit / summary.totalIncome) * 100
    : 0;

  if (loading) return (
    <p style={{ color: "hsl(var(--page-fg-muted))", padding: "2rem" }}>Loading dashboard data...</p>
  );

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard Overview - {roleLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "All transactions across the business" : "Your personal transaction summary"}
            </p>
          </div>

          {/* ── Period toggle — dark-mode aware ── */}
          <div
            className="ts-toggle-bar"
            style={{
              borderRadius: "0.5rem",
              padding:      "0.25rem",
              display:      "grid",
              gridTemplateColumns: `repeat(${Math.min(availablePeriods.length, 6)}, auto)`,
              gap:          "0.25rem",
            }}
          >
            {availablePeriods.map((p) => {
              const isActive  = period === p.key;
              const isHovered = hoveredPeriod === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  onMouseEnter={() => setHoveredPeriod(p.key)}
                  onMouseLeave={() => setHoveredPeriod(null)}
                  // Active pill reuses the same pattern as TabBtn in SettingsPage
                  className={isActive ? "ts-surface ts-page-fg" : "ts-page-fg-light"}
                  style={{
                    fontSize:        "0.75rem",
                    fontWeight:      isActive ? 600 : 500,
                    padding:         "0.25rem 0.75rem",
                    borderRadius:    "0.375rem",
                    border:          "none",
                    cursor:          "pointer",
                    whiteSpace:      "nowrap",
                    transition:      "background-color 0.15s, color 0.15s",
                    // Active: filled with primary; hovered: soft income tint; default: transparent
                    backgroundColor: isActive  ? PRIMARY
                                   : isHovered ? "hsl(var(--income) / 0.12)"
                                   : "transparent",
                    color:           isActive  ? "hsl(0,0%,100%)"
                                   : isHovered ? INCOME
                                   : undefined, // let className handle default
                    boxShadow:       isActive  ? "0 1px 4px hsl(var(--primary) / 0.25)" : "none",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Income"
            value={`₱${summary.totalIncome.toLocaleString()}`}
            subtitle={`${summary.incomeCount} transactions`}
            icon={ArrowDownLeft}
            variant="income"
            onClick={() => openModal("Income")}
          />
          <KpiCard
            title="Total Expenses"
            value={`₱${summary.totalExpense.toLocaleString()}`}
            subtitle={`${summary.expenseCount} transactions`}
            icon={ArrowUpRight}
            variant="expense"
            onClick={() => openModal("Expense")}
          />
          <KpiCard
            title="Net Profit"
            value={`${summary.netProfit >= 0 ? "" : "-"}₱${Math.abs(summary.netProfit).toLocaleString()}`}
            subtitle={`${profitMargin.toFixed(1)}% margin`}
            icon={summary.netProfit >= 0 ? TrendingUp : TrendingDown}
            variant={summary.netProfit >= 0 ? "income" : "expense"}
            onClick={() => openModal("all")}
          />
          <KpiCard
            title="Transactions"
            value={summary.transactionCount.toString()}
            subtitle="Active records"
            icon={Activity}
            variant="default"
            onClick={() => openModal("all")}
          />
        </div>

        {/* Charts */}
        {chartsReady ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Suspense fallback={<ChartSkeleton height={340} />}>
                <IncomeExpenseChart data={dailyTrends} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton height={340} />}>
                <NetProfitChart data={dailyTrends} />
              </Suspense>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <CategoryBreakdownChart title="Expense Breakdown" subtitle="By category" data={expenseBreakdown} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <CategoryBreakdownChart title="Income Breakdown"  subtitle="By category" data={incomeBreakdown}  />
              </Suspense>
              <RecentTransactions
                transactions={filteredTransactions}
                getCategoryName={getCategoryName}
                openViewTransactions={() => openModal("all")}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartSkeleton height={340} />
              <ChartSkeleton height={340} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartSkeleton height={320} />
              <ChartSkeleton height={320} />
              <ChartSkeleton height={320} />
            </div>
          </>
        )}

        {openTransactionsModal && (
          <ReadTransactions
            onClose={() => setOpenTransactionsModal(false)}
            initialTypeFilter={transactionTypeFilter}
            initialMonthFilter={transactionMonthFilter}
          />
        )}
      </div>
    </>
  );
}