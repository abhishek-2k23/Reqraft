import { generateClarificationQuestions } from "@repo/services/shipflow/agents";

export function runClarificationAgent(request: string) {
  return generateClarificationQuestions(request);
}
