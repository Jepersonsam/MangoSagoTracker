import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  sheetName: string;
  header: string[];
  rows: (string | number | boolean | null | undefined)[][];
  columnWidths?: number[];
}

export function exportToExcel(
  filename: string,
  sheetOrSheets: ExcelSheetData | ExcelSheetData[]
): void {
  const sheets = Array.isArray(sheetOrSheets) ? sheetOrSheets : [sheetOrSheets];
  const workbook = XLSX.utils.book_new();

  for (const item of sheets) {
    const aoa = [item.header, ...item.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths
    if (item.columnWidths && item.columnWidths.length > 0) {
      worksheet['!cols'] = item.columnWidths.map((w) => ({ wch: w }));
    } else {
      // Auto-calculate column widths based on content
      const colWidths = item.header.map((colName, colIdx) => {
        let maxLen = colName ? String(colName).length : 10;
        for (const row of item.rows) {
          const cellVal = row[colIdx];
          if (cellVal !== undefined && cellVal !== null) {
            const len = String(cellVal).length;
            if (len > maxLen) maxLen = len;
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
      });
      worksheet['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, item.sheetName.slice(0, 31));
  }

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}
