/**
 * app/api/submissions/route.ts
 *
 * POST /api/submissions — Save a simulation result to the Submission table
 *                          Called by useArenaProblem and useProblem hooks
 *                          after every run/submit.
 *
 * GET  /api/submissions — Fetch submission history for the current user
 *
 * This is the critical LLM training data pipeline.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// POST — Save a submission (from run or submit)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      userId,           // string | null (optional, for guest submissions)
      problemSlug,      // string (required) — used to find Question.id
      designCode,       // string (required)
      testbenchCode,    // string (required)
      submissionType,   // "RUN" | "SUBMIT"
      simStatus,        // "SUCCESS" | "COMPILE_ERROR" | "RUNTIME_ERROR" | "TIMEOUT"
      simStdout,        // string | null
      simStderr,        // string | null
      simExitCode,      // number | null
      durationMs,       // number | null
      testcaseResults,  // Array<{id, description, passed, expected, actual}>
      waveformVcd,      // string | null (base64)
      xpEarned,         // number
      accepted,         // boolean
    } = body;

    // Validate required fields
    if (!problemSlug || !designCode || !testbenchCode) {
      return NextResponse.json(
        { error: "problemSlug, designCode, and testbenchCode are required." },
        { status: 400 }
      );
    }

    // Look up the Question by slug
    const question = await prisma.question.findUnique({
      where: { slug: problemSlug },
      select: { id: true },
    });

    if (!question) {
      console.warn(`[submissions] Problem not found in DB: ${problemSlug}`);
      return NextResponse.json(
        { error: `Problem not found: ${problemSlug}` },
        { status: 404 }
      );
    }

    // If userId provided, look up user; otherwise skip
    let dbUserId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (user) {
        dbUserId = user.id;
      }
    }

    // Count previous attempts for this user + problem (optional, for metrics)
    const attemptCount = dbUserId
      ? await prisma.submission.count({
          where: { userId: dbUserId, problemId: question.id },
        })
      : 0;

    // Save submission
    const submission = await prisma.submission.create({
      data: {
        userId:         dbUserId ?? undefined,
        problemId:      question.id,
        designCode,
        testbenchCode,
        submissionType: submissionType ?? "RUN",
        attemptNumber:  attemptCount + 1,
        simStatus:      simStatus ?? "SUCCESS",
        simStdout:      simStdout ?? null,
        simStderr:      simStderr ?? null,
        simExitCode:    simExitCode ?? null,
        durationMs:     durationMs ?? null,
        testcaseResults: JSON.stringify(testcaseResults ?? []),
        numTestsPassed: Array.isArray(testcaseResults)
          ? testcaseResults.filter((t: any) => t.passed).length
          : 0,
        numTestsTotal: Array.isArray(testcaseResults)
          ? testcaseResults.length
          : 0,
        waveformVcd:   waveformVcd ?? null,
        xpEarned:      xpEarned ?? 0,
        accepted:      accepted ?? false,
      },
      select: {
        id:             true,
        attemptNumber:  true,
        accepted:       true,
        numTestsPassed: true,
        numTestsTotal:  true,
        xpEarned:       true,
        createdAt:      true,
      },
    });

    // If this was a SUBMIT and ACCEPTED, update UserProgress
    if (dbUserId && accepted && submissionType === "SUBMIT") {
      // Get existing progress to check if this is first solve
      const existing = await prisma.userProgress.findUnique({
        where: {
          userId_problemId: { userId: dbUserId, problemId: question.id },
        },
        select: { solved: true, firstSolvedAt: true },
      });

      const isFirstSolve = !existing?.solved;

      await prisma.userProgress.upsert({
        where: {
          userId_problemId: { userId: dbUserId, problemId: question.id },
        },
        create: {
          userId:        dbUserId,
          problemId:     question.id,
          solved:        true,
          attempts:      attemptCount + 1,
          firstSolvedAt: new Date(),
          xpEarned:      xpEarned ?? 0,
        },
        update: {
          attempts:  { increment: 1 },
          // Only set firstSolvedAt on first solve
          ...(isFirstSolve
            ? {
                solved:        true,
                firstSolvedAt: new Date(),
                xpEarned:      { increment: xpEarned ?? 0 },
              }
            : {
                attempts: { increment: 1 },
              }),
        },
      });

      // Update user's total XP (only if first solve)
      if (isFirstSolve && (xpEarned ?? 0) > 0) {
        await prisma.userXp.upsert({
          where:  { userId: dbUserId },
          create: { userId: dbUserId, totalXp: xpEarned ?? 0 },
          update: { totalXp: { increment: xpEarned ?? 0 } },
        });
      }
    }

    return NextResponse.json({ submission }, { status: 201 });

  } catch (err) {
    console.error("[submissions POST] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(err) },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch submission history for a user
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId       = searchParams.get("userId");
    const problemSlug  = searchParams.get("slug");
    const limit        = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    let whereClause: Record<string, any> = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (problemSlug) {
      const question = await prisma.question.findUnique({
        where:  { slug: problemSlug },
        select: { id: true },
      });
      if (question) {
        whereClause.problemId = question.id;
      }
    }

    const submissions = await prisma.submission.findMany({
      where:   whereClause,
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id:             true,
        submissionType: true,
        attemptNumber:  true,
        simStatus:      true,
        numTestsPassed: true,
        numTestsTotal:  true,
        accepted:       true,
        xpEarned:       true,
        createdAt:      true,
        question: {
          select: { slug: true, title: true, difficulty: true },
        },
        user: {
          select: { username: true },
        },
      },
    });

    return NextResponse.json({ submissions });

  } catch (err) {
    console.error("[submissions GET] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
