export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1J0yncjvPpq7m2BU6JBtUHy4OiuTn_FCn_tcV0DZN0ec/export?format=csv&gid=0";

export type Person = {
  group: number;
  name: string;
  registration: string;
  postcode: string;
};

export function groupNumberFromPath(pathname: string): number | null {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  if (!segment || !/^\d+$/.test(segment)) return null;
  return Number(segment);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function clean(value: string): string {
  return value
    .replaceAll("\u200b", "")
    .replaceAll("\u200c", "")
    .replaceAll("\u200d", "")
    .replaceAll("\ufeff", "")
    .replaceAll("\u00a0", " ")
    .trim();
}

export function parsePeople(csv: string): Person[] {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => clean(cell) === "Name"),
  );
  if (headerIndex === -1) return [];

  const header = rows[headerIndex].map(clean);
  const nameCol = header.indexOf("Name");
  const registrationCol = header.findIndex((cell) =>
    cell.toLowerCase().startsWith("registration"),
  );
  const postcodeCol = header.findIndex((cell) =>
    cell.toLowerCase().startsWith("postcode"),
  );
  const groupCol = Math.max(0, nameCol - 1);

  const people: Person[] = [];
  let group = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const groupMatch = /^group\s+(\d+)$/i.exec(clean(row[groupCol] ?? ""));
    if (groupMatch) group = Number(groupMatch[1]);

    const name = clean(row[nameCol] ?? "");
    if (!name || group === 0) continue;

    people.push({
      group,
      name,
      registration: clean(row[registrationCol] ?? ""),
      postcode: clean(row[postcodeCol] ?? ""),
    });
  }

  return people;
}

export async function loadPeople(): Promise<Person[]> {
  const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Sheet request failed (${response.status})`);
  }
  return parsePeople(await response.text());
}
