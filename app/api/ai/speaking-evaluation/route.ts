import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  AI_POINT_PRICE_VND,
  getAiPointsSummary,
  recordLearningActivity,
  SPEAKING_AI_COST,
  spendAiPointsWithClient,
} from "@/lib/ai-points";
import { prisma } from "@/lib/prisma";
import { sanitizeEssay, validateEssay, validatePromptSafety } from "@/lib/ai";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";
import { canUseAiForCourse, shouldChargeAiPoints } from "@/lib/ai-access";
import { evaluateTestAiAnswers } from "@/lib/test-ai-evaluation";
import { getCertificateRubric } from "@/lib/ai-rubrics";
import { evaluateIeltsSpeaking } from "@/lib/ielts-grading";
import { buildSpeakingAssessmentPayload } from "@/lib/ielts-assessment";
import {
  formatUploadLimit,
  getAllowedUpload,
  MAX_AUDIO_UPLOAD_BYTES,
  validateUploadSignature,
} from "@/lib/upload-validation";
import type { IeltsSpeakingEvaluation } from "@/lib/ielts-rubric";
import type { Prisma } from "@/.generated/prisma/client";
import {
  getSpeakingEvaluationSystem,
  getSpeakingLanguageFromExamSetting,
  normalizeSpeakingLanguage,
} from "@/lib/speaking-languages";

const SPEAKING_RUBRIC_LANGUAGE_CODES = {
  ENGLISH: "en",
  CHINESE: "zh",
  JAPANESE: "ja",
  KOREAN: "ko",
} as const;

async function saveSpeakingAudio(file: File | null, userId: string) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new Error("INVALID_AUDIO_FILE");
  }

  const uploadType = getAllowedUpload(file.type, ["audio"]);
  if (!uploadType) {
    throw new Error("INVALID_AUDIO_FILE");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "speaking");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${userId.slice(0, 8)}.${uploadType.extension}`;
  const diskPath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateUploadSignature(buffer, file.type)) {
    throw new Error("INVALID_AUDIO_FILE");
  }
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
    const speakingTask = Math.max(1, Math.min(3, Number(form.get("task") || 1)));
    const courseId = String(form.get("courseId") || "").trim();
    const conversation = String(form.get("conversation") || "").trim();
    const durationSeconds = Number(form.get("durationSeconds") || 0);
    const audio = form.get("audio");
    const includeAiFeedback = form.get("includeAiFeedback") === "true";
    const speakingSetting = await getSpeakingAiSetting();
    const speakingLanguage = normalizeSpeakingLanguage(
      form.get("language"),
      getSpeakingLanguageFromExamSetting(speakingSetting.examType),
    );
    const exam = getSpeakingEvaluationSystem(speakingLanguage);
    const scoreOnly = !includeAiFeedback;
    const chargePoints =
      includeAiFeedback && shouldChargeAiPoints(user.role);

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
    if (chargePoints) {
      const pointsBefore = await getAiPointsSummary(user.id);
      if (pointsBefore.available < SPEAKING_AI_COST) {
        return NextResponse.json(
          {
            error: "Vui lòng thanh toán lượt nhận xét Speaking AI trước khi sử dụng.",
            requiresPointPurchase: true,
            neededPoints: SPEAKING_AI_COST,
            neededBeans: SPEAKING_AI_COST,
            currentPoints: pointsBefore.available,
            currentBeans: pointsBefore.available,
            pointPriceVnd: AI_POINT_PRICE_VND,
            beanPriceVnd: AI_POINT_PRICE_VND,
          },
          { status: 400 },
        );
      }

    }

    const audioFile = audio instanceof File ? audio : null;
    const audioUrl = await saveSpeakingAudio(audioFile, user.id);
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
          languageCode:
            speakingLanguage === "CHINESE"
              ? "zh"
              : speakingLanguage === "JAPANESE"
                ? "ja"
                : speakingLanguage === "KOREAN"
                  ? "ko"
                  : "en",
          examType: exam,
          scoreOnly,
        },
      ])).get("speaking");
      if (!evaluationResult || evaluationResult.failed) {
        throw new Error("AI_EVALUATION_FAILED");
      }

      const evaluation = evaluationResult.aiEvaluation;
      const normalizedOverall = evaluationResult.normalizedScore;
      const taskRelevance = evaluation.taskRelevance ?? 0;
      const isHsk = exam === "HSK";
      const rubric = getCertificateRubric(SPEAKING_RUBRIC_LANGUAGE_CODES[speakingLanguage], "SPEAKING");
      const toExamScore = (score: number) =>
        isHsk ? Math.round(score * 10) : Math.round(score * 10) / 10;
      const criteriaEntries: Array<[string, number]> = rubric.criteria.map(({ key }) => {
        const score100 = evaluation.criteriaScores?.[key] ?? (evaluation.criteria?.[key] ?? 0) * 10;
        return [key, isHsk ? Math.round(Number(score100)) : Math.round(Number(score100)) / 10];
      });
      const criteria = Object.fromEntries(criteriaEntries);
      overall = toExamScore(normalizedOverall);
      maxScore = isHsk ? 100 : 10;
      bandLevel = isHsk
        ? `HSKK ${Math.round(overall)}`
        : `${overall.toFixed(1)}/10`;
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
          taskType: `task_${speakingTask}`,
          maxScore,
          scoreScale: isHsk ? "SCORE_0_100" : "SCORE_0_10",
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
          criteriaFeedback: evaluation.criteriaFeedback || {},
        },
        analysis: {
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          feedback: evaluation.feedback || [],
          suggestions: evaluation.suggestions,
          majorErrors: evaluation.majorErrors || [],
          improvementsNeeded: evaluation.improvementsNeeded || [],
        },
        mistakes: {
          pronunciation: evaluation.pronunciationErrors || [],
          grammar: evaluation.grammarErrors || [],
          vocabulary: evaluation.vocabularyErrors || [],
          fluency: evaluation.fluencyIssues || [],
          majorErrors: evaluation.majorErrors || [],
        },
        improvements: {
          suggestions: evaluation.suggestions,
          improvementsNeeded: evaluation.improvementsNeeded || [],
          practiceMethods: evaluation.practiceMethods || [],
          sampleAnswer: sampleAnswer || "",
        },
      };
      mistakesPayload = {
        pronunciation: evaluation.pronunciationErrors || [],
        grammar: evaluation.grammarErrors || [],
        vocabulary: evaluation.vocabularyErrors || [],
        fluency: evaluation.fluencyIssues || [],
        majorErrors: evaluation.majorErrors || [],
      };
      improvementsPayload = {
        suggestions: evaluation.suggestions,
        improvementsNeeded: evaluation.improvementsNeeded || [],
        practiceMethods: evaluation.practiceMethods || [],
        sampleAnswer: sampleAnswer || "",
      };
    }

    const saved = await prisma.$transaction(async (tx) => {
      const assessment = await tx.aiAssessment.create({ data: {
        userId: user.id,
        courseId: courseId || null,
        type: "SPEAKING",
        taskType: `${exam.toLowerCase()}_task_${speakingTask}`,
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
      }});
      const pointResult = chargePoints
        ? await spendAiPointsWithClient(
            tx,
            user.id,
            courseId || null,
            SPEAKING_AI_COST,
            "SPEAKING_AI",
            assessment.id,
          )
        : null;
      return { assessment, pointResult };
    }, { isolationLevel: "Serializable" });
    const assessment = saved.assessment;
    const pointResult = saved.pointResult ?? {
      spent: 0,
      available: (await getAiPointsSummary(user.id)).available,
    };
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
      aiFeedbackPurchased: includeAiFeedback,
      evaluationBasis: "TRANSCRIPT_ESTIMATE",
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error evaluating speaking:", error);
    const message = error instanceof Error ? error.message : "Failed to evaluate speaking.";
    if (message === "AI_EVALUATION_FAILED") {
      return NextResponse.json(
        { error: "AI đang tạm thời quá tải. Vui lòng thử lại sau." },
        { status: 503 },
      );
    }
    if (message === "INVALID_AUDIO_FILE") {
      return NextResponse.json(
        { error: `File audio khong hop le hoac vuot qua gioi han ${formatUploadLimit(MAX_AUDIO_UPLOAD_BYTES)}.` },
        { status: 400 },
      );
    }
    if (message === "INSUFFICIENT_POINTS") {
      return NextResponse.json(
        {
          error: "Thanh toán lượt nhận xét AI không hợp lệ hoặc đã được sử dụng.",
          requiresPointPurchase: true,
          neededPoints: SPEAKING_AI_COST,
          pointPriceVnd: AI_POINT_PRICE_VND,
        },
        { status: 400 },
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
