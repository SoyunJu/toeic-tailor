-- CreateEnum
CREATE TYPE "ClassName" AS ENUM ('TARGET_600', 'TARGET_800', 'HIGH_SCORE');

-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('WEEKDAY', 'WEEKEND');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "className" "ClassName",
ADD COLUMN     "classType" "ClassType",
ADD COLUMN     "enrolledAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3);
