import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAiPointsSummary,
  recordLearningActivity,
  SPEAKING_AI_COST,
  spendAiPoints,
} from "@/lib/ai-points";
import { prisma } from "@/lib/prisma";
import { ollamaService, sanitizeEssay, validateEssay, validatePromptSafety } from "@/lib/ai";
import { SpeakingExamType } from "@/lib/ai/types";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";
import { canUseAiForCourse, shouldChargeAiPoints } from "@/lib/ai-access";
import { evaluateTestAiAnswers } from "@/lib/test-ai-evaluation";
import { evaluateIeltsSpeaking } from "@/lib/ielts-grading";
import { buildSpeakingAssessmentPayload } from "@/lib/ielts-assessment";
import type { IeltsSpeakingEvaluation } from "@/lib/ielts-rubric";
import type { Prisma } from "@/app/generated/prisma/client";
import { isCourseMarkedCompleted } from "@/lib/learning-progress";

function audioExtension(type: string) {
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("wav")) return "wav";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

async function saveSpeakingAudio(file: File | null, userId: string) {
  if (!file || file.size === 0) return null;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "speaking");
  await mkdir(uploadsDir, { recursive: true });

  const extension = audioExtension(file.type);
  const filename = `${Date.now()}-${userId.slice(0, 8)}.${extension}`;
  const diskPath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  return `/uploads/speaking/${filename}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    const form = await request.formData();
    const transcript = String(form.get("transcript") || "").trim();
    const prompt = String(form.get("prompt") || "").trim();
    const title = String(form.get("title") || "Speaking AI").trim();
    const courseId = String(form.get("courseId") || "").trim();
    const conversation = String(form.get("conversation") || "").trim();
    const durationSeconds = Number(form.get("durationSeconds") || 0);
    const audio = form.get("audio");
    const speakingSetting = await getSpeakingAiSetting();
    const examType = speakingSetting.examType as SpeakingExamType;
    const chargePoints = shouldChargeAiPoints(user.role);

    if (!transcript) {
      return NextResponse.json({ error: "Cần có bản ghi lời nói để AI chấm bài." }, { status: 400 });
    }
    const validation = validateEssay(transcript);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid speaking transcript" }, { status: 400 });
    }
    const sanitizedTranscript = sanitizeEssay(transcript);
    if (!validatePromptSafety(sanitizedTranscript)) {
      return NextResponse.json({ error: "Invalid request content" }, { status: 400 });
    }

    if (courseId) {
      const canUseCourse = await canUseAiForCourse(user, courseId);
      if (!canUseCourse) {
        return NextResponse.json({ error: "Bạn không có quyền trên khóa học này." }, { status: 403 });
      }
    }
    const scoreOnly =
      user.role === "STUDENT" && Boolean(courseId)
        ? await isCourseMarkedCompleted(user.id, courseId)
        : false;

    if (chargePoints) {
      const pointsBefore = await getAiPointsSummary(user.id);
      if (pointsBefore.available < SPEAKING_AI_COST) {
        return NextResponse.json({ error: "Không đủ điểm để sử dụng Speaking AI." }, { status: 400 });
      }
    }

    const healthy = await ollamaService.healthCheck();
    if (!healthy) {
      return NextResponse.json({ error: "AI service is unavailable. Please ensure Ollama is running." }, { status: 503 });
    }

    const audioFile = audio instanceof File ? audio : null;
    const audioUrl = await saveSpeakingAudio(audioFile, user.id);
    const exam = examType === "HSK" ? "HSK" : "IELTS";
    let overall: number;
    let maxScore: number;
    let bandLevel: string;
    let criteriaPayload: Prisma.InputJsonValue;
    let feedbackPayload: Prisma.InputJsonValue;
    let mistakesPayload: Prisma.InputJsonValue;
    let improvementsPayload: Prisma.InputJsonValue;
    let sampleAnswer: string | null = null;

    if (exam === "IELTS") {
      let evaluation: IeltsSpeakingEvaluation;
      try {
        evaluation = await evaluateIeltsSpeaking({
          prompt: prompt || "General IELTS Speaking interview",
          transcript: sanitizedTranscript,
          conversation: conversation.slice(0, 4000),
          durationSeconds:
            Number.isFinite(durationSeconds) && durationSeconds > 0
              ? durationSeconds
              : null,
          audioAnalysisAvailable: false,
          scoreOnly,
        });
      } catch (evaluationError) {
        console.error("IELTS speaking grading failed:", evaluationError);
        throw new Error("AI_EVALUATION_FAILED");
      }

      const storedPayload = buildSpeakingAssessmentPayload(
        evaluation,
        scoreOnly,
      );
      overall = evaluation.overall_band;
      maxScore = 9;
      bandLevel = overall.toFixed(1);
      criteriaPayload = storedPayload.criteria;
      feedbackPayload = storedPayload.feedback;
      mistakesPayload = storedPayload.mistakes;
      improvementsPayload = storedPayload.improvements;
    } else {
      const evaluationResult = (await evaluateTestAiAnswers([
        {
          questionId: "speaking",
          mode: "SPEAKING",
          answer: sanitizedTranscript,
          prompt: `${prompt}\nConversation context: ${conversation.slice(0, 1500)}`,
          examType: "HSK",
          scoreOnly,
        },
      ])).get("speaking");
      if (!evaluationResult || evaluationResult.failed) {
        throw new Error("AI_EVALUATION_FAILED");
      }

      const evaluation = evaluationResult.aiEvaluation;
      const normalizedOverall = evaluationResult.normalizedScore;
      const taskRelevance = evaluation.taskRelevance ?? 0;
      const normalizedCriteria = evaluation.criteria || {};
      const toExamScore = (score: number) => Math.round(score * 10);
      const criteria = Object.fromEntries(
        Object.entries(normalizedCriteria)
          .filter(([key]) =>
            ["fluency", "vocabulary", "grammar", "pronunciation"].includes(key),
          )
          .map(([key, value]) => [key, toExamScore(Number(value))]),
      );
      overall = toExamScore(normalizedOverall);
      maxScore = 100;
      bandLevel = `HSKK ${Math.round(overall)}`;
      sampleAnswer = evaluation.sampleAnswer || null;
      criteriaPayload = { ...criteria, taskRelevance };
      feedbackPayload = {
        scoreOnly,
        evaluation: {
          scores: criteria,
          overall,
          normalizedOverall,
          taskRelevance,
          language: evaluation.language,
          exam,
          scoreScale: "SCORE_0_100",
          band: {
            system: exam,
            level: bandLevel,
            score: overall,
            rationale: evaluation.band?.rationale || "",
          },
          summary: evaluation.summary,
          onTopic: evaluation.onTopic ?? true,
          offTopicReason: evaluation.offTopicReason || "",
          detailedComment: evaluation.detailedComment || evaluation.summary,
        },
        analysis: {
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          feedback: evaluation.feedback || [],
          suggestions: evaluation.suggestions,
        },
        mistakes: {
          pronunciation: evaluation.pronunciationErrors || [],
          grammar: evaluation.grammarErrors || [],
          vocabulary: evaluation.vocabularyErrors || [],
          fluency: evaluation.fluencyIssues || [],
        },
        improvements: {
          practiceMethods: evaluation.practiceMethods || [],
          sampleAnswer: sampleAnswer || "",
        },
      };
      mistakesPayload = {
        pronunciation: evaluation.pronunciationErrors || [],
        grammar: evaluation.grammarErrors || [],
        vocabulary: evaluation.vocabularyErrors || [],
        fluency: evaluation.fluencyIssues || [],
      };
      improvementsPayload = {
        suggestions: evaluation.suggestions,
        practiceMethods: evaluation.practiceMethods || [],
        sampleAnswer: sampleAnswer || "",
      };
    }

    const assessment = await prisma.aiAssessment.create({
      data: {
        userId: user.id,
        courseId: courseId || null,
        type: "SPEAKING",
        taskType: exam === "IELTS" ? "speaking" : null,
        title,
        prompt: prompt || null,
        submissionText: sanitizedTranscript,
        audioUrl,
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds > 0
            ? Math.min(Math.round(durationSeconds), speakingSetting.durationSeconds)
            : null,
        score: overall,
        maxScore,
        bandSystem: exam,
        bandLevel,
        bandScore: overall,
        criteria: criteriaPayload,
        feedback: feedbackPayload,
        mistakes: mistakesPayload,
        improvements: improvementsPayload,
        sampleAnswer,
        submittedAt: new Date(),
      },
    });

    const pointResult = chargePoints
      ? await spendAiPoints(user.id, courseId || null, SPEAKING_AI_COST, "SPEAKING_AI", assessment.id)
      : { spent: 0, available: (await getAiPointsSummary(user.id)).available };
    const activity = await recordLearningActivity({
      userId: user.id,
      courseId: courseId || null,
      activityType: "SPEAKING",
      sourceId: assessment.id,
    });

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      audioUrl,
      points: pointResult,
      streak: activity.streak,
      data: feedbackPayload,
      scoreOnly,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error evaluating speaking:", error);
    const message = error instanceof Error ? error.message : "Failed to evaluate speaking.";
    if (message === "AI_EVALUATION_FAILED") {
      return NextResponse.json(
        { error: "AI dang tam thoi qua tai. Vui long thu lai sau." },
        { status: 503 },
      );
    }
    if (message.includes("too short") || message.includes("too long")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Không thể lưu kết quả bài nói. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
