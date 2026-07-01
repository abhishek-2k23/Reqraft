import type { Command } from "commander";

import { CliError, dim, info, printJson, success } from "../output";
import { ensureOrg, requireToken, type Runtime } from "../runtime";

async function prep(getRuntime: () => Runtime): Promise<Runtime> {
  const rt = getRuntime();
  requireToken(rt);
  await ensureOrg(rt);
  return rt;
}

export function registerPrdCommands(program: Command, getRuntime: () => Runtime): void {
  const prd = program.command("prd").description("Work with product requirement documents.");

  prd
    .command("show <featureId>")
    .description("Print the PRD for a feature.")
    .action(async (featureId: string) => {
      const rt = await prep(getRuntime);
      const doc = await rt.client.prd.byFeature.query({ featureId });
      if (!doc) throw new CliError("No PRD has been generated for this feature yet.");

      if (rt.json) return printJson(doc);
      if (doc.rawMarkdown) {
        info(doc.rawMarkdown);
        return;
      }
      info(`# ${doc.problem}\n`);
      info(`Goals:\n${doc.goals.map((g) => `  - ${g}`).join("\n")}`);
      info(`\nAcceptance criteria:\n${doc.acceptanceCriteria.map((c) => `  - ${c}`).join("\n")}`);
    });

  prd
    .command("generate <featureId>")
    .description("Trigger PRD generation (or regeneration) for a feature.")
    .action(async (featureId: string) => {
      const rt = await prep(getRuntime);
      const result = await rt.client.feature.triggerPrdGeneration.mutate({ featureId });
      if (rt.json) return printJson(result);
      success(result.regenerated ? "PRD regeneration triggered." : "PRD generation triggered.");
      dim("  Track progress with `reqraft feature show <id>`.");
    });

  prd
    .command("approve <featureId>")
    .description("Approve a feature's PRD (kicks off task generation).")
    .action(async (featureId: string) => {
      const rt = await prep(getRuntime);
      const doc = await rt.client.prd.byFeature.query({ featureId });
      if (!doc) throw new CliError("No PRD exists for this feature yet.");

      const result = await rt.client.prd.approve.mutate({ prdId: doc.id, featureId });
      if (rt.json) return printJson(result);
      success("PRD approved — engineering task generation was triggered.");
    });
}
