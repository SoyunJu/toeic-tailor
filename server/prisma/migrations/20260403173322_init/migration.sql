-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('PHOTO_DESCRIPTION', 'SHORT_RESPONSE', 'SHORT_CONVERSATION', 'LONG_TALK', 'GRAMMAR', 'VOCABULARY', 'SHORT_PASSAGE_FILL', 'SINGLE_PASSAGE', 'DOUBLE_PASSAGE', 'TRIPLE_PASSAGE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "totalScore" INTEGER,
    "lcScore" INTEGER,
    "rcScore" INTEGER,
    "level" "Level",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRecord" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "lcScore" INTEGER NOT NULL,
    "rcScore" INTEGER NOT NULL,
    "part1Correct" INTEGER,
    "part2Correct" INTEGER,
    "part3Correct" INTEGER,
    "part4Correct" INTEGER,
    "part5Correct" INTEGER,
    "part6Correct" INTEGER,
    "part7Correct" INTEGER,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "part" INTEGER NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "content" TEXT NOT NULL,
    "options" JSONB,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workbook" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "bookUid" TEXT,
    "bookStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderUid" TEXT,
    "orderStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkbookQuestion" (
    "id" SERIAL NOT NULL,
    "workbookId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "pageOrder" INTEGER NOT NULL,

    CONSTRAINT "WorkbookQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkbookQuestion_workbookId_questionId_key" ON "WorkbookQuestion"("workbookId", "questionId");

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workbook" ADD CONSTRAINT "Workbook_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbookQuestion" ADD CONSTRAINT "WorkbookQuestion_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "Workbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbookQuestion" ADD CONSTRAINT "WorkbookQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
