-- AlterTable
ALTER TABLE "OCMPlayRecord" ADD COLUMN     "brakingPoint" INTEGER;

-- AlterTable
ALTER TABLE "OCMTop1Ghost" ADD COLUMN     "tuneHandling" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tunePower" INTEGER NOT NULL DEFAULT 0;
