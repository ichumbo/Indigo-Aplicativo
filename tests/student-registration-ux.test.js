const test = require("node:test");
const assert = require("node:assert/strict");

function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("/").map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return date;
    }
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return date;
    }
    return null;
  }

  const rawDigits = clean.replace(/\D/g, "");
  if (rawDigits.length === 8) {
    const first4 = Number(rawDigits.slice(0, 4));
    if (first4 >= 1900 && first4 <= 2099) {
      const y = first4;
      const m = Number(rawDigits.slice(4, 6));
      const d = Number(rawDigits.slice(6, 8));
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
        return date;
      }
    } else {
      const d = Number(rawDigits.slice(0, 2));
      const m = Number(rawDigits.slice(2, 4));
      const y = Number(rawDigits.slice(4, 8));
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
        return date;
      }
    }
  }

  const fallback = new Date(clean.includes("T") ? clean : `${clean}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateInput(value) {
  if (!value || typeof value !== "string") return "";
  const clean = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-");
    return `${d}/${m}/${y}`;
  }

  let digits = clean.replace(/\D/g, "").slice(0, 8);

  if (digits.length === 8) {
    const first4 = Number(digits.slice(0, 4));
    const last4 = Number(digits.slice(4, 8));
    if (first4 >= 1900 && first4 <= 2099 && (last4 < 1900 || last4 > 2099)) {
      const year = digits.slice(0, 4);
      const month = digits.slice(4, 6);
      const day = digits.slice(6, 8);
      return `${day}/${month}/${year}`;
    }
  }

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function calculateAge(birthDate, referenceDate = new Date()) {
  if (!birthDate) return null;
  const parsed = parseDateString(birthDate);
  if (!parsed) return null;

  let age = referenceDate.getFullYear() - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  const dayDiff = referenceDate.getDate() - parsed.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function normalizePhone(value) {
  return (value ?? "").replace(/\D/g, "");
}

function formatPhoneInput(value) {
  const digits = normalizePhone(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

test("Validação & Máscara de Data: Converte e valida datas 00/00/0000 e casos 20010705", () => {
  assert.strictEqual(formatDateInput("15"), "15");
  assert.strictEqual(formatDateInput("1506"), "15/06");
  assert.strictEqual(formatDateInput("15061998"), "15/06/1998");
  assert.strictEqual(formatDateInput("15/06/1998"), "15/06/1998");
  assert.strictEqual(formatDateInput("20010705"), "05/07/2001");
  assert.strictEqual(formatDateInput("2001-07-05"), "05/07/2001");

  const parsedBR = parseDateString("15/06/1998");
  assert.ok(parsedBR instanceof Date);
  assert.strictEqual(parsedBR.getFullYear(), 1998);
  assert.strictEqual(parsedBR.getMonth(), 5);
  assert.strictEqual(parsedBR.getDate(), 15);

  const parsedISO = parseDateString("1998-06-15");
  assert.ok(parsedISO instanceof Date);
  assert.strictEqual(parsedISO.getFullYear(), 1998);
  assert.strictEqual(parsedISO.getMonth(), 5);
  assert.strictEqual(parsedISO.getDate(), 15);

  const parsedRawYYYYMMDD = parseDateString("20010705");
  assert.ok(parsedRawYYYYMMDD instanceof Date);
  assert.strictEqual(parsedRawYYYYMMDD.getFullYear(), 2001);
  assert.strictEqual(parsedRawYYYYMMDD.getMonth(), 6);
  assert.strictEqual(parsedRawYYYYMMDD.getDate(), 5);

  const refDate = new Date("2026-08-27T00:00:00");
  const ageBR = calculateAge("15/06/1998", refDate);
  assert.strictEqual(ageBR, 28);

  const age2001 = calculateAge("20010705", refDate);
  assert.strictEqual(age2001, 25);
});

test("Validação de Telefone e Máscara no Cadastro", () => {
  assert.strictEqual(formatPhoneInput("11988887777"), "(11) 98888-7777");
  assert.strictEqual(formatPhoneInput("(11) 98888-7777"), "(11) 98888-7777");
  assert.strictEqual(formatPhoneInput("1188887777"), "(11) 8888-7777");
});
