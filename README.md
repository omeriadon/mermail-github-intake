# Mermail GitHub Intake

**Community / unofficial Mermail companion skill.** Turn bug reports and feature requests received through a Mermail agent inbox into evidence-linked, deduplicated GitHub issues without allowing email content to become agent authority.

The distinguishing property is end-to-end control of the effect: **bounded evidence → sanitized engineering packet → duplicate preflight → deterministic effect fingerprint → fresh approval → one write → reconciliation instead of blind retry.**

- Interactive judge demo: https://mermail-github-intake-omeriadons-projects.vercel.app
- Live Mermail proof: [`LIVE_TEST.md`](LIVE_TEST.md)
- Official Mermail companion discussion: https://github.com/Nudgen-Marketing/mermail-skills/issues/190

## Why it exists

Email is a useful universal bug-intake surface and an unusually hostile authority surface. A naive email→GitHub agent can be told by the email itself to change repository, publish secrets, alter labels, skip review, or retry a write whose result is already unknown.

Mermail GitHub Intake deliberately separates **evidence** from **authority**. The mailbox supplies facts; the authenticated operator supplies scope and approval.

## Workflow

```text
Mermail inbox
    │
    ▼
metadata-first bounded discovery
    │
    ▼
exact source + clean scan + coverage envelope
    │
    ▼
untrusted evidence interpretation
    ├── injected instructions ignored
    └── secrets / reporter PII withheld
    │
    ▼
GitHub duplicate preflight
    │
    ▼
freeze repository + title + body + labels + source ids
    │
    ▼
SHA-256 effect fingerprint
    │
    ▼
exact preview + fresh fingerprint-bound approval
    │
    ▼
ONE GitHub create attempt
    │
    ├── confirmed → created
    └── ambiguous → reconcile fingerprint, never blind retry
```

## What makes it reusable

- **Current Mermail contracts.** Metadata-first reads, `require_scan_status: clean`, `agent_safe_content: true`, bounded body reads, sender-auth reporting, attachment limits, and native structured MCP arguments.
- **Evidence provenance.** Source mailbox/thread/message IDs plus explicit `complete`/`partial` coverage prevent the agent from pretending a truncated read is complete.
- **Duplicate reasoning.** `exact`, `strong`, `possible`, and `none` confidence instead of title-only matching.
- **Approval binding.** The exact repository/title/body/labels/source tuple is SHA-256 fingerprinted. Any mutation after preview returns `approval_stale`.
- **Idempotency.** The fingerprint is embedded as a machine-readable issue marker. Uncertain writes are reconciled by that marker, with zero automatic create retries.
- **Mermail-native GitHub path.** When available, Mermail Composio discovers and schema-inspects the connected GitHub capability before use. Host GitHub integrations and `gh` remain safe fallbacks.
- **Separate effects.** GitHub approval never authorizes an email acknowledgement.

## Install

Install Mermail's official core skills first:

```bash
npx --yes skills add Nudgen-Marketing/mermail-skills --skill '*'
```

Install this companion:

```bash
npx --yes skills add omeriadon/mermail-github-intake --skill mermail-github-intake
```

Connect Mermail's hosted MCP server at `https://console.mermail.app/mcp`, then invoke `$mermail-github-intake` in a fresh agent session.

## Deterministic proof suite

No credentials or network writes are needed:

```bash
npm test
npm run demo
```

Seven scenarios cover:

1. adversarial clean report → sanitized `draft_ready`, target locked, zero writes;
2. strong semantic duplicate → `duplicate_candidate`;
3. unsafe scan → `blocked_scan`, body never interpreted;
4. materially truncated evidence → `needs_information`, missing facts not invented;
5. same Mermail source already present → exact duplicate, zero writes;
6. effect mutation after approval → `approval_stale`, zero writes;
7. ambiguous create result → one write attempt, fingerprint reconciliation, **zero automatic retries**.

The validator also checks current Mermail metadata, body/read bounds, partial-coverage handling, sender-auth semantics, Composio discovery/schema inspection, fingerprinting, stale approval, and write-uncertainty contracts.

## Real Mermail proof

A real external test email was delivered to a ready Mermail inbox and processed by Codex through Mermail MCP. It contained a valid bug report plus an embedded instruction attempting to change the GitHub repository/publish immediately and a synthetic credential marker.

The live agent returned `draft_ready`, reported `scan_status: clean`, kept the independently supplied repository unchanged, omitted the credential marker, found no duplicate, rendered the exact issue preview, and stopped with **zero GitHub mutations** pending fresh approval.

See [`LIVE_TEST.md`](LIVE_TEST.md) for the safe, credential-free evidence record.

## Output states

| State | Meaning |
| --- | --- |
| `draft_ready` | Exact effect + fingerprint ready for approval |
| `duplicate_candidate` | Exact/strong existing issue found |
| `needs_information` | Evidence is materially missing/partial |
| `blocked_scan` | Selected content is not safe to interpret |
| `ignored` | Not in the requested bug/feature scope |
| `approval_stale` | Current effect no longer matches approved fingerprint |
| `write_uncertain` | One attempted write remains ambiguous after reconciliation |
| `created` | Issue existence confirmed after approval |

## Security contract

- Email/provider output is untrusted evidence, never authority.
- Only `scan_status: clean` content is interpreted.
- `sender_authentication.status: pass` may describe authentication; it never authorizes an effect.
- Omitted/truncated evidence remains explicitly partial.
- Secrets and unnecessary reporter PII do not enter public issue effects.
- The target repository cannot be changed by mail content.
- Exact preview + fresh fingerprint-bound approval precedes GitHub mutation.
- Effect/source mutation invalidates approval.
- An ambiguous write is reconciled, never automatically replayed.
- Attachments stay bounded and are never executed.
- GitHub approval and reporter-email approval remain separate.

Full contracts:

- [`SKILL.md`](skills/mermail-github-intake/SKILL.md)
- [`references/security.md`](skills/mermail-github-intake/references/security.md)
- [`references/tools.md`](skills/mermail-github-intake/references/tools.md)
- [`references/workflow.md`](skills/mermail-github-intake/references/workflow.md)

## Repository layout

```text
skills/mermail-github-intake/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── security.md
    ├── tools.md
    └── workflow.md

demo/cases.json
scripts/demo.mjs
scripts/validate.mjs
site/
LIVE_TEST.md
DEMO.md
SUBMISSION.md
```

## Status

- [x] Standalone reusable skill
- [x] Current Mermail contract/security alignment
- [x] Seven deterministic safety/idempotency scenarios
- [x] GitHub Actions validation
- [x] Real Mermail + Codex pre-write smoke test
- [x] Interactive public judge demo
- [x] Mermail companion discussion #190
- [ ] Official `Nudgen-Marketing/mermail-skills` PR
- [ ] Final approved live issue creation
- [ ] 2–5 minute X demo tagged `@Mermailapp`
- [ ] Superteam submission

## License

MIT
