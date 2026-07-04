import { redirect } from "next/navigation";

// The Copilot page has moved into the floating Reqraft assistant widget,
// available on every protected page. Keep old bookmarks working.
export default function CopilotPage() {
  redirect("/dashboard");
}
