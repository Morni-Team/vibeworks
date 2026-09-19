import { db } from "@/lib/db";
import { visibleTo } from "@/lib/access";
import { CHANGELOG } from "@/lib/changelog";
import { newsSince } from "@/lib/news";
import { getSettings } from "@/lib/settings";
import { dayKeyToDate, diffDays, formatDue } from "@/lib/taskDates";
import { formatMoney, INTERVALS, nextRenewal, RENEWAL_WARN_DAYS, type CostInterval } from "@/lib/costs";
import { INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { makeT, translateMessage } from "@/lib/i18n/messages";
import { ensureWeeklySuggestions, loadWeekSuggestions } from "@/lib/suggestions";
import { suggestionVars } from "@/lib/suggestionsLogic";
import { pollNtfyInboxes } from "@/lib/inboxServer";
import { addDaysKey } from "@/lib/weeks";
import { dayKey, TIME_ZONE } from "@/lib/utils";
import { eventsOf } from "./format";
import { passwordReminderDue } from "@/lib/auth/passwordAge";
import { appLink, notifyUser } from "./index";
import { runDiscordReports } from "@/lib/discord/discord";
import { runStructureWatch } from "@/lib/projectStructure";
import { runWeeklyReports } from "./weeklyReport";

// Zeitgesteuerte Benachrichtigungen: morgens die fälligen Aufgaben, nach
// einem Update einmal „VibeWorks aktualisiert“ an die Admins.

const DIGEST_HOUR = 8;

function zoneHour(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(at));
}

/** Zusammenfassung fälliger und überfälliger Aufgaben – einmal am Tag ab 8 Uhr. */
async function runDigest(now = new Date()): Promise<number> {
  // Posteingang aufräumen: nach 30 Tagen hat die Windows-App ihn längst abgeholt
  await db.notification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } });
  // MCP-Protokoll ebenso nur 30 Tage
  await db.mcpCall.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } });
  if (zoneHour(now) < DIGEST_HOUR) return 0;
  const today = dayKey(now);
  const rows = await db.notificationSettings.findMany({
    where: { OR: [{ digestSentOn: null }, { digestSentOn: { not: today } }] },
    select: { userId: true, events: true },
  });
  if (rows.length > 0) {
    await db.notificationSettings.updateMany({
      where: { userId: { in: rows.map(r => r.userId) } },
      data: { digestSentOn: today }
    });
  }
  let sent = 0;
  for (const row of rows) {
    if (!eventsOf(row.events).taskDue) continue;
    const tasks = await db.task.findMany({
      where: { project: { ...visibleTo(row.userId), status: { not: "ARCHIVED" } }, status: { not: "DONE" }, dueDate: { not: null, lt: dayKeyToDate(addDaysKey(today, 1)) } },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: { title: true, dueDate: true, project: { select: { name: true } } },
    });
    if (!tasks.length) continue;
    await notifyUser(row.userId, "taskDue", (t, locale) => ({
      event: "taskDue",
      title: t("events.taskDue.title", { n: tasks.length }),
      message: tasks.map((x) => `• ${x.title} (${x.project.name}) – ${formatDue(dayKey(x.dueDate!), today, locale)}`).join("\n"),
      url: appLink("/tasks"),
      priority: tasks.some((x) => dayKey(x.dueDate!) < today) ? "high" : "default",
    }));
    sent++;
  }
  return sent;
}

/** Nach einem Update einmal die Admins benachrichtigen. Beim allerersten Start nicht. */
async function runVersionCheck(): Promise<void> {
  const entry = CHANGELOG[0];
  if (!entry) return;
  const settings = await getSettings();
  if (settings.lastVersion === entry.version) return;
  await db.settings.update({ where: { id: "instance" }, data: { lastVersion: entry.version } });
  if (!settings.lastVersion) return;
  const admins = await db.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
  for (const admin of admins) {
    await notifyUser(admin.id, "updated", (t, locale) => ({
      event: "updated",
      title: t("events.updated.title", { version: entry.version }),
      message: locale === "en" ? (entry.titleEn ?? entry.title) : entry.title,
      url: appLink("/"),
    }));
  }
  // Neue Funktionen mit eigener Seite: an alle, in ihrer Sprache – der Klick führt direkt dorthin
  const news = newsSince(CHANGELOG, settings.lastVersion);
  if (!news.length) return;
  const users = await db.user.findMany({ where: { active: true }, select: { id: true } });
  for (const u of users) {
    for (const n of news) {
      await notifyUser(u.id, "news", (t, locale) => ({
        event: "news",
        title: t("events.news.title", { version: n.version }),
        message: (locale === "en" && n.change.en) || n.change.text,
        url: appLink(n.change.link),
      }));
    }
  }
}

/**
 * Kosten: vergangene Verlängerungen auf den nächsten Termin schieben und zwei
 * Wochen vorher einmal warnen (je Termin höchstens eine Meldung).
 */
async function runRenewals(now = new Date()): Promise<number> {
  const today = dayKey(now);
  const costs = await db.projectCost.findMany({
    where: { renewsOn: { not: null }, project: { buriedAt: null } },
    include: { project: { select: { id: true, name: true, ownerId: true } } },
  });
  let warned = 0;
  for (const c of costs) {
    const interval = (INTERVALS as readonly string[]).includes(c.interval) ? (c.interval as CostInterval) : "MONTHLY";
    let renewsOn = c.renewsOn!;
    let notifiedFor = c.notifiedFor;
    const next = nextRenewal(renewsOn, interval, today)!;
    if (next !== renewsOn) {
      renewsOn = next;
      notifiedFor = null;
      await db.projectCost.update({ where: { id: c.id }, data: { renewsOn, notifiedFor: null } });
    }
    if (interval === "ONCE") continue;
    const days = diffDays(today, renewsOn);
    if (days < 0 || days > RENEWAL_WARN_DAYS || notifiedFor === renewsOn) continue;
    await db.projectCost.update({ where: { id: c.id }, data: { notifiedFor: renewsOn } });
    await notifyUser(c.project.ownerId, "renewal", (t, locale) => ({
      event: "renewal",
      title: t("events.renewal.title", { name: c.name, project: c.project.name }),
      message: t("events.renewal.message", {
        date: new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(dayKeyToDate(renewsOn)),
        n: days,
        amount: formatMoney(c.amountCents, c.currency, locale),
      }),
      url: appLink(`/projects/${c.project.id}`),
    }));
    warned++;
  }
  return warned;
}

/** Wochen-Vorschläge: ab Montag 8 Uhr (oder beim ersten Lauf danach) je Konto einmal anlegen und melden. */
async function runWeeklySuggestions(now = new Date()): Promise<number> {
  if (zoneHour(now) < DIGEST_HOUR) return 0;
  const users = await db.user.findMany({ where: { active: true, projects: { some: {} } }, select: { id: true, locale: true } });
  let sent = 0;
  for (const u of users) {
    const locale: Locale = isLocale(u.locale) ? u.locale : "de";
    const created = await ensureWeeklySuggestions(u.id, now, locale);
    if (!created) continue;
    const list = await loadWeekSuggestions(u.id, now);
    await notifyUser(u.id, "suggestions", (t, loc) => {
      const ts = makeT(loc, "suggestions");
      return {
        event: "suggestions",
        title: t("events.suggestions.title", { n: list.length }),
        message: list
          .map((s) => `• ${ts(`kinds.${s.kind}.title`, suggestionVars(s.data, loc, (x) => translateMessage(loc, x)))}`)
          .join("\n"),
        url: appLink("/"),
      };
    });
    sent++;
  }
  return sent;
}

/** Wochenbericht (#82): ab Montag 8 Uhr einmal je Konto. */
async function runWeeklyReport(now = new Date()): Promise<number> {
  if (zoneHour(now) < DIGEST_HOUR) return 0;
  return runWeeklyReports(now);
}

/** Passwort-Erinnerung: ab 8 Uhr, wer sie eingeschaltet hat und dessen Passwort zu alt ist – höchstens alle 30 Tage. */
async function runPasswordReminders(now = new Date()): Promise<number> {
  if (zoneHour(now) < DIGEST_HOUR) return 0;
  const users = await db.user.findMany({
    where: { active: true, passwordHash: { not: null }, passwordReminderDays: { gt: 0 } },
    select: { id: true, createdAt: true, passwordChangedAt: true, passwordReminderDays: true, passwordRemindedAt: true },
  });
  let sent = 0;
  for (const u of users) {
    const age = passwordReminderDue({ changedAt: u.passwordChangedAt, createdAt: u.createdAt, days: u.passwordReminderDays, remindedAt: u.passwordRemindedAt }, now);
    if (age === null) continue;
    await db.user.update({ where: { id: u.id }, data: { passwordRemindedAt: now } });
    await notifyUser(u.id, "passwordAge", (t) => ({
      event: "passwordAge",
      title: t("events.passwordAge.title"),
      message: t("events.passwordAge.message", { n: age }),
      url: appLink("/account#passwort"),
    }));
    sent++;
  }
  return sent;
}

const g = globalThis as typeof globalThis & { __vwNotifyScheduler?: boolean };

export function startNotifyScheduler() {
  if (g.__vwNotifyScheduler) return;
  g.__vwNotifyScheduler = true;
  const log = (err: unknown) => console.error("[notify]", err);
  setTimeout(() => void runVersionCheck().catch(log), 15_000).unref?.();
  const tick = () => {
    void runDigest().catch(log);
    void runRenewals().catch(log);
    void runWeeklySuggestions().catch(log);
    void runPasswordReminders().catch(log);
    void runDiscordReports().catch(log);
    void runWeeklyReport().catch(log);
    // Aufbau-Wächter (#82): einmal am Tag je Projekt mit Aufbau-Tabelle
    void runStructureWatch().catch(log);
  };
  // Ideen-Eingang: ntfy-Themen jede Minute abholen
  setInterval(() => void pollNtfyInboxes().catch(log), 60_000).unref?.();
  setTimeout(tick, 30_000).unref?.();
  setInterval(tick, 10 * 60_000).unref?.();
}
