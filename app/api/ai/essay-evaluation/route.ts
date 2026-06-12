/**
 * Essay Evaluation API Route
 * POST /api/ai/essay-evaluation
 */

import { NextRequest, NextResponse } from "next/server";
import { sanitizeEssay, validateEssay, validatePromptSafety, validateRequestBody } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { getAiPointsSummary, recordLearningActivity, spendAiPoints, WRITING_AI_COST } from "@/lib/ai-points";
import { prisma } from "@/lib/prisma";
import { canUseAiForCourse, shouldChargeAiPoints } from "@/lib/ai-access";
import { evaluateTestAiAnswers } from "@/lib/test-ai-evaluation";

function applyCorrections(
  essay: string,
  corrections: Array<{ original: string; improved: string; reason: string }>,
) {
  return corrections.reduce((result, correction) => {
    if (!correction.original || !correction.improved || !result.includes(correction.original)) {
      return result;
    }
    return result.replace(correction.original, correction.improved);
  }, essay);
}

/**
 * Health check before evaluation
 */
async function checkOllamaHealth() {
  try {
    const { ollamaService } = await import("@/lib/ai");
    const isHealthy = await ollamaService.healthCheck();
    return isHealthy;
  } catch {
    return false;
  }
}

/**
 * POST /api/ai/essay-evaluation
 * Evaluates an essay and returns detailed feedback
 *
 * Request body:
 * {
 *   "essay": "Your essay text here..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "evaluation": {...},
 *     "analysis": {...},
 *     "improvements": {...}
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate request structure
    if (!validateRequestBody(body)) {
      return NextResponse.json(
        {
          error: "Request must contain 'essay' field with string value",
        },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { essay, taskPrompt, courseId, title } = body as {
      essay: string;
      taskPrompt?: string;
      courseId?: string;
      title?: string;
    };
    const chargePoints = shouldChargeAiPoints(user.role);

    if (courseId) {
      const canUseCourse = await canUseAiForCourse(user, courseId);
      if (!canUseCourse) {
        return NextResponse.json({ error: "Ban khong co quyen tren khoa hoc nay." }, { status: 403 });
      }
    }

    if (chargePoints) {
      const pointsBefore = await getAiPointsSummary(user.id);
      if (pointsBefore.available < WRITING_AI_COST) {
        return NextResponse.json({ error: "Khong du diem de cham writing AI." }, { status: 400 });
      }
    }

    // Check if Ollama is available
    const ollamaHealthy = await checkOllamaHealth();
    if (!ollamaHealthy) {
      console.error("Ollama health check failed");
      return NextResponse.json(
        {
          error: "AI service is unavailable. Please ensure Ollama is running at http://127.0.0.1:11434",
        },
        { status: 503 }
      );
    }

    const validation = validateEssay(essay);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid essay" }, { status: 400 });
    }
    const sanitizedEssay = sanitizeEssay(essay);
    if (!validatePromptSafety(sanitizedEssay)) {
      return NextResponse.json({ error: "Invalid request content" }, { status: 400 });
    }

    const evaluationResult = (await evaluateTestAiAnswers([
      {
        questionId: "writing",
        mode: "WRITING",
        answer: sanitizedEssay,
        prompt: taskPrompt,
      },
    ])).get("writing");
    if (!evaluationResult || evaluationResult.failed) {
      throw new Error("AI_EVALUATION_FAILED");
    }

    const evaluation = evaluationResult.aiEvaluation;
    const criteria = evaluation.criteria || {};
    const grammar = Number(criteria.grammar ?? evaluationResult.normalizedScore);
    const vocabulary = Number(criteria.vocabulary ?? evaluationResult.normalizedScore);
    const coherence = Number(criteria.coherence ?? evaluationResult.normalizedScore);
    const taskResponse = Number(criteria.task_response ?? evaluationResult.normalizedScore);
    const overall = evaluationResult.normalizedScore;
    const corrections = evaluation.corrections || [];
    const improvedVersion = applyCorrections(sanitizedEssay, corrections);
    const formattedResponse = {
      evaluation: {
        scores: {
          grammar,
          vocabulary,
          coherence,
          task_response: taskResponse,
          overall,
        },
        summary: evaluation.summary,
        language: evaluation.language,
        band: evaluation.band,
        taskRelevance: evaluation.taskRelevance ?? 0,
        onTopic: evaluation.onTopic ?? true,
        offTopicReason: evaluation.offTopicReason || "",
        detailedComment: evaluation.detailedComment || evaluation.summary,
        task_requirements: {
          prompt_understanding: taskPrompt?.trim() || "General writing task",
          addressed_points: evaluation.strengths,
          missing_points: evaluation.weaknesses,
        },
      },
      analysis: {
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        feedback: evaluation.feedback || [],
        suggestions: evaluation.suggestions,
      },
      improvements: {
        corrections,
        improved_version: improvedVersion,
        sample_answer: evaluation.sampleAnswer || "",
      },
    };
    const assessment = await prisma.aiAssessment.create({
      data: {
        userId: user.id,
        courseId: courseId || null,
        type: "WRITING",
        title: title?.trim() || "Writing AI",
        prompt: taskPrompt || null,
        submissionText: essay,
        score: overall,
        maxScore: 10,
        bandSystem: evaluation.band?.system || "GENERAL",
        bandLevel: evaluation.band?.level || "Intermediate",
        bandScore: Number(evaluation.band?.score ?? overall),
        criteria: {
          taskAchievement: taskResponse,
          coherenceCohesion: coherence,
          lexicalResource: vocabulary,
          grammarRangeAccuracy: grammar,
          taskRelevance: evaluation.taskRelevance ?? 0,
        },
        feedback: formattedResponse,
        mistakes: {
          grammar: corrections,
          vocabulary: evaluation.vocabularyErrors || evaluation.feedback || [],
          weakSentences: corrections.map((item) => item.original),
        },
        improvements: {
          suggestions: evaluation.suggestions,
          improvedVersion,
          practiceMethods: [
            "Rewrite weak sentences, then compare with the improved version.",
            "Build a topic vocabulary bank before writing.",
            "Review grammar patterns from repeated corrections.",
          ],
        },
        sampleAnswer: evaluation.sampleAnswer || improvedVersion || null,
        submittedAt: new Date(),
      } as never,
    }) as unknown as { id: string };

    const pointResult = chargePoints
      ? await spendAiPoints(user.id, courseId || null, WRITING_AI_COST, "WRITING_AI", assessment.id)
      : { spent: 0, available: (await getAiPointsSummary(user.id)).available };
    const activity = await recordLearningActivity({
      userId: user.id,
      courseId: courseId || null,
      activityType: "WRITING",
      sourceId: assessment.id,
    });

    const duration = Date.now() - startTime;

    // Log successful evaluation
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "success",
        action: "essay_evaluation",
        duration,
        status: 200,
        language: evaluation.language,
        overall_score: overall,
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: formattedResponse,
        assessmentId: assessment.id,
        points: pointResult,
        streak: activity.streak,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        action: "essay_evaluation",
        duration,
        error: errorMessage,
      })
    );

    // Handle specific error messages
    if (errorMessage.includes("timeout")) {
      return NextResponse.json(
        { error: "Request timeout. Ollama took too long to respond." },
        { status: 504 }
      );
    }

    if (errorMessage === "AI_EVALUATION_FAILED") {
      return NextResponse.json(
        { error: "AI dang tam thoi qua tai. Vui long thu lai sau." },
        { status: 503 },
      );
    }

    if (errorMessage.includes("too short") || errorMessage.includes("too long")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    if (errorMessage.includes("suspicious patterns")) {
      return NextResponse.json(
        { error: "Invalid request content" },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to evaluate essay. Please try again later.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/essay-evaluation
 * Health check endpoint
 */
export async function GET() {
  try {
    const { ollamaService } = await import("@/lib/ai");
    const isHealthy = await ollamaService.healthCheck();

    if (isHealthy) {
      return NextResponse.json(
        {
          status: "healthy",
          service: "essay-evaluation",
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "essay-evaluation",
          message: "Ollama service is not responding",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        service: "essay-evaluation",
        message:
          error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
