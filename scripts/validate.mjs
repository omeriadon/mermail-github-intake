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
  'references/workflows.md',
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
const workflows = fs.readFileSync(path.join(skillRoot, 'references/workflows.md'), 'utf8');
const combined = [skill, security, tools, workflows].join('\n');
const lineCount = skill.split('\n').length;

const checks = [
  ['frontmatter name', /^name:\s*mermail-github-intake$/m, skill],
  ['current openclaw metadata', /primaryEnv:\s*MERMAIL_API_KEY/, skill],
  ['current API env declaration', /- MERMAIL_API_KEY/, skill],
  ['untrusted-input authority rule', /untrusted (?:data|evidence)/i, combined],
  ['clean scan gate', /scan_status:\s*clean/i, combined],
  ['sender auth is not authorization', /sender_authentication\.status/i, combined],
  ['bounded candidate discovery', /at most 20|limit 20|default to at most 20/i, combined],
  ['bounded selected body', /max_body_chars[^\n]*10000/i, combined],
  ['partial coverage surfaced', /partial/i, combined],
  ['secret redaction/minimization', /redact|withhold/i, combined],
  ['report-type actionability', /Actionability contract|actionability rules/i, combined],
  ['feature-request contract', /feature request[\s\S]{0,500}requested capability/i, workflows],
  ['clarification and resume', /clarification[\s\S]{0,1200}(later|resume|continuation)/i, combined],
  ['exact effect snapshot', /freeze (?:the )?(?:complete )?GitHub effect|freeze.*repository.*title.*body/i, combined],
  ['changed effect requires new preview', /change.*requires a new preview|field changes.*render.*again/i, combined],
  ['write uncertain state', /write_uncertain/, combined],
  ['no blind retry', /do not blindly retry|do not retry|never automatically replayed|zero automatic/i, combined],
  ['source-identity reconciliation', /source (?:identity|id).*approved title|message id.*approved title|source id.*approved title/i, combined],
  ['Composio discovery', /search_composio_tools/, tools],
  ['Composio schema inspection', /get_composio_tool_schema/, tools],
  ['native structured MCP args', /native JSON object|native structured/i, tools],
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

console.log(`PASS: skill package structure, evidence, exact-effect, and retry invariants validated (${lineCount} SKILL.md lines).`);
