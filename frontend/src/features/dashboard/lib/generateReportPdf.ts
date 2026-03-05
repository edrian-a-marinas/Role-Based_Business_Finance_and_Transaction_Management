import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GeneratePDFProps } from "../schemas/report";

export function generateReportPDF({ reportResult, reportMode, viewMode }: GeneratePDFProps) {
  if (!reportResult) return;

  const doc = new jsPDF();

  const cleanNumber = (value: any): number => {
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[^0-9.-]/g, "");
    return Number(cleaned) || 0;
  };

  const peso = (value: number) => {
    const abs = Math.abs(value);
    const parts = abs.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const simpleDate = (dateString: string) => {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${year}-${month}-${day} ${hours}:${minutes} ${ampm} (UTC+8)`;
  };

  // ---------------- HEADER ----------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${reportMode.toUpperCase()} REPORT SUMMARY`, 105, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  let y = 28;
  doc.text(`View Mode: ${viewMode === "all users" ? "All Users" : "Own"}`, 20, y); y += 7;
  doc.text(`Report Type: ${reportResult.report.report_type}`, 20, y); y += 7;
  doc.text(`Date Range: ${simpleDate(reportResult.report.start_date)} to ${simpleDate(reportResult.report.end_date)}`, 20, y); y += 7;
  doc.text(`Generated At: ${simpleDate(reportResult.report.created_at)}`, 20, y); y += 7;
  doc.text(`Currency: PHP`, 20, y); y += 10;

  // ---------------- TOTAL ENTRIES ----------------
  const totalEntriesAll = reportResult.summary.length;
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL ENTRIES: ${totalEntriesAll}`, 105, y, { align: "center" });
  y += 10;

  const incomeItems = reportResult.summary.filter(i => i.transaction_type === "Income");
  const expenseItems = reportResult.summary.filter(i => i.transaction_type === "Expense");

  // ---------------- CREATE AUTO TABLE ----------------
  const tableBody: any[] = [];

  // Income section
  if (incomeItems.length) {
    tableBody.push([{ content: `-- INCOME -- (Total Entries: ${incomeItems.length})`, colSpan: 2, styles: { halign: "center", fontStyle: "bold", fillColor: [220,220,220] } }]);
    incomeItems.forEach(i => {
      tableBody.push([
        { content: i.category_name + (i.entry_count && i.entry_count > 1 ? ` (${i.entry_count})` : ""), styles: { halign: "left" } },
        { content: `+${peso(cleanNumber(i.total_amount))}`, styles: { halign: "right" } }
      ]);
    });
    const totalIncome = incomeItems.reduce((acc, i) => acc + cleanNumber(i.total_amount), 0);
    tableBody.push([
      { content: "Total Income", styles: { halign: "left", fontStyle: "bold" } },
      { content: `+${peso(totalIncome)}`, styles: { halign: "right", fontStyle: "bold" } }
    ]);
  }

  // Expense section
  if (expenseItems.length) {
    tableBody.push([{ content: `-- EXPENSE -- (Total Entries: ${expenseItems.length})`, colSpan: 2, styles: { halign: "center", fontStyle: "bold", fillColor: [220,220,220] } }]);
    expenseItems.forEach(i => {
      tableBody.push([
        { content: i.category_name + (i.entry_count && i.entry_count > 1 ? ` (${i.entry_count})` : ""), styles: { halign: "left" } },
        { content: `-${peso(cleanNumber(i.total_amount))}`, styles: { halign: "right" } }
      ]);
    });
    const totalExpense = expenseItems.reduce((acc, i) => acc + cleanNumber(i.total_amount), 0);
    tableBody.push([
      { content: "Total Expense", styles: { halign: "left", fontStyle: "bold" } },
      { content: `-${peso(totalExpense)}`, styles: { halign: "right", fontStyle: "bold" } }
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Category", "Amount"]],
    body: tableBody,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      1: { halign: 'right', cellWidth: 28 } // index 1 is Amount column
    },
    margin: { left: 20, right: 20 },
  });

  // ---------------- NET RESULT ----------------
  const rawTotal = reportResult.summary.reduce((acc, item) => {
    const amt = cleanNumber(item.total_amount);
    return item.transaction_type === "Income" ? acc + amt :
           item.transaction_type === "Expense" ? acc - amt : acc;
  }, 0);

  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;
  doc.setFont("helvetica", "bold");
  doc.text(`NET RESULT: ${rawTotal >= 0 ? "" : "-"}${peso(Math.abs(rawTotal))}`, 190, finalY + 10, { align: "right" });

  // ---------------- SAVE ----------------
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const reportTypeName = reportMode.charAt(0).toUpperCase() + reportMode.slice(1);
  doc.save(`${reportTypeName}_Report_${datePart}_${timePart}.pdf`);
}