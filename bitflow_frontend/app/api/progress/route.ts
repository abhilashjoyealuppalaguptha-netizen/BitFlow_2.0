import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/progress - Fetch user progress
export async function GET() {
  try {
    const sessionCookie = cookies().get("bitflow_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({
        progress: {
          totalXp: 0,
          problems: {},
          unlockedModules: ["mod_logic_gates", "mod_arithmetic"],
          lastUpdatedAt: Date.now(),
        },
      });
    }

    const userXp = await prisma.userXp.findUnique({
      where: { userId: sessionCookie },
    });

    const progressRecords = await prisma.userProgress.findMany({
      where: { userId: sessionCookie },
    });

    const problemsRecord: Record<string, any> = {};
    for (const record of progressRecords) {
      problemsRecord[record.problemId] = {
        problemId: record.problemId,
        solved: record.solved,
        firstSolvedAt: record.firstSolvedAt ? record.firstSolvedAt.getTime() : null,
        attempts: record.attempts,
        bestSubmissionId: record.id,
        hintsUnlocked: JSON.parse(record.hintsUnlocked || "[]"),
        xpEarned: record.xpEarned,
      };
    }

    const unlockedModules = userXp?.unlockedModules
      ? JSON.parse(userXp.unlockedModules)
      : ["mod_logic_gates", "mod_arithmetic"];

    return NextResponse.json({
      progress: {
        totalXp: userXp?.totalXp || 0,
        problems: problemsRecord,
        unlockedModules,
        lastUpdatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.error("Fetch progress error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/progress - Record solves, attempts, and hint unlocks
export async function POST(request: Request) {
  try {
    const sessionCookie = cookies().get("bitflow_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { actionType, problemId, moduleId, xpReward, hintTier } = await request.json();

    if (!problemId) {
      return NextResponse.json({ error: "ProblemId is required." }, { status: 400 });
    }

    // Load or create UserProgress record
    let userProgress = await prisma.userProgress.findUnique({
      where: {
        userId_problemId: {
          userId: sessionCookie,
          problemId,
        },
      },
    });

    if (!userProgress) {
      userProgress = await prisma.userProgress.create({
        data: {
          userId: sessionCookie,
          problemId,
          solved: false,
          attempts: 0,
          xpEarned: 0,
          hintsUnlocked: "[]",
        },
      });
    }

    // Load UserXp
    let userXp = await prisma.userXp.findUnique({
      where: { userId: sessionCookie },
    });

    if (!userXp) {
      userXp = await prisma.userXp.create({
        data: {
          userId: sessionCookie,
          totalXp: 0,
          unlockedModules: JSON.stringify(["mod_logic_gates", "mod_arithmetic"]),
        },
      });
    }

    const currentUnlockedModules = JSON.parse(userXp.unlockedModules || "[]");

    if (actionType === "solve") {
      const alreadySolved = userProgress.solved;
      const additionalXp = alreadySolved ? 0 : (Number(xpReward) || 0);

      // Update UserProgress
      userProgress = await prisma.userProgress.update({
        where: { id: userProgress.id },
        data: {
          solved: true,
          attempts: userProgress.attempts + 1,
          firstSolvedAt: userProgress.firstSolvedAt || new Date(),
          xpEarned: userProgress.xpEarned + additionalXp,
        },
      });

      // Update UserXp
      const newXp = userXp.totalXp + additionalXp;
      const newModules = [...currentUnlockedModules];
      if (moduleId && !newModules.includes(moduleId)) {
        newModules.push(moduleId);
      }

      userXp = await prisma.userXp.update({
        where: { id: userXp.id },
        data: {
          totalXp: newXp,
          unlockedModules: JSON.stringify(newModules),
        },
      });
    } else if (actionType === "attempt") {
      userProgress = await prisma.userProgress.update({
        where: { id: userProgress.id },
        data: {
          attempts: userProgress.attempts + 1,
        },
      });
    } else if (actionType === "hint") {
      const currentHints = JSON.parse(userProgress.hintsUnlocked || "[]");
      if (hintTier && !currentHints.includes(hintTier)) {
        currentHints.push(hintTier);
        userProgress = await prisma.userProgress.update({
          where: { id: userProgress.id },
          data: {
            hintsUnlocked: JSON.stringify(currentHints),
          },
        });
      }
    }

    // Return the updated overall progress record
    const progressRecords = await prisma.userProgress.findMany({
      where: { userId: sessionCookie },
    });

    const problemsRecord: Record<string, any> = {};
    for (const record of progressRecords) {
      problemsRecord[record.problemId] = {
        problemId: record.problemId,
        solved: record.solved,
        firstSolvedAt: record.firstSolvedAt ? record.firstSolvedAt.getTime() : null,
        attempts: record.attempts,
        bestSubmissionId: record.id,
        hintsUnlocked: JSON.parse(record.hintsUnlocked || "[]"),
        xpEarned: record.xpEarned,
      };
    }

    return NextResponse.json({
      progress: {
        totalXp: userXp.totalXp,
        problems: problemsRecord,
        unlockedModules: JSON.parse(userXp.unlockedModules || "[]"),
        lastUpdatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.error("Update progress error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
