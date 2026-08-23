import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export async function shareCsv(fileName: string, rows: Record<string, unknown>[]) {
  if (!rows.length) throw new Error("There is no data to export.");
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const csv = [columns.map(csvCell).join(","), ...rows.map(row => columns.map(column => csvCell(row[column])).join(","))].join("\n");
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uri = `${FileSystem.cacheDirectory}${safe.endsWith(".csv") ? safe : `${safe}.csv`}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: safe });
  return uri;
}
