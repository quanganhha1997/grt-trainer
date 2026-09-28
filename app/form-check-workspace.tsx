"use client";

import type { NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Check,
  ChevronDown,
  Film,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
  Upload,
  Video,
} from "lucide-react";
import {
  ChangeEvent,
  type CSSProperties,
  DragEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  formatRecordingDuration,
  getRecordedVideoFileDetails,
  selectPreferredRecordingMimeType,
} from "@/lib/video-recording";
import type { FormAngleSummary, FormRepAnalysis } from "@/lib/form-analysis";
import {
  FORM_CHECK_EXERCISES,
  getFormCheckExercise,
  isDipExerciseId,
  isOverheadPressExerciseId,
  parseFormCheckExerciseId,
  type FormCheckExercise,
  type FormCheckExerciseId,
} from "@/lib/form-check-exercises";
import {
  calculateCalfRaiseAngles,
  calculateFlyAngles,
  calculateHipMachineAngles,
  calculateLateralRaiseAngles,
  calculatePressAngles,
  calculateSquatAngles,
  calculateUnilateralAngles,
  smoothCalfRaiseAngles,
  smoothFlyAngles,
  smoothHipMachineAngles,
  smoothPressAngles,
  smoothSquatAngles,
  type CalfRaiseAngles,
  type BodySide,
  type FlyAngles,
  type HipMachineAngles,
  type PressAngles,
  type SquatAngles,
} from "@/lib/pose-geometry";
import {
  evaluateScanQuality,
  formatScanQualityLevel,
  type ScanQualityResult,
} from "@/lib/scan-quality";
import {
  createSquatCoach,
  getLiveSquatCue,
  updateSquatCoach,
} from "@/lib/squat-coaching";
import {
  createSquatTracker,
  updateSquatTracker,
  type SquatPhase,
} from "@/lib/squat-repetition";
import {
  createHingeCoach,
  getLiveHingeCue,
  updateHingeCoach,
} from "@/lib/hinge-coaching";
import {
  createHingeTracker,
  getHingeThresholds,
  updateHingeTracker,
  type HingePhase,
} from "@/lib/hinge-repetition";
import {
  createUnilateralCoach,
  getLiveUnilateralCue,
  updateUnilateralCoach,
} from "@/lib/unilateral-coaching";
import {
  createUnilateralTracker,
  UNILATERAL_PHASE_THRESHOLDS,
  updateUnilateralTracker,
  type UnilateralPhase,
} from "@/lib/unilateral-repetition";
import {
  createPressCoach,
  getLivePressCue,
  updatePressCoach,
} from "@/lib/press-coaching";
import {
  createPressTracker,
  PRESS_PHASE_THRESHOLDS,
  updatePressTracker,
  type PressPhase,
} from "@/lib/press-repetition";
import {
  createRowCoach,
  getLiveRowCue,
  updateRowCoach,
  type RowExerciseId,
} from "@/lib/row-coaching";
import {
  createRowTracker,
  ROW_PHASE_THRESHOLDS,
  updateRowTracker,
  type RowPhase,
} from "@/lib/row-repetition";
import {
  createVerticalPullCoach,
  getLiveVerticalPullCue,
  updateVerticalPullCoach,
  type VerticalPullExerciseId,
} from "@/lib/vertical-pull-coaching";
import {
  createVerticalPullTracker,
  VERTICAL_PULL_PHASE_THRESHOLDS,
  updateVerticalPullTracker,
  type VerticalPullPhase,
} from "@/lib/vertical-pull-repetition";
import {
  createKneeIsolationCoach,
  getLiveKneeIsolationCue,
  updateKneeIsolationCoach,
} from "@/lib/knee-isolation-coaching";
import {
  createKneeIsolationTracker,
  KNEE_ISOLATION_PHASE_THRESHOLDS,
  updateKneeIsolationTracker,
  type KneeIsolationExerciseId,
  type KneeIsolationPhase,
} from "@/lib/knee-isolation-repetition";
import {
  createArmIsolationCoach,
  getLiveArmIsolationCue,
  updateArmIsolationCoach,
} from "@/lib/arm-isolation-coaching";
import {
  createArmIsolationTracker,
  ARM_ISOLATION_PHASE_THRESHOLDS,
  updateArmIsolationTracker,
  type ArmIsolationExerciseId,
  type ArmIsolationPhase,
} from "@/lib/arm-isolation-repetition";
import {
  createCoreFlexionCoach,
  getLiveCoreFlexionCue,
  updateCoreFlexionCoach,
} from "@/lib/core-flexion-coaching";
import {
  createCoreFlexionTracker,
  CORE_FLEXION_PHASE_THRESHOLDS,
  updateCoreFlexionTracker,
  type CoreFlexionExerciseId,
  type CoreFlexionPhase,
} from "@/lib/core-flexion-repetition";
import {
  createCalfIsolationCoach,
  getLiveCalfIsolationCue,
  updateCalfIsolationCoach,
} from "@/lib/calf-isolation-coaching";
import {
  createCalfIsolationTracker,
  CALF_ISOLATION_PHASE_THRESHOLDS,
  updateCalfIsolationTracker,
  type CalfIsolationExerciseId,
  type CalfIsolationPhase,
} from "@/lib/calf-isolation-repetition";
import {
  createShoulderIsolationCoach,
  getLiveShoulderIsolationCue,
  updateShoulderIsolationCoach,
} from "@/lib/shoulder-isolation-coaching";
import {
  createShoulderIsolationTracker,
  SHOULDER_ISOLATION_PHASE_THRESHOLDS,
  updateShoulderIsolationTracker,
  type ShoulderIsolationExerciseId,
  type ShoulderIsolationPhase,
} from "@/lib/shoulder-isolation-repetition";
import {
  createChestIsolationCoach,
  getLiveChestIsolationCue,
  updateChestIsolationCoach,
} from "@/lib/chest-isolation-coaching";
import {
  CHEST_ISOLATION_PHASE_THRESHOLDS,
  createChestIsolationTracker,
  updateChestIsolationTracker,
  type ChestIsolationPhase,
} from "@/lib/chest-isolation-repetition";
import {
  createRearShoulderIsolationCoach,
  getLiveRearShoulderIsolationCue,
  updateRearShoulderIsolationCoach,
} from "@/lib/rear-shoulder-isolation-coaching";
import {
  createRearShoulderIsolationTracker,
  REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS,
  updateRearShoulderIsolationTracker,
  type RearShoulderIsolationPhase,
} from "@/lib/rear-shoulder-isolation-repetition";
import {
  createStraightArmPullCoach,
  getLiveStraightArmPullCue,
  updateStraightArmPullCoach,
} from "@/lib/straight-arm-pull-coaching";
import {
  createStraightArmPullTracker,
  STRAIGHT_ARM_PULL_PHASE_THRESHOLDS,
  updateStraightArmPullTracker,
  type StraightArmPullPhase,
} from "@/lib/straight-arm-pull-repetition";
import {
  createHipMachineCoach,
  getLiveHipMachineCue,
  updateHipMachineCoach,
} from "@/lib/hip-machine-coaching";
import {
  createHipMachineTracker,
  HIP_MACHINE_PHASE_THRESHOLDS,
  updateHipMachineTracker,
  type HipMachineExerciseId,
  type HipMachinePhase,
} from "@/lib/hip-machine-repetition";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 30;
const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type AnalysisStatus = "idle" | "loading" | "scanning" | "complete";
type InputMode = "upload" | "record";
type CameraStatus = "idle" | "requesting" | "ready";
type FormFlowStage = "intro" | "instructions" | "workspace";
type PoseConnection = { start: number; end: number };
type MovementPhase =
  | SquatPhase
  | HingePhase
  | UnilateralPhase
  | PressPhase
  | RowPhase
  | VerticalPullPhase
  | KneeIsolationPhase
  | ArmIsolationPhase
  | CoreFlexionPhase
  | CalfIsolationPhase
  | ShoulderIsolationPhase
  | ChestIsolationPhase
  | RearShoulderIsolationPhase
  | StraightArmPullPhase
  | HipMachinePhase;
type MovementAngles =
  | SquatAngles
  | PressAngles
  | CalfRaiseAngles
  | FlyAngles
  | HipMachineAngles;

function isFlyAngles(angles: MovementAngles): angles is FlyAngles {
  return "wristSeparation" in angles;
}

function isHipMachineAngles(
  angles: MovementAngles,
): angles is HipMachineAngles {
  return "kneeSeparation" in angles;
}

function isArmAngles(angles: MovementAngles): angles is PressAngles {
  return "elbow" in angles;
}

function isCalfRaiseAngles(angles: MovementAngles): angles is CalfRaiseAngles {
  return "ankle" in angles;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FormCheckWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const poseConnectionsRef = useRef<PoseConnection[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const scanLoopRef = useRef<(() => void) | null>(null);
  const lastDetectionAtRef = useRef(0);
  const attemptedFramesRef = useRef(0);
  const detectedFramesRef = useRef(0);
  const maxVisibleLandmarksRef = useRef(0);
  const smoothedAnglesRef = useRef<SquatAngles | null>(null);
  const smoothedPressAnglesRef = useRef<PressAngles | null>(null);
  const smoothedRowAnglesRef = useRef<PressAngles | null>(null);
  const smoothedVerticalPullAnglesRef = useRef<PressAngles | null>(null);
  const smoothedKneeIsolationAnglesRef = useRef<SquatAngles | null>(null);
  const smoothedArmIsolationAnglesRef = useRef<PressAngles | null>(null);
  const smoothedCoreFlexionAnglesRef = useRef<SquatAngles | null>(null);
  const smoothedCalfIsolationAnglesRef = useRef<CalfRaiseAngles | null>(null);
  const smoothedShoulderIsolationAnglesRef = useRef<PressAngles | null>(null);
  const shoulderIsolationSideRef = useRef<BodySide | null>(null);
  const smoothedStraightArmPullAnglesRef = useRef<PressAngles | null>(null);
  const straightArmPullSideRef = useRef<BodySide | null>(null);
  const smoothedChestIsolationAnglesRef = useRef<FlyAngles | null>(null);
  const smoothedRearShoulderIsolationAnglesRef = useRef<FlyAngles | null>(null);
  const smoothedHipMachineAnglesRef = useRef<HipMachineAngles | null>(null);
  const angleSamplesRef = useRef(0);
  const confidenceTotalRef = useRef(0);
  const sideSamplesRef = useRef({ left: 0, right: 0 });
  const minimumKneeAngleRef = useRef(180);
  const maximumKneeAngleRef = useRef(0);
  const minimumHipAngleRef = useRef(180);
  const maximumHipAngleRef = useRef(0);
  const maximumTorsoLeanRef = useRef(0);
  const minimumTorsoLeanRef = useRef(180);
  const minimumElbowAngleRef = useRef(180);
  const maximumElbowAngleRef = useRef(0);
  const minimumShoulderAngleRef = useRef(180);
  const maximumShoulderAngleRef = useRef(0);
  const minimumAnkleAngleRef = useRef(180);
  const maximumAnkleAngleRef = useRef(0);
  const minimumWristSeparationRef = useRef(Number.POSITIVE_INFINITY);
  const maximumWristSeparationRef = useRef(0);
  const minimumKneeSeparationRef = useRef(Number.POSITIVE_INFINITY);
  const maximumKneeSeparationRef = useRef(0);
  const maximumKneeAsymmetryRef = useRef(0);
  const wristOffsetAtBottomRef = useRef(0);
  const squatTrackerRef = useRef(createSquatTracker());
  const squatCoachRef = useRef(createSquatCoach());
  const hingeTrackerRef = useRef(createHingeTracker());
  const hingeCoachRef = useRef(createHingeCoach());
  const unilateralTrackerRef = useRef(createUnilateralTracker());
  const unilateralCoachRef = useRef(createUnilateralCoach());
  const pressTrackerRef = useRef(createPressTracker());
  const pressCoachRef = useRef(createPressCoach());
  const rowTrackerRef = useRef(createRowTracker());
  const rowCoachRef = useRef(createRowCoach());
  const verticalPullTrackerRef = useRef(createVerticalPullTracker());
  const verticalPullCoachRef = useRef(createVerticalPullCoach());
  const kneeIsolationTrackerRef = useRef(createKneeIsolationTracker());
  const kneeIsolationCoachRef = useRef(createKneeIsolationCoach());
  const armIsolationTrackerRef = useRef(createArmIsolationTracker());
  const armIsolationCoachRef = useRef(createArmIsolationCoach());
  const coreFlexionTrackerRef = useRef(createCoreFlexionTracker());
  const coreFlexionCoachRef = useRef(createCoreFlexionCoach());
  const calfIsolationTrackerRef = useRef(createCalfIsolationTracker());
  const calfIsolationCoachRef = useRef(createCalfIsolationCoach());
  const shoulderIsolationTrackerRef = useRef(createShoulderIsolationTracker());
  const shoulderIsolationCoachRef = useRef(createShoulderIsolationCoach());
  const chestIsolationTrackerRef = useRef(createChestIsolationTracker());
  const chestIsolationCoachRef = useRef(createChestIsolationCoach());
  const rearShoulderIsolationTrackerRef = useRef(
    createRearShoulderIsolationTracker(),
  );
  const rearShoulderIsolationCoachRef = useRef(
    createRearShoulderIsolationCoach(),
  );
  const straightArmPullTrackerRef = useRef(createStraightArmPullTracker());
  const straightArmPullCoachRef = useRef(createStraightArmPullCoach());
  const hipMachineTrackerRef = useRef(createHipMachineTracker());
  const hipMachineCoachRef = useRef(createHipMachineCoach());
  const scanFinishedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const cameraRequestPendingRef = useRef(false);
  const componentMountedRef = useRef(true);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [analyzedFrames, setAnalyzedFrames] = useState(0);
  const [visibleLandmarks, setVisibleLandmarks] = useState(0);
  const [currentAngles, setCurrentAngles] = useState<MovementAngles | null>(null);
  const [angleSummary, setAngleSummary] = useState<FormAngleSummary | null>(null);
  const [scanQuality, setScanQuality] = useState<ScanQualityResult | null>(null);
  const [movementPhase, setMovementPhase] = useState<MovementPhase>("find-start");
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [repAnalyses, setRepAnalyses] = useState<FormRepAnalysis[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] =
    useState<FormCheckExerciseId>("bodyweight_squat");
  const [flowStage, setFlowStage] = useState<FormFlowStage>("intro");
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(
    null,
  );
  const [activeReviewTimestamp, setActiveReviewTimestamp] = useState<
    number | null
  >(null);
  const selectedExercise = getFormCheckExercise(selectedExerciseId);

  useEffect(() => {
    const exerciseId = parseFormCheckExerciseId(
      new URLSearchParams(window.location.search).get("exercise"),
    );
    if (!exerciseId) return;
    const frame = window.requestAnimationFrame(() => {
      setSelectedExerciseId(exerciseId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  useEffect(() => {
    componentMountedRef.current = true;

    return () => {
      componentMountedRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordingIntervalRef.current !== null) {
        window.clearInterval(recordingIntervalRef.current);
      }
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      poseLandmarkerRef.current?.close();
    };
  }, []);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resetAnalysis() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    videoRef.current?.pause();
    scanLoopRef.current = null;
    scanFinishedRef.current = false;
    attemptedFramesRef.current = 0;
    detectedFramesRef.current = 0;
    maxVisibleLandmarksRef.current = 0;
    smoothedAnglesRef.current = null;
    smoothedPressAnglesRef.current = null;
    smoothedRowAnglesRef.current = null;
    smoothedVerticalPullAnglesRef.current = null;
    smoothedKneeIsolationAnglesRef.current = null;
    smoothedArmIsolationAnglesRef.current = null;
    smoothedCoreFlexionAnglesRef.current = null;
    smoothedCalfIsolationAnglesRef.current = null;
    smoothedShoulderIsolationAnglesRef.current = null;
    shoulderIsolationSideRef.current = null;
    smoothedStraightArmPullAnglesRef.current = null;
    straightArmPullSideRef.current = null;
    smoothedChestIsolationAnglesRef.current = null;
    smoothedRearShoulderIsolationAnglesRef.current = null;
    smoothedHipMachineAnglesRef.current = null;
    angleSamplesRef.current = 0;
    confidenceTotalRef.current = 0;
    sideSamplesRef.current = { left: 0, right: 0 };
    minimumKneeAngleRef.current = 180;
    maximumKneeAngleRef.current = 0;
    minimumHipAngleRef.current = 180;
    maximumHipAngleRef.current = 0;
    maximumTorsoLeanRef.current = 0;
    minimumTorsoLeanRef.current = 180;
    minimumElbowAngleRef.current = 180;
    maximumElbowAngleRef.current = 0;
    minimumShoulderAngleRef.current = 180;
    maximumShoulderAngleRef.current = 0;
    minimumAnkleAngleRef.current = 180;
    maximumAnkleAngleRef.current = 0;
    minimumWristSeparationRef.current = Number.POSITIVE_INFINITY;
    maximumWristSeparationRef.current = 0;
    minimumKneeSeparationRef.current = Number.POSITIVE_INFINITY;
    maximumKneeSeparationRef.current = 0;
    maximumKneeAsymmetryRef.current = 0;
    wristOffsetAtBottomRef.current = 0;
    squatTrackerRef.current = createSquatTracker();
    squatCoachRef.current = createSquatCoach();
    hingeTrackerRef.current = createHingeTracker();
    hingeCoachRef.current = createHingeCoach();
    unilateralTrackerRef.current = createUnilateralTracker();
    unilateralCoachRef.current = createUnilateralCoach();
    pressTrackerRef.current = createPressTracker();
    pressCoachRef.current = createPressCoach();
    rowTrackerRef.current = createRowTracker();
    rowCoachRef.current = createRowCoach();
    verticalPullTrackerRef.current = createVerticalPullTracker();
    verticalPullCoachRef.current = createVerticalPullCoach();
    kneeIsolationTrackerRef.current = createKneeIsolationTracker();
    kneeIsolationCoachRef.current = createKneeIsolationCoach();
    armIsolationTrackerRef.current = createArmIsolationTracker();
    armIsolationCoachRef.current = createArmIsolationCoach();
    coreFlexionTrackerRef.current = createCoreFlexionTracker();
    coreFlexionCoachRef.current = createCoreFlexionCoach();
    calfIsolationTrackerRef.current = createCalfIsolationTracker();
    calfIsolationCoachRef.current = createCalfIsolationCoach();
    shoulderIsolationTrackerRef.current = createShoulderIsolationTracker();
    shoulderIsolationCoachRef.current = createShoulderIsolationCoach();
    chestIsolationTrackerRef.current = createChestIsolationTracker();
    chestIsolationCoachRef.current = createChestIsolationCoach();
    rearShoulderIsolationTrackerRef.current = createRearShoulderIsolationTracker();
    rearShoulderIsolationCoachRef.current = createRearShoulderIsolationCoach();
    straightArmPullTrackerRef.current = createStraightArmPullTracker();
    straightArmPullCoachRef.current = createStraightArmPullCoach();
    hipMachineTrackerRef.current = createHipMachineTracker();
    hipMachineCoachRef.current = createHipMachineCoach();
    lastDetectionAtRef.current = 0;
    setAnalysisStatus("idle");
    setAnalysisError("");
    setScanProgress(0);
    setAnalyzedFrames(0);
    setVisibleLandmarks(0);
    setCurrentAngles(null);
    setAngleSummary(null);
    setScanQuality(null);
    setMovementPhase("find-start");
    setRepetitionCount(0);
    setRepAnalyses([]);
    setActiveReviewTimestamp(null);
    clearCanvas();
  }

  function validateAndSelect(file: File | undefined) {
    setError("");
    setDuration(null);
    resetAnalysis();

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setVideoFile(null);
      setVideoUrl("");
      setError("Choose an MP4, WebM, or MOV video.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setVideoFile(null);
      setVideoUrl("");
      setError("The video must be 100 MB or smaller.");
      return;
    }

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndSelect(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    validateAndSelect(event.dataTransfer.files?.[0]);
  }

  function handleMetadataLoaded(event: SyntheticEvent<HTMLVideoElement>) {
    const videoDuration = event.currentTarget.duration;
    setDuration(videoDuration);

    if (videoDuration < MIN_DURATION_SECONDS) {
      setError("Keep the clip at least 5 seconds long so a full repetition can be reviewed.");
    } else if (videoDuration > MAX_DURATION_SECONDS) {
      setError("Keep the clip under 30 seconds so analysis stays focused.");
    }
  }

  function clearVideo() {
    resetAnalysis();
    setVideoFile(null);
    setVideoUrl("");
    setDuration(null);
    setError("");

    if (inputRef.current) inputRef.current.value = "";
  }

  function selectExercise(exerciseId: FormCheckExerciseId) {
    if (exerciseId === selectedExerciseId) return;
    turnOffCamera();
    clearVideo();
    setSelectedExerciseId(exerciseId);
    const url = new URL(window.location.href);
    url.searchParams.set("exercise", exerciseId);
    window.history.replaceState(null, "", url);
  }

  function clearRecordingInterval() {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }

  function cancelRecordingCountdown() {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRecordingCountdown(null);
  }

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;
  }

  function turnOffCamera() {
    cancelRecordingCountdown();
    clearRecordingInterval();
    stopCameraStream();
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setCameraStatus("idle");
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  function changeInputMode(nextMode: InputMode) {
    if (nextMode === inputMode) return;
    turnOffCamera();
    setInputMode(nextMode);
    setError("");
  }

  async function startCamera() {
    setError("");

    if (cameraRequestPendingRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera recording is not available in this browser. Use the upload option instead.",
      );
      return;
    }

    if (!("MediaRecorder" in window)) {
      setError(
        "This browser cannot create a recording here. Use the upload option instead.",
      );
      return;
    }

    cameraRequestPendingRef.current = true;
    setCameraStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!componentMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      cameraStreamRef.current = stream;

      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;
        await cameraPreviewRef.current.play();
      }

      setCameraStatus("ready");
    } catch (cameraError) {
      if (!componentMountedRef.current) return;
      stopCameraStream();
      setCameraStatus("idle");
      setError(
        cameraError instanceof DOMException && cameraError.name === "NotAllowedError"
          ? "Camera access was not allowed. Enable camera permission or upload a clip instead."
          : "The camera could not start. Check that another app is not using it, then try again.",
      );
    } finally {
      cameraRequestPendingRef.current = false;
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    clearRecordingInterval();

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  function beginRecording() {
    const stream = cameraStreamRef.current;
    if (!stream) return;

    try {
      const preferredMimeType = selectPreferredRecordingMimeType((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType),
      );
      const recorder = new MediaRecorder(
        stream,
        preferredMimeType ? { mimeType: preferredMimeType } : undefined,
      );
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearRecordingInterval();
        setIsRecording(false);
        setRecordingCountdown(null);
        const chunks = recordedChunksRef.current;
        const recorderMimeType =
          recorder.mimeType || chunks[0]?.type || preferredMimeType || "video/webm";
        const fileDetails = getRecordedVideoFileDetails(
          recorderMimeType,
          new Date(),
          selectedExercise.recordingSlug,
        );
        const blob = new Blob(chunks, { type: recorderMimeType });

        stopCameraStream();
        setCameraStatus("idle");
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];

        if (blob.size === 0) {
          setError("The camera did not produce a usable clip. Please record again.");
          return;
        }

        const file = new File([blob], fileDetails.fileName, {
          type: fileDetails.mimeType,
          lastModified: Date.now(),
        });
        validateAndSelect(file);
      };

      recorder.onerror = () => {
        setError("Recording stopped unexpectedly. Please try again.");
      };

      recorder.onstart = () => {
        recordingStartedAtRef.current = performance.now();
        setRecordingSeconds(0);
        setIsRecording(true);
      };
      recorder.start(250);
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.min(
          MAX_DURATION_SECONDS,
          (performance.now() - recordingStartedAtRef.current) / 1000,
        );
        setRecordingSeconds(elapsed);

        if (
          elapsed >= MAX_DURATION_SECONDS &&
          mediaRecorderRef.current?.state === "recording"
        ) {
          stopRecording();
        }
      }, 200);
    } catch {
      setError(
        "Recording could not start with this camera. Use the upload option instead.",
      );
    }
  }

  function startRecordingCountdown() {
    if (cameraStatus !== "ready" || isRecording) return;

    setError("");
    let remaining = 3;
    setRecordingCountdown(remaining);
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        cancelRecordingCountdown();
        beginRecording();
        return;
      }
      setRecordingCountdown(remaining);
    }, 1000);
  }

  async function getPoseLandmarker() {
    if (poseLandmarkerRef.current) return poseLandmarkerRef.current;

    const { FilesetResolver, PoseLandmarker } = await import(
      "@mediapipe/tasks-vision"
    );
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

    poseLandmarkerRef.current = poseLandmarker;
    poseConnectionsRef.current = PoseLandmarker.POSE_CONNECTIONS;
    return poseLandmarker;
  }

  function drawPose(landmarks: NormalizedLandmark[] | undefined) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!video || !canvas || !context) return 0;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return 0;

    const visibleCount = landmarks.filter((point) => point.visibility >= 0.5).length;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(2.5, canvas.width / 340);
    context.strokeStyle = "#ffffff";

    for (const connection of poseConnectionsRef.current) {
      const start = landmarks[connection.start];
      const end = landmarks[connection.end];
      if (!start || !end || start.visibility < 0.5 || end.visibility < 0.5) continue;

      context.beginPath();
      context.moveTo(start.x * canvas.width, start.y * canvas.height);
      context.lineTo(end.x * canvas.width, end.y * canvas.height);
      context.stroke();
    }

    const pointRadius = Math.max(3, canvas.width / 210);
    for (const point of landmarks) {
      if (point.visibility < 0.5) continue;
      context.beginPath();
      context.arc(
        point.x * canvas.width,
        point.y * canvas.height,
        pointRadius,
        0,
        Math.PI * 2,
      );
      context.fillStyle = "#ffffff";
      context.fill();
      context.lineWidth = Math.max(1.5, canvas.width / 600);
      context.strokeStyle = "#000000";
      context.stroke();
    }

    return visibleCount;
  }

  function measureMovementAngles(
    landmarks: NormalizedLandmark[] | undefined,
    timestampSeconds: number,
  ) {
    const video = videoRef.current;
    if (!video) return null;

    if (selectedExercise.family === "hip-machine") {
      const measuredAngles = calculateHipMachineAngles(
        landmarks,
        video.videoWidth,
        video.videoHeight,
      );
      if (!measuredAngles) return null;

      const smoothedAngles = smoothHipMachineAngles(
        smoothedHipMachineAnglesRef.current,
        measuredAngles,
      );
      smoothedHipMachineAnglesRef.current = smoothedAngles;
      angleSamplesRef.current += 1;
      confidenceTotalRef.current += measuredAngles.confidence;
      sideSamplesRef.current.left += 1;
      minimumKneeSeparationRef.current = Math.min(
        minimumKneeSeparationRef.current,
        smoothedAngles.kneeSeparation,
      );
      maximumKneeSeparationRef.current = Math.max(
        maximumKneeSeparationRef.current,
        smoothedAngles.kneeSeparation,
      );
      maximumKneeAsymmetryRef.current = Math.max(
        maximumKneeAsymmetryRef.current,
        smoothedAngles.kneeAsymmetry,
      );

      const exerciseId = selectedExercise.id as HipMachineExerciseId;
      const nextTracker = updateHipMachineTracker(
        hipMachineTrackerRef.current,
        smoothedAngles.kneeSeparation,
        exerciseId,
      );
      hipMachineTrackerRef.current = nextTracker;
      hipMachineCoachRef.current = updateHipMachineCoach(
        hipMachineCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
        exerciseId,
      );

      return smoothedAngles;
    }

    if (
      selectedExercise.family === "chest-isolation" ||
      selectedExercise.family === "rear-shoulder-isolation"
    ) {
      const measuredAngles = calculateFlyAngles(
        landmarks,
        video.videoWidth,
        video.videoHeight,
      );
      if (!measuredAngles) return null;

      const previousAngles = selectedExercise.family === "chest-isolation"
        ? smoothedChestIsolationAnglesRef.current
        : smoothedRearShoulderIsolationAnglesRef.current;
      const smoothedAngles = smoothFlyAngles(
        previousAngles,
        measuredAngles,
      );
      if (selectedExercise.family === "chest-isolation") {
        smoothedChestIsolationAnglesRef.current = smoothedAngles;
      } else {
        smoothedRearShoulderIsolationAnglesRef.current = smoothedAngles;
      }
      angleSamplesRef.current += 1;
      confidenceTotalRef.current += measuredAngles.confidence;
      sideSamplesRef.current.left += 1;
      minimumElbowAngleRef.current = Math.min(
        minimumElbowAngleRef.current,
        smoothedAngles.elbowAverage,
      );
      maximumElbowAngleRef.current = Math.max(
        maximumElbowAngleRef.current,
        smoothedAngles.elbowAverage,
      );
      minimumWristSeparationRef.current = Math.min(
        minimumWristSeparationRef.current,
        smoothedAngles.wristSeparation,
      );
      maximumWristSeparationRef.current = Math.max(
        maximumWristSeparationRef.current,
        smoothedAngles.wristSeparation,
      );

      if (selectedExercise.family === "chest-isolation") {
        const nextTracker = updateChestIsolationTracker(
          chestIsolationTrackerRef.current,
          smoothedAngles.wristSeparation,
        );
        chestIsolationTrackerRef.current = nextTracker;
        chestIsolationCoachRef.current = updateChestIsolationCoach(
          chestIsolationCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
        );
      } else {
        const nextTracker = updateRearShoulderIsolationTracker(
          rearShoulderIsolationTrackerRef.current,
          smoothedAngles.wristSeparation,
        );
        rearShoulderIsolationTrackerRef.current = nextTracker;
        rearShoulderIsolationCoachRef.current = updateRearShoulderIsolationCoach(
          rearShoulderIsolationCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
        );
      }

      return smoothedAngles;
    }

    if (selectedExercise.family === "calf-isolation") {
      const measuredAngles = calculateCalfRaiseAngles(
        landmarks,
        video.videoWidth,
        video.videoHeight,
      );
      if (!measuredAngles) return null;

      const smoothedAngles = smoothCalfRaiseAngles(
        smoothedCalfIsolationAnglesRef.current,
        measuredAngles,
      );
      smoothedCalfIsolationAnglesRef.current = smoothedAngles;
      angleSamplesRef.current += 1;
      confidenceTotalRef.current += measuredAngles.confidence;
      sideSamplesRef.current[measuredAngles.side] += 1;
      minimumKneeAngleRef.current = Math.min(
        minimumKneeAngleRef.current,
        smoothedAngles.knee,
      );
      maximumKneeAngleRef.current = Math.max(
        maximumKneeAngleRef.current,
        smoothedAngles.knee,
      );
      minimumAnkleAngleRef.current = Math.min(
        minimumAnkleAngleRef.current,
        smoothedAngles.ankle,
      );
      maximumAnkleAngleRef.current = Math.max(
        maximumAnkleAngleRef.current,
        smoothedAngles.ankle,
      );

      const exerciseId = selectedExercise.id as CalfIsolationExerciseId;
      const nextTracker = updateCalfIsolationTracker(
        calfIsolationTrackerRef.current,
        smoothedAngles.ankle,
        exerciseId,
      );
      calfIsolationTrackerRef.current = nextTracker;
      calfIsolationCoachRef.current = updateCalfIsolationCoach(
        calfIsolationCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
        exerciseId,
      );

      return smoothedAngles;
    }

    if (
      selectedExercise.family === "press" ||
      selectedExercise.family === "row" ||
      selectedExercise.family === "vertical-pull" ||
      selectedExercise.family === "arm-isolation" ||
      selectedExercise.family === "shoulder-isolation" ||
      selectedExercise.family === "straight-arm-pull"
    ) {
      const measuredAngles = selectedExercise.family === "shoulder-isolation" ||
        selectedExercise.family === "straight-arm-pull"
        ? calculateLateralRaiseAngles(
            landmarks,
            video.videoWidth,
            video.videoHeight,
            selectedExercise.family === "shoulder-isolation"
              ? shoulderIsolationSideRef.current
              : straightArmPullSideRef.current,
          )
        : calculatePressAngles(
            landmarks,
            video.videoWidth,
            video.videoHeight,
          );
      if (!measuredAngles) return null;
      if (selectedExercise.family === "shoulder-isolation") {
        shoulderIsolationSideRef.current = measuredAngles.side;
      } else if (selectedExercise.family === "straight-arm-pull") {
        straightArmPullSideRef.current = measuredAngles.side;
      }

      const previousAngles =
        selectedExercise.family === "row"
          ? smoothedRowAnglesRef.current
          : selectedExercise.family === "vertical-pull"
            ? smoothedVerticalPullAnglesRef.current
            : selectedExercise.family === "arm-isolation"
              ? smoothedArmIsolationAnglesRef.current
            : selectedExercise.family === "shoulder-isolation"
              ? smoothedShoulderIsolationAnglesRef.current
            : selectedExercise.family === "straight-arm-pull"
              ? smoothedStraightArmPullAnglesRef.current
          : smoothedPressAnglesRef.current;
      const smoothedAngles = smoothPressAngles(previousAngles, measuredAngles);
      if (selectedExercise.family === "row") {
        smoothedRowAnglesRef.current = smoothedAngles;
      } else if (selectedExercise.family === "vertical-pull") {
        smoothedVerticalPullAnglesRef.current = smoothedAngles;
      } else if (selectedExercise.family === "arm-isolation") {
        smoothedArmIsolationAnglesRef.current = smoothedAngles;
      } else if (selectedExercise.family === "shoulder-isolation") {
        smoothedShoulderIsolationAnglesRef.current = smoothedAngles;
      } else if (selectedExercise.family === "straight-arm-pull") {
        smoothedStraightArmPullAnglesRef.current = smoothedAngles;
      } else {
        smoothedPressAnglesRef.current = smoothedAngles;
      }
      angleSamplesRef.current += 1;
      confidenceTotalRef.current += measuredAngles.confidence;
      sideSamplesRef.current[measuredAngles.side] += 1;
      minimumElbowAngleRef.current = Math.min(
        minimumElbowAngleRef.current,
        smoothedAngles.elbow,
      );
      maximumElbowAngleRef.current = Math.max(
        maximumElbowAngleRef.current,
        smoothedAngles.elbow,
      );
      minimumShoulderAngleRef.current = Math.min(
        minimumShoulderAngleRef.current,
        smoothedAngles.shoulder,
      );
      maximumShoulderAngleRef.current = Math.max(
        maximumShoulderAngleRef.current,
        smoothedAngles.shoulder,
      );
      maximumTorsoLeanRef.current = Math.max(
        maximumTorsoLeanRef.current,
        smoothedAngles.torsoLean,
      );
      minimumTorsoLeanRef.current = Math.min(
        minimumTorsoLeanRef.current,
        smoothedAngles.torsoLean,
      );

      if (selectedExercise.family === "straight-arm-pull") {
        const nextTracker = updateStraightArmPullTracker(
          straightArmPullTrackerRef.current,
          smoothedAngles.shoulder,
        );
        straightArmPullTrackerRef.current = nextTracker;
        straightArmPullCoachRef.current = updateStraightArmPullCoach(
          straightArmPullCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
        );
      } else if (selectedExercise.family === "shoulder-isolation") {
        const exerciseId = selectedExercise.id as ShoulderIsolationExerciseId;
        const nextTracker = updateShoulderIsolationTracker(
          shoulderIsolationTrackerRef.current,
          smoothedAngles.shoulder,
          exerciseId,
        );
        shoulderIsolationTrackerRef.current = nextTracker;
        shoulderIsolationCoachRef.current = updateShoulderIsolationCoach(
          shoulderIsolationCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
        );
      } else if (selectedExercise.family === "arm-isolation") {
        const exerciseId = selectedExercise.id as ArmIsolationExerciseId;
        const nextTracker = updateArmIsolationTracker(
          armIsolationTrackerRef.current,
          smoothedAngles.elbow,
          exerciseId,
        );
        armIsolationTrackerRef.current = nextTracker;
        armIsolationCoachRef.current = updateArmIsolationCoach(
          armIsolationCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
          exerciseId,
        );
      } else if (selectedExercise.family === "vertical-pull") {
        const exerciseId = selectedExercise.id as VerticalPullExerciseId;
        const nextTracker = updateVerticalPullTracker(
          verticalPullTrackerRef.current,
          smoothedAngles.elbow,
        );
        verticalPullTrackerRef.current = nextTracker;
        verticalPullCoachRef.current = updateVerticalPullCoach(
          verticalPullCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
          exerciseId,
        );
      } else if (selectedExercise.family === "row") {
        const exerciseId = selectedExercise.id as RowExerciseId;
        const nextTracker = updateRowTracker(
          rowTrackerRef.current,
          smoothedAngles.elbow,
        );
        rowTrackerRef.current = nextTracker;
        rowCoachRef.current = updateRowCoach(
          rowCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
          exerciseId,
        );
      } else {
        if (smoothedAngles.elbow <= minimumElbowAngleRef.current + 0.01) {
          wristOffsetAtBottomRef.current = smoothedAngles.wristOffset;
        }
        const exerciseId = selectedExercise.id as Extract<
          FormCheckExerciseId,
          | "flat_bench_press"
          | "incline_bench_press"
          | "barbell_overhead_press"
          | "dumbbell_shoulder_press"
          | "triceps_dip"
        >;
        const nextTracker = updatePressTracker(
          pressTrackerRef.current,
          smoothedAngles.elbow,
        );
        pressTrackerRef.current = nextTracker;
        pressCoachRef.current = updatePressCoach(
          pressCoachRef.current,
          nextTracker.phase,
          nextTracker.repetitions,
          smoothedAngles,
          timestampSeconds,
          exerciseId,
        );
      }

      return smoothedAngles;
    }

    const measuredAngles = selectedExercise.family === "unilateral"
      ? calculateUnilateralAngles(
          landmarks,
          video.videoWidth,
          video.videoHeight,
          selectedExercise.id === "bulgarian_split_squat",
        )
      : calculateSquatAngles(
          landmarks,
          video.videoWidth,
          video.videoHeight,
        );

    if (!measuredAngles) return null;

    const previousAngles = selectedExercise.family === "knee-isolation"
      ? smoothedKneeIsolationAnglesRef.current
      : selectedExercise.family === "core-flexion"
        ? smoothedCoreFlexionAnglesRef.current
        : smoothedAnglesRef.current;
    const smoothedAngles = smoothSquatAngles(previousAngles, measuredAngles);
    if (selectedExercise.family === "knee-isolation") {
      smoothedKneeIsolationAnglesRef.current = smoothedAngles;
    } else if (selectedExercise.family === "core-flexion") {
      smoothedCoreFlexionAnglesRef.current = smoothedAngles;
    } else {
      smoothedAnglesRef.current = smoothedAngles;
    }
    angleSamplesRef.current += 1;
    confidenceTotalRef.current += measuredAngles.confidence;
    sideSamplesRef.current[measuredAngles.side] += 1;
    minimumKneeAngleRef.current = Math.min(
      minimumKneeAngleRef.current,
      smoothedAngles.knee,
    );
    maximumKneeAngleRef.current = Math.max(
      maximumKneeAngleRef.current,
      smoothedAngles.knee,
    );
    minimumHipAngleRef.current = Math.min(
      minimumHipAngleRef.current,
      smoothedAngles.hip,
    );
    maximumHipAngleRef.current = Math.max(
      maximumHipAngleRef.current,
      smoothedAngles.hip,
    );
    maximumTorsoLeanRef.current = Math.max(
      maximumTorsoLeanRef.current,
      smoothedAngles.torsoLean,
    );
    minimumTorsoLeanRef.current = Math.min(
      minimumTorsoLeanRef.current,
      smoothedAngles.torsoLean,
    );
    if (selectedExercise.family === "squat") {
      const nextTracker = updateSquatTracker(
        squatTrackerRef.current,
        smoothedAngles.knee,
      );
      squatTrackerRef.current = nextTracker;
      squatCoachRef.current = updateSquatCoach(
        squatCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
      );
    } else if (selectedExercise.family === "hinge") {
      const exerciseId = selectedExercise.id as Extract<
        FormCheckExerciseId,
        "deadlift" | "romanian_deadlift"
      >;
      const nextTracker = updateHingeTracker(
        hingeTrackerRef.current,
        smoothedAngles.hip,
        exerciseId,
      );
      hingeTrackerRef.current = nextTracker;
      hingeCoachRef.current = updateHingeCoach(
        hingeCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
        exerciseId,
      );
    } else if (selectedExercise.family === "unilateral") {
      const exerciseId = selectedExercise.id as Extract<
        FormCheckExerciseId,
        "bulgarian_split_squat" | "lunge"
      >;
      const nextTracker = updateUnilateralTracker(
        unilateralTrackerRef.current,
        smoothedAngles.knee,
      );
      unilateralTrackerRef.current = nextTracker;
      unilateralCoachRef.current = updateUnilateralCoach(
        unilateralCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
        exerciseId,
      );
    } else if (selectedExercise.family === "knee-isolation") {
      const exerciseId = selectedExercise.id as KneeIsolationExerciseId;
      const nextTracker = updateKneeIsolationTracker(
        kneeIsolationTrackerRef.current,
        smoothedAngles.knee,
        exerciseId,
      );
      kneeIsolationTrackerRef.current = nextTracker;
      kneeIsolationCoachRef.current = updateKneeIsolationCoach(
        kneeIsolationCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
        exerciseId,
      );
    } else if (selectedExercise.family === "core-flexion") {
      const exerciseId = selectedExercise.id as CoreFlexionExerciseId;
      const nextTracker = updateCoreFlexionTracker(
        coreFlexionTrackerRef.current,
        smoothedAngles.hip,
        exerciseId,
      );
      coreFlexionTrackerRef.current = nextTracker;
      coreFlexionCoachRef.current = updateCoreFlexionCoach(
        coreFlexionCoachRef.current,
        nextTracker.phase,
        nextTracker.repetitions,
        smoothedAngles,
        timestampSeconds,
        exerciseId,
      );
    }

    return smoothedAngles;
  }

  function finishScan() {
    if (scanFinishedRef.current) return;
    scanFinishedRef.current = true;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAnalyzedFrames(detectedFramesRef.current);
    setVisibleLandmarks(maxVisibleLandmarksRef.current);
    const quality = evaluateScanQuality({
      attemptedFrames: attemptedFramesRef.current,
      poseFrames: detectedFramesRef.current,
      measurableFrames: angleSamplesRef.current,
      averageConfidence:
        angleSamplesRef.current > 0
          ? confidenceTotalRef.current / angleSamplesRef.current
          : 0,
      leftSideSamples: sideSamplesRef.current.left,
      rightSideSamples: sideSamplesRef.current.right,
      maximumVisibleLandmarks: maxVisibleLandmarksRef.current,
    });
    setScanQuality(quality);
    const finalAngles = selectedExercise.family === "hip-machine"
      ? smoothedHipMachineAnglesRef.current
      : selectedExercise.family === "chest-isolation" ||
      selectedExercise.family === "rear-shoulder-isolation"
      ? selectedExercise.family === "chest-isolation"
        ? smoothedChestIsolationAnglesRef.current
        : smoothedRearShoulderIsolationAnglesRef.current
      : selectedExercise.family === "press"
      ? smoothedPressAnglesRef.current
      : selectedExercise.family === "row"
        ? smoothedRowAnglesRef.current
        : selectedExercise.family === "vertical-pull"
          ? smoothedVerticalPullAnglesRef.current
          : selectedExercise.family === "arm-isolation"
            ? smoothedArmIsolationAnglesRef.current
          : selectedExercise.family === "shoulder-isolation"
            ? smoothedShoulderIsolationAnglesRef.current
          : selectedExercise.family === "straight-arm-pull"
            ? smoothedStraightArmPullAnglesRef.current
          : selectedExercise.family === "knee-isolation"
            ? smoothedKneeIsolationAnglesRef.current
          : selectedExercise.family === "core-flexion"
            ? smoothedCoreFlexionAnglesRef.current
          : selectedExercise.family === "calf-isolation"
            ? smoothedCalfIsolationAnglesRef.current
        : smoothedAnglesRef.current;
    if (finalAngles && angleSamplesRef.current > 0) {
      setCurrentAngles(finalAngles);
      if (
        isHipMachineAngles(finalAngles) &&
        selectedExercise.family === "hip-machine"
      ) {
        setAngleSummary({
          kind: "hip-machine",
          side: "bilateral",
          sampleCount: angleSamplesRef.current,
          minimumKneeSeparation: minimumKneeSeparationRef.current,
          maximumKneeSeparation: maximumKneeSeparationRef.current,
          kneeSeparationRange: Math.max(
            0,
            maximumKneeSeparationRef.current - minimumKneeSeparationRef.current,
          ),
          maximumKneeAsymmetry: maximumKneeAsymmetryRef.current,
        });
      } else if (
        isFlyAngles(finalAngles) &&
        (selectedExercise.family === "chest-isolation" ||
          selectedExercise.family === "rear-shoulder-isolation")
      ) {
        setAngleSummary({
          kind: selectedExercise.family,
          side: "bilateral",
          sampleCount: angleSamplesRef.current,
          minimumWristSeparation: minimumWristSeparationRef.current,
          maximumWristSeparation: maximumWristSeparationRef.current,
          wristSeparationRange: Math.max(
            0,
            maximumWristSeparationRef.current - minimumWristSeparationRef.current,
          ),
          minimumElbow: minimumElbowAngleRef.current,
          maximumElbow: maximumElbowAngleRef.current,
          elbowAngleRange: Math.max(
            0,
            maximumElbowAngleRef.current - minimumElbowAngleRef.current,
          ),
        });
      } else if (
        isArmAngles(finalAngles) &&
        selectedExercise.family === "vertical-pull"
      ) {
        setAngleSummary({
          kind: "vertical-pull",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumElbow: minimumElbowAngleRef.current,
          minimumShoulder: minimumShoulderAngleRef.current,
          minimumTorsoLean: minimumTorsoLeanRef.current,
          maximumTorsoLean: maximumTorsoLeanRef.current,
          torsoLeanRange: Math.max(
            0,
            maximumTorsoLeanRef.current - minimumTorsoLeanRef.current,
          ),
        });
      } else if (
        isArmAngles(finalAngles) &&
        selectedExercise.family === "arm-isolation"
      ) {
        setAngleSummary({
          kind: "arm-isolation",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumElbow: minimumElbowAngleRef.current,
          maximumElbow: maximumElbowAngleRef.current,
          minimumShoulder: minimumShoulderAngleRef.current,
          maximumShoulder: maximumShoulderAngleRef.current,
          shoulderAngleRange: Math.max(
            0,
            maximumShoulderAngleRef.current - minimumShoulderAngleRef.current,
          ),
        });
      } else if (
        isArmAngles(finalAngles) &&
        (selectedExercise.family === "shoulder-isolation" ||
          selectedExercise.family === "straight-arm-pull")
      ) {
        setAngleSummary({
          kind: selectedExercise.family,
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumShoulder: minimumShoulderAngleRef.current,
          maximumShoulder: maximumShoulderAngleRef.current,
          shoulderAngleRange: Math.max(
            0,
            maximumShoulderAngleRef.current - minimumShoulderAngleRef.current,
          ),
          minimumElbow: minimumElbowAngleRef.current,
          maximumElbow: maximumElbowAngleRef.current,
          elbowAngleRange: Math.max(
            0,
            maximumElbowAngleRef.current - minimumElbowAngleRef.current,
          ),
        });
      } else if (
        isCalfRaiseAngles(finalAngles) &&
        selectedExercise.family === "calf-isolation"
      ) {
        setAngleSummary({
          kind: "calf-isolation",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumAnkle: minimumAnkleAngleRef.current,
          maximumAnkle: maximumAnkleAngleRef.current,
          ankleAngleRange: Math.max(
            0,
            maximumAnkleAngleRef.current - minimumAnkleAngleRef.current,
          ),
          minimumKnee: minimumKneeAngleRef.current,
          maximumKnee: maximumKneeAngleRef.current,
          kneeAngleRange: Math.max(
            0,
            maximumKneeAngleRef.current - minimumKneeAngleRef.current,
          ),
        });
      } else if (isArmAngles(finalAngles) && selectedExercise.family === "row") {
        setAngleSummary({
          kind: "row",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumElbow: minimumElbowAngleRef.current,
          minimumShoulder: minimumShoulderAngleRef.current,
          minimumTorsoLean: minimumTorsoLeanRef.current,
          maximumTorsoLean: maximumTorsoLeanRef.current,
          torsoLeanRange: Math.max(
            0,
            maximumTorsoLeanRef.current - minimumTorsoLeanRef.current,
          ),
        });
      } else if (isArmAngles(finalAngles)) {
        setAngleSummary({
          kind: "press",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumElbow: minimumElbowAngleRef.current,
          minimumShoulder: minimumShoulderAngleRef.current,
          wristOffsetAtBottom: wristOffsetAtBottomRef.current,
          minimumTorsoLean: minimumTorsoLeanRef.current,
          maximumTorsoLean: maximumTorsoLeanRef.current,
          torsoLeanRange: Math.max(
            0,
            maximumTorsoLeanRef.current - minimumTorsoLeanRef.current,
          ),
        });
      } else if (
        !isCalfRaiseAngles(finalAngles) &&
        !isFlyAngles(finalAngles) &&
        selectedExercise.family === "knee-isolation"
      ) {
        setAngleSummary({
          kind: "knee-isolation",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumKnee: minimumKneeAngleRef.current,
          maximumKnee: maximumKneeAngleRef.current,
          minimumHip: minimumHipAngleRef.current,
          maximumHip: maximumHipAngleRef.current,
          hipAngleRange: Math.max(
            0,
            maximumHipAngleRef.current - minimumHipAngleRef.current,
          ),
        });
      } else if (
        !isCalfRaiseAngles(finalAngles) &&
        !isFlyAngles(finalAngles) &&
        selectedExercise.family === "core-flexion"
      ) {
        setAngleSummary({
          kind: "core-flexion",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumHip: minimumHipAngleRef.current,
          maximumHip: maximumHipAngleRef.current,
          hipAngleRange: Math.max(
            0,
            maximumHipAngleRef.current - minimumHipAngleRef.current,
          ),
          minimumKnee: minimumKneeAngleRef.current,
          maximumKnee: maximumKneeAngleRef.current,
          minimumTorsoLean: minimumTorsoLeanRef.current,
          maximumTorsoLean: maximumTorsoLeanRef.current,
          torsoLeanRange: Math.max(
            0,
            maximumTorsoLeanRef.current - minimumTorsoLeanRef.current,
          ),
        });
      } else if (!isCalfRaiseAngles(finalAngles) && !isFlyAngles(finalAngles)) {
        setAngleSummary({
          kind: "lower-body",
          side: finalAngles.side,
          sampleCount: angleSamplesRef.current,
          minimumKnee: minimumKneeAngleRef.current,
          minimumHip: minimumHipAngleRef.current,
          maximumTorsoLean: maximumTorsoLeanRef.current,
        });
      }
    }
    if (selectedExercise.family === "squat") {
      setMovementPhase(squatTrackerRef.current.phase);
      setRepetitionCount(squatTrackerRef.current.repetitions);
      setRepAnalyses(squatCoachRef.current.completedReps);
    } else if (selectedExercise.family === "hinge") {
      setMovementPhase(hingeTrackerRef.current.phase);
      setRepetitionCount(hingeTrackerRef.current.repetitions);
      setRepAnalyses(hingeCoachRef.current.completedReps);
    } else if (selectedExercise.family === "unilateral") {
      setMovementPhase(unilateralTrackerRef.current.phase);
      setRepetitionCount(unilateralTrackerRef.current.repetitions);
      setRepAnalyses(unilateralCoachRef.current.completedReps);
    } else if (selectedExercise.family === "row") {
      setMovementPhase(rowTrackerRef.current.phase);
      setRepetitionCount(rowTrackerRef.current.repetitions);
      setRepAnalyses(rowCoachRef.current.completedReps);
    } else if (selectedExercise.family === "vertical-pull") {
      setMovementPhase(verticalPullTrackerRef.current.phase);
      setRepetitionCount(verticalPullTrackerRef.current.repetitions);
      setRepAnalyses(verticalPullCoachRef.current.completedReps);
    } else if (selectedExercise.family === "knee-isolation") {
      setMovementPhase(kneeIsolationTrackerRef.current.phase);
      setRepetitionCount(kneeIsolationTrackerRef.current.repetitions);
      setRepAnalyses(kneeIsolationCoachRef.current.completedReps);
    } else if (selectedExercise.family === "arm-isolation") {
      setMovementPhase(armIsolationTrackerRef.current.phase);
      setRepetitionCount(armIsolationTrackerRef.current.repetitions);
      setRepAnalyses(armIsolationCoachRef.current.completedReps);
    } else if (selectedExercise.family === "core-flexion") {
      setMovementPhase(coreFlexionTrackerRef.current.phase);
      setRepetitionCount(coreFlexionTrackerRef.current.repetitions);
      setRepAnalyses(coreFlexionCoachRef.current.completedReps);
    } else if (selectedExercise.family === "calf-isolation") {
      setMovementPhase(calfIsolationTrackerRef.current.phase);
      setRepetitionCount(calfIsolationTrackerRef.current.repetitions);
      setRepAnalyses(calfIsolationCoachRef.current.completedReps);
    } else if (selectedExercise.family === "shoulder-isolation") {
      setMovementPhase(shoulderIsolationTrackerRef.current.phase);
      setRepetitionCount(shoulderIsolationTrackerRef.current.repetitions);
      setRepAnalyses(shoulderIsolationCoachRef.current.completedReps);
    } else if (selectedExercise.family === "chest-isolation") {
      setMovementPhase(chestIsolationTrackerRef.current.phase);
      setRepetitionCount(chestIsolationTrackerRef.current.repetitions);
      setRepAnalyses(chestIsolationCoachRef.current.completedReps);
    } else if (selectedExercise.family === "rear-shoulder-isolation") {
      setMovementPhase(rearShoulderIsolationTrackerRef.current.phase);
      setRepetitionCount(rearShoulderIsolationTrackerRef.current.repetitions);
      setRepAnalyses(rearShoulderIsolationCoachRef.current.completedReps);
    } else if (selectedExercise.family === "straight-arm-pull") {
      setMovementPhase(straightArmPullTrackerRef.current.phase);
      setRepetitionCount(straightArmPullTrackerRef.current.repetitions);
      setRepAnalyses(straightArmPullCoachRef.current.completedReps);
    } else if (selectedExercise.family === "hip-machine") {
      setMovementPhase(hipMachineTrackerRef.current.phase);
      setRepetitionCount(hipMachineTrackerRef.current.repetitions);
      setRepAnalyses(hipMachineCoachRef.current.completedReps);
    } else {
      setMovementPhase(pressTrackerRef.current.phase);
      setRepetitionCount(pressTrackerRef.current.repetitions);
      setRepAnalyses(pressCoachRef.current.completedReps);
    }
    setScanProgress(100);
    setAnalysisStatus("complete");

    if (detectedFramesRef.current === 0) {
      setAnalysisError(
        "No clear pose was detected. Try a brighter video with your full body in view.",
      );
    } else if (angleSamplesRef.current === 0) {
      setAnalysisError(
        selectedExercise.family === "hip-machine"
          ? "A pose was detected, but both shoulders, hips, and knees were not visible enough to measure. Try a centered front-view recording."
        : selectedExercise.family === "press" ||
          selectedExercise.family === "row" ||
          selectedExercise.family === "vertical-pull" ||
          selectedExercise.family === "arm-isolation" ||
          selectedExercise.family === "shoulder-isolation" ||
          selectedExercise.family === "straight-arm-pull" ||
          selectedExercise.family === "chest-isolation" ||
          selectedExercise.family === "rear-shoulder-isolation"
          ? selectedExercise.family === "shoulder-isolation"
            ? "A pose was detected, but the working shoulder, elbow, wrist, and hip were not visible enough to measure. Try a clearer front-view recording."
            : selectedExercise.family === "chest-isolation"
              ? "A pose was detected, but both shoulders, elbows, and wrists were not visible enough to measure. Try a clearer front-view recording."
            : selectedExercise.family === "rear-shoulder-isolation"
              ? "A pose was detected, but both shoulders, elbows, and wrists were not visible enough to measure. Try a clearer rear-view recording."
            : "A pose was detected, but one complete side of the shoulder, elbow, wrist, and hip was not visible enough to measure. Try a clearer side-view recording."
          : selectedExercise.family === "calf-isolation"
            ? "A pose was detected, but one complete side of the hip, knee, ankle, and toes was not visible enough to measure. Try a clearer side-view recording."
          : "A pose was detected, but one complete side of the shoulder, hip, knee, and ankle was not visible enough to measure. Try a clearer side-view recording.",
      );
    }
  }

  async function startLandmarkScan() {
    const video = videoRef.current;
    if (!video || !duration) return;

    resetAnalysis();
    setAnalysisStatus("loading");

    try {
      const poseLandmarker = await getPoseLandmarker();
      video.currentTime = 0;
      scanFinishedRef.current = false;
      setAnalysisStatus("scanning");

      const scanFrame = () => {
        animationFrameRef.current = null;

        if (video.ended) {
          finishScan();
          return;
        }

        if (video.paused) return;

        const now = performance.now();
        if (now - lastDetectionAtRef.current >= 80) {
          lastDetectionAtRef.current = now;
          attemptedFramesRef.current += 1;
          const result = poseLandmarker.detectForVideo(video, now);
          const landmarks = result.landmarks[0];
          const visibleCount = drawPose(landmarks);
          const angles = measureMovementAngles(landmarks, video.currentTime);

          if (landmarks) {
            detectedFramesRef.current += 1;
            maxVisibleLandmarksRef.current = Math.max(
              maxVisibleLandmarksRef.current,
              visibleCount,
            );
          }

          const frames = detectedFramesRef.current;
          if (frames % 4 === 0 || frames === 1) {
            setAnalyzedFrames(frames);
            setVisibleLandmarks(visibleCount);
            if (angles) {
              setCurrentAngles(angles);
              if (selectedExercise.family === "squat") {
                setMovementPhase(squatTrackerRef.current.phase);
                setRepetitionCount(squatTrackerRef.current.repetitions);
                setRepAnalyses(squatCoachRef.current.completedReps);
              } else if (selectedExercise.family === "hinge") {
                setMovementPhase(hingeTrackerRef.current.phase);
                setRepetitionCount(hingeTrackerRef.current.repetitions);
                setRepAnalyses(hingeCoachRef.current.completedReps);
              } else if (selectedExercise.family === "unilateral") {
                setMovementPhase(unilateralTrackerRef.current.phase);
                setRepetitionCount(unilateralTrackerRef.current.repetitions);
                setRepAnalyses(unilateralCoachRef.current.completedReps);
              } else if (selectedExercise.family === "row") {
                setMovementPhase(rowTrackerRef.current.phase);
                setRepetitionCount(rowTrackerRef.current.repetitions);
                setRepAnalyses(rowCoachRef.current.completedReps);
              } else if (selectedExercise.family === "vertical-pull") {
                setMovementPhase(verticalPullTrackerRef.current.phase);
                setRepetitionCount(verticalPullTrackerRef.current.repetitions);
                setRepAnalyses(verticalPullCoachRef.current.completedReps);
              } else if (selectedExercise.family === "knee-isolation") {
                setMovementPhase(kneeIsolationTrackerRef.current.phase);
                setRepetitionCount(kneeIsolationTrackerRef.current.repetitions);
                setRepAnalyses(kneeIsolationCoachRef.current.completedReps);
              } else if (selectedExercise.family === "arm-isolation") {
                setMovementPhase(armIsolationTrackerRef.current.phase);
                setRepetitionCount(armIsolationTrackerRef.current.repetitions);
                setRepAnalyses(armIsolationCoachRef.current.completedReps);
              } else if (selectedExercise.family === "core-flexion") {
                setMovementPhase(coreFlexionTrackerRef.current.phase);
                setRepetitionCount(coreFlexionTrackerRef.current.repetitions);
                setRepAnalyses(coreFlexionCoachRef.current.completedReps);
              } else if (selectedExercise.family === "calf-isolation") {
                setMovementPhase(calfIsolationTrackerRef.current.phase);
                setRepetitionCount(calfIsolationTrackerRef.current.repetitions);
                setRepAnalyses(calfIsolationCoachRef.current.completedReps);
              } else if (selectedExercise.family === "shoulder-isolation") {
                setMovementPhase(shoulderIsolationTrackerRef.current.phase);
                setRepetitionCount(shoulderIsolationTrackerRef.current.repetitions);
                setRepAnalyses(shoulderIsolationCoachRef.current.completedReps);
              } else if (selectedExercise.family === "chest-isolation") {
                setMovementPhase(chestIsolationTrackerRef.current.phase);
                setRepetitionCount(chestIsolationTrackerRef.current.repetitions);
                setRepAnalyses(chestIsolationCoachRef.current.completedReps);
              } else if (selectedExercise.family === "rear-shoulder-isolation") {
                setMovementPhase(rearShoulderIsolationTrackerRef.current.phase);
                setRepetitionCount(rearShoulderIsolationTrackerRef.current.repetitions);
                setRepAnalyses(rearShoulderIsolationCoachRef.current.completedReps);
              } else if (selectedExercise.family === "straight-arm-pull") {
                setMovementPhase(straightArmPullTrackerRef.current.phase);
                setRepetitionCount(straightArmPullTrackerRef.current.repetitions);
                setRepAnalyses(straightArmPullCoachRef.current.completedReps);
              } else if (selectedExercise.family === "hip-machine") {
                setMovementPhase(hipMachineTrackerRef.current.phase);
                setRepetitionCount(hipMachineTrackerRef.current.repetitions);
                setRepAnalyses(hipMachineCoachRef.current.completedReps);
              } else {
                setMovementPhase(pressTrackerRef.current.phase);
                setRepetitionCount(pressTrackerRef.current.repetitions);
                setRepAnalyses(pressCoachRef.current.completedReps);
              }
            }
            setScanProgress(Math.min(99, (video.currentTime / duration) * 100));
          }
        }

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      };

      scanLoopRef.current = scanFrame;
      await video.play();
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (scanError) {
      console.error(scanError);
      setAnalysisStatus("idle");
      setAnalysisError(
        "The pose model could not start. Check your connection and try again.",
      );
    }
  }

  function resumeScanLoop() {
    if (
      analysisStatus === "scanning" &&
      animationFrameRef.current === null &&
      scanLoopRef.current
    ) {
      animationFrameRef.current = requestAnimationFrame(scanLoopRef.current);
    }
  }

  function reviewVideoMoment(timestampSeconds: number) {
    const video = videoRef.current;
    if (!video || duration === null) return;

    video.pause();
    setActiveReviewTimestamp(timestampSeconds);
    video.currentTime = Math.min(
      Math.max(0, timestampSeconds),
      Math.max(0, duration - 0.05),
    );
    clearCanvas();
    video.focus({ preventScroll: true });
    video.scrollIntoView({
      behavior: "auto",
      block: "center",
    });
  }

  const durationIsValid =
    duration !== null &&
    duration >= MIN_DURATION_SECONDS &&
    duration <= MAX_DURATION_SECONDS;
  const isBusy = analysisStatus === "loading" || analysisStatus === "scanning";
  const averageScore = repAnalyses.length
    ? Math.round(
        repAnalyses.reduce((total, rep) => total + rep.score, 0) /
          repAnalyses.length,
      )
    : null;
  const liveCue = currentAngles
    ? isHipMachineAngles(currentAngles)
      ? getLiveHipMachineCue(
          movementPhase as HipMachinePhase,
          selectedExercise.id as HipMachineExerciseId,
        )
    : isFlyAngles(currentAngles)
      ? selectedExercise.family === "rear-shoulder-isolation"
        ? getLiveRearShoulderIsolationCue(
            movementPhase as RearShoulderIsolationPhase,
          )
        : getLiveChestIsolationCue(movementPhase as ChestIsolationPhase)
    : isArmAngles(currentAngles)
      ? selectedExercise.family === "straight-arm-pull"
        ? getLiveStraightArmPullCue(movementPhase as StraightArmPullPhase)
      : selectedExercise.family === "shoulder-isolation"
        ? getLiveShoulderIsolationCue(
            movementPhase as ShoulderIsolationPhase,
          )
      : selectedExercise.family === "arm-isolation"
        ? getLiveArmIsolationCue(
            movementPhase as ArmIsolationPhase,
            selectedExercise.id as ArmIsolationExerciseId,
          )
        : selectedExercise.family === "vertical-pull"
        ? getLiveVerticalPullCue(movementPhase as VerticalPullPhase)
        : selectedExercise.family === "row"
        ? getLiveRowCue(movementPhase as RowPhase)
        : getLivePressCue(
            movementPhase as PressPhase,
            currentAngles,
            selectedExercise.id as Extract<
              FormCheckExerciseId,
              | "flat_bench_press"
              | "incline_bench_press"
              | "barbell_overhead_press"
              | "dumbbell_shoulder_press"
              | "triceps_dip"
            >,
          )
      : isCalfRaiseAngles(currentAngles)
        ? getLiveCalfIsolationCue(
            movementPhase as CalfIsolationPhase,
            selectedExercise.id as CalfIsolationExerciseId,
          )
      : selectedExercise.family === "squat"
        ? getLiveSquatCue(movementPhase as SquatPhase, currentAngles)
        : selectedExercise.family === "hinge"
          ? getLiveHingeCue(
              movementPhase as HingePhase,
              currentAngles,
              selectedExercise.id as Extract<
                FormCheckExerciseId,
                "deadlift" | "romanian_deadlift"
              >,
            )
          : selectedExercise.family === "knee-isolation"
            ? getLiveKneeIsolationCue(
                movementPhase as KneeIsolationPhase,
                selectedExercise.id as KneeIsolationExerciseId,
              )
            : selectedExercise.family === "core-flexion"
              ? getLiveCoreFlexionCue(
                  movementPhase as CoreFlexionPhase,
                  selectedExercise.id as CoreFlexionExerciseId,
                )
            : getLiveUnilateralCue(
                movementPhase as UnilateralPhase,
                currentAngles,
              )
    : null;
  const workflowStep = analysisStatus === "complete" ? 3 : 2;
  const setFeedback =
    averageScore !== null
      ? createSetFeedback(repAnalyses, averageScore, selectedExercise)
      : null;
  const showResults =
    analysisStatus === "complete" &&
    !analysisError &&
    scanQuality?.allowCoaching &&
    repAnalyses.length > 0 &&
    averageScore !== null &&
    setFeedback;
  const resultsReady = Boolean(showResults);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flowStage]);

  useEffect(() => {
    if (!resultsReady) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [resultsReady]);

  useEffect(() => {
    if (
      analysisStatus !== "complete" ||
      !scanQuality?.allowCoaching ||
      setFeedback?.reviewAtSeconds === null ||
      setFeedback?.reviewAtSeconds === undefined ||
      duration === null
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      const timestamp = Math.min(
        Math.max(0, setFeedback.reviewAtSeconds ?? 0),
        Math.max(0, duration - 0.05),
      );
      video.currentTime = timestamp;
      setActiveReviewTimestamp(timestamp);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [analysisStatus, duration, scanQuality?.allowCoaching, setFeedback?.reviewAtSeconds]);

  if (flowStage === "intro") {
    return (
      <div className="form-flow-shell grt-page-entry">
        <section className="form-intro-block" aria-labelledby="form-intro-heading">
          <div className="form-intro-copy">
            <p className="block-label">Form Check</p>
            <h1 id="form-intro-heading">Check your form.</h1>
            <p>Choose a movement. Get one clear correction.</p>
          </div>
          <div className="form-exercise-choice">
            <p className="block-label">Movement</p>
            <div className="form-exercise-selector" role="radiogroup" aria-label="Choose a movement to analyze">
              {FORM_CHECK_EXERCISES.map((exercise, index) => (
                <button
                  key={exercise.id}
                  type="button"
                  role="radio"
                  aria-checked={exercise.id === selectedExerciseId}
                  data-selected={exercise.id === selectedExerciseId}
                  onClick={() => selectExercise(exercise.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{exercise.name}</strong>
                  <small>{exercise.familyLabel}</small>
                  <span aria-hidden="true">{exercise.id === selectedExerciseId ? "●" : "○"}</span>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="grt-primary-inverse grt-pressable" onClick={() => setFlowStage("instructions")}>
            Continue with {selectedExercise.name.toLowerCase()} <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>
    );
  }

  if (flowStage === "instructions") {
    const instructions = selectedExercise.instructions;

    return (
      <div className="form-flow-shell grt-page-entry">
        <section className="form-instruction-block" aria-labelledby="form-instructions-heading">
          <div className="form-instruction-head">
            <p className="block-label">Before upload</p>
            <h1 id="form-instructions-heading">Before you start.</h1>
            <p className="form-instruction-movement">{selectedExercise.name}</p>
          </div>
          <ol className="form-instruction-list">
            {instructions.map((instruction, index) => (
              <li key={instruction} style={{ "--row-index": index } as CSSProperties}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{instruction}</strong>
              </li>
            ))}
          </ol>
          <p className="form-transparency-note">
            For transparency: videos are analyzed for this session. Saved history is not available yet.
          </p>
          <div className="form-instruction-actions">
            <button type="button" className="grt-text-button" onClick={() => setFlowStage("intro")}>Back</button>
            <button type="button" className="grt-primary-inverse grt-pressable" onClick={() => setFlowStage("workspace")}>
              I understand <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="workspace-shell form-results-stage grt-page-entry">
        <header className="form-results-heading">
          <div>
            <p className="grt-overline">Form Check / Review</p>
            <h1>Your feedback.</h1>
            <p>{selectedExercise.name}. One correction. One cue for the next rep.</p>
          </div>
          <button
            type="button"
            className="result-new-upload grt-pressable"
            onClick={clearVideo}
          >
            New upload <span aria-hidden="true">→</span>
          </button>
        </header>

        <div className="form-results-grid">
          <section className="result-video-column" aria-label={`Analyzed ${selectedExercise.name.toLowerCase()} video`}>
            <div className="result-video-frame">
              <video
                ref={videoRef}
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={handleMetadataLoaded}
              >
                Your browser does not support video playback.
              </video>
              <span className="result-video-label">
                {activeReviewTimestamp !== null
                  ? `Review · ${formatVideoTimestamp(activeReviewTimestamp)}`
                  : "Analyzed set"}
              </span>
            </div>
            <div className="result-video-meta">
              <span>{repetitionCount} complete {repetitionCount === 1 ? "rep" : "reps"}</span>
              <span>{duration !== null ? `${duration.toFixed(1)} sec` : "Short clip"}</span>
            </div>
          </section>

          <FormCoachingReview
            feedback={showResults}
            activeReviewTimestamp={activeReviewTimestamp}
            onReviewMoment={reviewVideoMoment}
          />
        </div>

        <details className="result-set-details">
          <summary>
            <span>
              <strong>Set details</strong>
              <small>Capture quality, joint measurements, and rep breakdown</small>
            </span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="result-set-details-content">
            <AnalysisSummary
              analyzedFrames={analyzedFrames}
              visibleLandmarks={visibleLandmarks}
              repetitionCount={repetitionCount}
              angleSummary={angleSummary}
              quality={scanQuality}
              exercise={selectedExercise}
            />
            <RepBreakdown
              repetitions={repAnalyses}
              exercise={selectedExercise}
              activeReviewTimestamp={activeReviewTimestamp}
              onReviewMoment={reviewVideoMoment}
            />
          </div>
        </details>

        <p className="review-disclaimer">
          Camera-based estimate for educational feedback. Stop if you feel pain.
        </p>
      </div>
    );
  }

  return (
    <div className="workspace-shell grt-form-workspace grt-page-entry">
      <header className="grt-page-heading form-workspace-heading" aria-labelledby="page-heading">
        <p className="grt-overline">Form Check / {selectedExercise.name}</p>
        <h1 id="page-heading">Upload a side view.</h1>
        <p>MP4, MOV, or WebM. 5 - 30 seconds.</p>
        <button type="button" onClick={() => setFlowStage("intro")}>Change movement</button>
      </header>

      <div className="workspace-grid">
        <section className="work-panel" aria-labelledby="upload-heading">
          <div className="panel-header">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="step-label">{selectedExercise.name}</p>
                <h2 id="upload-heading" className="grt-type-block mt-1 text-[#ffffff]">
                  {videoFile ? "Review your clip" : "Choose your input"}
                </h2>
              </div>
            </div>
            <WorkflowSteps currentStep={workflowStep} />
          </div>

          <div className="panel-body">
            {!videoFile ? (
              <div className="capture-input">
                <div
                  className="input-method-switch"
                  role="group"
                  aria-label="Choose video input method"
                >
                  <button
                    type="button"
                    data-selected={inputMode === "upload"}
                    aria-pressed={inputMode === "upload"}
                    onClick={() => changeInputMode("upload")}
                    disabled={
                      isRecording ||
                      recordingCountdown !== null ||
                      cameraStatus === "requesting"
                    }
                  >
                    <Upload className="size-3.5" aria-hidden="true" />
                    Upload clip
                  </button>
                  <button
                    type="button"
                    data-selected={inputMode === "record"}
                    aria-pressed={inputMode === "record"}
                    onClick={() => changeInputMode("record")}
                    disabled={
                      isRecording ||
                      recordingCountdown !== null ||
                      cameraStatus === "requesting"
                    }
                  >
                    <Camera className="size-3.5" aria-hidden="true" />
                    Record now
                  </button>
                </div>

                {inputMode === "upload" ? (
                  <div
                    className={`upload-zone ${isDragging ? "upload-zone-active" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="upload-icon" aria-hidden="true">
                      <Upload className="size-6" />
                    </div>
                    <h3 className="grt-type-block mt-5 text-[#ffffff]">
                      Upload a side view.
                    </h3>
                    <p id="video-requirements" className="grt-type-body mt-2 max-w-sm text-[#ffffff]/48">
                      MP4, MOV, or WebM. Maximum 100 MB.
                    </p>
                    <Button
                      type="button"
                      className="primary-action mt-6 bg-[#ffffff] text-[#000000] hover:bg-[#a3a3a3]"
                      onClick={() => inputRef.current?.click()}
                    >
                      <Film className="size-4" /> Choose video
                    </Button>
                    <input
                      ref={inputRef}
                      id="squat-video"
                      className="sr-only"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,.mov"
                      aria-describedby="video-requirements"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="camera-recorder">
                    <div
                      className="camera-preview-frame"
                      data-state={cameraStatus}
                      data-recording={isRecording}
                    >
                      <video
                        ref={cameraPreviewRef}
                        muted
                        playsInline
                        aria-label="Live camera preview"
                      />

                      {cameraStatus !== "ready" ? (
                        <div className="camera-placeholder">
                          <span className="upload-icon" aria-hidden="true">
                            {cameraStatus === "requesting" ? (
                              <LoaderCircle className="size-5 animate-spin" />
                            ) : (
                              <Camera className="size-5" />
                            )}
                          </span>
                          <h3>
                            {cameraStatus === "requesting"
                              ? "Starting your camera"
                              : `Frame your side-view ${selectedExercise.name.toLowerCase()}`}
                          </h3>
                          <p>
                            Camera access begins only after you choose the button
                            below. Audio is never recorded.
                          </p>
                        </div>
                      ) : null}

                      {recordingCountdown !== null ? (
                        <div className="countdown-overlay" aria-live="assertive">
                          <span>{recordingCountdown}</span>
                          <p>Get into position</p>
                        </div>
                      ) : null}

                      {isRecording ? (
                        <div className="recording-status" aria-live="polite">
                          <span className="recording-dot" aria-hidden="true" />
                          Recording {formatRecordingDuration(recordingSeconds)} / 0:30
                        </div>
                      ) : null}
                    </div>

                    <div className="camera-controls">
                      {cameraStatus !== "ready" ? (
                        <Button
                          type="button"
                          className="primary-action bg-[#ffffff] text-[#000000] hover:bg-[#a3a3a3]"
                          onClick={startCamera}
                          disabled={cameraStatus === "requesting"}
                        >
                          {cameraStatus === "requesting" ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Camera className="size-4" />
                          )}
                          {cameraStatus === "requesting"
                            ? "Starting camera…"
                            : "Turn on camera"}
                        </Button>
                      ) : recordingCountdown !== null ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#a3a3a3]/15 bg-transparent text-[#ffffff]/70 hover:bg-[#ffffff]/8 hover:text-[#ffffff]"
                          onClick={cancelRecordingCountdown}
                        >
                          Cancel countdown
                        </Button>
                      ) : isRecording ? (
                        <Button
                          type="button"
                          className="bg-[#ffffff] text-[#000000] hover:bg-[#a3a3a3]"
                          onClick={stopRecording}
                        >
                          <Square className="size-3.5 fill-current" /> Stop recording
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="primary-action bg-[#ffffff] text-[#000000] hover:bg-[#a3a3a3]"
                          onClick={startRecordingCountdown}
                        >
                          <Camera className="size-4" /> Record clip
                        </Button>
                      )}

                      {cameraStatus === "ready" &&
                      !isRecording &&
                      recordingCountdown === null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-[#ffffff]/52 hover:bg-[#ffffff]/8 hover:text-[#ffffff]"
                          onClick={turnOffCamera}
                        >
                          <CameraOff className="size-4" /> Turn off
                        </Button>
                      ) : null}
                    </div>

                    <p className="camera-privacy-note">
                      Record 5 - 30 seconds. Audio is not recorded.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="video-frame">
                  <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={handleMetadataLoaded}
                    onEnded={finishScan}
                    onPlay={resumeScanLoop}
                  >
                    Your browser does not support video playback.
                  </video>
                  <canvas ref={canvasRef} className="pose-overlay" aria-hidden="true" />
                  <span className="video-label">Side view · {selectedExercise.name.toLowerCase()}</span>
                  {analysisStatus === "scanning" ? (
                    <span className="scan-label">
                      <span className="scan-pulse" /> {formatMovementPhase(movementPhase, selectedExercise.family)}
                    </span>
                  ) : null}
                </div>

                <div className="file-summary">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="file-summary-icon" aria-hidden="true">
                      <Video className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="grt-type-ui truncate text-[#ffffff]">
                        {videoFile.name}
                      </p>
                      <p className="grt-type-ui mt-1 text-[#ffffff]/42">
                        {formatBytes(videoFile.size)}
                        {duration !== null ? ` · ${duration.toFixed(1)} seconds` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 text-[#ffffff]/65 hover:bg-[#ffffff]/10 hover:text-[#ffffff]"
                    onClick={clearVideo}
                    disabled={isBusy}
                  >
                    <RotateCcw className="size-4" /> Replace
                  </Button>
                </div>

                {isBusy || analysisStatus === "complete" ? (
                  <div className="scan-progress" aria-live="polite">
                    <div className="grt-type-ui flex items-center justify-between gap-4 text-[#ffffff]/50">
                      <span>
                        {analysisStatus === "loading"
                          ? "Preparing on-device model"
                          : analysisStatus === "scanning"
                            ? `Analyzing movement · ${analyzedFrames} frames`
                            : "Movement analysis complete"}
                      </span>
                      <span className="grt-type-numeric text-[#ffffff]/70">
                        {Math.round(analysisStatus === "loading" ? 8 : scanProgress)}%
                      </span>
                    </div>
                    <Progress
                      value={analysisStatus === "loading" ? 8 : scanProgress}
                      className="h-2 bg-[#ffffff]/10 [&>div]:bg-[#ffffff]"
                    />
                  </div>
                ) : null}

                {currentAngles && analysisStatus !== "loading" ? (
                  <div
                    className="live-tracking-card"
                    aria-live="polite"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="grt-type-block text-[#ffffff]">
                          Live {selectedExercise.family === "squat"
                            ? "squat"
                            : selectedExercise.family === "hinge"
                              ? "hinge"
                              : selectedExercise.family === "unilateral"
                                ? "single-leg"
                                : selectedExercise.family === "row"
                                  ? "row"
                                  : selectedExercise.family === "vertical-pull"
                                    ? "vertical pull"
                                    : selectedExercise.family === "knee-isolation"
                                      ? "leg isolation"
                                    : selectedExercise.family === "arm-isolation"
                                      ? "arm isolation"
                                      : selectedExercise.family === "core-flexion"
                                        ? "core"
                                      : selectedExercise.family === "calf-isolation"
                                        ? "calf"
                                      : selectedExercise.family === "shoulder-isolation"
                                        ? "shoulder isolation"
                                      : selectedExercise.family === "chest-isolation"
                                        ? "chest isolation"
                                      : selectedExercise.family === "rear-shoulder-isolation"
                                        ? "rear shoulder"
                                      : selectedExercise.family === "straight-arm-pull"
                                        ? "straight-arm pull"
                                      : selectedExercise.family === "hip-machine"
                                        ? "hip machine"
                                    : isOverheadPressExerciseId(selectedExercise.id)
                                      ? "overhead"
                                      : "press"} tracking
                        </p>
                        <p className="grt-type-body mt-1 text-[#ffffff]/45">
                          {liveCue ?? describeMovementPhase(movementPhase, selectedExercise.family)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-chip">
                          {formatMovementPhase(movementPhase, selectedExercise.family)}
                        </span>
                        <span className="status-chip capitalize">
                          {currentAngles.side === "bilateral"
                            ? "Front view"
                            : `${currentAngles.side} side`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                      <AngleMetric
                        label="Reps"
                        value={repetitionCount}
                        detail="Complete cycles"
                        suffix=""
                      />
                      {isHipMachineAngles(currentAngles) ? (
                        <>
                          <AngleMetric
                            label="Knee spacing"
                            value={currentAngles.kneeSeparation}
                            detail="Relative to hip width"
                            suffix="%"
                          />
                          <AngleMetric
                            label="Left knee"
                            value={currentAngles.leftKneeDistance}
                            detail="Distance from body center"
                            suffix="%"
                          />
                          <AngleMetric
                            label="Right knee"
                            value={currentAngles.rightKneeDistance}
                            detail="Distance from body center"
                            suffix="%"
                          />
                        </>
                      ) : isFlyAngles(currentAngles) ? (
                        <>
                          <AngleMetric
                            label="Hand spacing"
                            value={currentAngles.wristSeparation}
                            detail="Relative to shoulder width"
                            suffix="%"
                          />
                          <AngleMetric
                            label="Left elbow"
                            value={currentAngles.leftElbow}
                            detail="Shoulder–elbow–wrist"
                          />
                          <AngleMetric
                            label="Right elbow"
                            value={currentAngles.rightElbow}
                            detail="Shoulder–elbow–wrist"
                          />
                        </>
                      ) : isArmAngles(currentAngles) ? (
                        <>
                          <AngleMetric
                            label="Elbow"
                            value={currentAngles.elbow}
                            detail="Shoulder–elbow–wrist"
                          />
                          <AngleMetric
                            label="Shoulder"
                            value={currentAngles.shoulder}
                            detail="Torso–shoulder–elbow"
                          />
                          {selectedExercise.family === "row" ||
                          selectedExercise.family === "vertical-pull" ||
                          selectedExercise.family === "arm-isolation" ? (
                            <AngleMetric
                              label="Torso"
                              value={currentAngles.torsoLean}
                              detail="Lean from vertical"
                            />
                          ) : selectedExercise.family === "shoulder-isolation" ||
                            selectedExercise.family === "straight-arm-pull" ? null
                          : isOverheadPressExerciseId(selectedExercise.id) ? (
                            <AngleMetric
                              label="Torso"
                              value={currentAngles.torsoLean}
                              detail="Lean from vertical"
                            />
                          ) : (
                            <AngleMetric
                              label="Wrist offset"
                              value={currentAngles.wristOffset}
                              detail="From vertical stack"
                              suffix="%"
                            />
                          )}
                        </>
                      ) : isCalfRaiseAngles(currentAngles) ? (
                        <>
                          <AngleMetric
                            label="Ankle"
                            value={currentAngles.ankle}
                            detail="Knee–ankle–toes"
                          />
                          <AngleMetric
                            label="Knee"
                            value={currentAngles.knee}
                            detail="Hip–knee–ankle"
                          />
                        </>
                      ) : (
                        <>
                          <AngleMetric
                            label="Knee"
                            value={currentAngles.knee}
                            detail="Hip–knee–ankle"
                          />
                          <AngleMetric
                            label="Hip"
                            value={currentAngles.hip}
                            detail="Shoulder–hip–knee"
                          />
                          <AngleMetric
                            label="Torso"
                            value={currentAngles.torsoLean}
                            detail="Lean from vertical"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {durationIsValid && !error ? (
                  <Button
                    type="button"
                    className="primary-action min-h-11 w-full bg-[#ffffff] text-[#000000] hover:bg-[#a3a3a3]"
                    onClick={startLandmarkScan}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {analysisStatus === "loading"
                      ? "Preparing analysis…"
                      : analysisStatus === "scanning"
                        ? "Analyzing video…"
                        : analysisStatus === "complete"
                          ? "Analyze again"
                          : "Analyze video"}
                  </Button>
                ) : null}

                {analysisStatus === "complete" && !analysisError && scanQuality ? (
                  <AnalysisSummary
                    analyzedFrames={analyzedFrames}
                    visibleLandmarks={visibleLandmarks}
                    repetitionCount={repetitionCount}
                    angleSummary={angleSummary}
                    quality={scanQuality}
                    exercise={selectedExercise}
                  />
                ) : null}

              </div>
            )}

            {error ? (
              <Alert className="mt-4 border-[#a3a3a3]/20 bg-[#a3a3a3]/[0.06] text-[#ffffff]">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Video could not be used</AlertTitle>
                <AlertDescription className="text-[#ffffff]/65">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}
            {analysisError ? (
              <Alert className="mt-4 border-[#666666]/20 bg-[#666666]/[0.06] text-[#ffffff]">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Analysis needs a clearer view</AlertTitle>
                <AlertDescription className="text-[#ffffff]/65">
                  {analysisError}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </section>

      </div>
    </div>
  );
}

function WorkflowSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Instructions" },
    { number: 2, label: "Upload" },
    { number: 3, label: "Review" },
  ];

  return (
    <ol className="workflow-steps" aria-label="Analysis progress">
      {steps.map((step) => {
        const isComplete = currentStep > step.number;
        const isCurrent = currentStep === step.number;

        return (
          <li
            key={step.number}
            className={`workflow-step ${isCurrent ? "workflow-step-current" : ""} ${isComplete ? "workflow-step-complete" : ""}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="workflow-step-marker" aria-hidden="true">
              {isComplete ? <Check className="size-3" /> : step.number}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function AnalysisSummary({
  analyzedFrames,
  visibleLandmarks,
  repetitionCount,
  angleSummary,
  quality,
  exercise,
}: {
  analyzedFrames: number;
  visibleLandmarks: number;
  repetitionCount: number;
  angleSummary: FormAngleSummary | null;
  quality: ScanQualityResult;
  exercise: FormCheckExercise;
}) {
  const movementName = exercise.name.toLowerCase();
  const repetitionMessage =
    repetitionCount === 1
      ? `1 complete ${movementName} repetition was detected.`
      : repetitionCount > 1
        ? `${repetitionCount} complete ${movementName} repetitions were detected.`
        : exercise.family === "row" || exercise.family === "vertical-pull"
          ? "No complete extended-to-pull-to-extended cycle was detected."
          : exercise.family === "arm-isolation"
            ? exercise.id === "triceps_pushdown"
              ? "No complete bent-to-extended-to-bent elbow cycle was detected."
              : "No complete extended-to-flexed-to-extended elbow cycle was detected."
          : exercise.family === "knee-isolation"
            ? exercise.id === "leg_extension"
              ? "No complete bent-to-extended-to-bent knee cycle was detected."
              : "No complete extended-to-curled-to-extended knee cycle was detected."
          : exercise.family === "core-flexion"
            ? "No complete extended-to-flexed-to-extended hip cycle was detected."
          : exercise.family === "calf-isolation"
            ? "No complete lowered-to-raised-to-lowered heel cycle was detected."
          : exercise.family === "shoulder-isolation"
            ? "No complete lowered-to-raised-to-lowered arm cycle was detected."
          : exercise.family === "chest-isolation"
            ? "No complete open-to-closed-to-open arm cycle was detected."
          : exercise.family === "rear-shoulder-isolation"
            ? "No complete closed-to-open-to-closed arm cycle was detected."
          : exercise.family === "straight-arm-pull"
            ? "No complete overhead-to-lowered-to-overhead arm cycle was detected."
          : exercise.family === "hip-machine"
            ? exercise.id === "adductor_machine"
              ? "No complete open-to-closed-to-open knee cycle was detected."
              : "No complete closed-to-open-to-closed knee cycle was detected."
          : exercise.family === "press"
            ? "No complete lockout-to-range-to-lockout cycle was detected."
          : "No complete standing-to-range-to-standing cycle was detected.";
  const detectionThreshold =
    exercise.family === "squat"
      ? "a knee angle at or below 110°"
      : exercise.family === "hinge"
        ? `a hip angle at or below ${getHingeThresholds(
            exercise.id as Extract<
              FormCheckExerciseId,
              "deadlift" | "romanian_deadlift"
            >,
          ).bottom}°`
        : exercise.family === "unilateral"
          ? `a working-knee angle at or below ${UNILATERAL_PHASE_THRESHOLDS.bottom}°`
          : exercise.family === "row"
            ? `an elbow angle at or below ${ROW_PHASE_THRESHOLDS.contracted}°`
            : exercise.family === "vertical-pull"
              ? `an elbow angle at or below ${VERTICAL_PULL_PHASE_THRESHOLDS.contracted}°`
            : exercise.family === "arm-isolation"
              ? exercise.id === "triceps_pushdown"
                ? `an elbow angle at or above ${ARM_ISOLATION_PHASE_THRESHOLDS.triceps_pushdown.peak}°`
                : `an elbow angle at or below ${ARM_ISOLATION_PHASE_THRESHOLDS[exercise.id as ArmIsolationExerciseId].peak}°`
            : exercise.family === "knee-isolation"
              ? exercise.id === "leg_extension"
                ? `a knee angle at or above ${KNEE_ISOLATION_PHASE_THRESHOLDS.leg_extension.peak}°`
                : `a knee angle at or below ${KNEE_ISOLATION_PHASE_THRESHOLDS.leg_curl.peak}°`
            : exercise.family === "core-flexion"
              ? `a hip angle at or below ${CORE_FLEXION_PHASE_THRESHOLDS[exercise.id as CoreFlexionExerciseId].peak}°`
            : exercise.family === "calf-isolation"
              ? `an ankle angle at or above ${CALF_ISOLATION_PHASE_THRESHOLDS[exercise.id as CalfIsolationExerciseId].peak}°`
            : exercise.family === "shoulder-isolation"
              ? `a shoulder angle at or above ${SHOULDER_ISOLATION_PHASE_THRESHOLDS[exercise.id as ShoulderIsolationExerciseId].peak}°`
            : exercise.family === "chest-isolation"
              ? `hand spacing at or below ${CHEST_ISOLATION_PHASE_THRESHOLDS.peak}% of shoulder width`
            : exercise.family === "rear-shoulder-isolation"
              ? `hand spacing at or above ${REAR_SHOULDER_ISOLATION_PHASE_THRESHOLDS.peak}% of shoulder width`
            : exercise.family === "straight-arm-pull"
              ? `a shoulder angle at or below ${STRAIGHT_ARM_PULL_PHASE_THRESHOLDS.peak}°`
            : exercise.family === "hip-machine"
              ? exercise.id === "adductor_machine"
                ? `knee spacing at or below ${HIP_MACHINE_PHASE_THRESHOLDS.adductor_machine.peak}% of hip width`
                : `knee spacing at or above ${HIP_MACHINE_PHASE_THRESHOLDS.abductor_machine.peak}% of hip width`
            : `an elbow angle at or below ${PRESS_PHASE_THRESHOLDS.bottom}°`;

  return (
    <section className="analysis-summary" aria-labelledby="analysis-summary-heading" role="status">
      <div className="analysis-summary-heading">
        <span className="success-icon" data-level={quality.level} aria-hidden="true">
          {quality.allowCoaching ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
        </span>
        <div>
          <h3 id="analysis-summary-heading" className="grt-type-block text-[#ffffff]">
            Analysis complete
          </h3>
          <p className="grt-type-body mt-1 text-[#ffffff]/52">
            {repetitionMessage}
          </p>
        </div>
      </div>

      <div className="summary-metrics">
        <SummaryMetric label="Complete reps" value={repetitionCount.toString()} />
        <SummaryMetric
          label="Capture quality"
          value={formatScanQualityLevel(quality.level)}
        />
        <SummaryMetric label="Landmarks visible" value={`${visibleLandmarks}/33`} />
      </div>

      <div className="quality-gate" data-level={quality.level}>
        <span className="quality-gate-icon" aria-hidden="true">
          {quality.allowCoaching ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="grt-type-ui text-[#ffffff]/82">
            {quality.level === "high"
              ? "Capture quality supports coaching"
              : quality.level === "usable"
                ? "Coaching enabled with some uncertainty"
                : "Coaching score paused for this clip"}
          </p>
          <p className="grt-type-body mt-1 text-[#ffffff]/45">
            {quality.allowCoaching
              ? quality.issues[0] ??
                "The pose remained visible and measurable across the recording."
              : "Record again before relying on form feedback. The movement data was not consistent enough."}
          </p>
          {!quality.allowCoaching && quality.issues.length > 0 ? (
            <ul className="quality-issues">
              {quality.issues.slice(0, 3).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <details className="technical-details">
        <summary>
          <span>Technical measurements</span>
          <ChevronDown className="size-4" aria-hidden="true" />
        </summary>
        <div className="technical-details-content">
          <p>
            Capture quality: {quality.score}/100 heuristic · pose coverage{" "}
            {formatPercentage(quality.poseCoverage)} · measurable joint coverage{" "}
            {formatPercentage(quality.measurementCoverage)} · average landmark
            confidence {formatPercentage(quality.averageConfidence)} · side
            consistency {formatPercentage(quality.sideConsistency)}.
          </p>
          {angleSummary?.kind === "row" ||
          angleSummary?.kind === "vertical-pull" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the lowest elbow angle was {Math.round(angleSummary.minimumElbow)}°,
              the lowest shoulder angle was {Math.round(angleSummary.minimumShoulder)}°,
              and torso position changed by {Math.round(angleSummary.torsoLeanRange)}°.
            </p>
          ) : angleSummary?.kind === "hip-machine" ? (
            <p>
              Across {angleSummary.sampleCount} reliable bilateral samples, knee
              spacing moved between {Math.round(angleSummary.minimumKneeSeparation)}%
              and {Math.round(angleSummary.maximumKneeSeparation)}% of hip width,
              with a maximum left/right difference of {Math.round(angleSummary.maximumKneeAsymmetry)}%.
            </p>
          ) : angleSummary?.kind === "arm-isolation" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the elbow moved between {Math.round(angleSummary.minimumElbow)}°
              and {Math.round(angleSummary.maximumElbow)}°, while upper-arm position
              changed by {Math.round(angleSummary.shoulderAngleRange)}°.
            </p>
          ) : angleSummary?.kind === "press" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the lowest elbow angle was {Math.round(angleSummary.minimumElbow)}°,
              the lowest shoulder angle was {Math.round(angleSummary.minimumShoulder)}°,
              and {isDipExerciseId(exercise.id)
                ? `torso position changed by ${Math.round(angleSummary.torsoLeanRange)}°.`
                : isOverheadPressExerciseId(exercise.id)
                ? `peak torso lean was ${Math.round(angleSummary.maximumTorsoLean)}°.`
                : `wrist offset at the deepest position was ${Math.round(angleSummary.wristOffsetAtBottom)}%.`}
            </p>
          ) : angleSummary?.kind === "knee-isolation" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the knee moved between {Math.round(angleSummary.minimumKnee)}°
              and {Math.round(angleSummary.maximumKnee)}°, while thigh position
              changed by {Math.round(angleSummary.hipAngleRange)}°.
            </p>
          ) : angleSummary?.kind === "core-flexion" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the hip moved between {Math.round(angleSummary.minimumHip)}°
              and {Math.round(angleSummary.maximumHip)}°, while torso position
              changed by {Math.round(angleSummary.torsoLeanRange)}°.
            </p>
          ) : angleSummary?.kind === "calf-isolation" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the ankle moved between {Math.round(angleSummary.minimumAnkle)}°
              and {Math.round(angleSummary.maximumAnkle)}°, while knee position
              changed by {Math.round(angleSummary.kneeAngleRange)}°.
            </p>
          ) : angleSummary?.kind === "shoulder-isolation" ||
            angleSummary?.kind === "straight-arm-pull" ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the shoulder moved between {Math.round(angleSummary.minimumShoulder)}°
              and {Math.round(angleSummary.maximumShoulder)}°, while elbow position
              changed by {Math.round(angleSummary.elbowAngleRange)}°.
            </p>
          ) : angleSummary?.kind === "chest-isolation" ||
            angleSummary?.kind === "rear-shoulder-isolation" ? (
            <p>
              Across {angleSummary.sampleCount} reliable bilateral samples, hand
              spacing moved between {Math.round(angleSummary.minimumWristSeparation)}%
              and {Math.round(angleSummary.maximumWristSeparation)}% of shoulder
              width, while average elbow position changed by {Math.round(angleSummary.elbowAngleRange)}°.
            </p>
          ) : angleSummary ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the lowest knee angle was {Math.round(angleSummary.minimumKnee)}°,
              the lowest hip angle was {Math.round(angleSummary.minimumHip)}°, and
              peak torso lean was {Math.round(angleSummary.maximumTorsoLean)}°.
            </p>
          ) : null}
          <p>
            {analyzedFrames} pose frames contributed to this scan. Rep detection
            requires {exercise.family === "press" || exercise.family === "row" || exercise.family === "vertical-pull"
              ? "an extended-arm start"
              : exercise.family === "arm-isolation"
                ? exercise.id === "triceps_pushdown" ? "a bent-elbow start" : "an extended-arm start"
              : exercise.family === "knee-isolation"
                ? exercise.id === "leg_extension" ? "a bent-knee start" : "an extended-knee start"
              : exercise.family === "core-flexion"
                ? "the instructed extended hip position"
              : exercise.family === "calf-isolation"
                ? "a lowered-heel start"
              : exercise.family === "shoulder-isolation"
                ? "a lowered-arm start"
              : exercise.family === "chest-isolation"
                ? "an open-arm start"
              : exercise.family === "rear-shoulder-isolation"
                ? "a closed-arm start"
              : exercise.family === "straight-arm-pull"
                ? "an overhead-arm start"
              : exercise.family === "hip-machine"
                ? exercise.id === "adductor_machine" ? "an open-knee start" : "a closed-knee start"
                : "a standing start"}, {detectionThreshold} for the detected
            range, and a return to {exercise.family === "press" || exercise.family === "row" || exercise.family === "vertical-pull"
              ? "extended arms"
              : exercise.family === "arm-isolation"
                ? exercise.id === "triceps_pushdown" ? "the bent-elbow start" : "extended arms"
              : exercise.family === "knee-isolation"
                ? exercise.id === "leg_extension" ? "the bent-knee start" : "the extended-knee start"
              : exercise.family === "core-flexion"
                ? "the extended hip start"
              : exercise.family === "calf-isolation"
                ? "the lowered-heel start"
              : exercise.family === "shoulder-isolation"
                ? "the lowered-arm start"
              : exercise.family === "chest-isolation"
                ? "the open-arm start"
              : exercise.family === "rear-shoulder-isolation"
                ? "the closed-arm start"
              : exercise.family === "straight-arm-pull"
                ? "the overhead-arm start"
              : exercise.family === "hip-machine"
                ? exercise.id === "adductor_machine" ? "the open-knee start" : "the closed-knee start"
                : "standing"}. These are detection
            thresholds, not safety targets.
          </p>
        </div>
      </details>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

type SetFeedback = {
  score: number;
  rating: "Strong" | "Good" | "Needs work";
  good: Array<{ area: string; detail: string }>;
  fixTitle: string;
  fixDetail: string;
  nextCue: string;
  reviewAtSeconds: number | null;
};

function createSetFeedback(
  repetitions: FormRepAnalysis[],
  averageScore: number,
  exercise: FormCheckExercise,
): SetFeedback {
  const isOverheadPress = isOverheadPressExerciseId(exercise.id);
  const isDip = isDipExerciseId(exercise.id);
  const isRow = exercise.family === "row";
  const isVerticalPull = exercise.family === "vertical-pull";
  const isPullingFamily = isRow || isVerticalPull;
  const isKneeIsolation = exercise.family === "knee-isolation";
  const isArmIsolation = exercise.family === "arm-isolation";
  const isCoreFlexion = exercise.family === "core-flexion";
  const isCalfIsolation = exercise.family === "calf-isolation";
  const isShoulderIsolation = exercise.family === "shoulder-isolation";
  const isChestIsolation = exercise.family === "chest-isolation";
  const isRearShoulderIsolation = exercise.family === "rear-shoulder-isolation";
  const isStraightArmPull = exercise.family === "straight-arm-pull";
  const isHipMachine = exercise.family === "hip-machine";
  const coachingAreas = exercise.family === "squat"
    ? ["Depth", "Torso", "Tempo"]
    : exercise.family === "hinge"
      ? ["Range", "Knee bend", "Tempo"]
      : exercise.family === "unilateral"
        ? ["Range", "Torso", "Tempo"]
        : isKneeIsolation
          ? ["Range", "Thigh stability", "Tempo"]
        : isArmIsolation
          ? ["Range", "Upper-arm stability", "Tempo"]
        : isCoreFlexion
          ? ["Range", "Body stability", "Tempo"]
        : isCalfIsolation
          ? ["Range", "Knee stability", "Tempo"]
        : isShoulderIsolation
          ? ["Range", "Elbow stability", "Tempo"]
        : isChestIsolation || isRearShoulderIsolation || isStraightArmPull
          ? ["Range", "Elbow stability", "Tempo"]
        : isHipMachine
          ? ["Range", "Knee symmetry", "Tempo"]
        : isPullingFamily || isDip
          ? ["Range", "Torso stability", "Tempo"]
        : isOverheadPress
          ? ["Range", "Torso", "Tempo"]
          : ["Range", "Wrist position", "Tempo"];
  const adjustmentCounts = repetitions
    .flatMap((repetition) => repetition.signals)
    .filter((signal) => signal.status === "adjust")
    .reduce<Record<string, number>>((counts, signal) => {
      counts[signal.area] = (counts[signal.area] ?? 0) + 1;
      return counts;
    }, {});
  const primaryArea = coachingAreas
    .filter((area) => adjustmentCounts[area])
    .sort(
      (first, second) =>
        adjustmentCounts[second] - adjustmentCounts[first],
    )[0];
  const primarySignal = primaryArea
    ? repetitions
        .flatMap((repetition) => repetition.signals)
        .find(
          (signal) =>
            signal.area === primaryArea && signal.status === "adjust",
        )
    : null;
  const good = coachingAreas
    .filter((area) =>
      repetitions.every((repetition) =>
        repetition.signals.some(
          (signal) => signal.area === area && signal.status === "good",
        ),
      ),
    )
    .map((area) => ({
      area,
      detail:
        area === "Depth"
          ? "Range stayed controlled."
          : area === "Torso"
            ? "Torso position stayed stable."
            : area === "Range"
              ? exercise.family === "hinge"
                ? "The hip hinge reached a consistent range."
                : exercise.family === "unilateral"
                  ? "The working leg reached a consistent range."
                  : isKneeIsolation
                    ? "The working knee reached a consistent range."
                  : isArmIsolation
                    ? "The working elbow reached a consistent range."
                  : isCoreFlexion
                    ? "The core movement reached a consistent range."
                  : isCalfIsolation
                    ? "The heel raise reached a consistent range."
                  : isShoulderIsolation
                    ? "The arm raise reached a consistent range."
                  : isChestIsolation
                    ? "The arms reached a consistent closing range."
                  : isRearShoulderIsolation
                    ? "The arms reached a consistent opening range."
                  : isStraightArmPull
                    ? "The arm reached a consistent pulling range."
                  : isDip
                    ? "The dip reached a consistent elbow range."
                  : isHipMachine
                    ? exercise.id === "adductor_machine"
                      ? "The knees reached a consistent closing range."
                      : "The knees reached a consistent opening range."
                  : isPullingFamily
                    ? "The pull reached a consistent range."
                  : "The press reached a consistent range."
              : area === "Knee bend"
                ? "Knee bend matched the selected hinge."
                : area === "Wrist position"
                  ? "The wrist stayed stacked over the elbow."
                  : area === "Torso stability"
                    ? "Torso position stayed stable."
                    : area === "Thigh stability"
                      ? "The thigh stayed stable."
                      : area === "Upper-arm stability"
                        ? "The upper arm stayed stable."
                        : area === "Body stability"
                          ? exercise.id === "crunch"
                            ? "The lower body stayed stable."
                            : "The torso stayed stable."
                        : area === "Knee stability"
                          ? "The knee position stayed stable."
                        : area === "Elbow stability"
                          ? "The elbow position stayed consistent."
            : "Rep speed stayed controlled.",
    }));

  if (primarySignal?.area === "Depth") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "Depth stops short.",
      fixDetail: "Sit slightly deeper without losing control.",
      nextCue: "Next rep: sit slightly deeper.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Torso") {
    if (isOverheadPress) {
      return {
        score: averageScore,
        rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
        good,
        fixTitle: "The torso leans back.",
        fixDetail: "Stay tall and reduce the backward lean as the weight moves overhead.",
        nextCue: "Next rep: stay tall through the press.",
        reviewAtSeconds: primarySignal.timestampSeconds,
      };
    }

    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "Chest drifts forward.",
      fixDetail: "Brace before you descend and keep the chest steady.",
      nextCue: "Next rep: brace, then descend.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Range") {
    const isUnilateral = exercise.family === "unilateral";
    const isPress = exercise.family === "press";
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: isPullingFamily
        ? "The pull stops short."
        : isHipMachine
          ? exercise.id === "adductor_machine"
            ? "The knee closure stops short."
            : "The knee opening stops short."
        : isArmIsolation
          ? "The working range stops short."
        : isKneeIsolation
          ? "The working range stops short."
        : isCoreFlexion
          ? "The working range stops short."
        : isCalfIsolation
          ? "The heel raise stops short."
        : isShoulderIsolation
          ? "The arm raise stops short."
        : isChestIsolation
          ? "The arm closure stops short."
        : isRearShoulderIsolation
          ? "The arm opening stops short."
        : isStraightArmPull
          ? "The arm pull stops short."
        : isPress
        ? isDip ? "The dip stops short." : "The press stops short."
        : isUnilateral
          ? "The range stops short."
          : "The hinge stops short.",
      fixDetail: isPullingFamily
        ? "Pull through a slightly larger comfortable range before returning the weight."
        : isHipMachine
          ? exercise.id === "adductor_machine"
            ? "Bring the knees through a slightly larger comfortable range before reopening."
            : "Open the knees through a slightly larger comfortable range before returning."
        : isArmIsolation
          ? exercise.id === "biceps_curl"
            ? "Curl through a slightly larger comfortable range before returning."
            : "Extend through a slightly larger comfortable range before returning."
        : isKneeIsolation
          ? exercise.id === "leg_extension"
            ? "Extend through a slightly larger comfortable range before returning."
            : "Curl through a slightly larger comfortable range before returning."
        : isCoreFlexion
          ? "Move through a slightly larger comfortable range before returning."
        : isCalfIsolation
          ? "Raise the heel through a slightly larger comfortable range before returning."
        : isShoulderIsolation
          ? "Raise the arm through a slightly larger comfortable range before returning."
        : isChestIsolation
          ? "Bring the arms through a slightly larger comfortable range before reopening."
        : isRearShoulderIsolation
          ? "Open the arms through a slightly larger comfortable range before returning."
        : isStraightArmPull
          ? "Pull the arm through a slightly larger comfortable range before returning."
        : isPress
        ? isDip
          ? "Lower through a slightly larger comfortable elbow range before returning to the top."
          : "Lower slightly farther through a comfortable range before pressing up."
        : isUnilateral
          ? "Lower slightly farther through the working leg without losing control."
          : "Send the hips farther back while keeping the weight close.",
      nextCue: isPullingFamily
        ? "Next rep: finish the pull."
        : isHipMachine
          ? exercise.id === "adductor_machine"
            ? "Next rep: finish the knee closure."
            : "Next rep: finish the knee opening."
        : isArmIsolation
          ? exercise.id === "biceps_curl"
            ? "Next rep: finish the curl."
            : "Next rep: finish the extension."
        : isKneeIsolation
          ? exercise.id === "leg_extension"
            ? "Next rep: finish the extension."
            : "Next rep: finish the curl."
        : isCoreFlexion
          ? "Next rep: finish the working range."
        : isCalfIsolation
          ? "Next rep: finish the heel raise."
        : isShoulderIsolation
          ? "Next rep: finish the arm raise."
        : isChestIsolation
          ? "Next rep: finish the arm closure."
        : isRearShoulderIsolation
          ? "Next rep: finish the arm opening."
        : isStraightArmPull
          ? "Next rep: finish the arm pull."
        : isPress
        ? isDip ? "Next rep: finish the dip range." : "Next rep: lower with control."
        : isUnilateral
          ? "Next rep: lower with control."
          : "Next rep: hips farther back.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Knee symmetry") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "The knees move unevenly.",
      fixDetail: "Move both knees more evenly through the working range and return.",
      nextCue: "Next rep: move both knees together.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Torso stability") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: isDip
        ? "The torso angle changes during the dip."
        : isVerticalPull
        ? "The torso swings during the pull."
        : "The torso shifts during the row.",
      fixDetail: isDip
        ? "Keep the torso angle more consistent through the lowering and return."
        : isVerticalPull
        ? "Reduce the swing and keep the torso controlled through the pull and return."
        : "Hold the same torso position through the pull and controlled return.",
      nextCue: isDip
        ? "Next rep: keep the torso steady."
        : isVerticalPull
        ? "Next rep: control the torso."
        : "Next rep: keep the torso still.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Thigh stability") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "The thigh shifts during the rep.",
      fixDetail: "Keep the thigh steady while the lower leg moves through the working range and return.",
      nextCue: "Next rep: keep the thigh still.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Upper-arm stability") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "The upper arm shifts during the rep.",
      fixDetail: "Keep the upper arm steady while the forearm moves through the working range and return.",
      nextCue: "Next rep: keep the upper arm still.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Body stability") {
    const isCrunch = exercise.id === "crunch";
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: isCrunch
        ? "The lower body shifts during the rep."
        : "The torso shifts during the rep.",
      fixDetail: isCrunch
        ? "Keep the lower body steadier while the torso curls and returns."
        : "Reduce torso movement while the hips move through the working range and return.",
      nextCue: isCrunch
        ? "Next rep: keep the lower body still."
        : "Next rep: keep the torso steady.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Knee stability") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "The knee shifts during the rep.",
      fixDetail: "Keep the knee position steadier while the heel rises and returns.",
      nextCue: "Next rep: keep the knee steady.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Elbow stability") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "The elbow bend changes during the rep.",
      fixDetail: isChestIsolation
        ? "Keep the elbow bend more consistent while the arms close and reopen."
        : isRearShoulderIsolation
          ? "Keep the elbow bend more consistent while the arms open and close."
        : isStraightArmPull
          ? "Keep the elbow bend more consistent while the arm pulls down and returns."
        : "Keep the elbow position more consistent while the arm rises and lowers.",
      nextCue: "Next rep: keep the elbow steady.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Wrist position") {
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: "The wrist drifts from the elbow.",
      fixDetail: "At the bottom, bring the wrist closer over the elbow in the side view.",
      nextCue: "Next rep: wrist over elbow.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Knee bend") {
    const isRdl = exercise.id === "romanian_deadlift";
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: isRdl ? "The knees bend too much." : "Knee bend needs balance.",
      fixDetail: isRdl
        ? "Keep a soft bend, then let the hips lead the movement."
        : primarySignal.message,
      nextCue: isRdl
        ? "Next rep: soft knees, hips back."
        : "Next rep: hips and knees together.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  if (primarySignal?.area === "Tempo") {
    const movesTooFast = primarySignal.message.startsWith("Slow");
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: movesTooFast ? "The rep moves too fast." : "Tempo loses continuity.",
      fixDetail: movesTooFast
        ? isPullingFamily
          ? "Give the pull and return more time so each phase stays controlled."
          : isKneeIsolation || isArmIsolation || isCoreFlexion || isCalfIsolation || isShoulderIsolation || isChestIsolation || isRearShoulderIsolation || isStraightArmPull || isDip || isHipMachine
            ? "Give the working phase and return more time so each stays controlled."
          : "Give the descent more time so each phase stays controlled."
        : isPullingFamily
          ? "Keep the pull and return moving at a steady pace."
          : isKneeIsolation || isArmIsolation || isCoreFlexion || isCalfIsolation || isShoulderIsolation || isChestIsolation || isRearShoulderIsolation || isStraightArmPull || isDip || isHipMachine
            ? "Keep the working phase and return moving at a steady pace."
          : "Keep the descent and return moving at a steady pace.",
      nextCue: movesTooFast
        ? isPullingFamily
          ? "Next rep: slow the return."
          : isKneeIsolation || isArmIsolation || isCoreFlexion || isCalfIsolation || isShoulderIsolation || isChestIsolation || isRearShoulderIsolation || isStraightArmPull || isDip || isHipMachine
            ? "Next rep: control the return."
          : "Next rep: slow the descent."
        : "Next rep: keep the rep moving.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  return {
    score: averageScore,
    rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
    good,
    fixTitle: "No recurring fault detected.",
    fixDetail: exercise.family === "hinge"
      ? "Keep the same controlled hinge, knee bend, and tempo."
      : isPullingFamily
        ? "Keep the same pulling range, torso stability, and tempo."
      : isArmIsolation
        ? "Keep the same working range, upper-arm stability, and tempo."
      : isKneeIsolation
        ? "Keep the same working range, thigh stability, and tempo."
      : isCoreFlexion
        ? "Keep the same working range, body stability, and tempo."
      : isCalfIsolation
        ? "Keep the same heel range, knee stability, and tempo."
      : isShoulderIsolation
        ? "Keep the same arm range, elbow position, and tempo."
      : isChestIsolation
        ? "Keep the same arm closure, elbow position, and tempo."
      : isRearShoulderIsolation
        ? "Keep the same arm opening, elbow position, and tempo."
      : isStraightArmPull
        ? "Keep the same pulling range, elbow position, and tempo."
      : isHipMachine
        ? "Keep the same knee range, left/right control, and tempo."
      : exercise.family === "press"
        ? isDip
          ? "Keep the same controlled elbow range, torso position, and tempo."
          : isOverheadPress
          ? "Keep the same controlled range, torso position, and tempo."
          : "Keep the same controlled range, wrist position, and tempo."
        : "Keep the same controlled range, torso position, and tempo.",
    nextCue: "Next rep: repeat the same control.",
    reviewAtSeconds: repetitions[0]?.reviewAtSeconds ?? null,
  };
}

function FormCoachingReview({
  feedback,
  activeReviewTimestamp,
  onReviewMoment,
}: {
  feedback: SetFeedback;
  activeReviewTimestamp: number | null;
  onReviewMoment: (timestampSeconds: number) => void;
}) {
  return (
    <aside className="coaching-review" aria-labelledby="coach-review-heading">
      <div className="result-score-block">
        <p>Score</p>
        <strong>{feedback.score}<small>/100</small></strong>
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

function RepBreakdown({
  repetitions,
  exercise,
  activeReviewTimestamp,
  onReviewMoment,
}: {
  repetitions: FormRepAnalysis[];
  exercise: FormCheckExercise;
  activeReviewTimestamp: number | null;
  onReviewMoment: (timestampSeconds: number) => void;
}) {
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
                    label={isDipExerciseId(exercise.id)
                      ? "Torso drift"
                      : isOverheadPressExerciseId(exercise.id)
                        ? "Torso"
                        : "Wrist offset"}
                    value={isDipExerciseId(exercise.id)
                      ? `${Math.round(repetition.torsoLeanRange ?? 0)}°`
                      : isOverheadPressExerciseId(exercise.id)
                        ? `${Math.round(repetition.maximumTorsoLean)}°`
                        : `${Math.round(repetition.wristOffsetAtBottom ?? 0)}%`}
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
              <RepMetric label="Tempo" value={`${repetition.durationSeconds.toFixed(1)}s`} />
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

function formatVideoTimestamp(timestampSeconds: number) {
  const minutes = Math.floor(timestampSeconds / 60);
  const seconds = Math.max(0, timestampSeconds - minutes * 60);
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function RepMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#ffffff]/[0.045] px-3 py-2">
      <p className="grt-type-label uppercase text-[#ffffff]/35">{label}</p>
      <p className="grt-type-numeric grt-metric-value mt-0.5 text-[#ffffff]/80">{value}</p>
    </div>
  );
}

function formatMovementPhase(
  phase: MovementPhase,
  family: FormCheckExercise["family"],
) {
  switch (phase) {
    case "find-start":
      return family === "press" ||
        family === "row" ||
        family === "vertical-pull"
        ? "Find extended start"
        : family === "knee-isolation"
          ? "Find knee start"
        : family === "arm-isolation"
          ? "Find elbow start"
        : family === "core-flexion"
          ? "Find hip start"
        : family === "calf-isolation"
          ? "Find heel start"
        : family === "shoulder-isolation"
          ? "Find arm start"
        : family === "chest-isolation"
          ? "Find open start"
        : family === "rear-shoulder-isolation"
          ? "Find closed start"
        : family === "straight-arm-pull"
          ? "Find overhead start"
        : family === "hip-machine"
          ? "Find knee start"
        : "Find standing start";
    case "start":
      return "Start position";
    case "working":
      return "Working range";
    case "peak":
      return "Peak range";
    case "standing":
      return "Standing";
    case "locked-out":
      return "Arms extended";
    case "extended":
      return "Arm extended";
    case "descending":
      return "Descending";
    case "lowering":
      return "Lowering";
    case "hinging":
      return "Hinging";
    case "bottom":
      return "Bottom";
    case "ascending":
      return "Ascending";
    case "rising":
      return "Rising";
    case "pressing":
      return "Pressing";
    case "pulling":
      return "Pulling";
    case "contracted":
      return "Full pull";
    case "returning":
      return "Returning";
  }
}

function describeMovementPhase(
  phase: MovementPhase,
  family: FormCheckExercise["family"],
) {
  switch (phase) {
    case "find-start":
      return family === "press" ||
        family === "row" ||
        family === "vertical-pull"
        ? "Begin with the arms extended so the tracker can establish the start of a repetition."
        : family === "knee-isolation"
          ? "Use the instructed knee position so the tracker can establish the start of a repetition."
        : family === "arm-isolation"
          ? "Use the instructed elbow position so the tracker can establish the start of a repetition."
        : family === "core-flexion"
          ? "Use the instructed extended hip position so the tracker can establish the start of a repetition."
        : family === "calf-isolation"
          ? "Begin with the heel lowered so the tracker can establish the start of a repetition."
        : family === "shoulder-isolation"
          ? "Begin with the working arm lowered so the tracker can establish the start of a repetition."
        : family === "chest-isolation"
          ? "Begin with both arms open so the tracker can establish the start of a repetition."
        : family === "rear-shoulder-isolation"
          ? "Begin with both arms in the closed start position so the tracker can establish the start of a repetition."
        : family === "straight-arm-pull"
          ? "Begin with the working arm extended overhead so the tracker can establish the start of a repetition."
        : family === "hip-machine"
          ? "Use the instructed open or closed knee position so the tracker can establish the start of a repetition."
        : "Begin upright so the tracker can establish the start of a repetition.";
    case "start":
      return family === "arm-isolation"
        ? "The elbow start position is detected. The working phase can begin."
        : family === "core-flexion"
          ? "The hip start position is detected. The working phase can begin."
        : family === "calf-isolation"
          ? "The lowered-heel start is detected. The raise can begin."
        : family === "shoulder-isolation"
          ? "The lowered-arm start is detected. The raise can begin."
        : family === "chest-isolation"
          ? "The open-arm start is detected. The closing phase can begin."
        : family === "rear-shoulder-isolation"
          ? "The closed-arm start is detected. The opening phase can begin."
        : family === "straight-arm-pull"
          ? "The overhead-arm start is detected. The pulling phase can begin."
        : family === "hip-machine"
          ? "The knee start position is detected. The working phase can begin."
        : "The knee start position is detected. The working phase can begin.";
    case "working":
      return family === "arm-isolation"
        ? "The elbow is moving through the working range."
        : family === "core-flexion"
          ? "The hip angle is closing through the working range."
        : family === "calf-isolation"
          ? "The ankle angle is opening as the heel rises."
        : family === "shoulder-isolation"
          ? "The shoulder angle is opening as the arm rises."
        : family === "chest-isolation"
          ? "The hands are moving closer as the arms close."
        : family === "rear-shoulder-isolation"
          ? "The hands are moving apart as the arms open."
        : family === "straight-arm-pull"
          ? "The shoulder angle is closing as the arm pulls down."
        : family === "hip-machine"
          ? "The knees are moving through the working range."
        : "The knee is moving through the working range.";
    case "peak":
      return family === "arm-isolation"
        ? "The conservative elbow-range threshold has been reached."
        : family === "core-flexion"
          ? "The conservative hip-range threshold has been reached."
        : family === "calf-isolation"
          ? "The conservative ankle-range threshold has been reached."
        : family === "shoulder-isolation"
          ? "The conservative shoulder-range threshold has been reached."
        : family === "chest-isolation"
          ? "The conservative arm-closure threshold has been reached."
        : family === "rear-shoulder-isolation"
          ? "The conservative arm-opening threshold has been reached."
        : family === "straight-arm-pull"
          ? "The conservative straight-arm pulling threshold has been reached."
        : family === "hip-machine"
          ? "The conservative knee-spacing threshold has been reached."
        : "The conservative knee-range threshold has been reached.";
    case "standing":
      return "Standing position detected. The next descent can begin a repetition.";
    case "locked-out":
      return "Extended-arm position detected. The next lowering phase can begin a repetition.";
    case "extended":
      return "Extended-arm position detected. The next pull can begin a repetition.";
    case "descending":
      return "The knee angle is decreasing as the movement travels downward.";
    case "hinging":
      return "The hip angle is closing as the hips travel back.";
    case "lowering":
      return "The elbow angle is closing as the weight travels downward.";
    case "bottom":
      return "The conservative bottom threshold has been reached.";
    case "ascending":
      return "The knee angle is increasing on the return toward standing.";
    case "rising":
      return "The hip angle is opening on the return toward standing.";
    case "pressing":
      return "The elbow angle is opening on the press toward extended arms.";
    case "pulling":
      return "The elbow angle is closing as the weight moves toward the torso.";
    case "contracted":
      return "The conservative pulling-range threshold has been reached.";
    case "returning":
      return family === "knee-isolation"
        ? "The knee is returning to the start position."
        : family === "arm-isolation"
          ? "The elbow is returning to the start position."
        : family === "core-flexion"
          ? "The hip angle is opening on the controlled return."
        : family === "calf-isolation"
          ? "The heel is lowering to the start position."
        : family === "shoulder-isolation"
          ? "The arm is lowering to the start position."
        : family === "chest-isolation"
          ? "The arms are reopening to the start position."
        : family === "rear-shoulder-isolation"
          ? "The arms are returning to the closed start position."
        : family === "straight-arm-pull"
          ? "The arm is returning to the overhead start position."
        : family === "hip-machine"
          ? "The knees are returning to the start position."
        : "The elbow angle is opening on the controlled return.";
  }
}

function AngleMetric({
  label,
  value,
  detail,
  suffix = "°",
}: {
  label: string;
  value: number;
  detail: string;
  suffix?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#a3a3a3]/8 bg-[#ffffff]/[0.035] px-3 py-3">
      <p className="grt-type-label uppercase text-[#ffffff]/38">
        {label}
      </p>
      <p className="grt-type-numeric grt-angle-value mt-1 text-[#ffffff]">
        {Math.round(value)}{suffix}
      </p>
      <p className="grt-type-label grt-angle-detail mt-1 hidden text-[#ffffff]/35 sm:block">
        {detail}
      </p>
    </div>
  );
}
