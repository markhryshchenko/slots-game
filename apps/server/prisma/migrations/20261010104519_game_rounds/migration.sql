-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "mathProfileId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "betCents" BIGINT NOT NULL,
    "totalWinCents" BIGINT NOT NULL,
    "balanceAfterCents" BIGINT NOT NULL,
    "stops" JSONB NOT NULL,
    "grid" JSONB NOT NULL,
    "wins" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameRound_playerId_createdAt_idx" ON "GameRound"("playerId", "createdAt");
