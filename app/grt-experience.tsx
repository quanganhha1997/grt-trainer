"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { sitePath } from "@/lib/site-path";

const SESSION_PROFILE_KEY = "grt.session.profile.v1";
const ONBOARDING_STEPS = 6;

const goals = [
  { id: "muscle", label: "Build muscle" },
  { id: "strength", label: "Get stronger" },
  { id: "fat-loss", label: "Lose fat" },
  { id: "endurance", label: "Build endurance" },
  { id: "mobility", label: "Move better" },
  { id: "athletic", label: "Improve performance" },
] as const;

const experienceOptions = [
  { id: "beginner", label: "Beginner", detail: "Less than 6 months" },
  { id: "intermediate", label: "Intermediate", detail: "6 months to 2 years" },
  { id: "advanced", label: "Advanced", detail: "2+ years" },
] as const;

type UnitSystem = "metric" | "imperial";
type StepDirection = "forward" | "back";

type SessionProfile = {
  age: string;
  height: string;
  weight: string;
  unit: UnitSystem;
  goals: string[];
  experience: string;
};

const defaultProfile: SessionProfile = {
  age: "25",
  height: "175",
  weight: "70",
  unit: "metric",
  goals: [],
  experience: "",
};

function isSessionProfile(value: unknown): value is SessionProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<SessionProfile>;
  return (
    typeof profile.age === "string" &&
    typeof profile.height === "string" &&
    typeof profile.weight === "string" &&
    (profile.unit === "metric" || profile.unit === "imperial") &&
    Array.isArray(profile.goals) &&
    profile.goals.every((goal) => typeof goal === "string") &&
    typeof profile.experience === "string"
  );
}

export function GrtExperience() {
  const [mode, setMode] = useState<"loading" | "onboarding" | "home">(
    "loading",
  );
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<StepDirection>("forward");
  const [profile, setProfile] = useState<SessionProfile>(defaultProfile);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.sessionStorage.getItem(SESSION_PROFILE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isSessionProfile(parsed)) {
            setProfile(parsed);
            setMode("home");
            return;
          }
        }
      } catch {
        // The experience still works if session storage is unavailable.
      }
      setMode("onboarding");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function updateProfile(changes: Partial<SessionProfile>) {
    setProfile((current) => ({ ...current, ...changes }));
    setError("");
  }

  function changeUnits(nextUnit: UnitSystem) {
    if (nextUnit === profile.unit) return;
    const height = Number(profile.height);
    const weight = Number(profile.weight);

    updateProfile({
      unit: nextUnit,
      height: Number.isFinite(height)
        ? String(
            nextUnit === "imperial"
              ? Math.round(height / 2.54)
              : Math.round(height * 2.54),
          )
        : "",
      weight: Number.isFinite(weight)
        ? String(
            nextUnit === "imperial"
              ? Math.round(weight * 2.20462)
              : Math.round(weight / 2.20462),
          )
        : "",
    });
  }

  function validateStep() {
    if (step === 1) {
      const age = Number(profile.age);
      if (!Number.isFinite(age) || age < 13 || age > 100) {
        setError("Enter an age between 13 and 100.");
        return false;
      }
    }

    if (step === 2) {
      const height = Number(profile.height);
      const weight = Number(profile.weight);
      const validHeight =
        profile.unit === "metric"
          ? height >= 100 && height <= 250
          : height >= 39 && height <= 98;
      const validWeight =
        profile.unit === "metric"
          ? weight >= 30 && weight <= 300
          : weight >= 66 && weight <= 660;
      if (!validHeight || !validWeight) {
        setError("Check your height and weight.");
        return false;
      }
    }

    if (step === 3 && profile.goals.length === 0) {
      setError("Choose at least one goal.");
      return false;
    }

    if (step === 4 && !profile.experience) {
      setError("Choose your experience level.");
      return false;
    }

    return true;
  }

  function continueOnboarding() {
    if (!validateStep()) return;
    if (step === ONBOARDING_STEPS - 1) {
      finishOnboarding(profile);
      return;
    }
    setDirection("forward");
    setStep((current) => Math.min(current + 1, ONBOARDING_STEPS - 1));
    setError("");
  }

  function finishOnboarding(sessionProfile: SessionProfile) {
    try {
      window.sessionStorage.setItem(
        SESSION_PROFILE_KEY,
        JSON.stringify(sessionProfile),
      );
    } catch {
      // The experience still works without storage and resets on refresh.
    }
    setProfile(sessionProfile);
    setMode("home");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function resetSession() {
    try {
      window.sessionStorage.removeItem(SESSION_PROFILE_KEY);
    } catch {
      // No additional reset is needed when storage is unavailable.
    }
    setProfile(defaultProfile);
    setStep(0);
    setDirection("back");
    setMode("onboarding");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (mode === "loading") {
    return (
      <main className="grt-boot" aria-label="Loading Grt">
        <span>Grt</span>
      </main>
    );
  }

  if (mode === "onboarding") {
    return (
      <Onboarding
        step={step}
        direction={direction}
        profile={profile}
        error={error}
        onUpdate={updateProfile}
        onChangeUnits={changeUnits}
        onBack={() => {
          setDirection("back");
          setStep((current) => Math.max(0, current - 1));
          setError("");
        }}
        onContinue={continueOnboarding}
      />
    );
  }

  return <PersonalizedHome profile={profile} onReset={resetSession} />;
}

function Onboarding({
  step,
  direction,
  profile,
  error,
  onUpdate,
  onChangeUnits,
  onBack,
  onContinue,
}: {
  step: number;
  direction: StepDirection;
  profile: SessionProfile;
  error: string;
  onUpdate: (changes: Partial<SessionProfile>) => void;
  onChangeUnits: (unit: UnitSystem) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const questionStep = Math.max(1, step);
  const questionTotal = ONBOARDING_STEPS - 1;
  const progress = questionStep / questionTotal;

  if (step === 0) {
    return (
      <main className="onboarding-shell onboarding-intro-shell">
        <section className="onboarding-intro-block grt-motion-panel">
          <div>
            <p className="intro-wordmark">Grt</p>
            <h1>Train better.</h1>
            <p>Built for progress.</p>
          </div>
          <button
            type="button"
            className="grt-primary-inverse grt-pressable"
            onClick={onContinue}
          >
            Start <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-frame">
        <div
          className="onboarding-progress"
          aria-label={`Step ${questionStep} of ${questionTotal}`}
        >
          <span>
            {String(questionStep).padStart(2, "0")} / {String(questionTotal).padStart(2, "0")}
          </span>
          <div aria-hidden="true">
            <i style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>

        <div
          key={step}
          className="onboarding-stage grt-question-motion"
          data-direction={direction}
          aria-live="polite"
        >
          {step === 1 ? (
            <div className="question-stage">
              <p className="question-kicker">Your age</p>
              <h1>How old are you?</h1>
              <label className="large-number-field">
                <span className="sr-only">Age in years</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="13"
                  max="100"
                  value={profile.age}
                  onChange={(event) => onUpdate({ age: event.target.value })}
                  autoFocus
                />
                <small>Years</small>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="question-stage question-stage-wide">
              <p className="question-kicker">Your baseline</p>
              <h1>Height and weight.</h1>
              <div className="unit-switch" aria-label="Measurement units">
                <button type="button" data-active={profile.unit === "metric"} onClick={() => onChangeUnits("metric")}>Metric</button>
                <button type="button" data-active={profile.unit === "imperial"} onClick={() => onChangeUnits("imperial")}>Imperial</button>
              </div>
              <div className="paired-number-fields">
                <label>
                  <span>Height</span>
                  <span className="number-input-line">
                    <input type="number" inputMode="decimal" value={profile.height} onChange={(event) => onUpdate({ height: event.target.value })} />
                    <small>{profile.unit === "metric" ? "cm" : "in"}</small>
                  </span>
                </label>
                <label>
                  <span>Weight</span>
                  <span className="number-input-line">
                    <input type="number" inputMode="decimal" value={profile.weight} onChange={(event) => onUpdate({ weight: event.target.value })} />
                    <small>{profile.unit === "metric" ? "kg" : "lb"}</small>
                  </span>
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="question-stage question-stage-wide">
              <p className="question-kicker">Your direction</p>
              <h1>What’s your goal?</h1>
              <p>Choose all that apply.</p>
              <div className="goal-grid">
                {goals.map((goal, index) => {
                  const selected = profile.goals.includes(goal.id);
                  return (
                    <button key={goal.id} type="button" data-selected={selected} aria-pressed={selected} onClick={() => onUpdate({ goals: selected ? profile.goals.filter((item) => item !== goal.id) : [...profile.goals, goal.id] })}>
                      <span className="goal-index">{String(index + 1).padStart(2, "0")}</span>
                      <span>{goal.label}</span>
                      <span className="goal-selected" aria-hidden="true">{selected ? <Check className="size-4" /> : <ArrowRight className="size-4" />}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="question-stage question-stage-wide">
              <p className="question-kicker">Your experience</p>
              <h1>How long have you trained?</h1>
              <div className="experience-list" role="radiogroup" aria-label="Training experience">
                {experienceOptions.map((option, index) => {
                  const selected = profile.experience === option.id;
                  return (
                    <button key={option.id} type="button" role="radio" aria-checked={selected} data-selected={selected} onClick={() => onUpdate({ experience: option.id })}>
                      <span className="goal-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="experience-copy">
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                      <span className="radio-mark" aria-hidden="true">{selected ? <Check className="size-4" /> : null}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="question-stage question-stage-wide review-stage">
              <p className="question-kicker">Review</p>
              <h1>Ready to train.</h1>
              <dl className="profile-review">
                <ReviewRow label="Age" value={`${profile.age} years`} />
                <ReviewRow label="Height" value={`${profile.height} ${profile.unit === "metric" ? "cm" : "in"}`} />
                <ReviewRow label="Weight" value={`${profile.weight} ${profile.unit === "metric" ? "kg" : "lb"}`} />
                <ReviewRow label="Goals" value={profile.goals.map(goalLabel).join(", ")} />
                <ReviewRow label="Experience" value={experienceLabel(profile.experience)} />
              </dl>
            </div>
          ) : null}

          {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
        </div>

        <div className="onboarding-actions">
          <button type="button" className="onboarding-back grt-pressable" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Back
          </button>
          <button type="button" className="onboarding-next grt-pressable" onClick={onContinue}>
            {step === ONBOARDING_STEPS - 1 ? "Enter Grt" : "Next"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function PersonalizedHome({ profile, onReset }: { profile: SessionProfile; onReset: () => void }) {
  const recommendation = getRecommendation(profile);
  const weeklyDays = profile.experience === "advanced" ? "4–5" : profile.experience === "intermediate" ? "3–4" : "3";

  return (
    <main className="grt-app min-h-screen">
      <SiteHeader active="home" />
      <div className="grt-page-shell grt-page-entry">
        <header className="grt-page-heading">
          <p className="grt-overline">Home</p>
          <h1>Train with intent.</h1>
          <p>Workouts and form feedback.</p>
        </header>

        <section className="home-action-grid" aria-label="Training options">
          <a href={sitePath("/routines")} className="home-action-block grt-row grt-pressable">
            <span className="block-label">Today</span>
            <div><h2>{recommendation.title}</h2><p>{recommendation.duration} · {recommendation.level}</p></div>
            <strong>View workout <ArrowRight className="grt-row-arrow size-4" aria-hidden="true" /></strong>
          </a>
          <a href={sitePath("/routines")} className="home-action-block grt-row grt-pressable">
            <span className="block-label">Routine</span>
            <div><h2>{weeklyDays} days / week</h2><p>{recommendation.focus} focus</p></div>
            <strong>Browse routines <ArrowRight className="grt-row-arrow size-4" aria-hidden="true" /></strong>
          </a>
          <a href={sitePath("/form-check")} className="home-action-block grt-row grt-pressable">
            <span className="block-label">Form Check</span>
            <div><h2>Upload a set.</h2><p>Bodyweight squat</p></div>
            <strong>Check your form <ArrowRight className="grt-row-arrow size-4" aria-hidden="true" /></strong>
          </a>
        </section>

        <section className="home-metrics-grid" aria-label="Session recommendation">
          <HomeMetric label="Time" value={recommendation.duration} />
          <HomeMetric label="Level" value={recommendation.level} />
          <HomeMetric label="Focus" value={recommendation.focus} />
          <HomeMetric label="Equipment" value={recommendation.equipment} />
        </section>

        <section id="about" className="grt-about-grid" aria-labelledby="about-heading">
          <div><p className="block-label">About Grt</p><h2 id="about-heading">Built for progress.</h2></div>
          <p>Choose a routine. Train with purpose. Review one clear correction before the next set.</p>
          <ol><li><span>01</span>Choose</li><li><span>02</span>Train</li><li><span>03</span>Review</li></ol>
        </section>

        <footer className="grt-footer">
          <strong>Grt</strong>
          <button type="button" onClick={onReset}>Reset setup</button>
          <span>Train better.</span>
        </footer>
      </div>
    </main>
  );
}

function HomeMetric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function goalLabel(value: string) {
  return goals.find((goal) => goal.id === value)?.label ?? "General fitness";
}

function experienceLabel(value: string) {
  return experienceOptions.find((option) => option.id === value)?.label ?? "Beginner";
}

function getRecommendation(profile: SessionProfile) {
  const primaryGoal = profile.goals[0];
  const level = experienceLabel(profile.experience || "beginner");
  if (primaryGoal === "mobility") return { title: "Mobility Reset", duration: "28 min", focus: "Mobility", equipment: "None", level };
  if (primaryGoal === "fat-loss" || primaryGoal === "endurance") return { title: "Full Body Conditioning", duration: "36 min", focus: "Conditioning", equipment: "Optional", level };
  if (primaryGoal === "athletic") return { title: "Athletic Foundations", duration: "40 min", focus: "Performance", equipment: "Dumbbells", level };
  return { title: "Upper Body Strength", duration: "42 min", focus: "Strength", equipment: "Dumbbells", level };
}
