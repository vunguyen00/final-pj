import { requireRole } from "@/lib/auth";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";
import { getSpeakingLanguageFromExamSetting } from "@/lib/speaking-languages";
import SpeakingAiClient from "./SpeakingAiClient";

export default async function SpeakingAiPage() {
  const [user, setting] = await Promise.all([
    requireRole("STUDENT", "TEACHER", "ADMIN"),
    getSpeakingAiSetting(),
  ]);

  return (
    <SpeakingAiClient
      initialConfig={{
        userRole: user.role,
        speakingLanguage: getSpeakingLanguageFromExamSetting(setting.examType),
        durationSeconds: setting.durationSeconds,
      }}
    />
  );
}
