-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('debit', 'credit');

-- CreateTable
CREATE TABLE "WalletAccount" (
    "playerId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "roundId" TEXT NOT NULL,
    "balanceAfterCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_playerId_createdAt_idx" ON "LedgerEntry"("playerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_type_roundId_key" ON "LedgerEntry"("type", "roundId");

-- CreateIndex
CREATE INDEX "OutboxMessage_publishedAt_failedAt_id_idx" ON "OutboxMessage"("publishedAt", "failedAt", "id");
