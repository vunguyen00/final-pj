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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Can co transcript de AI cham speaking." }, { status: 400 });
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
        return NextResponse.json({ error: "Ban khong co quyen tren khoa hoc nay." }, { status: 403 });
      }
    }

    if (chargePoints) {
      const pointsBefore = await getAiPointsSummary(user.id);
      if (pointsBefore.available < SPEAKING_AI_COST) {
        return NextResponse.json({ error: "Khong du diem de dung speaking AI." }, { status: 400 });
      }
    }

    const healthy = await ollamaService.healthCheck();
    if (!healthy) {
      return NextResponse.json({ error: "AI service is unavailable. Please ensure Ollama is running." }, { status: 503 });
    }

    const audioFile = audio instanceof File ? audio : null;
    const audioUrl = await saveSpeakingAudio(audioFile, user.id);
    const evaluationResult = (await evaluateTestAiAnswers([
      {
        questionId: "speaking",
        mode: "SPEAKING",
        answer: sanitizedTranscript,
        prompt: `${prompt}\nConversation context: ${conversation.slice(0, 1500)}`,
        examType: examType === "HSK" ? "HSK" : "IELTS",
      },
    ])).get("speaking");
    if (!evaluationResult || evaluationResult.failed) {
      throw new Error("AI_EVALUATION_FAILED");
    }

    const evaluation = evaluationResult.aiEvaluation;
    const normalizedOverall = evaluationResult.normalizedScore;
    const taskRelevance = evaluation.taskRelevance ?? 0;
    const normalizedCriteria = evaluation.criteria || {};
    const exam = examType === "HSK" ? "HSK" : "IELTS";
    const maxScore = exam === "IELTS" ? 9 : 100;
    const toExamScore = (score: number) =>
      exam === "IELTS" ? Math.round(score * 0.9 * 2) / 2 : Math.round(score * 10);
    const criteria = Object.fromEntries(
      Object.entries(normalizedCriteria)
        .filter(([key]) => ["fluency", "vocabulary", "grammar", "pronunciation"].includes(key))
        .map(([key, value]) => [key, toExamScore(Number(value))]),
    );
    const overall = toExamScore(normalizedOverall);
    const band = {
      system: exam,
      level: exam === "IELTS" ? overall.toFixed(1) : `HSKK ${Math.round(overall)}`,
      score: overall,
      rationale: evaluation.band?.rationale || "",
    };
    const sampleAnswer = evaluation.sampleAnswer || "";

    const assessment = await prisma.aiAssessment.create({
      data: {
        userId: user.id,
        courseId: courseId || null,
        type: "SPEAKING",
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
        bandSystem: band.system,
        bandLevel: band.level,
        bandScore: band.score,
        criteria: {
          ...criteria,
          taskRelevance,
        },
        feedback: {
          evaluation: {
            scores: criteria,
            overall,
            normalizedOverall,
            taskRelevance,
            language: evaluation.language,
            exam,
            scoreScale: exam === "IELTS" ? "BAND_0_9" : "SCORE_0_100",
            band,
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
        },
        mistakes: {
          pronunciation: evaluation.pronunciationErrors || [],
          grammar: evaluation.grammarErrors || [],
          vocabulary: evaluation.vocabularyErrors || [],
          fluency: evaluation.fluencyIssues || [],
        },
        improvements: {
          suggestions: evaluation.suggestions,
          practiceMethods: evaluation.practiceMethods || [],
          sampleAnswer,
        },
        sampleAnswer: sampleAnswer || null,
        submittedAt: new Date(),
      } as never,
    }) as unknown as { id: string };

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
      data: {
        evaluation: {
          scores: criteria,
          overall,
          normalizedOverall,
          taskRelevance,
          language: evaluation.language,
          exam,
          scoreScale: exam === "IELTS" ? "BAND_0_9" : "SCORE_0_100",
          band,
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
          sampleAnswer,
        },
      },
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
    const status = message.includes("too short") || message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
