import type { FormRepAnalysis } from "@/lib/form-analysis";
import {
  isDipExerciseId,
  isOverheadPressExerciseId,
  type FormCheckExercise,
} from "@/lib/form-check-exercises";

export type SetFeedback = {
  score: number;
  rating: "Strong" | "Good" | "Needs work";
  good: Array<{ area: string; detail: string }>;
  fixTitle: string;
  fixDetail: string;
  nextCue: string;
  reviewAtSeconds: number | null;
};

type ReviewMomentProps = {
  activeReviewTimestamp: number | null;
  onReviewMoment: (timestampSeconds: number) => void;
};

type FormCoachingReviewProps = ReviewMomentProps & {
  feedback: SetFeedback;
};

export function FormCoachingReview({
  feedback,
  activeReviewTimestamp,
  onReviewMoment,
}: FormCoachingReviewProps) {
  return (
    <aside className="coaching-review" aria-labelledby="coach-review-heading">
      <div className="result-score-block">
        <p>Score</p>
        <strong>
          {feedback.score}
          <small>/100</small>
        </strong>
        <span>{feedback.rating}</span>
      </div>

      <section className="result-feedback-card result-fix-card">
        <div className="result-card-label-row">
          <p className="block-label">Fix first</p>
          {feedback.reviewAtSeconds !== null ? (
            <button
              type="button"
              data-active={timestampMatches(
                activeReviewTimestamp,
                feedback.reviewAtSeconds,
              )}
              onClick={() => onReviewMoment(feedback.reviewAtSeconds ?? 0)}
              aria-label={`Review correction at ${formatVideoTimestamp(feedback.reviewAtSeconds)}`}
            >
              {formatVideoTimestamp(feedback.reviewAtSeconds)} · Review
            </button>
          ) : null}
        </div>
        <h2>{feedback.fixTitle}</h2>
        <p>{feedback.fixDetail}</p>
      </section>

      <section className="result-feedback-card result-good-card">
        <p className="block-label">Good</p>
        <h2 id="coach-review-heading">What held up.</h2>
        {feedback.good.length ? (
          <ul>
            {feedback.good.map((item) => (
              <li key={item.area}>
                <strong>{item.area}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="result-empty-copy">
            No pattern held consistently across every completed rep.
          </p>
        )}
      </section>

      <section className="result-feedback-card result-next-card">
        <p className="block-label">Next rep</p>
        <h2>{feedback.nextCue}</h2>
      </section>
    </aside>
  );
}

type RepBreakdownProps = ReviewMomentProps & {
  repetitions: FormRepAnalysis[];
  exercise: FormCheckExercise;
};

export function RepBreakdown({
  repetitions,
  exercise,
  activeReviewTimestamp,
  onReviewMoment,
}: RepBreakdownProps) {
  return (
    <section className="result-rep-breakdown" aria-labelledby="rep-breakdown-heading">
      <div className="result-rep-breakdown-heading">
        <p className="block-label">Rep breakdown</p>
        <h3 id="rep-breakdown-heading">Review each rep.</h3>
      </div>
      <div className="rep-list">
        {repetitions.map((repetition) => (
          <article key={repetition.repetition} className="rep-card">
            <div className="rep-card-header">
              <div>
                <p>Rep {repetition.repetition}</p>
                <span className="status-chip" data-rating={repetition.rating}>
                  {repetition.rating}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  className="timestamp-button"
                  data-active={timestampMatches(
                    activeReviewTimestamp,
                    repetition.reviewAtSeconds,
                  )}
                  onClick={() => onReviewMoment(repetition.reviewAtSeconds)}
                  aria-label={`Review repetition ${repetition.repetition} at ${formatVideoTimestamp(repetition.reviewAtSeconds)}`}
                >
                  {formatVideoTimestamp(repetition.reviewAtSeconds)}
                </button>
                <strong>{repetition.score}/100</strong>
              </div>
            </div>
            <div className="rep-metric-grid">
              {exercise.family === "row" ||
              exercise.family === "vertical-pull" ? (
                <>
                  <RepMetric
                    label="Elbow range"
                    value={`${Math.round(repetition.minimumElbowAngle ?? 0)}°`}
                  />
                  <RepMetric
                    label="Torso drift"
                    value={`${Math.round(repetition.torsoLeanRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "arm-isolation" ? (
                <>
                  <RepMetric
                    label="Elbow range"
                    value={`${Math.round(repetition.minimumElbowAngle ?? 0)}° - ${Math.round(repetition.maximumElbowAngle ?? 0)}°`}
                  />
                  <RepMetric
                    label="Upper-arm drift"
                    value={`${Math.round(repetition.shoulderAngleRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "knee-isolation" ? (
                <>
                  <RepMetric
                    label="Knee range"
                    value={`${Math.round(repetition.minimumKneeAngle)}° - ${Math.round(repetition.maximumKneeAngle ?? 0)}°`}
                  />
                  <RepMetric
                    label="Thigh drift"
                    value={`${Math.round(repetition.hipAngleRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "core-flexion" ? (
                <>
                  <RepMetric
                    label="Hip range"
                    value={`${Math.round(repetition.minimumHipAngle)}° - ${Math.round(repetition.maximumHipAngle ?? 0)}°`}
                  />
                  <RepMetric
                    label="Body drift"
                    value={`${Math.round(repetition.bodyPositionRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "calf-isolation" ? (
                <>
                  <RepMetric
                    label="Ankle range"
                    value={`${Math.round(repetition.minimumAnkleAngle ?? 0)}° - ${Math.round(repetition.maximumAnkleAngle ?? 0)}°`}
                  />
                  <RepMetric
                    label="Knee drift"
                    value={`${Math.round(repetition.bodyPositionRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "shoulder-isolation" ||
                exercise.family === "straight-arm-pull" ? (
                <>
                  <RepMetric
                    label="Shoulder range"
                    value={`${Math.round(repetition.minimumShoulderAngle ?? 0)}° - ${Math.round((repetition.minimumShoulderAngle ?? 0) + (repetition.shoulderAngleRange ?? 0))}°`}
                  />
                  <RepMetric
                    label="Elbow drift"
                    value={`${Math.round(repetition.bodyPositionRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "chest-isolation" ||
                exercise.family === "rear-shoulder-isolation" ? (
                <>
                  <RepMetric
                    label="Hand spacing"
                    value={`${Math.round(repetition.minimumWristSeparation ?? 0)}% - ${Math.round(repetition.maximumWristSeparation ?? 0)}%`}
                  />
                  <RepMetric
                    label="Elbow drift"
                    value={`${Math.round(repetition.bodyPositionRange ?? 0)}°`}
                  />
                </>
              ) : exercise.family === "hip-machine" ? (
                <>
                  <RepMetric
                    label="Knee spacing"
                    value={`${Math.round(repetition.minimumKneeSeparation ?? 0)}% - ${Math.round(repetition.maximumKneeSeparation ?? 0)}%`}
                  />
                  <RepMetric
                    label="Left / right"
                    value={`${Math.round(repetition.maximumKneeAsymmetry ?? 0)}% difference`}
                  />
                </>
              ) : exercise.family === "press" ? (
                <>
                  <RepMetric
                    label="Elbow range"
                    value={`${Math.round(repetition.minimumElbowAngle ?? 0)}°`}
                  />
                  <RepMetric
                    label={
                      isDipExerciseId(exercise.id)
                        ? "Torso drift"
                        : isOverheadPressExerciseId(exercise.id)
                          ? "Torso"
                          : "Wrist offset"
                    }
                    value={
                      isDipExerciseId(exercise.id)
                        ? `${Math.round(repetition.torsoLeanRange ?? 0)}°`
                        : isOverheadPressExerciseId(exercise.id)
                          ? `${Math.round(repetition.maximumTorsoLean)}°`
                          : `${Math.round(repetition.wristOffsetAtBottom ?? 0)}%`
                    }
                  />
                </>
              ) : (
                <>
                  <RepMetric
                    label={exercise.family === "hinge" ? "Hip range" : "Depth"}
                    value={`${Math.round(
                      exercise.family === "hinge"
                        ? repetition.minimumHipAngle
                        : repetition.minimumKneeAngle,
                    )}°`}
                  />
                  <RepMetric
                    label={exercise.family === "hinge" ? "Knee" : "Torso"}
                    value={`${Math.round(
                      exercise.family === "hinge"
                        ? repetition.minimumKneeAngle
                        : repetition.maximumTorsoLean,
                    )}°`}
                  />
                </>
              )}
              <RepMetric
                label="Tempo"
                value={`${repetition.durationSeconds.toFixed(1)}s`}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function timestampMatches(first: number | null, second: number) {
  return first !== null && Math.abs(first - second) < 0.05;
}

export function formatVideoTimestamp(timestampSeconds: number) {
  const minutes = Math.floor(timestampSeconds / 60);
  const seconds = Math.max(0, timestampSeconds - minutes * 60);
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function RepMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#ffffff]/[0.045] px-3 py-2">
      <p className="grt-type-label uppercase text-[#ffffff]/35">{label}</p>
      <p className="grt-type-numeric grt-metric-value mt-0.5 text-[#ffffff]/80">
        {value}
      </p>
    </div>
  );
}
