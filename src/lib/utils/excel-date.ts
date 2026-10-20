import * as XLSX from "xlsx";

/**
 * Helper robust untuk parsing berbagai format tanggal lahir di Excel:
 * - Serial number Excel (e.g. 43600 -> "2019-05-15")
 * - Format ISO (YYYY-MM-DD atau YYYY/MM/DD)
 * - Format Indonesia / Eropa (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
 * - Format teks nama bulan Indonesia / Inggris ("15 Mei 2019", "Pasuruan, 12 Agustus 2012")
 * - JavaScript Date objects
 */
export function parseExcelDate(val: any): string | null {
  if (val === null || val === undefined) return null;

  // 1. Jika objek Date native JavaScript
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. Jika tipe angka (serial date number Excel, misal 43600)
  if (typeof val === "number" && !isNaN(val)) {
    if (val > 1000 && val < 100000) {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
          return `${dateObj.y}-${String(dateObj.m).padStart(2, "0")}-${String(dateObj.d).padStart(2, "0")}`;
        }
      } catch {
        // Abaikan dan lanjut ke metode berikutnya
      }
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // 3. Jika string berisi kode serial Excel numerik (misal "43600" atau "43600.0")
  if (/^\d{4,6}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 1000 && num < 100000) {
      try {
        const dateObj = XLSX.SSF.parse_date_code(num);
        if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
          return `${dateObj.y}-${String(dateObj.m).padStart(2, "0")}-${String(dateObj.d).padStart(2, "0")}`;
        }
      } catch {
        // Abaikan
      }
    }
  }

  // 4. Format ISO YYYY-MM-DD atau YYYY/MM/DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // 5. Format Indonesia / Eropa: DD/MM/YYYY, DD-MM-YYYY, atau DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 6. Format teks nama bulan Indonesia / Inggris (misal: "15 Mei 2019" atau "Pasuruan, 12 Agustus 2012")
  const indoMonths: Record<string, string> = {
    januari: "01", jan: "01", january: "01",
    februari: "02", feb: "02", february: "02",
    maret: "03", mar: "03", march: "03",
    april: "04", apr: "04",
    mei: "05", may: "05",
    juni: "06", jun: "06", june: "06",
    juli: "07", jul: "07", july: "07",
    agustus: "08", agu: "08", ags: "08", aug: "08", august: "08",
    september: "09", sep: "09",
    oktober: "10", okt: "10", oct: "10", october: "10",
    november: "11", nov: "11",
    desember: "12", des: "12", dec: "12", december: "12",
  };

  const textMatch = str.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (textMatch && indoMonths[textMatch[2]]) {
    const day = textMatch[1].padStart(2, "0");
    const month = indoMonths[textMatch[2]];
    const year = textMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 7. Fallback Date constructor
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

// Helper untuk membaca nilai baris Excel secara case-insensitive & toleran variasi nama kolom
export function getRowValue(row: any, ...possibleKeys: string[]): any {
  if (!row || typeof row !== "object") return undefined;

  // 1. Cek langsung
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }

  // 2. Cek dengan normalisasi (abaikan huruf besar/kecil, spasi, tanda baca)
  const normalizedRowKeys = new Map<string, string>();
  for (const actualKey of Object.keys(row)) {
    const norm = actualKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    normalizedRowKeys.set(norm, actualKey);
  }

  for (const k of possibleKeys) {
    const normSearch = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedActualKey = normalizedRowKeys.get(normSearch);
    if (matchedActualKey) {
      const val = row[matchedActualKey];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return val;
      }
    }
  }

  // 3. Cek substring / kecocokan parsial
  for (const k of possibleKeys) {
    const normSearch = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [normActual, actualKey] of normalizedRowKeys.entries()) {
      if (normActual.includes(normSearch) || normSearch.includes(normActual)) {
        const val = row[actualKey];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
  }

  return undefined;
}
