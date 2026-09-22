-- Registrierte KI-Programme merken (#141/#188): Autorisierung prüft Kennung
-- und Rückkehr-Adresse gegen die Registrierung, statt beides zu glauben.
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");
CREATE INDEX "OAuthClient_expiresAt_idx" ON "OAuthClient"("expiresAt");

-- Nachgereicht: im Schema steht codeHash seit #141 auf @unique, die Migration
-- hat den Index aber nie angelegt (Abgleich war dadurch nicht leer).
CREATE UNIQUE INDEX "OAuthFlow_codeHash_key" ON "OAuthFlow"("codeHash");
