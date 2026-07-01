import { Command } from "commander";

import { registerAuthCommands } from "./commands/auth";
import { registerFeatureCommands } from "./commands/feature";
import { registerOrgCommands } from "./commands/org";
import { registerPrdCommands } from "./commands/prd";
import { registerReviewCommands } from "./commands/review";
import { fail } from "./output";
import { runtime } from "./runtime";

// Bump in lockstep with package.json "version".
const VERSION = "0.1.0";

const program = new Command();

program
  .name("reqraft")
  .description("Drive your Reqraft AI product delivery pipeline from the terminal.")
  .version(VERSION, "-v, --version")
  .showHelpAfterError()
  // Global options — place them before the subcommand, e.g. `reqraft --json feature list`.
  .option("--json", "Output machine-readable JSON instead of formatted text.")
  .option("--api <url>", "Override the Reqraft API base URL (default https://reqraft.in).")
  .option("--org <slug>", "Run this command against a specific organization (slug or id).");

const getRuntime = () => runtime(program);

registerAuthCommands(program, getRuntime);
registerOrgCommands(program, getRuntime);
registerFeatureCommands(program, getRuntime);
registerPrdCommands(program, getRuntime);
registerReviewCommands(program, getRuntime);

program.parseAsync(process.argv).catch((err) => {
  fail(err, Boolean(program.opts().json));
});
