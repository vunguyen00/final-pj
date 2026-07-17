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

const ENTRANCE_COPY = {
  en: {
    writingName: "Teacher Entrance Writing - English",
    writingDescription: "Writing entrance test for English teacher candidates.",
    speakingName: "Teacher Entrance Speaking - English",
    speakingDescription: "Speaking entrance test for English teacher candidates.",
    writingQuestion2: "Write a short lesson plan for a 45-minute class. Include objective, warm-up, main activity, and assessment.",
    speakingQuestion2: "Explain how you would correct a student's mistake without discouraging them.",
    writingExplanation: "AI evaluates structure, pedagogy, and language control.",
    speakingExplanation: "AI evaluates speaking clarity and teaching judgment.",
  },
  zh: {
    writingName: "\u6559\u5e08\u5165\u95e8\u5199\u4f5c\u6d4b\u8bd5 - \u4e2d\u6587",
    writingDescription: "\u9762\u5411\u4e2d\u6587\u6559\u5e08\u5019\u9009\u4eba\u7684\u5199\u4f5c\u5165\u95e8\u6d4b\u8bd5\u3002",
    speakingName: "\u6559\u5e08\u5165\u95e8\u53e3\u8bed\u6d4b\u8bd5 - \u4e2d\u6587",
    speakingDescription: "\u9762\u5411\u4e2d\u6587\u6559\u5e08\u5019\u9009\u4eba\u7684\u53e3\u8bed\u5165\u95e8\u6d4b\u8bd5\u3002",
    writingQuestion2: "\u8bf7\u5199\u4e00\u4efd45\u5206\u949f\u8bfe\u7a0b\u7684\u7b80\u8981\u6559\u6848\uff0c\u5305\u62ec\u76ee\u6807\u3001\u70ed\u8eab\u3001\u4e3b\u8981\u6d3b\u52a8\u548c\u8bc4\u4f30\u65b9\u5f0f\u3002",
    speakingQuestion2: "\u8bf7\u8bf4\u660e\u4f60\u4f1a\u5982\u4f55\u7ea0\u6b63\u5b66\u751f\u7684\u9519\u8bef\uff0c\u540c\u65f6\u4e0d\u8ba9\u4ed6\u4eec\u611f\u5230\u6cae\u4e27\u3002",
    writingExplanation: "AI\u4f1a\u8bc4\u4f30\u7ed3\u6784\u3001\u6559\u5b66\u6cd5\u548c\u8bed\u8a00\u638c\u63a7\u80fd\u529b\u3002",
    speakingExplanation: "AI\u4f1a\u8bc4\u4f30\u53e3\u8bed\u8868\u8fbe\u6e05\u6670\u5ea6\u548c\u6559\u5b66\u5224\u65ad\u529b\u3002",
  },
  ja: {
    writingName: "\u8b1b\u5e2b\u767b\u9332\u30e9\u30a4\u30c6\u30a3\u30f3\u30b0\u30c6\u30b9\u30c8 - \u65e5\u672c\u8a9e",
    writingDescription: "\u65e5\u672c\u8a9e\u8b1b\u5e2b\u5fd7\u9858\u8005\u5411\u3051\u306e\u30e9\u30a4\u30c6\u30a3\u30f3\u30b0\u30c6\u30b9\u30c8\u3067\u3059\u3002",
    speakingName: "\u8b1b\u5e2b\u767b\u9332\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u30c6\u30b9\u30c8 - \u65e5\u672c\u8a9e",
    speakingDescription: "\u65e5\u672c\u8a9e\u8b1b\u5e2b\u5fd7\u9858\u8005\u5411\u3051\u306e\u30b9\u30d4\u30fc\u30ad\u30f3\u30b0\u30c6\u30b9\u30c8\u3067\u3059\u3002",
    writingQuestion2: "45\u5206\u6388\u696d\u306e\u77ed\u3044\u6559\u6848\u3092\u66f8\u3044\u3066\u304f\u3060\u3055\u3044\u3002\u76ee\u6a19\u3001\u30a6\u30a9\u30fc\u30e0\u30a2\u30c3\u30d7\u3001\u4e3b\u6d3b\u52d5\u3001\u8a55\u4fa1\u65b9\u6cd5\u3092\u542b\u3081\u3066\u304f\u3060\u3055\u3044\u3002",
    speakingQuestion2: "\u5b66\u751f\u3092\u843d\u3061\u8fbc\u307e\u305b\u305a\u306b\u9593\u9055\u3044\u3092\u3069\u306e\u3088\u3046\u306b\u8a02\u6b63\u3059\u308b\u304b\u3001\u65e5\u672c\u8a9e\u3067\u8aac\u660e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    writingExplanation: "AI\u304c\u69cb\u6210\u3001\u6559\u6388\u6cd5\u3001\u8a00\u8a9e\u904b\u7528\u529b\u3092\u8a55\u4fa1\u3057\u307e\u3059\u3002",
    speakingExplanation: "AI\u304c\u8a71\u3057\u65b9\u306e\u660e\u78ba\u3055\u3068\u6559\u80b2\u7684\u5224\u65ad\u529b\u3092\u8a55\u4fa1\u3057\u307e\u3059\u3002",
  },
  ko: {
    writingName: "\uac15\uc0ac \uc785\ubb38 \uc4f0\uae30 \ud14c\uc2a4\ud2b8 - \ud55c\uad6d\uc5b4",
    writingDescription: "\ud55c\uad6d\uc5b4 \uac15\uc0ac \uc9c0\uc6d0\uc790\ub97c \uc704\ud55c \uc4f0\uae30 \uc785\ubb38 \ud14c\uc2a4\ud2b8\uc785\ub2c8\ub2e4.",
    speakingName: "\uac15\uc0ac \uc785\ubb38 \ub9d0\ud558\uae30 \ud14c\uc2a4\ud2b8 - \ud55c\uad6d\uc5b4",
    speakingDescription: "\ud55c\uad6d\uc5b4 \uac15\uc0ac \uc9c0\uc6d0\uc790\ub97c \uc704\ud55c \ub9d0\ud558\uae30 \uc785\ubb38 \ud14c\uc2a4\ud2b8\uc785\ub2c8\ub2e4.",
    writingQuestion2: "45\ubd84 \uc218\uc5c5\uc758 \uc9e7\uc740 \uc218\uc5c5 \uacc4\ud68d\uc744 \uc791\uc131\ud558\uc138\uc694. \ubaa9\ud45c, \uc6cc\ubc0d\uc5c5, \uc8fc\uc694 \ud65c\ub3d9, \ud3c9\uac00 \ubc29\ubc95\uc744 \ud3ec\ud568\ud558\uc138\uc694.",
    speakingQuestion2: "\ud559\uc0dd\uc774 \uc88c\uc808\ud558\uc9c0 \uc54a\ub3c4\ub85d \uc624\ub958\ub97c \uc5b4\ub5bb\uac8c \uace0\uccd0 \uc904\uc9c0 \ud55c\uad6d\uc5b4\ub85c \uc124\uba85\ud558\uc138\uc694.",
    writingExplanation: "AI\uac00 \uad6c\uc131, \uad50\uc218\ubc95, \uc5b8\uc5b4 \uc0ac\uc6a9 \ub2a5\ub825\uc744 \ud3c9\uac00\ud569\ub2c8\ub2e4.",
    speakingExplanation: "AI\uac00 \ub9d0\ud558\uae30 \uba85\ud655\uc131\uacfc \uad50\uc721\uc801 \ud310\ub2e8\ub825\uc744 \ud3c9\uac00\ud569\ub2c8\ub2e4.",
  },
};

function getEntranceCopy(language) {
  return ENTRANCE_COPY[language.code] || ENTRANCE_COPY.en;
}

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
    params.push(data.kind, data.languageId, data.assessmentMode);
    whereSql = `"kind" = $1::"TestKind" AND "languageId" = $2 AND "assessmentMode" = $3::"TestAssessmentMode" AND "courseId" IS NULL`;
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
  const copy = getEntranceCopy(language);
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
      content: copy.writingQuestion2,
      explanation: copy.writingExplanation,
    },
  ];
}

function speakingEntranceQuestions(language) {
  const copy = getEntranceCopy(language);
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
      content: copy.speakingQuestion2,
      explanation: copy.speakingExplanation,
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
      const entranceCopy = getEntranceCopy(language);
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
        name: entranceCopy.writingName,
        description: entranceCopy.writingDescription,
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
        name: entranceCopy.speakingName,
        description: entranceCopy.speakingDescription,
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
