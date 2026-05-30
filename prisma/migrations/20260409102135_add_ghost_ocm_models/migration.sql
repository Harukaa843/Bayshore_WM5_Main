-- AlterTable
ALTER TABLE "CarCrown" ADD COLUMN     "path" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ramp" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CarItem" ADD COLUMN     "earnedAt" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CarChallenger" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "challengerCarId" INTEGER NOT NULL,
    "stamp" INTEGER NOT NULL DEFAULT 0,
    "result" INTEGER NOT NULL DEFAULT 0,
    "area" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarChallenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarStampTarget" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "stampTargetCarId" INTEGER NOT NULL,
    "returnCount" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "recommended" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CarStampTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarCrownDetect" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "trail" BYTEA,
    "opponentCarId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarCrownDetect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GhostBattleRecord" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,
    "playedAt" INTEGER NOT NULL DEFAULT 0,
    "playedShopName" TEXT NOT NULL DEFAULT '',
    "playedShopId" TEXT NOT NULL DEFAULT '',
    "playedRegionId" INTEGER NOT NULL DEFAULT 0,
    "rgResult" INTEGER NOT NULL DEFAULT 0,
    "rgVictoryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GhostBattleRecord_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "GhostTrail" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "area" INTEGER NOT NULL,
    "ramp" INTEGER NOT NULL DEFAULT 0,
    "path" INTEGER NOT NULL DEFAULT 0,
    "trail" BYTEA,
    "time" INTEGER,
    "driveData" BYTEA,
    "driveDMergeSerial" INTEGER,
    "trendBinaryByArea" BYTEA,
    "byAreaMergeSerial" INTEGER,
    "trendBinaryByCar" BYTEA,
    "byCarMergeSerial" INTEGER,
    "trendBinaryByUser" BYTEA,
    "byUserMergeSerial" INTEGER,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,
    "playedAt" INTEGER NOT NULL DEFAULT 0,
    "crownBattle" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GhostTrail_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "CarPathandTuning" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "area" INTEGER NOT NULL,
    "ramp" INTEGER NOT NULL DEFAULT 0,
    "path" INTEGER NOT NULL DEFAULT 0,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarPathandTuning_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMEvent" (
    "dbId" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "qualifyingPeriodStartAt" INTEGER NOT NULL,
    "qualifyingPeriodCloseAt" INTEGER NOT NULL,
    "competitionStartAt" INTEGER NOT NULL,
    "competitionCloseAt" INTEGER NOT NULL,
    "competitionEndAt" INTEGER NOT NULL,
    "lengthOfPeriod" INTEGER NOT NULL DEFAULT 0,
    "lengthOfInterval" INTEGER NOT NULL DEFAULT 0,
    "area" INTEGER NOT NULL DEFAULT 0,
    "minigamePatternId" INTEGER NOT NULL DEFAULT 0,
    "isOutdated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OCMEvent_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMPeriod" (
    "dbId" SERIAL NOT NULL,
    "competitionDbId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "startAt" INTEGER NOT NULL,
    "closeAt" INTEGER NOT NULL,

    CONSTRAINT "OCMPeriod_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMTally" (
    "dbId" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "result" INTEGER NOT NULL DEFAULT 0,
    "numWins" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OCMTally_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMGhostBattleRecord" (
    "dbId" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL DEFAULT 0,
    "result" INTEGER NOT NULL DEFAULT 0,
    "ocmMainDraw" BOOLEAN NOT NULL DEFAULT false,
    "shopName" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "OCMGhostBattleRecord_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMGhostTrail" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "area" INTEGER NOT NULL,
    "ramp" INTEGER NOT NULL DEFAULT 0,
    "path" INTEGER NOT NULL DEFAULT 0,
    "trail" BYTEA,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,
    "playedAt" INTEGER NOT NULL DEFAULT 0,
    "competitionId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL DEFAULT 0,
    "ocmMainDraw" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OCMGhostTrail_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMTop1Ghost" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL DEFAULT 0,
    "result" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OCMTop1Ghost_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMTop1GhostTrail" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "area" INTEGER NOT NULL,
    "ramp" INTEGER NOT NULL DEFAULT 0,
    "path" INTEGER NOT NULL DEFAULT 0,
    "trail" BYTEA,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,
    "playedAt" INTEGER NOT NULL DEFAULT 0,
    "competitionId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OCMTop1GhostTrail_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "OCMPlayRecord" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OCMPlayRecord_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "GhostExpeditionEvent" (
    "dbId" SERIAL NOT NULL,
    "ghostExpeditionId" INTEGER NOT NULL,
    "startAt" INTEGER NOT NULL,
    "endAt" INTEGER NOT NULL,
    "aftereventEndAt" INTEGER NOT NULL,
    "opponentCountry" TEXT NOT NULL DEFAULT 'JPN',

    CONSTRAINT "GhostExpeditionEvent_pkey" PRIMARY KEY ("dbId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OCMEvent_competitionId_key" ON "OCMEvent"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "GhostExpeditionEvent_ghostExpeditionId_key" ON "GhostExpeditionEvent"("ghostExpeditionId");

-- AddForeignKey
ALTER TABLE "CarChallenger" ADD CONSTRAINT "CarChallenger_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarChallenger" ADD CONSTRAINT "CarChallenger_challengerCarId_fkey" FOREIGN KEY ("challengerCarId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarStampTarget" ADD CONSTRAINT "CarStampTarget_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarStampTarget" ADD CONSTRAINT "CarStampTarget_stampTargetCarId_fkey" FOREIGN KEY ("stampTargetCarId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCrownDetect" ADD CONSTRAINT "CarCrownDetect_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostBattleRecord" ADD CONSTRAINT "GhostBattleRecord_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostTrail" ADD CONSTRAINT "GhostTrail_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarPathandTuning" ADD CONSTRAINT "CarPathandTuning_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;
