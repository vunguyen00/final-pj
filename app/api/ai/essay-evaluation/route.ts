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
import { evaluateIeltsWriting } from "@/lib/ielts-grading";
import { buildWritingAssessmentPayload } from "@/lib/ielts-assessment";
import { isCourseMarkedCompleted } from "@/lib/learning-progress";
import type {
  IeltsWritingEvaluation,
  IeltsWritingTaskType,
} from "@/lib/ielts-rubric";

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
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    const { essay, taskPrompt, courseId, title, taskType } = body as {
      essay: string;
      taskPrompt?: string;
      courseId?: string;
      title?: string;
      taskType?: IeltsWritingTaskType;
    };
    const chargePoints = shouldChargeAiPoints(user.role);

    if (courseId) {
      const canUseCourse = await canUseAiForCourse(user, courseId);
      if (!canUseCourse) {
        return NextResponse.json({ error: "Bạn không có quyền trên khóa học này." }, { status: 403 });
      }
    }
    const scoreOnly =
      user.role === "STUDENT" && Boolean(courseId)
        ? await isCourseMarkedCompleted(user.id, courseId!)
        : false;

    if (chargePoints) {
      const pointsBefore = await getAiPointsSummary(user.id);
      if (pointsBefore.available < WRITING_AI_COST) {
        return NextResponse.json({ error: "Không đủ điểm để chấm bài bằng Writing AI." }, { status: 400 });
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

    let evaluation: IeltsWritingEvaluation;
    try {
      evaluation = await evaluateIeltsWriting({
        prompt: taskPrompt?.trim() || "General IELTS Writing Task 2",
        answer: sanitizedEssay,
        taskType,
        scoreOnly,
      });
    } catch (evaluationError) {
      console.error("IELTS writing grading failed:", evaluationError);
      throw new Error("AI_EVALUATION_FAILED");
    }

    const storedPayload = buildWritingAssessmentPayload(evaluation, scoreOnly);
    const overall = evaluation.overall_band;
    const assessment = await prisma.aiAssessment.create({
      data: {
        userId: user.id,
        courseId: courseId || null,
        type: "WRITING",
        taskType: evaluation.task_type,
        title: title?.trim() || "Writing AI",
        prompt: taskPrompt || null,
        submissionText: essay,
        score: overall,
        maxScore: 9,
        bandSystem: "IELTS",
        bandLevel: overall.toFixed(1),
        bandScore: overall,
        criteria: storedPayload.criteria,
        feedback: storedPayload.feedback,
        mistakes: storedPayload.mistakes,
        improvements: storedPayload.improvements,
        sampleAnswer: scoreOnly ? null : evaluation.model_answer || null,
        submittedAt: new Date(),
      },
    });

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
        language: "English",
        overall_score: overall,
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: storedPayload.feedback,
        assessmentId: assessment.id,
        points: pointResult,
        streak: activity.streak,
        scoreOnly,
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
