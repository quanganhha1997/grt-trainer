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
import {
  calculateSquatAngles,
  smoothSquatAngles,
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
  type SquatRepAnalysis,
} from "@/lib/squat-coaching";
import {
  createSquatTracker,
  updateSquatTracker,
  type SquatPhase,
} from "@/lib/squat-repetition";

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
type AngleSummary = {
  side: SquatAngles["side"];
  sampleCount: number;
  minimumKnee: number;
  minimumHip: number;
  maximumTorsoLean: number;
};

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
  const angleSamplesRef = useRef(0);
  const confidenceTotalRef = useRef(0);
  const sideSamplesRef = useRef({ left: 0, right: 0 });
  const minimumKneeAngleRef = useRef(180);
  const minimumHipAngleRef = useRef(180);
  const maximumTorsoLeanRef = useRef(0);
  const squatTrackerRef = useRef(createSquatTracker());
  const squatCoachRef = useRef(createSquatCoach());
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
  const [currentAngles, setCurrentAngles] = useState<SquatAngles | null>(null);
  const [angleSummary, setAngleSummary] = useState<AngleSummary | null>(null);
  const [scanQuality, setScanQuality] = useState<ScanQualityResult | null>(null);
  const [squatPhase, setSquatPhase] = useState<SquatPhase>("find-start");
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [repAnalyses, setRepAnalyses] = useState<SquatRepAnalysis[]>([]);
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
    angleSamplesRef.current = 0;
    confidenceTotalRef.current = 0;
    sideSamplesRef.current = { left: 0, right: 0 };
    minimumKneeAngleRef.current = 180;
    minimumHipAngleRef.current = 180;
    maximumTorsoLeanRef.current = 0;
    squatTrackerRef.current = createSquatTracker();
    squatCoachRef.current = createSquatCoach();
    lastDetectionAtRef.current = 0;
    setAnalysisStatus("idle");
    setAnalysisError("");
    setScanProgress(0);
    setAnalyzedFrames(0);
    setVisibleLandmarks(0);
    setCurrentAngles(null);
    setAngleSummary(null);
    setScanQuality(null);
    setSquatPhase("find-start");
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
        const fileDetails = getRecordedVideoFileDetails(recorderMimeType);
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

      recorder.start(250);
      recordingStartedAtRef.current = performance.now();
      setRecordingSeconds(0);
      setIsRecording(true);
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

  function measureSquatAngles(
    landmarks: NormalizedLandmark[] | undefined,
    timestampSeconds: number,
  ) {
    const video = videoRef.current;
    if (!video) return null;

    const measuredAngles = calculateSquatAngles(
      landmarks,
      video.videoWidth,
      video.videoHeight,
    );

    if (!measuredAngles) return null;

    const smoothedAngles = smoothSquatAngles(
      smoothedAnglesRef.current,
      measuredAngles,
    );
    smoothedAnglesRef.current = smoothedAngles;
    angleSamplesRef.current += 1;
    confidenceTotalRef.current += measuredAngles.confidence;
    sideSamplesRef.current[measuredAngles.side] += 1;
    minimumKneeAngleRef.current = Math.min(
      minimumKneeAngleRef.current,
      smoothedAngles.knee,
    );
    minimumHipAngleRef.current = Math.min(
      minimumHipAngleRef.current,
      smoothedAngles.hip,
    );
    maximumTorsoLeanRef.current = Math.max(
      maximumTorsoLeanRef.current,
      smoothedAngles.torsoLean,
    );
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
    const finalAngles = smoothedAnglesRef.current;
    if (finalAngles && angleSamplesRef.current > 0) {
      setCurrentAngles(finalAngles);
      setAngleSummary({
        side: finalAngles.side,
        sampleCount: angleSamplesRef.current,
        minimumKnee: minimumKneeAngleRef.current,
        minimumHip: minimumHipAngleRef.current,
        maximumTorsoLean: maximumTorsoLeanRef.current,
      });
    }
    setSquatPhase(squatTrackerRef.current.phase);
    setRepetitionCount(squatTrackerRef.current.repetitions);
    setRepAnalyses(squatCoachRef.current.completedReps);
    setScanProgress(100);
    setAnalysisStatus("complete");

    if (detectedFramesRef.current === 0) {
      setAnalysisError(
        "No clear pose was detected. Try a brighter video with your full body in view.",
      );
    } else if (angleSamplesRef.current === 0) {
      setAnalysisError(
        "A pose was detected, but one complete side of the shoulder, hip, knee, and ankle was not visible enough to measure. Try a clearer side-view recording.",
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
          const angles = measureSquatAngles(landmarks, video.currentTime);

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
              setSquatPhase(squatTrackerRef.current.phase);
              setRepetitionCount(squatTrackerRef.current.repetitions);
              setRepAnalyses(squatCoachRef.current.completedReps);
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
    ? getLiveSquatCue(squatPhase, currentAngles)
    : null;
  const workflowStep = analysisStatus === "complete" ? 3 : 2;
  const setFeedback =
    averageScore !== null ? createSetFeedback(repAnalyses, averageScore) : null;
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
            <p>Clear feedback. Better reps.</p>
          </div>
          <ol className="form-rule-preview">
            <li><span>01</span><strong>Side view</strong></li>
            <li><span>02</span><strong>Full body</strong></li>
            <li><span>03</span><strong>5–30 seconds</strong></li>
          </ol>
          <button type="button" className="grt-primary-inverse grt-pressable" onClick={() => setFlowStage("instructions")}>
            Continue <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>
    );
  }

  if (flowStage === "instructions") {
    const instructions = [
      "Use a side view",
      "Show your full body",
      "Keep it 5–30 seconds",
      "Record at least one full rep",
      "Use good lighting",
      "Keep the camera still",
    ];

    return (
      <div className="form-flow-shell grt-page-entry">
        <section className="form-instruction-block" aria-labelledby="form-instructions-heading">
          <div className="form-instruction-head">
            <p className="block-label">Before upload</p>
            <h1 id="form-instructions-heading">Before you start.</h1>
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
            <p>One correction. One cue for the next rep.</p>
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
          <section className="result-video-column" aria-label="Analyzed squat video">
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

          <SquatCoachingReview
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
            />
            <RepBreakdown
              repetitions={repAnalyses}
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
        <p className="grt-overline">Form Check / Bodyweight squat</p>
        <h1 id="page-heading">Upload a side view.</h1>
        <p>MP4, MOV, or WebM. 5–30 seconds.</p>
        <button type="button" onClick={() => setFlowStage("instructions")}>Review instructions</button>
      </header>

      <div className="workspace-grid">
        <section className="work-panel" aria-labelledby="upload-heading">
          <div className="panel-header">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="step-label">Bodyweight squat</p>
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
                              : "Frame your side-view squat"}
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
                      Record 5–30 seconds. Audio is not recorded.
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
                  <span className="video-label">Side view · squat</span>
                  {analysisStatus === "scanning" ? (
                    <span className="scan-label">
                      <span className="scan-pulse" /> {formatSquatPhase(squatPhase)}
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
                          Live squat tracking
                        </p>
                        <p className="grt-type-body mt-1 text-[#ffffff]/45">
                          {liveCue ?? describeSquatPhase(squatPhase)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-chip">
                          {formatSquatPhase(squatPhase)}
                        </span>
                        <span className="status-chip capitalize">
                          {currentAngles.side} side
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
}: {
  analyzedFrames: number;
  visibleLandmarks: number;
  repetitionCount: number;
  angleSummary: AngleSummary | null;
  quality: ScanQualityResult;
}) {
  const repetitionMessage =
    repetitionCount === 1
      ? "1 complete squat was detected."
      : repetitionCount > 1
        ? `${repetitionCount} complete squats were detected.`
        : "No complete standing-to-bottom-to-standing cycle was detected.";

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
          {angleSummary ? (
            <p>
              Across {angleSummary.sampleCount} reliable {angleSummary.side}-side
              samples, the lowest knee angle was {Math.round(angleSummary.minimumKnee)}°,
              the lowest hip angle was {Math.round(angleSummary.minimumHip)}°, and
              peak torso lean was {Math.round(angleSummary.maximumTorsoLean)}°.
            </p>
          ) : null}
          <p>
            {analyzedFrames} pose frames contributed to this scan. Rep detection
            requires a standing start, a knee angle at or below 110° for the
            bottom phase, and a return to standing. These are detection
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

const coachingAreas = ["Depth", "Torso", "Tempo"] as const;

function createSetFeedback(
  repetitions: SquatRepAnalysis[],
  averageScore: number,
): SetFeedback {
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

  if (primarySignal?.area === "Tempo") {
    const movesTooFast = primarySignal.message.startsWith("Slow");
    return {
      score: averageScore,
      rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
      good,
      fixTitle: movesTooFast ? "The rep moves too fast." : "Tempo loses continuity.",
      fixDetail: movesTooFast
        ? "Give the descent more time so each phase stays controlled."
        : "Keep the descent and return moving at a steady pace.",
      nextCue: movesTooFast
        ? "Next rep: slow the descent."
        : "Next rep: keep the rep moving.",
      reviewAtSeconds: primarySignal.timestampSeconds,
    };
  }

  return {
    score: averageScore,
    rating: averageScore >= 85 ? "Strong" : averageScore >= 70 ? "Good" : "Needs work",
    good,
    fixTitle: "No recurring fault detected.",
    fixDetail: "Keep the same controlled range, torso position, and tempo.",
    nextCue: "Next rep: repeat the same control.",
    reviewAtSeconds: repetitions[0]?.reviewAtSeconds ?? null,
  };
}

function SquatCoachingReview({
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
  activeReviewTimestamp,
  onReviewMoment,
}: {
  repetitions: SquatRepAnalysis[];
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
              <RepMetric label="Depth" value={`${Math.round(repetition.minimumKneeAngle)}°`} />
              <RepMetric label="Torso" value={`${Math.round(repetition.maximumTorsoLean)}°`} />
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

function formatSquatPhase(phase: SquatPhase) {
  switch (phase) {
    case "find-start":
      return "Find standing start";
    case "standing":
      return "Standing";
    case "descending":
      return "Descending";
    case "bottom":
      return "Bottom";
    case "ascending":
      return "Ascending";
  }
}

function describeSquatPhase(phase: SquatPhase) {
  switch (phase) {
    case "find-start":
      return "Begin upright so the tracker can establish the start of a repetition.";
    case "standing":
      return "Standing position detected. The next descent can begin a repetition.";
    case "descending":
      return "The knee angle is decreasing as the movement travels downward.";
    case "bottom":
      return "The conservative bottom threshold has been reached.";
    case "ascending":
      return "The knee angle is increasing on the return toward standing.";
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
