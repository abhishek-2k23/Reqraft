export { reviewImplementationAgainstCriteria } from "@repo/services/shipflow/agents";
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ReviewPullRequestInput, PullRequestReviewResult } from '@repo/services/shipflow/code-review';

export async function reviewPullRequestAgainstPrd(
  input: ReviewPullRequestInput,
): Promise<PullRequestReviewResult> {
  const { repoFullName, pullRequestTitle, prdTitle, acceptanceCriteria, files } = input;
  
  const diffText = files.map(f => `File: ${f.filePath}\n\`\`\`diff\n${f.patch}\n\`\`\``).join('\n\n');
  const criteriaText = acceptanceCriteria.map(c => `- ${c}`).join('\n');

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      status: z.enum(['passed', 'changes_requested']),
      summary: z.string().describe('A short summary of the review verdict.'),
      findings: z.array(z.object({
        severity: z.enum(['blocking', 'non_blocking', 'positive']),
        message: z.string().describe('Detailed message about the finding.'),
        file: z.string().describe('The file path associated with the finding, or "general" if it applies to the whole PR.')
      }))
    }),
    system: `You are an expert AI code reviewer. Your job is to review a GitHub Pull Request against a Product Requirements Document (PRD).
You will be provided with the PRD acceptance criteria and the PR code diff.
Determine if the code diff satisfies all the acceptance criteria. If any criteria are missing or implemented incorrectly, flag them as 'blocking' findings and set status to 'changes_requested'.
If the PR implements the criteria correctly, set status to 'passed'.
Be constructive and specific.`,
    prompt: `Repository: ${repoFullName}
PR Title: ${pullRequestTitle}
PRD Feature: ${prdTitle}

Acceptance Criteria:
${criteriaText}

Code Diff:
${diffText}
`
  });

  const formattedFindings = object.findings
    .map(f => `- **${f.severity}** (${f.file}): ${f.message}`)
    .join('\n');

  const reviewMarkdown = `## ShipFlow AI Review

Repository: ${repoFullName}
PR: ${pullRequestTitle}
PRD: ${prdTitle}

${object.summary}

### Findings
${formattedFindings || "- No findings."}

### Reviewed Diff
${files.map(f => `#### ${f.filePath}\n\`\`\`diff\n${f.patch}\n\`\`\``).join('\n\n')}
`;

  return {
    status: object.status,
    summary: object.summary,
    findings: object.findings,
    reviewMarkdown
  };
}
