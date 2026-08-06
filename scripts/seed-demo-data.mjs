import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const DEMO_PASSWORD = "Demo@123456";
const ADMIN_EMAIL = "admin.seed@finncenter.local";

const LANGUAGES = [
  {
    key: "english",
    name: "English",
    code: "en",
    nativeName: "English",
    teacherEmail: "teacher.english.seed@finncenter.local",
    teacherName: "Emily Carter - English Teacher",
    courseName: "Advanced English Academic Communication",
    courseDescription:
      "Master advanced academic speaking, argumentation, nuanced grammar, and formal writing in English.",
    category: "Speaking",
    level: "Advanced",
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
    teacherEmail: "teacher.chinese.seed@finncenter.local",
    teacherName: "Li Wei - Chinese Teacher",
    courseName: "Advanced Chinese HSK 5-6 Communication",
    courseDescription:
      "Develop advanced Chinese reading, formal expression, idiomatic vocabulary, and HSK 5-6 communication skills.",
    category: "Reading",
    level: "Advanced",
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
    teacherEmail: "teacher.japanese.seed@finncenter.local",
    teacherName: "Haruka Sato - Japanese Teacher",
    courseName: "Advanced Japanese JLPT N2 Communication",
    courseDescription:
      "Strengthen advanced Japanese grammar, reading comprehension, honorific language, and JLPT N2 communication.",
    category: "Grammar",
    level: "Advanced",
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
    teacherEmail: "teacher.korean.seed@finncenter.local",
    teacherName: "Min-jun Kim - Korean Teacher",
    courseName: "Advanced Korean TOPIK II Communication",
    courseDescription:
      "Build advanced Korean writing, formal discourse, complex grammar, and TOPIK II communication skills.",
    category: "Writing",
    level: "Advanced",
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

async function upsertApprovedTeacherApplication(client, {
  teacherId,
  languageId,
  entranceTestId,
  adminId,
}) {
  await query(
    client,
    `
      UPDATE "TeacherApplication"
      SET "status" = 'REJECTED'::"TeacherApplicationStatus",
          "rejectionReason" = 'Replaced by the fixed demo teaching language.',
          "reviewedAt" = NOW(), "reviewedById" = $3, "updatedAt" = NOW()
      WHERE "userId" = $1 AND "languageId" <> $2
        AND "status" = 'APPROVED'::"TeacherApplicationStatus"
    `,
    [teacherId, languageId, adminId],
  );

  const existing = await query(
    client,
    `
      SELECT "id" FROM "TeacherApplication"
      WHERE "userId" = $1 AND "languageId" = $2
      ORDER BY "createdAt" DESC
      LIMIT 1
    `,
    [teacherId, languageId],
  );

  if (existing.rowCount) {
    await query(
      client,
      `
        UPDATE "TeacherApplication"
        SET "status" = 'APPROVED'::"TeacherApplicationStatus",
            "entranceTestId" = $2, "submittedAt" = COALESCE("submittedAt", NOW()),
            "reviewedAt" = NOW(), "reviewedById" = $3, "rejectionReason" = NULL,
            "failureReason" = NULL, "sequentialCompletedAt" = COALESCE("sequentialCompletedAt", NOW()),
            "entrancePassingScore" = 70, "entranceMaxScore" = 100,
            "entranceTimeLimit" = 60, "updatedAt" = NOW()
        WHERE "id" = $1
      `,
      [existing.rows[0].id, entranceTestId, adminId],
    );
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await query(
    client,
    `
      INSERT INTO "TeacherApplication" (
        "id", "userId", "languageId", "status", "attemptNo", "entranceTestId",
        "submittedAt", "reviewedAt", "reviewedById", "sequentialCompletedAt",
        "entrancePassingScore", "entranceMaxScore", "entranceTimeLimit",
        "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, 'APPROVED'::"TeacherApplicationStatus", 1, $4,
        NOW(), NOW(), $5, NOW(), 70, 100, 60, NOW(), NOW()
      )
    `,
    [id, teacherId, languageId, entranceTestId, adminId],
  );
  return id;
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
        language.courseDescription,
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
      language.courseDescription,
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
    `
      SELECT "id" FROM "Module"
      WHERE "courseId" = $1 AND ("name" = $2 OR "order" = $3)
      ORDER BY CASE WHEN "name" = $2 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [courseId, name, order],
  );

  if (existing.rowCount) {
    await query(client, `UPDATE "Module" SET "name" = $2, "order" = $3 WHERE "id" = $1`, [
      existing.rows[0].id,
      name,
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

async function upsertLesson(client, {
  moduleId,
  title,
  content,
  legacyTitle = null,
  videoUrl = null,
}) {
  const existing = await query(
    client,
    `
      SELECT "id" FROM "Lesson"
      WHERE "moduleId" = $1 AND ("title" = $2 OR ($3::text IS NOT NULL AND "title" = $3))
      ORDER BY CASE WHEN "title" = $2 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [moduleId, title, legacyTitle],
  );

  if (existing.rowCount) {
    await query(
      client,
      `UPDATE "Lesson" SET "title" = $2, "content" = $3, "videoUrl" = $4 WHERE "id" = $1`,
      [existing.rows[0].id, title, content, videoUrl],
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

const LEGACY_LESSON_TITLES = [
  "Lesson 1 - Nuanced vocabulary",
  "Lesson 2 - Complex sentence patterns",
  "Lesson 3 - Argument and evidence",
  "Lesson 4 - Formal register",
  "Lesson 5 - Debate and presentation",
  "Lesson 6 - Advanced final review",
];

const COURSE_CONTENT_BY_LANGUAGE = {
  en: [
    {
      name: "Module 1 - Advanced language control",
      lessons: [
        {
          title: "Lesson 1 - Nuanced vocabulary and register",
          content:
            "Use precise academic and professional vocabulary, distinguish subtle differences in meaning, and choose an appropriate register for formal and informal contexts.",
        },
        {
          title: "Lesson 2 - Complex sentence patterns",
          content:
            "Analyze and produce complex sentences using condition, concession, cause, contrast, emphasis, and inversion with accurate punctuation.",
        },
      ],
    },
    {
      name: "Module 2 - Academic and professional discourse",
      lessons: [
        {
          title: "Lesson 3 - Arguments and supporting evidence",
          content:
            "Build a focused claim and support it with relevant data, examples, explanations, and logically connected counterarguments.",
        },
        {
          title: "Lesson 4 - Formal register and diplomatic language",
          content:
            "Adjust tone, politeness, hedging, and sentence structure for academic papers, meetings, reports, and professional correspondence.",
        },
      ],
    },
    {
      name: "Module 3 - Advanced communication practice",
      lessons: [
        {
          title: "Lesson 5 - Debate and presentation",
          content:
            "Plan and deliver a persuasive presentation, respond spontaneously to questions, and challenge opposing views respectfully.",
        },
        {
          title: "Lesson 6 - Advanced review and final assessment preparation",
          content:
            "Consolidate advanced vocabulary, grammar, reading, writing, and speaking strategies through an integrated final review.",
        },
      ],
    },
  ],
  zh: [
    {
      name: "模块一：高级语言运用",
      lessons: [
        {
          title: "第一课：精准词汇与语体",
          content:
            "学习在学术、职场和正式交流中准确使用高级词汇与惯用表达，辨析近义词，并根据不同场合选择恰当的书面语或口语语体。",
        },
        {
          title: "第二课：复杂句式与关联结构",
          content:
            "分析并运用复句、关联词和高级语法结构，准确表达条件、让步、因果、转折和对比关系。",
        },
      ],
    },
    {
      name: "模块二：学术与职场表达",
      lessons: [
        {
          title: "第三课：论点与证据",
          content:
            "学习提出清晰的中心论点，并使用数据、实例、解释和逻辑推理来支持观点，同时回应不同意见。",
        },
        {
          title: "第四课：正式语体与礼貌表达",
          content:
            "掌握学术文章、会议发言、报告和商务往来中的正式表达，并根据对象调整语气、礼貌程度和措辞。",
        },
      ],
    },
    {
      name: "模块三：高级沟通实践",
      lessons: [
        {
          title: "第五课：辩论与演讲",
          content:
            "练习组织有说服力的演讲、即席回答问题、清楚陈述立场，并以尊重的方式反驳不同观点。",
        },
        {
          title: "第六课：综合复习与期末测验准备",
          content:
            "通过综合练习复习高级词汇、语法、阅读、写作和口语策略，为期末测验做好准备。",
        },
      ],
    },
  ],
  ja: [
    {
      name: "モジュール1：高度な言語運用",
      lessons: [
        {
          title: "第1課：ニュアンスのある語彙と文体",
          content:
            "学術・ビジネス・フォーマルな場面で適切な上級語彙や慣用表現を使い、類義語の微妙な違いと文体の使い分けを学びます。",
        },
        {
          title: "第2課：複雑な文型と接続表現",
          content:
            "条件、譲歩、原因、対比、強調を表す複雑な文型と接続表現を分析し、正確に使えるようにします。",
        },
      ],
    },
    {
      name: "モジュール2：学術・ビジネスコミュニケーション",
      lessons: [
        {
          title: "第3課：主張と根拠",
          content:
            "明確な主張を立て、データ、具体例、説明、論理的な推論を用いて意見を裏付け、反対意見にも対応します。",
        },
        {
          title: "第4課：敬語とフォーマルな表現",
          content:
            "論文、会議、報告書、ビジネスメールに適した敬語、丁寧さ、表現の和らげ方、文章構成を身につけます。",
        },
      ],
    },
    {
      name: "モジュール3：高度なコミュニケーション演習",
      lessons: [
        {
          title: "第5課：ディベートとプレゼンテーション",
          content:
            "説得力のある発表を構成し、質問に即座に答え、相手を尊重しながら異なる意見に反論する練習をします。",
        },
        {
          title: "第6課：総合復習と期末試験対策",
          content:
            "上級語彙、文法、読解、作文、会話の方略を総合問題で復習し、期末試験に備えます。",
        },
      ],
    },
  ],
  ko: [
    {
      name: "모듈 1: 고급 언어 활용",
      lessons: [
        {
          title: "1과: 뉘앙스를 살리는 어휘와 문체",
          content:
            "학술, 직장, 공식적인 의사소통 상황에서 고급 어휘와 관용 표현을 정확하게 사용하고 유의어의 미묘한 차이와 문체 선택을 익힙니다.",
        },
        {
          title: "2과: 복합 문장과 연결 표현",
          content:
            "조건, 양보, 원인, 대조, 강조를 나타내는 복합 문장과 고급 문법 표현을 분석하고 정확하게 활용합니다.",
        },
      ],
    },
    {
      name: "모듈 2: 학술 및 비즈니스 의사소통",
      lessons: [
        {
          title: "3과: 주장과 근거",
          content:
            "명확한 주장을 세우고 자료, 사례, 설명, 논리적인 추론으로 의견을 뒷받침하며 반대 의견에도 적절히 대응합니다.",
        },
        {
          title: "4과: 높임말과 격식체",
          content:
            "논문, 회의, 보고서, 비즈니스 이메일에 맞게 높임말, 완곡한 표현, 격식 있는 어휘와 문장 구조를 조절합니다.",
        },
      ],
    },
    {
      name: "모듈 3: 고급 의사소통 실습",
      lessons: [
        {
          title: "5과: 토론과 발표",
          content:
            "설득력 있는 발표를 구성하고 질문에 즉흥적으로 답하며 상대를 존중하면서 다른 주장에 논리적으로 반박하는 연습을 합니다.",
        },
        {
          title: "6과: 종합 복습 및 기말 평가 준비",
          content:
            "고급 어휘, 문법, 읽기, 쓰기, 말하기 전략을 통합 활동으로 복습하고 기말 평가를 준비합니다.",
        },
      ],
    },
  ],
};

async function seedCourseContent(client, language, courseId) {
  const modules = COURSE_CONTENT_BY_LANGUAGE[language.code];
  if (!modules) {
    throw new Error(`Course content is not configured for ${language.code}.`);
  }

  let lessonCount = 0;
  for (const [moduleIndex, module] of modules.entries()) {
    const moduleId = await upsertModule(client, {
      courseId,
      name: module.name,
      order: moduleIndex + 1,
    });
    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      await upsertLesson(client, {
        moduleId,
        title: lesson.title,
        content: lesson.content,
        legacyTitle: LEGACY_LESSON_TITLES[moduleIndex * 2 + lessonIndex],
      });
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
  } else if (data.kind === "PUBLIC_PRACTICE") {
    params.push(data.kind, data.languageId, data.assessmentMode, data.name);
    whereSql = `"kind" = $1::"TestKind" AND "languageId" = $2 AND "assessmentMode" = $3::"TestAssessmentMode" AND "name" = $4 AND "courseId" IS NULL`;
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

const ADVANCED_QUESTION_SETS = {
  en: {
    course: [
      {
        type: "MULTIPLE_CHOICE",
        content: "Had the committee reviewed the evidence earlier, it ___ a different conclusion.",
        explanation: "A third conditional uses 'would have' plus a past participle in the result clause.",
        answers: [
          { content: "might have reached", isCorrect: true },
          { content: "might reach", isCorrect: false },
          { content: "will have reached", isCorrect: false },
          { content: "had reached", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "Which verb best completes the sentence? The new policy is intended to ___ the impact of rising costs.",
        explanation: "'Mitigate' means to make something harmful less severe.",
        answers: [
          { content: "mitigate", isCorrect: true },
          { content: "provoke", isCorrect: false },
          { content: "allocate", isCorrect: false },
          { content: "compile", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "The sentence 'Not until the results were published did the researchers identify the error' uses correct subject-auxiliary inversion.",
        explanation: "A negative limiting phrase at the beginning triggers inversion in the main clause.",
        answers: [
          { content: "True", isCorrect: true },
          { content: "False", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "Fill in the blank with a formal contrast connector: The evidence was limited; ____, the findings influenced later research.",
        explanation: "'Nevertheless' introduces a contrast with the preceding limitation.",
        answers: [{ content: "nevertheless", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "Write 180-220 words arguing whether universities should require every student to complete a community-based project. Address one counterargument.",
        explanation: "AI evaluates argument quality, cohesion, advanced vocabulary, grammar, and register.",
      },
    ],
    practice: [
      {
        type: "MULTIPLE_CHOICE",
        content: "Choose the best revision: Despite the proposal was carefully prepared, it was rejected.",
        explanation: "'Despite' is followed by a noun phrase or gerund, not a finite clause.",
        answers: [
          { content: "Despite being carefully prepared, the proposal was rejected.", isCorrect: true },
          { content: "Despite it carefully prepared, the proposal was rejected.", isCorrect: false },
          { content: "Despite was carefully prepared, the proposal was rejected.", isCorrect: false },
          { content: "Despite of careful preparation, the proposal was rejected.", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "If a reviewer is 'ambivalent' about a proposal, how do they feel?",
        explanation: "'Ambivalent' describes having mixed or contradictory feelings.",
        answers: [
          { content: "They have mixed feelings about it.", isCorrect: true },
          { content: "They strongly support it.", isCorrect: false },
          { content: "They have not read it.", isCorrect: false },
          { content: "They consider it illegal.", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "In formal writing, 'whereas' can be used to contrast two facts within one sentence.",
        explanation: "'Whereas' is a subordinating conjunction commonly used for direct contrast.",
        answers: [
          { content: "True", isCorrect: true },
          { content: "False", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "Fill in the blank: Rarely ____ a technological change affected so many industries at once.",
        explanation: "After 'rarely', present-perfect inversion requires 'has'.",
        answers: [{ content: "has", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "Write 180-220 words comparing remote and face-to-face collaboration. Recommend one approach for an international team and justify your choice.",
        explanation: "AI evaluates comparison, recommendation, coherence, vocabulary, grammar, and formal register.",
      },
    ],
  },
  zh: {
    course: [
      {
        type: "MULTIPLE_CHOICE",
        content: "选择最恰当的词语：即使任务很复杂，我们___要按时完成。",
        explanation: "“即使……也……”是表示让步关系的固定搭配。",
        answers: [
          { content: "也", isCorrect: true },
          { content: "才", isCorrect: false },
          { content: "却", isCorrect: false },
          { content: "便", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "“缓解压力”中的“缓解”最接近下面哪个意思？",
        explanation: "“缓解”表示使程度减轻或局势变得和缓。",
        answers: [
          { content: "减轻", isCorrect: true },
          { content: "增加", isCorrect: false },
          { content: "忽略", isCorrect: false },
          { content: "证明", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "“未必”表示说话人认为某件事一定不会发生。",
        explanation: "错误。“未必”表示不一定，而不是一定不会。",
        answers: [
          { content: "正确", isCorrect: false },
          { content: "错误", isCorrect: true },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "填空：与其等待别人帮助，____自己先尝试解决。",
        explanation: "“与其……不如……”用于比较并选择后一种做法。",
        answers: [{ content: "不如", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "请用中文写一篇180至220字的短文，讨论人工智能对教育的影响，并提出一个负责任的使用建议。",
        explanation: "AI将评估观点、结构、衔接、高级词汇和语法准确性。",
      },
    ],
    practice: [
      {
        type: "MULTIPLE_CHOICE",
        content: "选择最恰当的词语：只有充分了解实际情况，___能作出合理的判断。",
        explanation: "“只有……才……”表示必要条件。",
        answers: [
          { content: "才", isCorrect: true },
          { content: "就", isCorrect: false },
          { content: "又", isCorrect: false },
          { content: "还", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "“他对这个方案持保留态度”最可能表示什么？",
        explanation: "“持保留态度”表示尚未完全赞同，仍有疑虑。",
        answers: [
          { content: "他没有完全赞同这个方案", isCorrect: true },
          { content: "他已经无条件接受这个方案", isCorrect: false },
          { content: "他拒绝阅读这个方案", isCorrect: false },
          { content: "他决定立刻取消这个方案", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "“把”字句常用来强调动作对宾语产生的处置或结果。",
        explanation: "正确。“把”字句突出宾语受到动作影响后的状态或结果。",
        answers: [
          { content: "正确", isCorrect: true },
          { content: "错误", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "填空：____遇到不少困难，但是团队始终没有放弃。",
        explanation: "“虽然……但是……”表示转折关系。",
        answers: [{ content: "虽然", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "请用中文写一篇180至220字的短文，比较线上学习和面对面学习，并说明你更推荐哪一种方式。",
        explanation: "AI将评估比较、论证、篇章结构、词汇和语法。",
      },
    ],
  },
  ja: {
    course: [
      {
        type: "MULTIPLE_CHOICE",
        content: "最も適切なものを選んでください。どんなに忙しくても、約束した締め切りは守る___。",
        explanation: "「べきだ」は、義務や当然そうするのが望ましいことを表します。",
        answers: [
          { content: "べきだ", isCorrect: true },
          { content: "わけがない", isCorrect: false },
          { content: "ことはない", isCorrect: false },
          { content: "にすぎない", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "「悪天候にもかかわらず、イベントは予定どおり行われた」の意味に最も近いものはどれですか。",
        explanation: "「にもかかわらず」は、予想に反する結果を表します。",
        answers: [
          { content: "天気が悪かったが、イベントは実施された", isCorrect: true },
          { content: "天気が悪かったため、イベントは中止された", isCorrect: false },
          { content: "天気が良くなってから、イベントが始まった", isCorrect: false },
          { content: "イベントのために、天気が悪くなった", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "「有名な店だからといって、おいしいとは限らない」は、有名な店が必ずおいしいわけではないという意味です。",
        explanation: "正しいです。「とは限らない」は、いつもそうだとは言えないことを表します。",
        answers: [
          { content: "正しい", isCorrect: true },
          { content: "誤り", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "空欄を埋めてください。この問題は専門家____、解決するのが難しい。",
        explanation: "「でさえ」は、極端な例を挙げて強調するときに使います。",
        answers: [{ content: "でさえ", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "テクノロジーが教育に与える影響について、利点と課題の両方を含めて400字程度で論じてください。",
        explanation: "AIが論旨、構成、語彙、文法、文体を評価します。",
      },
    ],
    practice: [
      {
        type: "MULTIPLE_CHOICE",
        content: "最も適切なものを選んでください。人口が急速に減少している___、地域の学校が統合されることになった。",
        explanation: "「ことから」は、判断や結果の根拠・理由を示します。",
        answers: [
          { content: "ことから", isCorrect: true },
          { content: "ものなら", isCorrect: false },
          { content: "ばかりに", isCorrect: false },
          { content: "どころか", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "「この程度の変更なら差し支えない」の意味に最も近いものはどれですか。",
        explanation: "「差し支えない」は、問題や不都合がないという意味です。",
        answers: [
          { content: "この程度の変更なら問題ない", isCorrect: true },
          { content: "この変更は絶対に認められない", isCorrect: false },
          { content: "変更する必要はまったくない", isCorrect: false },
          { content: "変更の内容が理解できない", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "尊敬語は、話題になっている相手の動作や状態を高めて表すために使われます。",
        explanation: "正しいです。尊敬語は相手側の人物への敬意を表します。",
        answers: [
          { content: "正しい", isCorrect: true },
          { content: "誤り", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "空欄を埋めてください。十分に検討した____、今回は計画を見送ることにした。",
        explanation: "「結果」は、検討後に得られた結論を示します。",
        answers: [{ content: "結果", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "オンラインでの協働と対面での協働を比較し、国際的なチームにはどちらが適しているか、400字程度で述べてください。",
        explanation: "AIが比較、提案、論理性、語彙、文法を評価します。",
      },
    ],
  },
  ko: {
    course: [
      {
        type: "MULTIPLE_CHOICE",
        content: "가장 알맞은 표현을 고르세요. 이 방법은 시간이 오래 걸리___ 결과의 정확도가 높다.",
        explanation: "'-기는 하지만'은 앞의 내용을 인정하면서 뒤에서 대조되는 내용을 제시합니다.",
        answers: [
          { content: "기는 하지만", isCorrect: true },
          { content: "는 바람에", isCorrect: false },
          { content: "는 대신에만", isCorrect: false },
          { content: "도록 하자마자", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "'부담을 완화하다'에서 '완화하다'와 가장 가까운 뜻은 무엇입니까?",
        explanation: "'완화하다'는 정도를 줄이거나 누그러뜨린다는 뜻입니다.",
        answers: [
          { content: "줄이다", isCorrect: true },
          { content: "늘리다", isCorrect: false },
          { content: "증명하다", isCorrect: false },
          { content: "무시하다", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "'매일 한 시간씩 공부했으니 일주일에 일곱 시간을 공부한 셈이다'에서 '-는 셈이다'는 결과적으로 그와 같다는 뜻이다.",
        explanation: "맞습니다. '-는 셈이다'는 사실이나 상황을 종합하면 결과적으로 그렇다는 의미입니다.",
        answers: [
          { content: "맞다", isCorrect: true },
          { content: "틀리다", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "빈칸을 채우세요. 꾸준히 노력한 ____ 좋은 결과를 얻을 수 있다.",
        explanation: "'-은/는 만큼'은 앞의 정도에 상응하는 결과를 나타냅니다.",
        answers: [{ content: "만큼", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "인공지능이 교육에 미치는 영향에 대해 장점과 문제점을 포함하여 500~600자로 논술하세요.",
        explanation: "AI가 논지, 구성, 고급 어휘, 문법 정확성, 문체를 평가합니다.",
      },
    ],
    practice: [
      {
        type: "MULTIPLE_CHOICE",
        content: "가장 알맞은 표현을 고르세요. 이 정책은 비용을 줄일___ 업무 효율도 높일 수 있다.",
        explanation: "'-을 뿐만 아니라'는 두 가지 사실을 더하여 강조할 때 사용합니다.",
        answers: [
          { content: "뿐만 아니라", isCorrect: true },
          { content: "수밖에 없어", isCorrect: false },
          { content: "리가 없어서", isCorrect: false },
          { content: "뻔했지만", isCorrect: false },
        ],
      },
      {
        type: "MULTIPLE_CHOICE",
        content: "'그는 결정을 내릴 때 매우 신중하다'에서 '신중하다'와 가장 가까운 뜻은 무엇입니까?",
        explanation: "'신중하다'는 조심스럽고 깊이 생각하는 태도를 뜻합니다.",
        answers: [
          { content: "조심스럽다", isCorrect: true },
          { content: "성급하다", isCorrect: false },
          { content: "무관심하다", isCorrect: false },
          { content: "단순하다", isCorrect: false },
        ],
      },
      {
        type: "TRUE_FALSE",
        content: "간접 높임은 문장의 주어와 관련된 사람이나 사물을 높임으로써 그 주어를 존중하는 표현이다.",
        explanation: "맞습니다. 간접 높임은 높여야 할 사람과 관계된 대상에 높임 표현을 사용합니다.",
        answers: [
          { content: "맞다", isCorrect: true },
          { content: "틀리다", isCorrect: false },
        ],
      },
      {
        type: "FILL_IN_BLANK",
        content: "빈칸을 채우세요. 회의가 끝나는 ____ 결과를 이메일로 보내 드리겠습니다.",
        explanation: "'-는 대로'는 앞의 일이 끝난 직후에 뒤의 일이 이루어짐을 나타냅니다.",
        answers: [{ content: "대로", isCorrect: true }],
      },
      {
        type: "ESSAY",
        content: "온라인 협업과 대면 협업을 비교하고 국제적인 팀에 더 적합한 방식을 500~600자로 제안하세요.",
        explanation: "AI가 비교, 제안, 논리성, 어휘, 문법을 평가합니다.",
      },
    ],
  },
};

function scoredAdvancedQuestions(language, setName) {
  const languageSet = ADVANCED_QUESTION_SETS[language.code];
  if (!languageSet) {
    throw new Error(`Advanced questions are not configured for ${language.code}.`);
  }
  return languageSet[setName].map((question, index) => ({
    ...question,
    order: index + 1,
    score: 20,
  }));
}

function advancedCourseQuestions(language) {
  return scoredAdvancedQuestions(language, "course");
}

function advancedPublicPracticeQuestions(language) {
  return scoredAdvancedQuestions(language, "practice");
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
    teachers: 0,
    approvedTeacherApplications: 0,
    courses: 0,
    modules: LANGUAGES.length * 3,
    lessons: LANGUAGES.length * 6,
    courseTests: 0,
    publicPracticeTests: 0,
    teacherEntranceTests: 0,
    courseQuestions: 0,
    publicPracticeQuestions: 0,
  };
  const seededTeachers = [];

  try {
    await client.query("BEGIN");
    if (schema) {
      await query(client, `SET search_path TO ${JSON.stringify(schema)}`);
    }

    const admin = await upsertUser(client, {
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

      const teacher = await upsertUser(client, {
        email: language.teacherEmail,
        username: language.teacherName,
        role: "TEACHER",
      });
      await ensureWallet(client, teacher.id);
      seededTeachers.push({
        email: language.teacherEmail,
        language: language.name,
      });
      summary.teachers += 1;

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
      const courseQuestions = advancedCourseQuestions(language);
      await syncTestQuestions(client, finalTestId, courseQuestions);
      summary.courseTests += 1;
      summary.courseQuestions += courseQuestions.length;

      const practiceTestId = await upsertTest(client, {
        courseId: null,
        languageId: language.id,
        kind: "PUBLIC_PRACTICE",
        assessmentMode: "STANDARD",
        name: `Advanced Public Practice - ${language.nativeName}`,
        description: `Advanced public practice test for ${language.nativeName} learners.`,
        passingScore: 70,
        timeLimit: 45,
        shuffleQuestions: true,
      });
      const practiceQuestions = advancedPublicPracticeQuestions(language);
      await syncTestQuestions(client, practiceTestId, practiceQuestions);
      summary.publicPracticeTests += 1;
      summary.publicPracticeQuestions += practiceQuestions.length;

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

      await upsertApprovedTeacherApplication(client, {
        teacherId: teacher.id,
        languageId: language.id,
        entranceTestId: writingEntranceId,
        adminId: admin.id,
      });
      summary.approvedTeacherApplications += 1;
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          ok: true,
          seededAt: nowIso(),
          teachers: seededTeachers.map((teacher) => ({
            ...teacher,
            password: DEMO_PASSWORD,
          })),
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
