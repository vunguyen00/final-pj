import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const DEMO_PASSWORD = "Demo@123456";
const TEACHER_EMAIL = "teacher.seed@finncenter.local";
const ADMIN_EMAIL = "admin.seed@finncenter.local";

const LANGUAGES = [
  {
    key: "english",
    name: "English",
    code: "en",
    nativeName: "English",
    courseName: "English Communication Foundations",
    category: "Communication",
    level: "A2-B1",
    entrancePrompt:
      "Write 180-220 words about how you would motivate beginner students to keep learning English.",
    speakingPrompt:
      "Describe a lesson activity you would use to help students speak more confidently in English.",
  },
  {
    key: "chinese",
    name: "Chinese",
    code: "zh",
    nativeName: "Chinese",
    courseName: "Chinese HSK 3 Practical Course",
    category: "HSK",
    level: "HSK 3",
    entrancePrompt:
      "请用中文写一篇短文，说明你会如何帮助初级学生学习汉语词汇和语法。",
    speakingPrompt:
      "请用中文介绍一个适合初级学生的课堂活动，并说明它为什么有效。",
  },
  {
    key: "japanese",
    name: "Japanese",
    code: "ja",
    nativeName: "Japanese",
    courseName: "Japanese N4 Everyday Skills",
    category: "JLPT",
    level: "N4",
    entrancePrompt:
      "日本語で、初級学習者に文法と会話を教える方法について短い作文を書いてください。",
    speakingPrompt:
      "日本語で、初級者向けの授業活動とその目的を説明してください。",
  },
  {
    key: "korean",
    name: "Korean",
    code: "ko",
    nativeName: "Korean",
    courseName: "Korean TOPIK I Starter Course",
    category: "TOPIK",
    level: "TOPIK I",
    entrancePrompt:
      "한국어로 초급 학습자에게 어휘와 문법을 가르치는 방법에 대해 짧은 글을 쓰세요.",
    speakingPrompt:
      "한국어로 초급 학생을 위한 수업 활동과 그 활동의 장점을 설명하세요.",
  },
];

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const url = new URL(databaseUrl);
  const schema = url.searchParams.get("schema") || undefined;
  url.searchParams.delete("schema");
  return { connectionString: url.toString(), schema };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function query(client, text, params = []) {
  return client.query(text, params);
}

async function upsertLanguage(client, language) {
  const result = await query(
    client,
    `
      INSERT INTO "LearningLanguage" ("id", "name", "code", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT ("code")
      DO UPDATE SET "name" = EXCLUDED."name", "isActive" = true, "updatedAt" = NOW()
      RETURNING "id", "name", "code"
    `,
    [randomUUID(), language.name, language.code],
  );
  return result.rows[0];
}

async function upsertUser(client, { email, username, role }) {
  const password = hashPassword(DEMO_PASSWORD);
  const result = await query(
    client,
    `
      INSERT INTO "User" (
        "id", "username", "email", "password", "role", "isBanned",
        "accountStatus", "emailVerifiedAt", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5::"Role", false, 'ACTIVE'::"UserAccountStatus", NOW(), NOW())
      ON CONFLICT ("email")
      DO UPDATE SET
        "username" = EXCLUDED."username",
        "role" = EXCLUDED."role",
        "accountStatus" = 'ACTIVE'::"UserAccountStatus",
        "emailVerifiedAt" = COALESCE("User"."emailVerifiedAt", NOW()),
        "isBanned" = false
      RETURNING "id", "email", "role"
    `,
    [randomUUID(), username, email, password, role],
  );
  return result.rows[0];
}

async function ensureWallet(client, userId) {
  await query(
    client,
    `
      INSERT INTO "Wallet" ("id", "userId", "balance", "createdAt", "updatedAt")
      VALUES ($1, $2, 0, NOW(), NOW())
      ON CONFLICT ("userId") DO NOTHING
    `,
    [randomUUID(), userId],
  );
}

async function upsertCourse(client, { language, teacherId }) {
  const existing = await query(
    client,
    `SELECT "id" FROM "Course" WHERE "name" = $1 AND "instructorId" = $2 LIMIT 1`,
    [language.courseName, teacherId],
  );

  if (existing.rowCount) {
    await query(
      client,
      `
        UPDATE "Course"
        SET "description" = $2, "category" = $3, "level" = $4, "duration" = $5,
            "status" = 'ACTIVE'::"CourseStatus", "price" = $6, "languageId" = $7,
            "updatedAt" = NOW()
        WHERE "id" = $1
      `,
      [
        existing.rows[0].id,
        `Seed demo course for ${language.nativeName}: vocabulary, grammar, communication, and a final test.`,
        language.category,
        language.level,
        "6 lessons",
        299000,
        language.id,
      ],
    );
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await query(
    client,
    `
      INSERT INTO "Course" (
        "id", "name", "description", "category", "level", "duration", "lessons",
        "status", "createdAt", "updatedAt", "price", "languageId", "instructorId"
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'ACTIVE'::"CourseStatus", NOW(), NOW(), $7, $8, $9)
    `,
    [
      id,
      language.courseName,
      `Seed demo course for ${language.nativeName}: vocabulary, grammar, communication, and a final test.`,
      language.category,
      language.level,
      "6 lessons",
      299000,
      language.id,
      teacherId,
    ],
  );
  return id;
}

async function upsertModule(client, { courseId, name, order }) {
  const existing = await query(
    client,
    `SELECT "id" FROM "Module" WHERE "courseId" = $1 AND "name" = $2 LIMIT 1`,
    [courseId, name],
  );

  if (existing.rowCount) {
    await query(client, `UPDATE "Module" SET "order" = $2 WHERE "id" = $1`, [
      existing.rows[0].id,
      order,
    ]);
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await query(
    client,
    `INSERT INTO "Module" ("id", "courseId", "name", "order") VALUES ($1, $2, $3, $4)`,
    [id, courseId, name, order],
  );
  return id;
}

async function upsertLesson(client, { moduleId, title, content, videoUrl = null }) {
  const existing = await query(
    client,
    `SELECT "id" FROM "Lesson" WHERE "moduleId" = $1 AND "title" = $2 LIMIT 1`,
    [moduleId, title],
  );

  if (existing.rowCount) {
    await query(
      client,
      `UPDATE "Lesson" SET "content" = $2, "videoUrl" = $3 WHERE "id" = $1`,
      [existing.rows[0].id, content, videoUrl],
    );
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await query(
    client,
    `INSERT INTO "Lesson" ("id", "moduleId", "title", "content", "videoUrl") VALUES ($1, $2, $3, $4, $5)`,
    [id, moduleId, title, content, videoUrl],
  );
  return id;
}

async function seedCourseContent(client, language, courseId) {
  const modules = [
    {
      name: "Module 1 - Core vocabulary",
      lessons: [
        ["Lesson 1 - Daily greetings", `Practice essential greetings and polite classroom phrases for ${language.nativeName}.`],
        ["Lesson 2 - Numbers and time", `Learn numbers, dates, and simple time expressions in ${language.nativeName}.`],
      ],
    },
    {
      name: "Module 2 - Grammar in context",
      lessons: [
        ["Lesson 3 - Sentence patterns", `Build clear affirmative, negative, and question sentences in ${language.nativeName}.`],
        ["Lesson 4 - Common connectors", `Use connectors to explain reasons, contrast ideas, and give examples.`],
      ],
    },
    {
      name: "Module 3 - Communication practice",
      lessons: [
        ["Lesson 5 - Speaking situations", `Role-play common situations: introductions, requests, directions, and opinions.`],
        ["Lesson 6 - Final review", `Review vocabulary, grammar, and communication strategies before the final test.`],
      ],
    },
  ];

  let lessonCount = 0;
  for (const [moduleIndex, module] of modules.entries()) {
    const moduleId = await upsertModule(client, {
      courseId,
      name: module.name,
      order: moduleIndex + 1,
    });
    for (const [title, content] of module.lessons) {
      await upsertLesson(client, { moduleId, title, content });
      lessonCount += 1;
    }
  }

  await query(client, `UPDATE "Course" SET "lessons" = $2, "updatedAt" = NOW() WHERE "id" = $1`, [
    courseId,
    lessonCount,
  ]);
}

async function upsertTest(client, data) {
  const params = [];
  let whereSql = "";
  if (data.courseId) {
    params.push(data.courseId);
    whereSql = `"courseId" = $1 AND "kind" = 'COURSE'::"TestKind"`;
  } else {
    params.push(data.name, data.kind, data.languageId);
    whereSql = `"name" = $1 AND "kind" = $2::"TestKind" AND "languageId" = $3 AND "courseId" IS NULL`;
  }

  const existing = await query(client, `SELECT "id" FROM "Test" WHERE ${whereSql} LIMIT 1`, params);
  if (existing.rowCount) {
    await query(
      client,
      `
        UPDATE "Test"
        SET "name" = $2, "description" = $3, "languageId" = $4,
            "assessmentMode" = $5::"TestAssessmentMode", "maxScore" = 100,
            "passingScore" = $6, "maxAttempts" = $7, "timeLimit" = $8,
            "shuffleQuestions" = $9, "updatedAt" = NOW()
        WHERE "id" = $1
      `,
      [
        existing.rows[0].id,
        data.name,
        data.description,
        data.languageId,
        data.assessmentMode,
        data.passingScore,
        2147483647,
        data.timeLimit,
        Boolean(data.shuffleQuestions),
      ],
    );
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await query(
    client,
    `
      INSERT INTO "Test" (
        "id", "courseId", "languageId", "kind", "assessmentMode", "name",
        "description", "maxScore", "passingScore", "maxAttempts", "timeLimit",
        "shuffleQuestions", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4::"TestKind", $5::"TestAssessmentMode", $6,
        $7, 100, $8, $9, $10, $11, NOW(), NOW()
      )
    `,
    [
      id,
      data.courseId || null,
      data.languageId,
      data.kind,
      data.assessmentMode,
      data.name,
      data.description,
      data.passingScore,
      2147483647,
      data.timeLimit,
      Boolean(data.shuffleQuestions),
    ],
  );
  return id;
}

async function resetQuestions(client, testId) {
  const questions = await query(client, `SELECT "id" FROM "Question" WHERE "testId" = $1`, [testId]);
  const ids = questions.rows.map((row) => row.id);
  if (ids.length) {
    await query(client, `DELETE FROM "Answer" WHERE "questionId" = ANY($1::text[])`, [ids]);
    await query(client, `DELETE FROM "Question" WHERE "id" = ANY($1::text[])`, [ids]);
  }
}

async function insertQuestion(client, testId, question) {
  const questionId = randomUUID();
  await query(
    client,
    `
      INSERT INTO "Question" (
        "id", "testId", "type", "content", "audioUrl", "order", "score",
        "explanation", "hint", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3::"QuestionType", $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `,
    [
      questionId,
      testId,
      question.type,
      question.content,
      question.audioUrl || null,
      question.order,
      question.score,
      question.explanation || null,
      question.hint || null,
    ],
  );

  for (const [index, answer] of (question.answers || []).entries()) {
    await query(
      client,
      `
        INSERT INTO "Answer" ("id", "questionId", "content", "isCorrect", "order", "feedback")
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        randomUUID(),
        questionId,
        answer.content,
        Boolean(answer.isCorrect),
        answer.order ?? index + 1,
        answer.feedback || null,
      ],
    );
  }
}

function standardQuestions(language) {
  return [
    {
      type: "MULTIPLE_CHOICE",
      order: 1,
      score: 20,
      content: `Which study habit is most useful when learning ${language.nativeName}?`,
      explanation: "Regular practice with feedback builds long-term language skill.",
      answers: [
        { content: "Practice a little every day and review mistakes", isCorrect: true },
        { content: "Only study once before the final test", isCorrect: false },
        { content: "Ignore pronunciation and writing accuracy", isCorrect: false },
        { content: "Memorize random words without context", isCorrect: false },
      ],
    },
    {
      type: "TRUE_FALSE",
      order: 2,
      score: 20,
      content: "A complete sentence usually needs clear meaning and correct word order.",
      explanation: "Meaning and order are essential for communication.",
      answers: [
        { content: "True", isCorrect: true },
        { content: "False", isCorrect: false },
      ],
    },
    {
      type: "FILL_IN_BLANK",
      order: 3,
      score: 20,
      content: "Fill in the blank: A good learner checks ____ after practice.",
      explanation: "The expected answer is feedback.",
      answers: [{ content: "feedback", isCorrect: true }],
    },
    {
      type: "MULTIPLE_CHOICE",
      order: 4,
      score: 20,
      content: "What should a student do before speaking practice?",
      explanation: "Planning key words makes speaking more organized.",
      answers: [
        { content: "Prepare key words and a simple structure", isCorrect: true },
        { content: "Avoid all preparation", isCorrect: false },
        { content: "Read silently only", isCorrect: false },
        { content: "Skip listening practice", isCorrect: false },
      ],
    },
    {
      type: "ESSAY",
      order: 5,
      score: 20,
      content: `Write a short paragraph about your plan to keep improving ${language.nativeName} after this course.`,
      explanation: "AI evaluates task response, coherence, vocabulary, and grammar.",
    },
  ];
}

function publicPracticeQuestions(language) {
  return [
    ...standardQuestions(language).slice(0, 3).map((question, index) => ({
      ...question,
      order: index + 1,
      score: 25,
    })),
    {
      type: "ESSAY",
      order: 4,
      score: 25,
      content: `Write 120-150 words about a learning challenge in ${language.nativeName} and how you solved it.`,
      explanation: "AI evaluates language quality and task relevance.",
    },
  ];
}

function writingEntranceQuestions(language) {
  return [
    {
      type: "ESSAY",
      order: 1,
      score: 50,
      content: language.entrancePrompt,
      explanation: "AI evaluates whether the candidate can explain teaching strategy clearly.",
    },
    {
      type: "ESSAY",
      order: 2,
      score: 50,
      content:
        "Write a short lesson plan for a 45-minute class. Include objective, warm-up, main activity, and assessment.",
      explanation: "AI evaluates structure, pedagogy, and language control.",
    },
  ];
}

function speakingEntranceQuestions(language) {
  return [
    {
      type: "SPEAKING",
      order: 1,
      score: 50,
      content: language.speakingPrompt,
      explanation: "AI evaluates fluency, vocabulary, grammar, pronunciation, and task completion.",
    },
    {
      type: "SPEAKING",
      order: 2,
      score: 50,
      content:
        "Explain how you would correct a student's mistake without discouraging them.",
      explanation: "AI evaluates speaking clarity and teaching judgment.",
    },
  ];
}

async function syncTestQuestions(client, testId, questions) {
  await resetQuestions(client, testId);
  for (const question of questions) {
    await insertQuestion(client, testId, question);
  }
}

async function main() {
  const { connectionString, schema } = getDatabaseConfig();
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  const summary = {
    languages: 0,
    courses: 0,
    modules: LANGUAGES.length * 3,
    lessons: LANGUAGES.length * 6,
    courseTests: 0,
    publicPracticeTests: 0,
    teacherEntranceTests: 0,
  };

  try {
    await client.query("BEGIN");
    if (schema) {
      await query(client, `SET search_path TO ${JSON.stringify(schema)}`);
    }

    const teacher = await upsertUser(client, {
      email: TEACHER_EMAIL,
      username: "Seed Demo Teacher",
      role: "TEACHER",
    });
    await ensureWallet(client, teacher.id);

    await upsertUser(client, {
      email: ADMIN_EMAIL,
      username: "Seed Demo Admin",
      role: "ADMIN",
    });

    for (const languageSeed of LANGUAGES) {
      const language = {
        ...languageSeed,
        ...(await upsertLanguage(client, languageSeed)),
      };
      summary.languages += 1;

      const courseId = await upsertCourse(client, { language, teacherId: teacher.id });
      summary.courses += 1;
      await seedCourseContent(client, language, courseId);

      const finalTestId = await upsertTest(client, {
        courseId,
        languageId: language.id,
        kind: "COURSE",
        assessmentMode: "STANDARD",
        name: `Final Test - ${language.courseName}`,
        description: `Final assessment for ${language.courseName}. Total score is 100.`,
        passingScore: 60,
        timeLimit: 45,
        shuffleQuestions: true,
      });
      await syncTestQuestions(client, finalTestId, standardQuestions(language));
      summary.courseTests += 1;

      const practiceTestId = await upsertTest(client, {
        courseId: null,
        languageId: language.id,
        kind: "PUBLIC_PRACTICE",
        assessmentMode: "STANDARD",
        name: `Public Practice - ${language.nativeName}`,
        description: `Public practice test for ${language.nativeName} learners.`,
        passingScore: 60,
        timeLimit: 30,
        shuffleQuestions: true,
      });
      await syncTestQuestions(client, practiceTestId, publicPracticeQuestions(language));
      summary.publicPracticeTests += 1;

      const writingEntranceId = await upsertTest(client, {
        courseId: null,
        languageId: language.id,
        kind: "TEACHER_ENTRANCE",
        assessmentMode: "WRITING",
        name: `Teacher Entrance Writing - ${language.nativeName}`,
        description: `Writing entrance test for ${language.nativeName} teacher candidates.`,
        passingScore: 70,
        timeLimit: 60,
        shuffleQuestions: false,
      });
      await syncTestQuestions(client, writingEntranceId, writingEntranceQuestions(language));
      summary.teacherEntranceTests += 1;

      const speakingEntranceId = await upsertTest(client, {
        courseId: null,
        languageId: language.id,
        kind: "TEACHER_ENTRANCE",
        assessmentMode: "SPEAKING",
        name: `Teacher Entrance Speaking - ${language.nativeName}`,
        description: `Speaking entrance test for ${language.nativeName} teacher candidates.`,
        passingScore: 70,
        timeLimit: 20,
        shuffleQuestions: false,
      });
      await syncTestQuestions(client, speakingEntranceId, speakingEntranceQuestions(language));
      summary.teacherEntranceTests += 1;
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          ok: true,
          seededAt: nowIso(),
          teacher: { email: TEACHER_EMAIL, password: DEMO_PASSWORD },
          admin: { email: ADMIN_EMAIL, password: DEMO_PASSWORD },
          summary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[seed-demo-data] failed", error);
  process.exitCode = 1;
});
