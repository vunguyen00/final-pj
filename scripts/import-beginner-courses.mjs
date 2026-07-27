import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import { normalizeScoresToTotal } from "./test-score-normalization.mjs";

const { Pool } = pg;

const DEFAULT_SEED_FILE = path.resolve("finncenter_beginner_courses_seed.json");
const DEFAULT_PRICE = 0;
const UNLIMITED_ATTEMPTS = 2_147_483_647;

const LANGUAGE_CONFIG = {
  ENGLISH: {
    code: "en",
    labels: {
      objectives: "Objectives",
      moduleSummary: "Module summary",
      reading: "Reading",
      vocabulary: "Vocabulary",
      questions: "Comprehension questions",
      modelAnswer: "Model answer",
      expressions: "Useful expressions",
      task: "Task",
      preparation: "Preparation",
      speaking: "Speaking time",
      audioScript: "Audio script",
      rubric: "Rubric",
      minutes: "minutes",
      seconds: "seconds",
    },
    rubric: {
      taskCompletion: "Task completion",
      fluency: "Fluency",
      pronunciation: "Pronunciation",
      vocabularyAndGrammar: "Vocabulary and grammar",
      coherence: "Coherence",
    },
  },
  CHINESE: {
    code: "zh",
    labels: {
      objectives: "学习目标",
      moduleSummary: "单元概要",
      reading: "课文",
      vocabulary: "词汇",
      questions: "阅读理解题",
      modelAnswer: "参考答案",
      expressions: "常用表达",
      task: "任务",
      preparation: "准备时间",
      speaking: "口语时间",
      audioScript: "听力原文",
      rubric: "评分标准",
      minutes: "分钟",
      seconds: "秒",
    },
    rubric: {
      taskCompletion: "任务完成度",
      fluency: "流利度",
      pronunciation: "发音",
      vocabularyAndGrammar: "词汇与语法",
      coherence: "连贯性",
    },
  },
  JAPANESE: {
    code: "ja",
    labels: {
      objectives: "学習目標",
      moduleSummary: "モジュール概要",
      reading: "本文",
      vocabulary: "語彙",
      questions: "読解問題",
      modelAnswer: "解答例",
      expressions: "便利な表現",
      task: "課題",
      preparation: "準備時間",
      speaking: "発話時間",
      audioScript: "音声スクリプト",
      rubric: "評価基準",
      minutes: "分",
      seconds: "秒",
    },
    rubric: {
      taskCompletion: "課題達成度",
      fluency: "流暢さ",
      pronunciation: "発音",
      vocabularyAndGrammar: "語彙と文法",
      coherence: "一貫性",
    },
  },
  KOREAN: {
    code: "ko",
    labels: {
      objectives: "학습 목표",
      moduleSummary: "단원 요약",
      reading: "본문",
      vocabulary: "어휘",
      questions: "독해 문제",
      modelAnswer: "모범 답안",
      expressions: "유용한 표현",
      task: "과제",
      preparation: "준비 시간",
      speaking: "말하기 시간",
      audioScript: "듣기 대본",
      rubric: "평가 기준",
      minutes: "분",
      seconds: "초",
    },
    rubric: {
      taskCompletion: "과제 수행",
      fluency: "유창성",
      pronunciation: "발음",
      vocabularyAndGrammar: "어휘와 문법",
      coherence: "일관성",
    },
  },
};

function databaseConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const url = new URL(process.env.DATABASE_URL);
  const schema = url.searchParams.get("schema") || "public";
  url.searchParams.delete("schema");
  return { connectionString: url.toString(), schema };
}

function parseArguments() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArgument = args.find((argument) => argument !== "--dry-run");
  return {
    dryRun,
    seedFile: fileArgument ? path.resolve(fileArgument) : DEFAULT_SEED_FILE,
  };
}

function assertString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }
}

function validateSeed(seed) {
  if (!seed || typeof seed !== "object") throw new Error("Seed root must be an object.");
  assertString(seed.instructor?.email, "instructor.email");
  if (!Array.isArray(seed.courses) || seed.courses.length === 0) {
    throw new Error("courses must be a non-empty array.");
  }

  const ids = new Set();
  const registerId = (id, field) => {
    assertString(id, field);
    if (ids.has(id)) throw new Error(`Duplicate seed id: ${id}`);
    ids.add(id);
  };

  for (const [courseIndex, course] of seed.courses.entries()) {
    const coursePath = `courses[${courseIndex}]`;
    registerId(course.id, `${coursePath}.id`);
    assertString(course.title, `${coursePath}.title`);
    assertString(course.description, `${coursePath}.description`);
    if (!LANGUAGE_CONFIG[course.language]) {
      throw new Error(`${coursePath}.language is not supported: ${course.language}`);
    }
    if (!Array.isArray(course.modules) || course.modules.length === 0) {
      throw new Error(`${coursePath}.modules must be a non-empty array.`);
    }

    for (const [moduleIndex, module] of course.modules.entries()) {
      const modulePath = `${coursePath}.modules[${moduleIndex}]`;
      registerId(module.id, `${modulePath}.id`);
      assertString(module.title, `${modulePath}.title`);
      if (!Array.isArray(module.lessons) || module.lessons.length === 0) {
        throw new Error(`${modulePath}.lessons must be a non-empty array.`);
      }
      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        registerId(lesson.id, `${modulePath}.lessons[${lessonIndex}].id`);
        assertString(lesson.title, `${modulePath}.lessons[${lessonIndex}].title`);
      }
      validateTest(module.endOfModuleTest, `${modulePath}.endOfModuleTest`, registerId);
    }
    validateTest(course.finalTest, `${coursePath}.finalTest`, registerId);
  }
}

function validateTest(test, field, registerId) {
  if (!test || typeof test !== "object") throw new Error(`${field} must be an object.`);
  registerId(test.id, `${field}.id`);
  assertString(test.title, `${field}.title`);
  if (!Array.isArray(test.questions) || test.questions.length === 0) {
    throw new Error(`${field}.questions must be a non-empty array.`);
  }
  test.questions.forEach((question, index) => {
    registerId(question.id, `${field}.questions[${index}].id`);
    assertString(question.prompt, `${field}.questions[${index}].prompt`);
  });
  const rawScores = test.questions.map((question) => Number(question.points));
  const rawTotal = rawScores.reduce((sum, score) => sum + score, 0);
  if (!Number.isFinite(Number(test.totalPoints)) || Math.abs(rawTotal - Number(test.totalPoints)) > 0.001) {
    throw new Error(`${field}.totalPoints must equal the sum of question points.`);
  }
  normalizeScoresToTotal(rawScores);
}

function courseDescription(course, labels) {
  const objectives = Array.isArray(course.objectives) ? course.objectives.filter(Boolean) : [];
  if (objectives.length === 0) return course.description;
  return `${course.description}\n\n${labels.objectives}\n${objectives.map((item) => `• ${item}`).join("\n")}`;
}

function courseDuration(course, labels) {
  const minutes = course.modules
    .flatMap((module) => module.lessons)
    .reduce((total, lesson) => total + (Number(lesson.estimatedMinutes) || 0), 0);
  return minutes > 0 ? `${minutes} ${labels.minutes}` : null;
}

function lessonContent(lesson, module, language, includeModuleSummary) {
  const labels = language.labels;
  const sections = [];
  if (lesson.instruction) sections.push(lesson.instruction);
  if (includeModuleSummary && module.summary) {
    sections.push(`${labels.moduleSummary}\n${module.summary}`);
  }

  if (lesson.type === "READING") {
    if (lesson.content?.text) sections.push(`${labels.reading}\n${lesson.content.text}`);

    const vocabulary = Array.isArray(lesson.content?.vocabulary)
      ? lesson.content.vocabulary.map((item) => `• ${item.term} — ${item.meaning}`).join("\n")
      : "";
    if (vocabulary) sections.push(`${labels.vocabulary}\n${vocabulary}`);

    const questions = Array.isArray(lesson.content?.comprehensionQuestions)
      ? lesson.content.comprehensionQuestions
          .map((question, index) => {
            const options = Array.isArray(question.options)
              ? question.options.map((option, optionIndex) => `   ${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n")
              : "";
            return `${index + 1}. ${question.prompt}${options ? `\n${options}` : ""}`;
          })
          .join("\n")
      : "";
    if (questions) sections.push(`${labels.questions}\n${questions}`);
  } else if (lesson.type === "SPEAKING") {
    if (lesson.content?.modelAnswer) {
      sections.push(`${labels.modelAnswer}\n${lesson.content.modelAnswer}`);
    }
    if (Array.isArray(lesson.content?.usefulExpressions)) {
      sections.push(
        `${labels.expressions}\n${lesson.content.usefulExpressions.map((item) => `• ${item}`).join("\n")}`,
      );
    }
    if (lesson.content?.task) sections.push(`${labels.task}\n${lesson.content.task}`);
    const timing = [];
    if (lesson.content?.preparationSeconds != null) {
      timing.push(`${labels.preparation}: ${lesson.content.preparationSeconds} ${labels.seconds}`);
    }
    if (lesson.content?.speakingSeconds != null) {
      timing.push(`${labels.speaking}: ${lesson.content.speakingSeconds} ${labels.seconds}`);
    }
    if (timing.length) sections.push(timing.join("\n"));
  } else {
    sections.push(JSON.stringify(lesson.content, null, 2));
  }

  return sections.filter(Boolean).join("\n\n");
}

function questionType(type) {
  const mapping = {
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    FILL_IN_THE_BLANK: "FILL_IN_BLANK",
    LISTENING: "MULTIPLE_CHOICE",
    WRITING: "ESSAY",
    SPEAKING: "SPEAKING",
  };
  const mapped = mapping[type];
  if (!mapped) throw new Error(`Unsupported question type: ${type}`);
  return mapped;
}

function questionContent(question) {
  return [question.instruction, question.prompt].filter(Boolean).join("\n\n");
}

function questionHint(question, language) {
  const sections = [];
  if (question.audioScript) {
    sections.push(`${language.labels.audioScript}: ${question.audioScript}`);
  }
  if (Array.isArray(question.suggestedExpressions) && question.suggestedExpressions.length > 0) {
    sections.push(
      `${language.labels.expressions}:\n${question.suggestedExpressions.map((item) => `• ${item}`).join("\n")}`,
    );
  }
  return sections.length ? sections.join("\n\n") : null;
}

function questionExplanation(question, language) {
  const sections = [];
  if (question.explanation) sections.push(question.explanation);
  if (question.rubric && typeof question.rubric === "object") {
    const rubric = Object.entries(question.rubric)
      .map(([key, points]) => `• ${language.rubric[key] || key}: ${points}`)
      .join("\n");
    sections.push(`${language.labels.rubric}\n${rubric}`);
  }
  return sections.length ? sections.join("\n\n") : null;
}

function questionAnswers(question) {
  if (Array.isArray(question.options)) {
    return question.options.map((content, index) => ({
      id: `${question.id}-answer-${index + 1}`,
      content,
      isCorrect: index === question.correctIndex,
      order: index + 1,
    }));
  }
  if (Array.isArray(question.acceptedAnswers)) {
    return question.acceptedAnswers.map((content, index) => ({
      id: `${question.id}-answer-${index + 1}`,
      content,
      isCorrect: true,
      order: index + 1,
    }));
  }
  return [];
}

async function query(client, text, params = []) {
  return client.query(text, params);
}

async function captureAndDeleteOldCourses(client) {
  await query(client, `CREATE TEMP TABLE seed_old_courses ON COMMIT DROP AS SELECT "id" FROM "Course"`);
  await query(
    client,
    `CREATE TEMP TABLE seed_old_modules ON COMMIT DROP AS
       SELECT "id" FROM "Module" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`,
  );
  await query(
    client,
    `CREATE TEMP TABLE seed_old_lessons ON COMMIT DROP AS
       SELECT "id" FROM "Lesson" WHERE "moduleId" IN (SELECT "id" FROM seed_old_modules)`,
  );
  await query(
    client,
    `CREATE TEMP TABLE seed_old_tests ON COMMIT DROP AS
       SELECT "id" FROM "Test"
       WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)
          OR "moduleId" IN (SELECT "id" FROM seed_old_modules)
          OR "lessonId" IN (SELECT "id" FROM seed_old_lessons)`,
  );
  await query(
    client,
    `CREATE TEMP TABLE seed_old_attempts ON COMMIT DROP AS
       SELECT "id" FROM "TestAttempt" WHERE "testId" IN (SELECT "id" FROM seed_old_tests)`,
  );
  await query(
    client,
    `CREATE TEMP TABLE seed_old_order_items ON COMMIT DROP AS
       SELECT "id", "orderId" FROM "OrderItem" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`,
  );

  const oldCountsResult = await query(
    client,
    `SELECT
       (SELECT COUNT(*) FROM seed_old_courses)::int AS courses,
       (SELECT COUNT(*) FROM seed_old_modules)::int AS modules,
       (SELECT COUNT(*) FROM seed_old_lessons)::int AS lessons,
       (SELECT COUNT(*) FROM seed_old_tests)::int AS tests,
       (SELECT COUNT(*) FROM seed_old_attempts)::int AS attempts,
       (SELECT COUNT(*) FROM seed_old_order_items)::int AS order_items`,
  );

  await query(client, `DELETE FROM "AntiCheatLog" WHERE "testAttemptId" IN (SELECT "id" FROM seed_old_attempts)`);
  await query(client, `DELETE FROM "CheatingLog" WHERE "attemptId" IN (SELECT "id" FROM seed_old_attempts)`);
  await query(client, `DELETE FROM "TestAttempt" WHERE "id" IN (SELECT "id" FROM seed_old_attempts)`);
  await query(
    client,
    `DELETE FROM "Answer" WHERE "questionId" IN
       (SELECT "id" FROM "Question" WHERE "testId" IN (SELECT "id" FROM seed_old_tests))`,
  );
  await query(client, `DELETE FROM "Question" WHERE "testId" IN (SELECT "id" FROM seed_old_tests)`);
  await query(client, `DELETE FROM "Test" WHERE "id" IN (SELECT "id" FROM seed_old_tests)`);

  await query(client, `DELETE FROM "CourseRefundRequest" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(client, `DELETE FROM "CourseReport" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(client, `DELETE FROM "VideoWatchProgress" WHERE "lessonId" IN (SELECT "id" FROM seed_old_lessons)`);
  await query(client, `DELETE FROM "Lesson" WHERE "id" IN (SELECT "id" FROM seed_old_lessons)`);
  await query(client, `DELETE FROM "Module" WHERE "id" IN (SELECT "id" FROM seed_old_modules)`);

  await query(client, `DELETE FROM "Enrollment" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(client, `DELETE FROM "Feedback" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(client, `DELETE FROM "AiAssessment" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(client, `DELETE FROM "PointTransaction" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(client, `DELETE FROM "LearningActivity" WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)`);
  await query(
    client,
    `DELETE FROM "Payment"
     WHERE "courseId" IN (SELECT "id" FROM seed_old_courses)
        OR "orderId" IN (SELECT "orderId" FROM seed_old_order_items)`,
  );
  await query(client, `DELETE FROM "OrderItem" WHERE "id" IN (SELECT "id" FROM seed_old_order_items)`);
  await query(client, `DELETE FROM "Course" WHERE "id" IN (SELECT "id" FROM seed_old_courses)`);
  await query(
    client,
    `DELETE FROM "Order"
     WHERE "id" IN (SELECT "orderId" FROM seed_old_order_items)
       AND NOT EXISTS (SELECT 1 FROM "OrderItem" item WHERE item."orderId" = "Order"."id")`,
  );

  return oldCountsResult.rows[0];
}

async function insertQuestion(client, testId, question, order, score, language) {
  const type = questionType(question.type);
  await query(
    client,
    `INSERT INTO "Question" (
       "id", "testId", "type", "content", "audioUrl", "order", "score",
       "explanation", "hint", "preparationTimeSeconds", "answerTimeSeconds", "createdAt", "updatedAt"
     ) VALUES ($1, $2, $3::"QuestionType", $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
    [
      question.id,
      testId,
      type,
      questionContent(question),
      question.audioUrl || null,
      order,
      score,
      questionExplanation(question, language),
      questionHint(question, language),
      type === "SPEAKING" ? Number(question.preparationSeconds) || 0 : null,
      type === "SPEAKING" ? Number(question.speakingSeconds) || 0 : null,
    ],
  );

  for (const answer of questionAnswers(question)) {
    await query(
      client,
      `INSERT INTO "Answer" ("id", "questionId", "content", "isCorrect", "order", "feedback")
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [answer.id, question.id, answer.content, answer.isCorrect, answer.order],
    );
  }
}

async function insertTest(client, { test, course, module, languageId, language }) {
  const description = module
    ? [module.title, module.summary].filter(Boolean).join(" — ")
    : course.description;
  await query(
    client,
    `INSERT INTO "Test" (
       "id", "courseId", "languageId", "moduleId", "lessonId", "kind", "assessmentMode",
       "name", "description", "maxScore", "passingScore", "maxAttempts", "timeLimit",
       "shuffleQuestions", "createdAt", "updatedAt"
     ) VALUES ($1, $2, $3, $4, NULL, 'COURSE'::"TestKind", 'STANDARD'::"TestAssessmentMode",
       $5, $6, 100, $7, $8, $9, false, NOW(), NOW())`,
    [
      test.id,
      course.id,
      languageId,
      module?.id || null,
      test.title,
      description,
      Number(test.passScorePercent) || 60,
      UNLIMITED_ATTEMPTS,
      Number(test.durationMinutes) || null,
    ],
  );

  const normalizedScores = normalizeScoresToTotal(
    test.questions.map((question) => question.points),
  );
  for (const [index, question] of test.questions.entries()) {
    await insertQuestion(
      client,
      test.id,
      question,
      index + 1,
      normalizedScores[index],
      language,
    );
  }
}

async function insertSeed(client, seed, instructorId) {
  const summary = { courses: 0, modules: 0, lessons: 0, tests: 0, questions: 0, answers: 0 };

  for (const course of seed.courses) {
    const language = LANGUAGE_CONFIG[course.language];
    const languageResult = await query(
      client,
      `SELECT "id" FROM "LearningLanguage" WHERE "code" = $1 AND "isActive" = true LIMIT 1`,
      [language.code],
    );
    if (languageResult.rowCount === 0) {
      throw new Error(`Active learning language not found for code: ${language.code}`);
    }
    const languageId = languageResult.rows[0].id;

    const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
    await query(
      client,
      `INSERT INTO "Course" (
         "id", "name", "description", "thumbnail", "category", "level", "duration", "lessons",
         "status", "createdAt", "updatedAt", "price", "languageId", "instructorId"
       ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, 'ACTIVE'::"CourseStatus", NOW(), NOW(), $8, $9, $10)`,
      [
        course.id,
        course.title,
        courseDescription(course, language.labels),
        "Beginner",
        course.level || null,
        courseDuration(course, language.labels),
        lessonCount,
        DEFAULT_PRICE,
        languageId,
        instructorId,
      ],
    );
    summary.courses += 1;

    for (const courseModule of course.modules) {
      await query(
        client,
        `INSERT INTO "Module" ("id", "courseId", "name", "order") VALUES ($1, $2, $3, $4)`,
        [courseModule.id, course.id, courseModule.title, courseModule.order],
      );
      summary.modules += 1;

      for (const [lessonIndex, lesson] of courseModule.lessons.entries()) {
        await query(
          client,
          `INSERT INTO "Lesson" ("id", "moduleId", "title", "content", "videoUrl")
           VALUES ($1, $2, $3, $4, NULL)`,
          [
            lesson.id,
            courseModule.id,
            lesson.title,
            lessonContent(lesson, courseModule, language, lessonIndex === 0),
          ],
        );
        summary.lessons += 1;
      }

      await insertTest(client, {
        test: courseModule.endOfModuleTest,
        course,
        module: courseModule,
        languageId,
        language,
      });
      summary.tests += 1;
      summary.questions += courseModule.endOfModuleTest.questions.length;
      summary.answers += courseModule.endOfModuleTest.questions.reduce(
        (total, question) => total + questionAnswers(question).length,
        0,
      );
    }

    await insertTest(client, {
      test: course.finalTest,
      course,
      module: null,
      languageId,
      language,
    });
    summary.tests += 1;
    summary.questions += course.finalTest.questions.length;
    summary.answers += course.finalTest.questions.reduce(
      (total, question) => total + questionAnswers(question).length,
      0,
    );
  }

  return summary;
}

async function verifyInsertedData(client, seed) {
  const courseIds = seed.courses.map((course) => course.id);
  const result = await query(
    client,
    `SELECT
       (SELECT COUNT(*) FROM "Course")::int AS total_courses,
       (SELECT COUNT(*) FROM "Course" WHERE "id" = ANY($1::text[]))::int AS seeded_courses,
       (SELECT COUNT(*) FROM "Module" WHERE "courseId" = ANY($1::text[]))::int AS modules,
       (SELECT COUNT(*) FROM "Lesson" lesson
          JOIN "Module" module ON module."id" = lesson."moduleId"
          WHERE module."courseId" = ANY($1::text[]))::int AS lessons,
       (SELECT COUNT(*) FROM "Test" WHERE "courseId" = ANY($1::text[]))::int AS tests,
       (SELECT COUNT(*) FROM "Question" question
          JOIN "Test" test ON test."id" = question."testId"
          WHERE test."courseId" = ANY($1::text[]))::int AS questions,
       (SELECT COUNT(*) FROM "Answer" answer
          JOIN "Question" question ON question."id" = answer."questionId"
          JOIN "Test" test ON test."id" = question."testId"
          WHERE test."courseId" = ANY($1::text[]))::int AS answers,
       (SELECT COUNT(*) FROM (
          SELECT question."testId"
          FROM "Question" question
          JOIN "Test" test ON test."id" = question."testId"
          WHERE test."courseId" = ANY($1::text[])
          GROUP BY question."testId"
          HAVING ABS(SUM(question."score") - 100) > 0.001
        ) invalid_test)::int AS invalid_test_score_totals`,
    [courseIds],
  );
  return result.rows[0];
}

async function main() {
  const { dryRun, seedFile } = parseArguments();
  const seed = JSON.parse(await readFile(seedFile, "utf8"));
  validateSeed(seed);

  const { connectionString, schema } = databaseConfig();
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await query(client, "BEGIN");
    await query(client, `SET LOCAL search_path TO ${JSON.stringify(schema)}`);

    const instructorResult = await query(
      client,
      `SELECT "id", "email", "role", "accountStatus", "isBanned"
       FROM "User" WHERE LOWER("email") = LOWER($1) LIMIT 1`,
      [seed.instructor.email],
    );
    if (instructorResult.rowCount === 0) {
      throw new Error(`Instructor not found: ${seed.instructor.email}`);
    }
    const instructor = instructorResult.rows[0];
    if (instructor.role !== "TEACHER" || instructor.accountStatus !== "ACTIVE" || instructor.isBanned) {
      throw new Error(`Instructor is not an active teacher: ${seed.instructor.email}`);
    }

    const deleted = await captureAndDeleteOldCourses(client);
    const inserted = await insertSeed(client, seed, instructor.id);
    const verified = await verifyInsertedData(client, seed);

    if (dryRun) {
      await query(client, "ROLLBACK");
    } else {
      await query(client, "COMMIT");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun,
          seedFile,
          instructor: instructor.email,
          defaults: { price: DEFAULT_PRICE, status: "ACTIVE", category: "Beginner" },
          deleted,
          inserted,
          verified,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await query(client, "ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[import-beginner-courses] failed", error);
  process.exitCode = 1;
});
