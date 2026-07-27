import { requireRole } from "@/lib/auth";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";
import { getSpeakingLanguageFromExamSetting } from "@/lib/speaking-languages";
import { getAiPointsSummary } from "@/lib/ai-points";
import SpeakingAiClient from "./SpeakingAiClient";

export default async function SpeakingAiPage() {
  const [user, setting] = await Promise.all([
    requireRole("STUDENT", "TEACHER", "ADMIN"),
    getSpeakingAiSetting(),
  ]);
  const aiPointBalance = user.role === "ADMIN" ? 0 : (await getAiPointsSummary(user.id)).available;

  return (
    <SpeakingAiClient
      initialConfig={{
        userRole: user.role,
        aiPointBalance,
        speakingLanguage: getSpeakingLanguageFromExamSetting(setting.examType),
        durationSeconds: setting.durationSeconds,
      }}
    />
  );
}
