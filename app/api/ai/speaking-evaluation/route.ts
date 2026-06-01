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
import { ollamaService, speakingService } from "@/lib/ai";
import { SpeakingExamType } from "@/lib/ai/types";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";

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
    if (!user || user.role !== "STUDENT") {
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

    if (!transcript) {
      return NextResponse.json({ error: "Can co transcript de AI cham speaking." }, { status: 400 });
    }

    if (courseId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      });
      if (!enrollment) {
        return NextResponse.json({ error: "Ban khong co quyen tren khoa hoc nay." }, { status: 403 });
      }
    }

    const pointsBefore = await getAiPointsSummary(user.id);
    if (pointsBefore.available < SPEAKING_AI_COST) {
      return NextResponse.json({ error: "Khong du diem de dung speaking AI." }, { status: 400 });
    }

    const healthy = await ollamaService.healthCheck();
    if (!healthy) {
      return NextResponse.json({ error: "AI service is unavailable. Please ensure Ollama is running." }, { status: 503 });
    }

    const audioFile = audio instanceof File ? audio : null;
    const audioUrl = await saveSpeakingAudio(audioFile, user.id);
    const evaluation = await speakingService.evaluateSpeaking({
      transcript,
      examType,
      prompt,
      conversation,
      durationSeconds:
        Number.isFinite(durationSeconds) && durationSeconds > 0
          ? Math.min(Math.round(durationSeconds), speakingSetting.durationSeconds)
          : null,
      audioAvailable: Boolean(audioUrl),
    });

    const criteria = evaluation.criteria_scores;
    const maxScore = evaluation.exam === "IELTS" ? 9 : 100;

    const assessment = await prisma.aiAssessment.create({
      data: {
        userId: user.id,
        courseId: courseId || null,
        type: "SPEAKING",
        title,
        prompt: prompt || null,
        submissionText: transcript,
        audioUrl,
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds > 0
            ? Math.min(Math.round(durationSeconds), speakingSetting.durationSeconds)
            : null,
        score: evaluation.overall,
        maxScore,
        bandSystem: evaluation.band.system,
        bandLevel: evaluation.band.level,
        bandScore: evaluation.band.score,
        criteria,
        feedback: {
          evaluation: {
            scores: criteria,
            overall: evaluation.overall,
            normalizedOverall: evaluation.normalized_overall,
            language: evaluation.language,
            exam: evaluation.exam,
            scoreScale: evaluation.score_scale,
            band: evaluation.band,
            summary: evaluation.summary,
          },
          analysis: {
            strengths: evaluation.strengths,
            weaknesses: evaluation.weaknesses,
            feedback: evaluation.feedback,
            suggestions: evaluation.suggestions,
          },
        },
        mistakes: {
          pronunciation: evaluation.pronunciation_errors,
          grammar: evaluation.grammar_errors,
          vocabulary: evaluation.vocabulary_errors,
          fluency: evaluation.fluency_issues,
        },
        improvements: {
          suggestions: evaluation.suggestions,
          practiceMethods: evaluation.practice_methods,
        },
        submittedAt: new Date(),
      } as never,
    }) as unknown as { id: string };

    const pointResult = await spendAiPoints(user.id, courseId || null, SPEAKING_AI_COST, "SPEAKING_AI", assessment.id);
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
          overall: evaluation.overall,
          normalizedOverall: evaluation.normalized_overall,
          language: evaluation.language,
          exam: evaluation.exam,
          scoreScale: evaluation.score_scale,
          band: evaluation.band,
          summary: evaluation.summary,
        },
        analysis: {
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          feedback: evaluation.feedback,
          suggestions: evaluation.suggestions,
        },
        mistakes: {
          pronunciation: evaluation.pronunciation_errors,
          grammar: evaluation.grammar_errors,
          vocabulary: evaluation.vocabulary_errors,
          fluency: evaluation.fluency_issues,
        },
        improvements: {
          practiceMethods: evaluation.practice_methods,
        },
      },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error evaluating speaking:", error);
    const message = error instanceof Error ? error.message : "Failed to evaluate speaking.";
    const status = message.includes("too short") || message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
