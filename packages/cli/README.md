# reqraft

The **Reqraft** command-line interface — drive your AI product delivery pipeline
(features → PRD → tasks → AI code review) straight from the terminal.

> Companion to the Reqraft web app at <https://reqraft.in>.

## Install

```bash
npm install -g reqraft
# or run without installing:
npx reqraft --help
```

Requires Node.js ≥ 18.

## Sign in

Reqraft uses the OAuth 2.0 Device Authorization flow — no passwords or tokens to
copy by hand:

```bash
reqraft login
```

It prints a URL and a short code, opens your browser, and waits while you approve
the request. The credential is stored at `~/.reqraft/config.json` (mode `0600`).

For CI / headless use, set a token in the environment instead:

```bash
export REQRAFT_TOKEN="<token>"
```

## Usage

Global flags go **before** the subcommand: `reqraft --json feature list`.

| Flag | Meaning |
| --- | --- |
| `--json` | Machine-readable JSON output (for scripting / CI). |
| `--api <url>` | Point at a non-default deployment (default `https://reqraft.in`). |
| `--org <slug>` | Run against a specific organization for this call. |

### Organizations

```bash
reqraft org list            # organizations you belong to (* = active)
reqraft org use <slug>      # set the active organization
```

### Features & the pipeline

```bash
reqraft feature list [--status prd_ready] [--project <id>]
reqraft feature create --title "Dark mode" --description "Add a theme toggle" [--project <slug>] [--priority high]
reqraft feature show <featureId>
reqraft feature clarify <featureId> "Target users are mobile web visitors"
reqraft feature tasks <featureId>

reqraft prd generate <featureId>   # trigger PRD generation / regeneration
reqraft prd show <featureId>       # print the PRD (markdown)
reqraft prd approve <featureId>    # approve the PRD → generates tasks
```

### Reviews

```bash
reqraft review list [--status passed|failed|running]
reqraft review show <cycleId>
reqraft review resolve <issueId>
```

### Session

```bash
reqraft whoami     # current user + active org
reqraft logout     # remove stored credentials
```

## How it works

The CLI is a thin, fully type-safe [tRPC](https://trpc.io) client against the same
API the web app uses; its types are derived from the server's router, so the CLI
can never drift from the API. Authentication rides on BetterAuth's device grant +
bearer token.
