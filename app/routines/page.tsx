import { SiteHeader } from "@/components/site-header";
import { WorkoutPlanner } from "./workout-planner";

export default function RoutinesPage() {
  return (
    <main className="grt-app min-h-screen">
      <SiteHeader active="workouts" />
      <WorkoutPlanner />
    </main>
  );
}
