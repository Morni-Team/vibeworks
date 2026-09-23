import Link from "next/link";
import { Eye } from "lucide-react";
import { getLocale, getT } from "@/lib/i18n/server";
import { registrationOpen } from "@/lib/settings";

// Hinweisleiste über jeder Seite der Demo-Instanz (DEMO_MODE=true).
export async function DemoBanner() {
  const t = await getT("demo");
  // Zum Konto einladen darf nur, wo die Registrierung auch offen ist
  const signUp = await registrationOpen();
  const site = (await getLocale()) === "en" ? "https://moinmornhart.github.io/vibeworks/en/" : "https://moinmornhart.github.io/vibeworks/";
  return (
    <div role="note" data-testid="demo-banner" className="border-b border-accent/30 bg-accent/15 px-4 py-2 text-center text-sm">
      <Eye size={14} className="-mt-0.5 mr-1.5 inline text-accent-ink" aria-hidden />
      {t("banner.text")}{" "}
      {/* Erst der Weg zum eigenen Konto (#195) – dann, wer mag, die eigene Installation */}
      {signUp && (
        <>
          <Link href="/register" className="font-semibold text-accent-ink hover:underline" data-testid="demo-signup">
            {t("banner.signUp")} →
          </Link>{" "}
          ·{" "}
        </>
      )}
      <a href={site} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink hover:underline">
        {t("banner.install")} →
      </a>
    </div>
  );
}
