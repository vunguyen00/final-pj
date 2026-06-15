import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ollamaService, speakingService } from "@/lib/ai";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";
import {
  getSpeakingLanguageFromExamSetting,
  normalizeSpeakingLanguage,
  normalizeSpeakingTask,
  type SpeakingLanguage,
  type SpeakingTask,
} from "@/lib/speaking-languages";

const DEFAULT_TOPICS: Record<SpeakingLanguage, string> = {
  ENGLISH: "Daily life",
  CHINESE: "学习与生活",
  JAPANESE: "日常生活",
  KOREAN: "일상생활",
};

function fallbackPrompt(
  language: SpeakingLanguage,
  task: SpeakingTask,
  topic: string,
) {
  const selectedTopic = topic || DEFAULT_TOPICS[language];

  const prompts: Record<
    SpeakingLanguage,
    Record<SpeakingTask, string>
  > = {
    ENGLISH: {
      1: `Topic: ${selectedTopic}\n1. How often do you think about this topic?\n2. What do you like most about it?\n3. Was it important to you when you were younger?\n4. Will it become more important in the future?`,
      2: `Describe an experience related to ${selectedTopic}.\n\nYou should say:\n- when and where it happened\n- who was involved\n- what happened\n- and explain why it was memorable.`,
      3: `Topic: ${selectedTopic}\n1. Why is this topic important today?\n2. How has it changed compared with the past?\n3. What benefits and problems can it create?\n4. How may it develop in the future?`,
    },
    CHINESE: {
      1: `主题：${selectedTopic}\n1. 你平时什么时候会接触这个主题？\n2. 你最喜欢哪一个方面？\n3. 这个主题对你重要吗？\n4. 请举一个具体的例子。`,
      2: `请用中文谈一谈“${selectedTopic}”。请描述一次相关的经历，说明事情发生的时间、地点、过程，以及这次经历对你的影响。`,
      3: `主题：${selectedTopic}\n1. 这个主题为什么对现代社会很重要？\n2. 过去和现在有什么不同？\n3. 它带来哪些好处或问题？\n4. 未来可能会发生什么变化？`,
    },
    JAPANESE: {
      1: `テーマ：${selectedTopic}\n1. このテーマにどのくらい関心がありますか。\n2. 一番好きな点は何ですか。\n3. あなたの生活にどんな関係がありますか。\n4. 具体的な例を一つ話してください。`,
      2: `「${selectedTopic}」に関する経験について話してください。いつ、どこで、誰と、何が起きたか、そしてなぜ印象に残っているかを説明してください。`,
      3: `テーマ：${selectedTopic}\n1. なぜ現代社会で重要ですか。\n2. 昔と今では何が違いますか。\n3. どんな利点と問題がありますか。\n4. 将来どのように変わると思いますか。`,
    },
    KOREAN: {
      1: `주제: ${selectedTopic}\n1. 이 주제에 얼마나 관심이 있습니까?\n2. 가장 좋아하는 점은 무엇입니까?\n3. 일상생활과 어떤 관련이 있습니까?\n4. 구체적인 예를 하나 말해 보세요.`,
      2: `${selectedTopic}와 관련된 경험을 말해 보세요. 언제, 어디서, 누구와 있었는지, 무슨 일이 있었는지, 왜 기억에 남는지 설명하세요.`,
      3: `주제: ${selectedTopic}\n1. 현대 사회에서 왜 중요합니까?\n2. 과거와 현재는 어떻게 다릅니까?\n3. 어떤 장점과 문제가 있습니까?\n4. 미래에는 어떻게 변할 것 같습니까?`,
    },
  };

  return prompts[language][task];
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
      language?: unknown;
      task?: unknown;
      part?: unknown;
      topic?: unknown;
      randomTopic?: unknown;
    };
    const setting = await getSpeakingAiSetting();
    const language = normalizeSpeakingLanguage(
      body.language,
      getSpeakingLanguageFromExamSetting(setting.examType),
    );
    const task = normalizeSpeakingTask(language, body.task ?? body.part);
    const topic = String(body.topic || "")
      .replace(/[\r\n<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const randomTopic = body.randomTopic === true || !topic;

    const healthy = await ollamaService.healthCheck();
    if (!healthy) {
      return NextResponse.json({
        language,
        task,
        topic: topic || DEFAULT_TOPICS[language],
        prompt: fallbackPrompt(language, task, topic),
        fallback: true,
      });
    }

    try {
      const generated = await speakingService.generatePracticePrompt({
        language,
        task,
        topic,
        randomTopic,
      });
      return NextResponse.json({
        language,
        task,
        ...generated,
        fallback: false,
      });
    } catch (error) {
      console.error("Error generating speaking topic:", error);
      return NextResponse.json({
        language,
        task,
        topic: topic || DEFAULT_TOPICS[language],
        prompt: fallbackPrompt(language, task, topic),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("Error preparing speaking topic:", error);
    return NextResponse.json(
      { error: "Không thể tạo đề Speaking lúc này." },
      { status: 500 },
    );
  }
}
