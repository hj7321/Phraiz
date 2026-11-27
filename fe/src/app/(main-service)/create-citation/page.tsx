import { redirect } from "next/navigation";

export default function LegacyCitationPage() {
  redirect("/ai-stream-test?tab=citation");
}
