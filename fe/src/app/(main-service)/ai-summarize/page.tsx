import { redirect } from "next/navigation";

export default function LegacySummarizePage() {
  redirect("/ai-stream-test?tab=summary");
}
