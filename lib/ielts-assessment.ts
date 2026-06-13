import {
  getIeltsCriteriaScores,
  IeltsCriterionFeedback,
  IeltsSpeakingEvaluation,
  IeltsWritingCriterionFeedback,
  IeltsWritingEvaluation,
} from "@/lib/ielts-rubric";

function uniqueStrings(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function collectCriterionField(
  criteria: Array<IeltsCriterionFeedback | IeltsWritingCriterionFeedback>,
  field: "strengths" | "weaknesses" | "improvement_suggestions",
) {
  return uniqueStrings(criteria.flatMap((criterion) => criterion[field]));
}

export function buildWritingAssessmentPayload(
  evaluation: IeltsWritingEvaluation,
) {
  const criteria = Object.values(evaluation.criteria);
  const strengths = collectCriterionField(criteria, "strengths");
  const weaknesses = collectCriterionField(criteria, "weaknesses");
  const suggestions = collectCriterionField(
    criteria,
    "improvement_suggestions",
  );
  const corrections = criteria.flatMap((criterion) => {
    const count = Math.max(
      criterion.examples_from_answer.length,
      criterion.corrected_examples.length,
    );
    return Array.from({ length: count }, (_, index) => ({
      original: criterion.examples_from_answer[index] || "",
      improved: criterion.corrected_examples[index] || "",
      reason: criterion.detailed_feedback,
    })).filter((item) => item.original || item.improved);
  });
  const firstCriterion = evaluation.criteria.task_achievement_or_response;

  return {
    criteria: {
      schemaVersion: 2,
      scores: getIeltsCriteriaScores(evaluation),
      detailed: evaluation.criteria,
    },
    feedback: {
      schemaVersion: 2,
      ielts: evaluation,
      evaluation: {
        scores: {
          task_response: firstCriterion.score,
          coherence: evaluation.criteria.coherence_and_cohesion.score,
          vocabulary: evaluation.criteria.lexical_resource.score,
          grammar:
            evaluation.criteria.grammatical_range_and_accuracy.score,
          overall: evaluation.overall_band,
        },
        summary: evaluation.final_feedback,
        language: "English",
        band: {
          system: "IELTS",
          level: evaluation.overall_band.toFixed(1),
          score: evaluation.overall_band,
          rationale: evaluation.estimated_examiner_comment,
        },
        taskRelevance: Math.round((firstCriterion.score / 9) * 100),
        onTopic: firstCriterion.score >= 4,
        offTopicReason:
          firstCriterion.score >= 4
            ? ""
            : firstCriterion.detailed_feedback,
        detailedComment: evaluation.final_feedback,
      },
      analysis: {
        strengths,
        weaknesses,
        feedback: criteria.map((criterion) => criterion.detailed_feedback),
        suggestions,
      },
      improvements: {
        corrections,
        improved_version: evaluation.model_answer,
        sample_answer: evaluation.model_answer,
      },
    },
    mistakes: {
      examples: uniqueStrings(
        criteria.flatMap((criterion) => criterion.examples_from_answer),
      ),
      correctedExamples: uniqueStrings(
        criteria.flatMap((criterion) => criterion.corrected_examples),
      ),
    },
    improvements: {
      priorityToImprove: evaluation.priority_to_improve,
      suggestions,
      modelAnswer: evaluation.model_answer,
    },
  };
}

export function buildSpeakingAssessmentPayload(
  evaluation: IeltsSpeakingEvaluation,
) {
  const criteria = Object.values(evaluation.criteria);
  const strengths = collectCriterionField(criteria, "strengths");
  const weaknesses = collectCriterionField(criteria, "weaknesses");
  const suggestions = collectCriterionField(
    criteria,
    "improvement_suggestions",
  );

  return {
    criteria: {
      schemaVersion: 2,
      scores: getIeltsCriteriaScores(evaluation),
      detailed: evaluation.criteria,
    },
    feedback: {
      schemaVersion: 2,
      ielts: evaluation,
      evaluation: {
        scores: getIeltsCriteriaScores(evaluation),
        overall: evaluation.overall_band,
        normalizedOverall: (evaluation.overall_band / 9) * 10,
        language: "English",
        exam: "IELTS",
        scoreScale: "BAND_0_9",
        band: {
          system: "IELTS",
          level: evaluation.overall_band.toFixed(1),
          score: evaluation.overall_band,
          rationale: evaluation.estimated_examiner_comment,
        },
        summary: evaluation.final_feedback,
        detailedComment: evaluation.final_feedback,
      },
      analysis: {
        strengths,
        weaknesses,
        feedback: criteria.map((criterion) => criterion.detailed_feedback),
        suggestions,
      },
      mistakes: {
        pronunciation:
          evaluation.criteria.pronunciation.pronunciation_errors,
        grammar:
          evaluation.criteria.grammatical_range_and_accuracy.weaknesses,
        vocabulary: evaluation.criteria.lexical_resource.weaknesses,
        fluency: evaluation.criteria.fluency_and_coherence.weaknesses,
      },
      improvements: {
        practiceMethods: suggestions,
      },
    },
    mistakes: {
      pronunciation: evaluation.criteria.pronunciation.pronunciation_errors,
      grammar: evaluation.criteria.grammatical_range_and_accuracy.weaknesses,
      vocabulary: evaluation.criteria.lexical_resource.weaknesses,
      fluency: evaluation.criteria.fluency_and_coherence.weaknesses,
    },
    improvements: {
      priorityToImprove: evaluation.priority_to_improve,
      suggestions,
    },
  };
}

