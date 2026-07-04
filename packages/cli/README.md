# reqraft

The **Reqraft** command-line interface — drive your AI product delivery pipeline
(features → PRD → tasks → AI code review) straight from the terminal.

> Companion to the Reqraft web app at <https://reqraft.in>. Full docs: <https://reqraft.in/docs/cli>.

```
$ reqraft feature create --title "Dark mode" --description "Add a theme toggle"
✔ Created feature 4f9a02c1 — Dark mode

$ reqraft prd approve 4f9a02c1…
✔ PRD approved — engineering task generation was triggered.

$ reqraft task mine
ID        STATUS       TYPE      TITLE                       FEATURE    ORG
482bd89c  in_progress  backend   Implement theme service     Dark mode  Acme
```

## Quick start

```bash
# 1. Install (Node.js ≥ 18)
npm install -g reqraft

# 2. Sign in — opens your browser for a one-click approval
reqraft login

# 3. Pick an organization (skipped automatically if you only have one)
reqraft org use <slug>

# 4. Look around
reqraft status
```

`reqraft login` uses the OAuth 2.0 Device Authorization flow: it prints a URL and
a short code, opens your browser, and waits while you approve the request. No
passwords or tokens to copy by hand. The credential is stored at
`~/.reqraft/config.json` (mode `0600`).

## Commands

Run `reqraft <command> --help` for the options of any command.

### Session & configuration

| Command | What it does |
| --- | --- |
| `reqraft login` | Sign in via the browser (device authorization). |
| `reqraft logout` | Remove the stored credentials from this machine. |
| `reqraft whoami` | Show the signed-in user, active org, and API URL. |
| `reqraft ping` | Check the configured deployment is reachable (+ latency). |
| `reqraft config list` | Show the effective configuration (token redacted). |
| `reqraft config set-api <url>` | Pin the CLI to a self-hosted / staging deployment. |
| `reqraft config unset-api` | Go back to the default `https://reqraft.in`. |
| `reqraft config path` | Print the config file location. |

### Organizations & projects

| Command | What it does |
| --- | --- |
| `reqraft org list` | Organizations you belong to (`*` marks the active one). |
| `reqraft org use <slug>` | Set the active organization. |
| `reqraft project list` | Projects in the active organization. |
| `reqraft member list` | Teammates, their roles, and email verification state. |
| `reqraft status` | One-screen pipeline snapshot: features by status, review cycles. |
| `reqraft search <query>` | Search projects, features, tasks, PRDs, repos, and reviews. |

### Features

| Command | What it does |
| --- | --- |
| `reqraft feature list [--status s] [--project id]` | List feature requests. |
| `reqraft feature create --title t --description d` | Create a feature (starts AI clarification). |
| `reqraft feature show <id>` | Status, PRD summary, tasks, and reviews for one feature. |
| `reqraft feature clarify <id> <answer…>` | Reply to the AI product manager's question. |
| `reqraft feature open <id>` | Open the feature in your browser. |
| `reqraft feature approve <id> [--notes n]` | Approve a feature in review *(manager+)*. |
| `reqraft feature reject <id> <reason…>` | Reject a feature — marks it blocked *(manager+)*. |
| `reqraft feature ship <id>` | Mark an approved feature as shipped *(manager+)*. |

### PRDs

| Command | What it does |
| --- | --- |
| `reqraft prd generate <featureId>` | Trigger PRD generation / regeneration. |
| `reqraft prd show <featureId>` | Print the PRD as markdown. |
| `reqraft prd approve <featureId>` | Approve the PRD → generates engineering tasks. |
| `reqraft prd download <featureId> [-o file]` | Save the PRD as a PDF. |
| `reqraft prd share <featureId> --to a@b.com [--to …] [--message m]` | Email the PRD (PDF attached). |

`prd share` sends to teammates and outside addresses alike; teammates must have
a verified email (see `reqraft member list`).

### Tasks

| Command | What it does |
| --- | --- |
| `reqraft task list <featureId>` | The feature's task board, grouped by status. |
| `reqraft task mine` | Tasks assigned to you, across all organizations. |
| `reqraft task start <taskId>` | Move a task to `in_progress`. |
| `reqraft task done <taskId>` | Mark a task as `done`. |
| `reqraft task move <taskId> <status> [--reason r]` | Any move: `todo`, `in_progress`, `done`, `blocked`. |
| `reqraft task assign <taskId> <who>` | Assign by email, name, or `me`. |
| `reqraft task notes <taskId>` | Read a task's discussion thread. |
| `reqraft task note <taskId> <text…>` | Add a note to the thread. |

### Reviews

| Command | What it does |
| --- | --- |
| `reqraft review list [--status s]` | AI review cycles (`running`, `passed`, `failed`). |
| `reqraft review show <cycleId>` | A cycle's verdict, score, and findings. |
| `reqraft review resolve <issueId>` | Mark a finding as resolved. |

## Global flags

Global flags go **before** the subcommand: `reqraft --json feature list`.

| Flag | Meaning |
| --- | --- |
| `--json` | Machine-readable JSON output — for scripting and CI. |
| `--api <url>` | Target a non-default deployment for this call (and persist it on `login`). |
| `--org <slug>` | Run against a specific organization for this call. |

## Configuration

Everything lives in `~/.reqraft/config.json`. The API base URL is resolved in
this order:

1. `--api <url>` flag
2. `REQRAFT_API_URL` environment variable
3. `apiUrl` stored in the config file (set via `reqraft config set-api` or `login --api`)
4. Default: `https://reqraft.in`

`reqraft login` prints which deployment it is signing in to, and only persists
the URL when you passed it explicitly — so a one-off `--api` experiment can't
silently redirect future logins.

For CI / headless use, skip `login` and set a token in the environment:

```bash
export REQRAFT_TOKEN="<token>"
reqraft --json task mine
```

## Scripting

Every command supports `--json`, so output pipes cleanly into `jq`:

```bash
# Full ids of all features that are ready for PRD review
reqraft --json feature list | jq -r '.[] | select(.status == "prd_ready") | .id'

# Fail a CI step if any AI review cycle failed
test "$(reqraft --json review list --status failed | jq length)" = "0"
```

## Troubleshooting

**Login opens the wrong URL (an old dev/staging domain).**
The CLI is pinned to another deployment. Check with `reqraft config list`, then
`reqraft config unset-api` and run `reqraft login` again.

**"You're not signed in" / 401s.**
Your token expired or points at a different deployment. `reqraft login`.

**"Select an organization before accessing this resource."**
Run `reqraft org use <slug>` once, or pass `--org <slug>` per command.

**No browser opens on login.**
Headless environments can't spawn a browser — open the printed URL on any device
and enter the device code.

## How it works

The CLI is a thin, fully type-safe [tRPC](https://trpc.io) client against the same
API the web app uses; its types are derived from the server's router, so the CLI
can never drift from the API. Authentication rides on BetterAuth's device grant +
bearer token.
