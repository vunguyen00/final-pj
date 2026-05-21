/**
 * Essay Evaluation API Route
 * POST /api/ai/essay-evaluation
 */

import { NextRequest, NextResponse } from "next/server";
import { scoringService, validateRequestBody, formatResponseForClient } from "@/lib/ai";

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

    const { essay, taskPrompt } = body as { essay: string; taskPrompt?: string };

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

    // Evaluate essay
    const evaluation = await scoringService.evaluateEssay({ essay, taskPrompt });

    // Format response
    const formattedResponse = formatResponseForClient(evaluation);

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
        overall_score: evaluation.overall,
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: formattedResponse,
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
