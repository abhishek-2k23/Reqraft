export type PullRequestFilePatch = {
  filePath: string;
  patch: string;
};

export type ReviewPullRequestInput = {
  repoFullName: string;
  pullRequestTitle: string;
  prdTitle: string;
  acceptanceCriteria: string[];
  files: PullRequestFilePatch[];
};

export type PullRequestReviewFinding = {
  severity: "blocking" | "non_blocking" | "positive";
  message: string;
  file: string;
};

export type PullRequestReviewResult = {
  status: "passed" | "changes_requested";
  summary: string;
  reviewMarkdown: string;
  findings: PullRequestReviewFinding[];
};

export function formatPullRequestFilesForReview(files: PullRequestFilePatch[]) {
  return files
    .map((file) => `### ${file.filePath}\n\`\`\`diff\n${file.patch}\n\`\`\``)
    .join("\n\n");
}

export function reviewPullRequestAgainstPrd(
  input: ReviewPullRequestInput,
): PullRequestReviewResult {
  const diffText = normalize(
    input.files.map((file) => `${file.filePath}\n${file.patch}`).join("\n"),
  );

  const blockingFindings = input.acceptanceCriteria
    .filter((criterion) => isCriterionMissing(criterion, diffText))
    .map<PullRequestReviewFinding>((criterion) => ({
      severity: "blocking",
      message: `Missing acceptance criterion: ${criterion}`,
      file: findMostLikelyFile(input.files),
    }));

  const positiveFindings: PullRequestReviewFinding[] =
    blockingFindings.length === 0
      ? [
          {
            severity: "positive",
            message: "PR diff covers the listed PRD acceptance criteria.",
            file: input.files[0]?.filePath ?? "pull request diff",
          },
        ]
      : [];

  const status = blockingFindings.length > 0 ? "changes_requested" : "passed";
  const findings = [...blockingFindings, ...positiveFindings];
  const summary =
    status === "passed"
      ? `${input.pullRequestTitle} satisfies ${input.prdTitle}.`
      : `${input.pullRequestTitle} is missing ${blockingFindings.length} PRD requirement.`;

  return {
    status,
    summary,
    findings,
    reviewMarkdown: buildReviewMarkdown(input, summary, findings),
  };
}

function buildReviewMarkdown(
  input: ReviewPullRequestInput,
  summary: string,
  findings: PullRequestReviewFinding[],
) {
  const formattedFindings = findings
    .map((finding) => `- **${finding.severity}** (${finding.file}): ${finding.message}`)
    .join("\n");

  return `## Reqraft Review

Repository: ${input.repoFullName}
PR: ${input.pullRequestTitle}
PRD: ${input.prdTitle}

${summary}

### Findings
${formattedFindings || "- No findings."}

### Reviewed Diff
${formatPullRequestFilesForReview(input.files)}
`;
}

function isCriterionMissing(criterion: string, diffText: string) {
  const normalizedCriterion = normalize(criterion);

  if (
    normalizedCriterion.includes("prevent approval") ||
    normalizedCriterion.includes("block approval")
  ) {
    return (
      !diffText.includes("block approval") &&
      !diffText.includes("prevent approval")
    );
  }

  const keywords = normalizedCriterion
    .split(" ")
    .filter((word) => word.length > 3);
  const matches = keywords.filter((word) => diffText.includes(word));

  return matches.length < Math.max(1, Math.ceil(keywords.length / 2));
}

function findMostLikelyFile(files: PullRequestFilePatch[]) {
  return files[0]?.filePath ?? "pull request diff";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
}
