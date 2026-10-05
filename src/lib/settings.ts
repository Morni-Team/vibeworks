import { cache } from "react";
import { db } from "./db";

// Die eine Einstellungszeile wird auf jeder Seite mehrfach gebraucht (Layout,
// Anmeldung, Projektseite …). `cache` holt sie deshalb nur einmal je Anfrage –
// vorher waren es zwei bis drei Abfragen pro Seitenaufruf (#214).
export const getSettings = cache(async () => {
  const existing = await db.settings.findUnique({ where: { id: "instance" } });
  if (existing) return existing;
  return db.settings.upsert({ where: { id: "instance" }, create: { id: "instance" }, update: {} });
});

export async function isSetupDone(): Promise<boolean> {
  return Boolean((await getSettings()).setupDoneAt);
}

export async function registrationOpen(): Promise<boolean> {
  const s = await getSettings();
  return s.mode === "MULTI" && s.allowRegistration;
}
