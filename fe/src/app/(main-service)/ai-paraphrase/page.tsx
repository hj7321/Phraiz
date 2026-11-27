import { redirect } from "next/navigation";

export default function LegacyParaphrasePage() {
  redirect("/ai-stream-test?tab=paraphrase");
}
