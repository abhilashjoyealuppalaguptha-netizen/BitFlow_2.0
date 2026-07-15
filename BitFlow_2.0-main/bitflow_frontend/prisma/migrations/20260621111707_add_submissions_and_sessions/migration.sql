-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "learningLevel" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "moduleId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "examples" TEXT NOT NULL,
    "hints" TEXT NOT NULL,
    "solutionExplanation" TEXT,
    "starterCode" TEXT NOT NULL,
    "testbenchSkeleton" TEXT,
    "publicTestbench" TEXT NOT NULL,
    "hiddenTestcases" TEXT NOT NULL,
    "hiddenTestbench" TEXT,
    "publicTestcases" TEXT NOT NULL,
    "expectedOutputMode" TEXT NOT NULL DEFAULT 'stdout_compare',
    "waveformRequired" BOOLEAN NOT NULL DEFAULT false,
    "xpReward" INTEGER NOT NULL DEFAULT 300,
    "xpBonusNoHints" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstSolvedAt" DATETIME,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "hintsUnlocked" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserProgress_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserXp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "unlockedModules" TEXT NOT NULL DEFAULT '["mod_logic_gates", "mod_arithmetic"]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserXp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "designCode" TEXT NOT NULL,
    "testbenchCode" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL DEFAULT 'RUN',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "simStatus" TEXT NOT NULL,
    "simStdout" TEXT,
    "simStderr" TEXT,
    "simExitCode" INTEGER,
    "durationMs" INTEGER,
    "testcaseResults" TEXT NOT NULL DEFAULT '[]',
    "numTestsPassed" INTEGER NOT NULL DEFAULT 0,
    "numTestsTotal" INTEGER NOT NULL DEFAULT 0,
    "waveformVcd" TEXT,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Question_slug_key" ON "Question"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_problemId_key" ON "UserProgress"("userId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserXp_userId_key" ON "UserXp"("userId");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_problemId_idx" ON "Submission"("problemId");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_accepted_idx" ON "Submission"("accepted");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");
