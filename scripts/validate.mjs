import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(root, 'skills/mermail-github-intake');
const required = [
  'SKILL.md',
  'agents/openai.yaml',
  'references/security.md',
  'references/tools.md',
  'references/workflow.md',
];

for (const rel of required) {
  if (!fs.existsSync(path.join(skillRoot, rel))) {
    console.error(`FAIL: missing ${rel}`);
    process.exit(1);
  }
}

const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
const yaml = fs.readFileSync(path.join(skillRoot, 'agents/openai.yaml'), 'utf8');
const security = fs.readFileSync(path.join(skillRoot, 'references/security.md'), 'utf8');
const tools = fs.readFileSync(path.join(skillRoot, 'references/tools.md'), 'utf8');
const workflow = fs.readFileSync(path.join(skillRoot, 'references/workflow.md'), 'utf8');
const combined = [skill, security, tools, workflow].join('\n');
const lineCount = skill.split('\n').length;

const checks = [
  ['frontmatter name', /^name:\s*mermail-github-intake$/m, skill],
  ['current openclaw metadata', /primaryEnv:\s*MERMAIL_API_KEY/, skill],
  ['current API env declaration', /- MERMAIL_API_KEY/, skill],
  ['community/unofficial disclosure', /community\s*\/\s*unofficial/i, skill],
  ['untrusted-input authority rule', /untrusted (?:data|evidence)/i, combined],
  ['clean scan gate', /scan_status:\s*clean/i, combined],
  ['sender auth is not authorization', /sender_authentication\.status/i, combined],
  ['bounded candidate discovery', /at most \*\*20/i, skill],
  ['bounded selected body', /max_body_chars:\s*10000/i, combined],
  ['partial coverage surfaced', /coverage.*partial|partial.*coverage/i, combined],
  ['secret redaction', /redact/i, combined],
  ['fresh approval', /fresh approval/i, combined],
  ['SHA-256 fingerprint', /SHA-256|sha256:/i, combined],
  ['approval stale state', /approval_stale/, combined],
  ['write uncertain state', /write_uncertain/, combined],
  ['no blind retry', /do not retry|never retry/i, combined],
  ['fingerprint reconciliation', /reconcil.*fingerprint|fingerprint.*reconcil/i, combined],
  ['Composio discovery', /search_composio_tools/, tools],
  ['Composio schema inspection', /get_composio_tool_schema/, tools],
  ['native structured MCP args', /native JSON objects|native structured/i, tools],
  ['official core install pointer', /Nudgen-Marketing\/mermail-skills/, skill],
  ['Mermail MCP URL', /https:\/\/console\.mermail\.app\/mcp/, yaml],
  ['OpenAI skill invocation', /\$mermail-github-intake/, yaml],
];

for (const [name, re, haystack] of checks) {
  if (!re.test(haystack)) {
    console.error(`FAIL: ${name}`);
    process.exit(1);
  }
}

if (lineCount > 500) {
  console.error(`FAIL: SKILL.md is ${lineCount} lines; current Mermail authoring limit is 500.`);
  process.exit(1);
}

if (/\bTODO\b/.test(combined)) {
  console.error('FAIL: unresolved TODO in skill package');
  process.exit(1);
}

console.log(`PASS: skill package structure, provenance, approval, and retry invariants validated (${lineCount} SKILL.md lines).`);
