PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
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

INSERT INTO "new_Submission" (
    "id",
    "userId",
    "problemId",
    "designCode",
    "testbenchCode",
    "submissionType",
    "attemptNumber",
    "simStatus",
    "simStdout",
    "simStderr",
    "simExitCode",
    "durationMs",
    "testcaseResults",
    "numTestsPassed",
    "numTestsTotal",
    "waveformVcd",
    "xpEarned",
    "accepted",
    "createdAt"
)
SELECT
    "id",
    "userId",
    "problemId",
    "designCode",
    "testbenchCode",
    "submissionType",
    "attemptNumber",
    "simStatus",
    "simStdout",
    "simStderr",
    "simExitCode",
    "durationMs",
    "testcaseResults",
    "numTestsPassed",
    "numTestsTotal",
    "waveformVcd",
    "xpEarned",
    "accepted",
    "createdAt"
FROM "Submission";

DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";

CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");
CREATE INDEX "Submission_problemId_idx" ON "Submission"("problemId");
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");
CREATE INDEX "Submission_accepted_idx" ON "Submission"("accepted");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
