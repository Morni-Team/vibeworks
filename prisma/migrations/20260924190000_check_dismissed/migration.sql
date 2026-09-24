-- Fehlalarme im Repo-Check abhaken (#203): je Projekt eine Liste aus "regel|datei".
ALTER TABLE "RepoCache" ADD COLUMN "checkDismissed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
