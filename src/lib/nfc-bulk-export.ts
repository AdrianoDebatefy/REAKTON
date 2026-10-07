import * as XLSX from "xlsx";
import type { NfcBulkBatch } from "@/types/content";

export type NfcBulkExportRow = {
  cardId: string;
  url: string;
  taps: number;
  lastTapAt: number | null;
};

/** German Excel list separator — comma decimals would break comma-separated CSV. */
const CSV_FIELD_SEP = ";";

function bulkFileStamp(createdAt: string): string {
  return createdAt.slice(0, 19).replace(/[:T]/g, "-");
}

function formatLastTapForExport(ms: number | null): string {
  if (ms == null) return "";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString("de-DE");
  }
}

function formatBulkCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE");
  } catch {
    return iso;
  }
}

function csvEscapeField(value: string | number): string {
  const raw = String(value);
  const needsQuotes =
    raw.includes(CSV_FIELD_SEP) ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r") ||
    raw.includes(",");
  if (!needsQuotes) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvEscapeField).join(CSV_FIELD_SEP);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportNfcBulkCsv(batch: NfcBulkBatch, rows: NfcBulkExportRow[]) {
  const header = csvRow(["Karten-ID", "NFC-Link", "Taps", "Letzter Tap"]);
  const dataLines = rows.map((row) =>
    csvRow([
      row.cardId,
      row.url,
      row.taps,
      formatLastTapForExport(row.lastTapAt),
    ])
  );
  const body = [header, ...dataLines].join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  downloadBlob(`reakton-nfc-bulk-${bulkFileStamp(batch.createdAt)}.csv`, blob);
}

export function exportNfcBulkXlsx(batch: NfcBulkBatch, rows: NfcBulkExportRow[]) {
  const cardsSheet = XLSX.utils.aoa_to_sheet([
    ["Karten-ID", "NFC-Link", "Taps", "Letzter Tap"],
    ...rows.map((row) => [
      row.cardId,
      row.url,
      row.taps,
      formatLastTapForExport(row.lastTapAt),
    ]),
  ]);
  cardsSheet["!cols"] = [{ wch: 18 }, { wch: 58 }, { wch: 8 }, { wch: 20 }];

  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["Feld", "Wert"],
    ["Bulk-ID", batch.id],
    ["Erstellt am", formatBulkCreatedAt(batch.createdAt)],
    ["Anzahl Codes", rows.length],
    ["Taps gesamt", rows.reduce((sum, row) => sum + row.taps, 0)],
  ]);
  infoSheet["!cols"] = [{ wch: 16 }, { wch: 40 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, cardsSheet, "Karten");
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Bulk-Info");
  XLSX.writeFile(workbook, `reakton-nfc-bulk-${bulkFileStamp(batch.createdAt)}.xlsx`);
}
