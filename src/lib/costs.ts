import type { ProjectCost } from "@/generated/prisma/client";
import type { Locale } from "./i18n/config";
import { INTL_LOCALE } from "./i18n/config";

// Kosten je Projekt: Beträge in Cent, Zahlweise monatlich, jährlich oder
// einmalig, optional mit Verlängerungstermin. Ohne Datenbank.

export const CURRENCIES = ["EUR", "USD", "CHF", "GBP"] as const;
export const INTERVALS = ["MONTHLY", "YEARLY", "ONCE"] as const;
type Currency = (typeof CURRENCIES)[number];
export type CostInterval = (typeof INTERVALS)[number];

/** Warnung so viele Tage vor einer Verlängerung. */
export const RENEWAL_WARN_DAYS = 14;

export interface CostItem {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  interval: CostInterval;
  renewsOn: string | null;
  note: string | null;
}

export function serializeCost(c: ProjectCost): CostItem {
  return {
    id: c.id,
    name: c.name,
    amountCents: c.amountCents,
    currency: c.currency,
    interval: (INTERVALS as readonly string[]).includes(c.interval) ? (c.interval as CostInterval) : "MONTHLY",
    renewsOn: c.renewsOn,
    note: c.note,
  };
}

/** Monate auf einen Kalendertag addieren – der 31. wird im kürzeren Monat zum letzten Tag. */
export function addMonthsKey(key: string, months: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + months;
  const d = Number(key.slice(8, 10));
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(d, last))).toISOString().slice(0, 10);
}

/** Nächster Verlängerungstermin ab heute – vergangene rücken um Monat bzw. Jahr weiter. */
export function nextRenewal(renewsOn: string | null, interval: CostInterval, today: string): string | null {
  if (!renewsOn) return null;
  if (interval === "ONCE") return renewsOn;
  const step = interval === "MONTHLY" ? 1 : 12;
  let next = renewsOn;
  for (let i = 0; next < today && i < 1200; i++) next = addMonthsKey(renewsOn, step * (i + 1));
  return next;
}

export interface CostTotals {
  currency: string;
  monthly: number;
  yearly: number;
  once: number;
}

/** Summen je Währung in Cent: monatlich (Jährliches anteilig), jährlich, einmalig. */
export function costTotals(costs: Array<Pick<CostItem, "amountCents" | "currency" | "interval">>): CostTotals[] {
  const map = new Map<string, CostTotals>();
  for (const c of costs) {
    const t = map.get(c.currency) ?? { currency: c.currency, monthly: 0, yearly: 0, once: 0 };
    if (c.interval === "MONTHLY") {
      t.monthly += c.amountCents;
      t.yearly += c.amountCents * 12;
    } else if (c.interval === "YEARLY") {
      t.monthly += c.amountCents / 12;
      t.yearly += c.amountCents;
    } else {
      t.once += c.amountCents;
    }
    map.set(c.currency, t);
  }
  return [...map.values()].map((t) => ({ ...t, monthly: Math.round(t.monthly) })).sort((a, b) => b.yearly - a.yearly);
}

export function formatMoney(cents: number, currency: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
