/**
 * Credit Log Export Utilities
 * Handles exporting credit activity log data to CSV and PDF formats
 */

import { format } from "date-fns";
import type { CreditLogEntry } from "@/types/credit-log";

/**
 * Format credit status for display
 */
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    charged: "Charged",
    refunded: "Refunded",
    pending_refund: "Pending Refund",
    reserved: "Reserved",
    dispute_rejected: "Dispute Rejected",
    failed: "Failed",
  };
  return statusMap[status] || status;
};

/**
 * Format credit amount for export
 */
const formatCredits = (entry: CreditLogEntry): string => {
  if (entry.creditStatus === "refunded") {
    return `+${entry.refundAmount.toFixed(2)}`;
  }
  return `-${(entry.creditsCharged || entry.creditsReserved).toFixed(2)}`;
};

/**
 * Export credit log entries to CSV format
 */
export const exportToCSV = (entries: CreditLogEntry[], filename?: string): void => {
  const headers = [
    "Date",
    "Time",
    "Generation ID",
    "Prompt",
    "Model Type",
    "Model Name",
    "Model Version",
    "Credits",
    "Status",
    "Balance After",
  ];

  const rows = entries.map((entry) => [
    format(entry.date, "yyyy-MM-dd"),
    format(entry.date, "HH:mm:ss"),
    entry.id,
    // Escape quotes and wrap in quotes for CSV
    `"${(entry.prompt || "Audio-driven generation").replace(/"/g, '""')}"`,
    entry.modelType,
    entry.modelName,
    entry.modelVersion || "-",
    formatCredits(entry),
    formatStatus(entry.creditStatus),
    entry.cumulativeBalance?.toFixed(2) || "-",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `credit-activity-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export credit log entries to PDF format
 * Uses a simple HTML-to-PDF approach with print styling
 */
export const exportToPDF = (entries: CreditLogEntry[], title?: string): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Unable to open print window. Please allow popups.");
  }

  const tableRows = entries
    .map(
      (entry) => `
      <tr>
        <td>${format(entry.date, "MMM d, yyyy")}</td>
        <td>${format(entry.date, "h:mm a")}</td>
        <td style="font-family: monospace; font-size: 10px;">${entry.id.substring(0, 8)}...</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${entry.prompt || "<em>Audio-driven</em>"}
        </td>
        <td>${entry.modelName}</td>
        <td>${entry.modelVersion || "-"}</td>
        <td style="text-align: right; ${entry.creditStatus === "refunded" ? "color: green;" : "color: inherit;"}">${formatCredits(entry)}</td>
        <td>${formatStatus(entry.creditStatus)}</td>
        <td style="text-align: right;">${entry.cumulativeBalance?.toFixed(2) || "-"}</td>
      </tr>
    `
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || "Credit Activity Log"}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          padding: 20px;
          margin: 0;
        }
        h1 {
          font-size: 18px;
          margin-bottom: 5px;
        }
        .meta {
          color: #666;
          margin-bottom: 20px;
          font-size: 11px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        .footer {
          margin-top: 20px;
          font-size: 10px;
          color: #999;
          text-align: center;
        }
        @media print {
          body { padding: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title || "Credit Activity Log"}</h1>
      <div class="meta">
        Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} • ${entries.length} transactions
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>ID</th>
            <th>Prompt</th>
            <th>Model</th>
            <th>Version</th>
            <th style="text-align: right;">Credits</th>
            <th>Status</th>
            <th style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="footer">
        Credit Activity Report • Page 1
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
