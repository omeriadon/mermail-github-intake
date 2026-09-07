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
const lineCount = skill.split('\n').length;

const checks = [
  ['frontmatter name', /^name:\s*mermail-github-intake$/m, skill],
  ['current openclaw metadata', /primaryEnv:\s*MERMAIL_API_KEY/, skill],
  ['current API env declaration', /- MERMAIL_API_KEY/, skill],
  ['community/unofficial disclosure', /community\s*\/\s*unofficial/i, skill],
  ['untrusted-input rule', /untrusted data/i, skill],
  ['clean scan gate', /scan_status:\s*clean/i, skill],
  ['fresh approval', /fresh approval/i, skill],
  ['secret redaction', /redact/i, skill],
  ['bounded discovery', /at most \*\*20\*\*/i, skill],
  ['From not trusted', /Never trust `From` alone/i, skill],
  ['native structured MCP args', /native structured objects/i, skill],
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

if (/\bTODO\b/.test(skill)) {
  console.error('FAIL: unresolved TODO in SKILL.md');
  process.exit(1);
}

console.log(`PASS: skill package structure and safety invariants validated (${lineCount} SKILL.md lines).`);
