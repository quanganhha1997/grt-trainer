import { SiteHeader } from "@/components/site-header";
import { FormCheckWorkspace } from "../form-check-workspace";

export default function FormCheckPage() {
  return (
    <main className="grt-app min-h-screen">
      <SiteHeader active="form-check" />
      <FormCheckWorkspace />
    </main>
  );
}
