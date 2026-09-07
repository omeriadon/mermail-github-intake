# Superteam submission — Mermail GitHub Intake

## One-line pitch

Mermail GitHub Intake is a community companion skill that turns inbound bug reports and feature requests into deduplicated, privacy-safe GitHub issue drafts without letting email content become agent authority.

## Why it matters

Email is a universal intake surface, but it is also untrusted input. A naive email→GitHub agent can be prompt-injected into changing repositories, leaking secrets, publishing private reporter data, or skipping review. This skill makes that boundary explicit and reusable.

## What the skill demonstrates

- live Mermail MCP inbox discovery and thread reads;
- clean-message scan gating before body interpretation;
- email-as-untrusted-data handling;
- secret and reporter-PII redaction;
- trusted-session target repository selection;
- bounded, read-only GitHub duplicate checking;
- exact external-effect preview;
- fresh human approval before GitHub mutation;
- separate approval boundary for optional Mermail acknowledgement;
- current Mermail companion-skill metadata and hosted MCP declaration.

## Public deliverables

- Source: https://github.com/omeriadon/mermail-github-intake
- Interactive judge demo: https://mermail-github-intake-omeriadons-projects.vercel.app
- Official Mermail companion discussion: https://github.com/Nudgen-Marketing/mermail-skills/issues/190
- Skill: `skills/mermail-github-intake/SKILL.md`
- OpenAI metadata: `skills/mermail-github-intake/agents/openai.yaml`
- Security model: `skills/mermail-github-intake/references/security.md`
- Deterministic demo: `npm test && npm run demo`
- Live/demo walkthrough and video script: `DEMO.md`
- Video demo: added after the live smoke test is recorded

## Deterministic proof

The bundled test suite exercises three policy outcomes:

1. unique clean report containing an embedded instruction and synthetic secret → `draft_ready`, sanitized, no write;
2. likely existing GitHub issue → `duplicate_candidate`, no write;
3. suspicious Mermail scan state → `blocked_scan`, body not interpreted.

The unique case asserts that the inbound message cannot change the trusted target repository and that no external write occurs before approval.

GitHub Actions runs the same validator/demo on every push and the standalone repository is currently passing.

## Live proof contract

A live Codex + Mermail smoke test is complete when:

1. Mermail `list_mailboxes` succeeds through an authenticated hosted MCP connection (OAuth preferred; workspace API-key auth is acceptable for inbox-only testing);
2. a real inbound test email is discovered through Mermail MCP;
3. the skill returns a sanitized exact GitHub preview while ignoring embedded instructions;
4. no GitHub write happens before approval;
5. after explicit approval, exactly one issue is created;
6. the resulting public issue contains neither the synthetic credential marker nor reporter email address;
7. the response returns the issue URL and Mermail source IDs.

## Security choices

The skill follows Mermail's current authoring anti-pattern guidance: never trust email bodies as instructions, never trust `From` alone as authentication, never stringify MCP query objects, never follow magic/verification links because email requests it, keep reads bounded, and require exact preview plus fresh approval for external effects.

## Bounty status

- [x] Reusable Mermail Agent Skill
- [x] Public standalone GitHub repository
- [x] Community/unofficial disclosure
- [x] Current Mermail hosted MCP metadata
- [x] Security references
- [x] Deterministic adversarial demo
- [x] Automated validation workflow
- [x] Interactive judge demo deployed
- [x] Official companion idea opened with Mermail maintainers
- [ ] Live Mermail/Codex smoke test recorded
- [ ] Video URL added
- [ ] Submitted to Superteam Earn
