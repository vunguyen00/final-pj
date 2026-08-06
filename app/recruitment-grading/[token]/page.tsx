import { notFound } from "next/navigation";
import { getExamSkillLabels } from "@/lib/teacher-exam-skills";
import { getRecruitmentRoundForGrading, parseRoundLocations } from "@/lib/teacher-recruitment-rounds";
import RecruitmentGradingClient, { type GradingRoundData } from "./RecruitmentGradingClient";

export default async function RecruitmentGradingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const round = await getRecruitmentRoundForGrading(token);
  if (!round) notFound();
  const initialRound: GradingRoundData = {
    id: round.id,
    name: round.name,
    status: round.status,
    examStartsAt: round.examStartsAt.toISOString(),
    examEndsAt: round.examEndsAt.toISOString(),
    locations: parseRoundLocations(round.locations),
    applications: round.applications.map((application) => ({
      id: application.id,
      status: application.status,
      user: application.user,
      language: application.language,
      examLocationName: application.examLocationName,
      examLocationAddress: application.examLocationAddress,
      certificates: application.certificates,
      skillLabels: getExamSkillLabels(application.language.code),
      examResult: application.examResult ? {
        checkedIn: application.examResult.checkedIn,
        completed: application.examResult.completed,
        writingScore: application.examResult.writingScore,
        speakingScore: application.examResult.speakingScore,
        listeningScore: application.examResult.listeningScore,
        readingScore: application.examResult.readingScore,
        failed: application.examResult.failed,
        submittedAt: application.examResult.submittedAt?.toISOString() ?? null,
      } : null,
    })),
  };
  return <RecruitmentGradingClient token={token} initialRound={initialRound} />;
}
