import { router } from "./trpc";

import { approvalRouter } from "./routes/approval/route";
import { billingRouter } from "./routes/billing/route";
import { featureRouter } from "./routes/feature/route";
import { githubRouter } from "./routes/github/route";
import { healthRouter } from "./routes/health/route";
import { memberRouter } from "./routes/member/route";
import { orgRouter } from "./routes/org/route";
import { prdRouter } from "./routes/prd/route";
import { projectRouter } from "./routes/project/route";
import { reviewRouter } from "./routes/review/route";
import { shipflowRouter } from "./routes/shipflow/route";
import { taskRouter } from "./routes/task/route";

export const serverRouter = router({
  approval: approvalRouter,
  billing: billingRouter,
  feature: featureRouter,
  github: githubRouter,
  health: healthRouter,
  member: memberRouter,
  org: orgRouter,
  prd: prdRouter,
  project: projectRouter,
  review: reviewRouter,
  shipflow: shipflowRouter,
  task: taskRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
