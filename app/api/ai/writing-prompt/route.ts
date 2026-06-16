import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ollamaService } from "@/lib/ai";
import {
  isChartMaterialData,
  type ChartMaterialData,
} from "@/lib/test-material";
import {
  getWritingAiLanguageName,
  normalizeWritingLanguage,
  type WritingLanguage,
} from "@/lib/writing-languages";

type WritingTaskType = "task_1" | "task_2";

function extractJson(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned,
  ) as Record<string, unknown>;
}

function fallbackTaskOne(topic: string, language: WritingLanguage) {
  const localized = {
    ENGLISH: {
      subject: "household internet access",
      title:
        "Household internet access in three countries, 2000-2020",
      unit: "%",
      series: ["Country A", "Country B", "Country C"],
      source: "AI-generated practice data",
      prompt: (subject: string) =>
        `The chart shows changes in ${subject} in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.`,
    },
    CHINESE: {
      subject: "家庭互联网普及率",
      title: "三个国家的家庭互联网普及率变化（2000—2020年）",
      unit: "%",
      series: ["国家A", "国家B", "国家C"],
      source: "AI生成的练习数据",
      prompt: (subject: string) =>
        `图表展示了2000年至2020年三个国家${subject}的变化。请概括主要特征，选择重要数据进行说明，并在适当的地方作出比较。`,
    },
    JAPANESE: {
      subject: "家庭のインターネット普及率",
      title: "3か国における家庭のインターネット普及率（2000～2020年）",
      unit: "%",
      series: ["国A", "国B", "国C"],
      source: "AIが生成した練習データ",
      prompt: (subject: string) =>
        `グラフは、2000年から2020年までの3か国における${subject}の変化を示しています。主な特徴を要約し、重要なデータを選んで説明したうえで、必要に応じて比較してください。`,
    },
    KOREAN: {
      subject: "가정 인터넷 보급률",
      title: "3개국의 가정 인터넷 보급률 변화(2000~2020년)",
      unit: "%",
      series: ["국가 A", "국가 B", "국가 C"],
      source: "AI가 생성한 연습 데이터",
      prompt: (subject: string) =>
        `그래프는 2000년부터 2020년까지 3개국의 ${subject} 변화를 보여 줍니다. 주요 특징을 요약하고 중요한 수치를 선별해 설명한 뒤, 필요한 경우 비교하십시오.`,
    },
  }[language];
  const subject = topic || localized.subject;
  const chart: ChartMaterialData = {
    chartType: "line",
    title: topic ? `${subject} (2000-2020)` : localized.title,
    unit: localized.unit,
    categories: ["2000", "2005", "2010", "2015", "2020"],
    series: [
      { name: localized.series[0], values: [35, 48, 63, 76, 88] },
      { name: localized.series[1], values: [22, 37, 55, 68, 79] },
      { name: localized.series[2], values: [12, 25, 41, 59, 73] },
    ],
    source: localized.source,
  };
  return {
    topic: subject,
    prompt: localized.prompt(subject),
    chart,
  };
}

function fallbackTaskTwo(topic: string, language: WritingLanguage) {
  const localized = {
    ENGLISH: {
      subject: "online learning",
      prompt: (subject: string) =>
        `Some people believe that ${subject} brings more benefits than disadvantages. Discuss both views and give your own opinion.`,
    },
    CHINESE: {
      subject: "在线学习",
      prompt: (subject: string) =>
        `有人认为${subject}带来的好处多于坏处。请讨论不同观点，并说明你自己的看法。`,
    },
    JAPANESE: {
      subject: "オンライン学習",
      prompt: (subject: string) =>
        `${subject}は欠点よりも利点の方が多いと考える人がいます。両方の見方を論じ、あなた自身の意見を述べてください。`,
    },
    KOREAN: {
      subject: "온라인 학습",
      prompt: (subject: string) =>
        `일부 사람들은 ${subject}의 장점이 단점보다 더 많다고 생각합니다. 양쪽 견해를 논의하고 자신의 의견을 제시하십시오.`,
    },
  }[language];
  const subject = topic || localized.subject;
  return {
    topic: subject,
    prompt: localized.prompt(subject),
    chart: null,
  };
}

function hasAtLeastTwoYearCategories(chart: ChartMaterialData) {
  const years = new Set(
    chart.categories
      .map((category) => String(category).match(/\b(?:19|20)\d{2}\b/)?.[0])
      .filter(Boolean),
  );
  return years.size >= 2;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (
      !user ||
      (user.role !== "STUDENT" &&
        user.role !== "TEACHER" &&
        user.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      taskType?: unknown;
      topic?: unknown;
      randomTopic?: unknown;
      language?: unknown;
    };
    const taskType: WritingTaskType =
      body.taskType === "task_1" ? "task_1" : "task_2";
    const language = normalizeWritingLanguage(body.language);
    const outputLanguage = getWritingAiLanguageName(language);
    const topic = String(body.topic || "")
      .replace(/[\r\n<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    const randomTopic = body.randomTopic === true || !topic;
    const fallback =
      taskType === "task_1"
        ? fallbackTaskOne(topic, language)
        : fallbackTaskTwo(topic, language);

    if (!(await ollamaService.healthCheck())) {
      return NextResponse.json({
        ...fallback,
        language,
        fallback: true,
      });
    }

    try {
      const taskInstruction =
        taskType === "task_1"
          ? `Create a realistic IELTS Academic Writing Task 1 practice question with self-contained statistical data.
Return a chart object using:
- chartType: "bar", "line", or "table"
- title and unit
- 2-6 categories, and categories must be different years such as "2022" and "2023"
- 2-3 distinct comparable series, each with exactly one finite numeric value per category
- source identifying the values as AI-generated practice data, translated into the output language
The chart must compare the same series across at least two different years. Never return a single-year or single-series chart.
The prompt must accurately describe the generated chart without revealing an analysis or answer. Use plausible values and make comparisons meaningful.`
          : `Create one realistic Writing Task 2 question. It must require a clear position, discussion, causes/solutions, or advantages/disadvantages. Return chart as null.`;
      const topicInstruction = randomTopic
        ? "Choose a varied, realistic topic suitable for language writing practice."
        : `Use this requested topic: ${topic}`;

      const raw = await ollamaService.chat(
        [
          {
            role: "system",
            content: `You create language Writing practice tasks. Return only valid JSON with fields "topic", "prompt", and "chart". Write the topic, task prompt, chart title, categories, series names, unit labels, and source in ${outputLanguage}. Keep JSON property names in English.`,
          },
          {
            role: "user",
            content: `Task type: ${taskType}
${topicInstruction}
${taskInstruction}

Do not include markdown. Keep the prompt under 130 words.`,
          },
        ],
        { maxOutputTokens: 1100 },
      );
      const parsed = extractJson(raw);
      const prompt = String(parsed.prompt || "").trim().slice(0, 1800);
      const generatedTopic = String(parsed.topic || topic || "General")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);

      if (!prompt) throw new Error("AI returned an empty writing prompt.");
      if (
        taskType === "task_1" &&
        (!isChartMaterialData(parsed.chart) ||
          parsed.chart.series.length < 2 ||
          !hasAtLeastTwoYearCategories(parsed.chart))
      ) {
        throw new Error("AI returned invalid chart data.");
      }
      const chart =
        taskType === "task_1"
          ? normalizeChart(parsed.chart as ChartMaterialData)
          : null;

      return NextResponse.json({
        topic: generatedTopic,
        prompt,
        chart,
        language,
        fallback: false,
      });
    } catch (error) {
      console.error("Error generating writing prompt:", error);
      return NextResponse.json({
        ...fallback,
        language,
        fallback: true,
      });
    }
  } catch (error) {
    console.error("Error preparing writing prompt:", error);
    return NextResponse.json(
      { error: "Không thể tạo đề Writing lúc này." },
      { status: 500 },
    );
  }
}

function normalizeChart(data: ChartMaterialData): ChartMaterialData {
  return {
    chartType: data.chartType,
    title: String(data.title).trim(),
    unit: String(data.unit).trim(),
    categories: data.categories.map((item) => String(item).trim()),
    series: data.series.map((series) => ({
      name: String(series.name).trim(),
      values: series.values.map((value) => Number(value)),
    })),
    source: String(data.source || "AI-generated practice data").trim(),
  };
}
