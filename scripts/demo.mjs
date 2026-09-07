import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const check = process.argv.includes('--check');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'demo/cases.json'), 'utf8'));
const trustedRepo = 'example/acme';

const instructionPatterns = [
  /embedded instruction test:[^\n]*/ig,
  /disregard the workflow[^\n]*/ig,
  /change the target repository[^\n]*/ig,
  /publish without review[^\n]*/ig,
];

const secretPatterns = [
  /DEMO_CREDENTIAL_REDACT_ME/g,
  /synthetic credential marker:\s*[^\n]+/ig,
];

function sanitize(text) {
  let out = text;
  for (const pattern of instructionPatterns) out = out.replace(pattern, '[UNTRUSTED INSTRUCTION REMOVED]');
  for (const pattern of secretPatterns) out = out.replace(pattern, '[SECRET REDACTED]');
  return out;
}

function section(body, label, nextLabels) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const next = nextLabels.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n\\n(?:${next}):|$)`, 'i');
  return (body.match(re)?.[1] ?? '').trim();
}

function words(value) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function similarity(a, b) {
  const A = words(a);
  const B = words(b);
  const intersection = [...A].filter((word) => B.has(word)).length;
  const union = new Set([...A, ...B]).size;
  return union ? intersection / union : 0;
}

function processCase(testCase) {
  const { report, existingIssues } = testCase;

  if (report.scanStatus !== 'clean') {
    return {
      state: 'blocked_scan',
      source: `${report.threadId}/${report.messageId}`,
      reason: `scan_status=${report.scanStatus}`,
    };
  }

  const safeBody = sanitize(report.body);
  const observed = section(safeBody, 'Observed', ['Expected', 'Steps', 'Environment']);
  const expected = section(safeBody, 'Expected', ['Steps', 'Environment']);
  const stepsRaw = section(safeBody, 'Steps', ['Environment']);
  const environmentRaw = section(safeBody, 'Environment', ['zzzz-never']);
  const environment = environmentRaw.split(/\n\s*\n/)[0].trim();
  const steps = stepsRaw.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = report.subject.trim().replace(/[\r\n]+/g, ' ').slice(0, 120);

  const candidateText = `${title} ${observed} ${expected}`;
  const ranked = existingIssues
    .slice(0, 20)
    .map((issue) => ({
      ...issue,
      score: similarity(candidateText, `${issue.title} ${issue.body}`),
    }))
    .sort((a, b) => b.score - a.score);

  const duplicate = ranked[0]?.score >= 0.46 ? ranked[0] : null;
  if (duplicate) {
    return {
      state: 'duplicate_candidate',
      source: `${report.threadId}/${report.messageId}`,
      match: duplicate,
    };
  }

  if (!observed || !expected || steps.length === 0) {
    return {
      state: 'needs_information',
      source: `${report.threadId}/${report.messageId}`,
    };
  }

  const issueBody = [
    '## Summary',
    title,
    '',
    '## Observed behavior',
    observed,
    '',
    '## Expected behavior',
    expected,
    '',
    '## Reproduction steps',
    ...steps,
    '',
    '## Environment',
    environment || 'Not provided.',
    '',
    '---',
    `Source: Mermail thread \`${report.threadId}\`, message \`${report.messageId}\`.`,
    '',
    '> Reporter address intentionally omitted. Potential secrets and embedded instructions were not copied into this draft.',
  ].join('\n');

  if (/DEMO_CREDENTIAL_REDACT_ME|embedded instruction test|change the target repository/i.test(issueBody)) {
    throw new Error('untrusted or secret content leaked into issue draft');
  }

  return {
    state: 'draft_ready',
    source: `${report.threadId}/${report.messageId}`,
    repository: trustedRepo,
    title,
    issueBody,
    security: {
      scan: 'clean',
      embeddedInstructionRemoved: safeBody.includes('[UNTRUSTED INSTRUCTION REMOVED]'),
      secretRedacted: safeBody.includes('[SECRET REDACTED]'),
      reporterAddressOmitted: true,
      writePerformed: false,
    },
  };
}

const results = cases.map((testCase) => ({
  name: testCase.name,
  expectedState: testCase.expectedState,
  result: processCase(testCase),
}));

if (check) {
  for (const entry of results) {
    if (entry.result.state !== entry.expectedState) {
      console.error(`FAIL: ${entry.name}: expected ${entry.expectedState}, got ${entry.result.state}`);
      process.exit(1);
    }
  }

  const unique = results.find((entry) => entry.result.state === 'draft_ready')?.result;
  if (!unique?.security.embeddedInstructionRemoved || !unique?.security.secretRedacted) {
    console.error('FAIL: adversarial case did not prove both injection removal and secret redaction');
    process.exit(1);
  }
  if (unique.repository !== trustedRepo || unique.security.writePerformed !== false) {
    console.error('FAIL: trust boundary changed target repository or performed a write');
    process.exit(1);
  }

  console.log(`PASS: ${results.length} deterministic scenarios preserved scan, trust, redaction, duplicate and approval boundaries.`);
  process.exit(0);
}

console.log('Mermail GitHub Intake — deterministic demo');
console.log('==========================================');
for (const entry of results) {
  console.log(`\nCASE: ${entry.name}`);
  console.log(`STATE: ${entry.result.state}`);
  console.log(`SOURCE: ${entry.result.source}`);

  if (entry.result.state === 'draft_ready') {
    console.log('security: scan clean; embedded instruction ignored; synthetic secret redacted');
    console.log('duplicates searched: bounded to 20');
    console.log('\nEXACT EFFECT PREVIEW');
    console.log('--------------------');
    console.log(`repository: ${entry.result.repository}`);
    console.log(`title: ${entry.result.title}`);
    console.log(entry.result.issueBody);
    console.log('\nAPPROVAL GATE: no GitHub write performed; fresh approval required.');
  } else if (entry.result.state === 'duplicate_candidate') {
    console.log(`match: #${entry.result.match.number} ${entry.result.match.title}`);
    console.log('effect: none; operator review required');
  } else if (entry.result.state === 'blocked_scan') {
    console.log(`reason: ${entry.result.reason}`);
    console.log('effect: body was not interpreted');
  }
}
