export { reviewImplementationAgainstCriteria } from "@repo/services/shipflow/agents";
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { PullRequestReviewResult } from '@repo/services/shipflow/code-review';

export type ReviewInput = {
  repoFullName: string;
  pullRequestTitle: string;
  prdTitle?: string | null;
  acceptanceCriteria?: string[] | null;
  files: Array<{ filePath: string; patch: string }>;
};

export async function reviewPullRequestAgainstPrd(
  input: ReviewInput,
): Promise<PullRequestReviewResult> {
  const { repoFullName, pullRequestTitle, prdTitle, acceptanceCriteria, files } = input;

  const hasPrd = !!(prdTitle && acceptanceCriteria?.length);
  const diffText = files.map(f => `File: ${f.filePath}\n\`\`\`diff\n${f.patch}\n\`\`\``).join('\n\n');

  const system = hasPrd
    ? `You are an expert AI code reviewer. Your job is to review a GitHub Pull Request against a Product Requirements Document (PRD).
You will be provided with the PRD acceptance criteria and the PR code diff.
Determine if the code diff satisfies all the acceptance criteria. If any criteria are missing or implemented incorrectly, flag them as 'blocking' findings and set status to 'changes_requested'.
If the PR implements the criteria correctly, set status to 'passed'.
Be constructive and specific.`
    : `You are an expert AI code reviewer. Review this GitHub Pull Request for code quality, potential bugs, security issues, and best practices.
Flag any serious issues (security vulnerabilities, crashes, data loss risks) as 'blocking' and set status to 'changes_requested'.
Minor suggestions should be 'non_blocking'. If the code looks good overall, set status to 'passed'.
Be constructive and specific.`;

  const prompt = hasPrd
    ? `Repository: ${repoFullName}
PR Title: ${pullRequestTitle}
PRD Feature: ${prdTitle}

Acceptance Criteria:
${acceptanceCriteria!.map((c: string) => `- ${c}`).join('\n')}

Code Diff:
${diffText}`
    : `Repository: ${repoFullName}
PR Title: ${pullRequestTitle}

Code Diff:
${diffText}`;

  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini'),
    schema: z.object({
      status: z.enum(['passed', 'changes_requested']),
      summary: z.string().describe('A short summary of the review verdict.'),
      findings: z.array(z.object({
        severity: z.enum(['blocking', 'non_blocking', 'positive']),
        message: z.string().describe('Detailed message about the finding.'),
        file: z.string().describe('The file path associated with the finding, or "general" if it applies to the whole PR.')
      }))
    }),
    system,
    prompt,
  });

  const formattedFindings = object.findings
    .map(f => `- **${f.severity}** (${f.file}): ${f.message}`)
    .join('\n');

  const reviewMarkdown = `## Reqraft Review

Repository: ${repoFullName}
PR: ${pullRequestTitle}
${hasPrd ? `PRD: ${prdTitle}\n` : ''}
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
    reviewMarkdown,
  };
}
