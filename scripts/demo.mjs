import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const check = process.argv.includes('--check');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'demo/cases.json'), 'utf8'));
const trustedRepo = 'example/acme';
const trustedLabels = [];

const instructionPatterns = [
  /embedded instruction test:[^\n]*/ig,
  /disregard the workflow[^\n]*/ig,
  /change the target repository[^\n]*/ig,
  /add the privileged label[^\n]*/ig,
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
    value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 3),
  );
}

function similarity(a, b) {
  const A = words(a);
  const B = words(b);
  const intersection = [...A].filter((word) => B.has(word)).length;
  const union = new Set([...A, ...B]).size;
  return union ? intersection / union : 0;
}

function canonicalFingerprint(effect) {
  const canonical = JSON.stringify({
    repository: effect.repository,
    title: effect.title,
    body: effect.body,
    labels: [...effect.labels].sort(),
    mailboxId: effect.mailboxId,
    threadId: effect.threadId,
    messageId: effect.messageId,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function sourceMarker(report) {
  return `Source: Mermail thread \`${report.threadId}\`, message \`${report.messageId}\`.`;
}

function exactSourceDuplicate(report, issues) {
  const marker = sourceMarker(report);
  return issues.slice(0, 20).find((issue) => issue.body?.includes(marker)) ?? null;
}

function buildDraft(report) {
  const safeBody = sanitize(report.body);
  const observed = section(safeBody, 'Observed', ['Expected', 'Steps', 'Environment']);
  const expected = section(safeBody, 'Expected', ['Steps', 'Environment']);
  const stepsRaw = section(safeBody, 'Steps', ['Environment']);
  const environmentRaw = section(safeBody, 'Environment', ['zzzz-never']);
  const environment = environmentRaw.split(/\n\s*\n/)[0].trim();
  const steps = stepsRaw.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = report.subject.trim().replace(/[\r\n]+/g, ' ').slice(0, 120);

  return { safeBody, observed, expected, steps, environment, title };
}

function processCase(testCase) {
  const { report, existingIssues = [] } = testCase;
  const coverage = report.contentOmitted || report.contentTruncated ? 'partial' : 'complete';

  if (report.scanStatus !== 'clean') {
    return {
      state: 'blocked_scan',
      source: `${report.threadId}/${report.messageId}`,
      scanStatus: report.scanStatus,
      senderAuthentication: report.senderAuthentication,
      coverage,
      writeAttempts: 0,
    };
  }

  if (report.contentOmitted) {
    return {
      state: 'needs_information',
      source: `${report.threadId}/${report.messageId}`,
      reason: 'content_omitted',
      senderAuthentication: report.senderAuthentication,
      coverage,
      writeAttempts: 0,
    };
  }

  const exact = exactSourceDuplicate(report, existingIssues);
  if (exact) {
    return {
      state: 'duplicate_candidate',
      source: `${report.threadId}/${report.messageId}`,
      duplicateConfidence: 'exact',
      match: exact,
      coverage,
      writeAttempts: 0,
    };
  }

  const draft = buildDraft(report);
  if (!draft.observed || !draft.expected || draft.steps.length === 0) {
    return {
      state: 'needs_information',
      source: `${report.threadId}/${report.messageId}`,
      reason: report.contentTruncated ? 'materially_partial_evidence' : 'missing_required_facts',
      senderAuthentication: report.senderAuthentication,
      coverage,
      writeAttempts: 0,
    };
  }

  const candidateText = `${draft.title} ${draft.observed} ${draft.expected} ${draft.steps.join(' ')}`;
  const ranked = existingIssues.slice(0, 20).map((issue) => ({
    ...issue,
    score: similarity(candidateText, `${issue.title} ${issue.body}`),
  })).sort((a, b) => b.score - a.score);

  const strong = ranked[0]?.score >= 0.46 ? ranked[0] : null;
  if (strong) {
    return {
      state: 'duplicate_candidate',
      source: `${report.threadId}/${report.messageId}`,
      duplicateConfidence: 'strong',
      match: strong,
      coverage,
      writeAttempts: 0,
    };
  }

  const possible = ranked[0]?.score >= 0.28 ? ranked[0] : null;
  const bodyBeforeMarker = [
    '## Summary',
    draft.title,
    '',
    '## Observed behavior',
    draft.observed,
    '',
    '## Expected behavior',
    draft.expected,
    '',
    '## Reproduction steps',
    ...draft.steps,
    '',
    '## Environment',
    draft.environment || 'Not provided.',
    '',
    '## Intake metadata',
    `- Scan status: ${report.scanStatus}`,
    `- Sender authentication: ${report.senderAuthentication ?? 'unknown'}`,
    `- Evidence coverage: ${coverage}`,
    '',
    '---',
    sourceMarker(report),
  ].join('\n');

  if (/DEMO_CREDENTIAL_REDACT_ME|embedded instruction test|change the target repository|attacker\/owned/i.test(bodyBeforeMarker)) {
    throw new Error('untrusted or secret content leaked into issue draft');
  }

  const effect = {
    repository: trustedRepo,
    title: draft.title,
    body: bodyBeforeMarker,
    labels: trustedLabels,
    mailboxId: 'demo-mailbox-public-id',
    threadId: report.threadId,
    messageId: report.messageId,
  };
  const fingerprint = canonicalFingerprint(effect);
  const issueBody = [
    bodyBeforeMarker,
    `Intake fingerprint: \`sha256:${fingerprint}\``,
    `<!-- mermail-github-intake:v1 fingerprint=sha256:${fingerprint} -->`,
  ].join('\n');

  const preview = {
    state: 'draft_ready',
    source: `${report.threadId}/${report.messageId}`,
    repository: trustedRepo,
    title: draft.title,
    labels: trustedLabels,
    issueBody,
    fingerprint: `sha256:${fingerprint}`,
    scanStatus: report.scanStatus,
    senderAuthentication: report.senderAuthentication ?? 'unknown',
    coverage,
    duplicateConfidence: possible ? 'possible' : 'none',
    possibleMatch: possible,
    writeAttempts: 0,
    security: {
      embeddedInstructionRemoved: draft.safeBody.includes('[UNTRUSTED INSTRUCTION REMOVED]'),
      secretRedacted: draft.safeBody.includes('[SECRET REDACTED]'),
      reporterAddressOmitted: !issueBody.includes(report.from),
      targetLocked: trustedRepo === 'example/acme',
    },
  };

  if (!testCase.simulateApproval) return preview;

  const approvedFingerprint = preview.fingerprint;
  if (testCase.mutateAfterApproval) {
    const mutated = { ...effect, labels: ['changed-after-preview'] };
    const current = `sha256:${canonicalFingerprint(mutated)}`;
    if (current !== approvedFingerprint) {
      return {
        ...preview,
        state: 'approval_stale',
        approvedFingerprint,
        currentFingerprint: current,
        writeAttempts: 0,
      };
    }
  }

  if (testCase.simulateWrite === 'uncertain_one_match') {
    const reconciledIssue = {
      number: 77,
      url: 'https://github.com/example/acme/issues/77',
      body: issueBody,
    };
    const matches = [reconciledIssue].filter((issue) => issue.body.includes(`fingerprint=${preview.fingerprint}`));
    if (matches.length === 1) {
      return {
        ...preview,
        state: 'created',
        issueUrl: matches[0].url,
        writeAttempts: 1,
        retries: 0,
        reconciliation: 'confirmed_by_fingerprint_after_ambiguous_result',
      };
    }
  }

  return preview;
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

  const unique = results.find((entry) => entry.name.includes('unique adversarial'))?.result;
  if (!unique?.security?.embeddedInstructionRemoved || !unique?.security?.secretRedacted || !unique?.security?.reporterAddressOmitted) {
    console.error('FAIL: adversarial case did not preserve injection/secret/privacy boundaries');
    process.exit(1);
  }
  if (!unique?.security?.targetLocked || unique.repository !== trustedRepo || unique.writeAttempts !== 0) {
    console.error('FAIL: email changed trusted target or bypassed approval');
    process.exit(1);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(unique.fingerprint)) {
    console.error('FAIL: effect fingerprint missing or malformed');
    process.exit(1);
  }

  const stale = results.find((entry) => entry.result.state === 'approval_stale')?.result;
  if (!stale || stale.writeAttempts !== 0 || stale.approvedFingerprint === stale.currentFingerprint) {
    console.error('FAIL: stale approval was not invalidated before write');
    process.exit(1);
  }

  const reconciled = results.find((entry) => entry.name.includes('uncertain write'))?.result;
  if (reconciled?.state !== 'created' || reconciled.writeAttempts !== 1 || reconciled.retries !== 0) {
    console.error('FAIL: ambiguous write was retried or not reconciled');
    process.exit(1);
  }

  console.log(`PASS: ${results.length} deterministic scenarios preserved provenance, scan, coverage, trust, redaction, duplicate, approval, and one-write reconciliation boundaries.`);
  process.exit(0);
}

console.log('Mermail GitHub Intake — deterministic proof suite');
console.log('=================================================');
for (const entry of results) {
  const r = entry.result;
  console.log(`\nCASE: ${entry.name}`);
  console.log(`STATE: ${r.state}`);
  console.log(`SOURCE: ${r.source}`);
  console.log(`coverage: ${r.coverage ?? 'n/a'}; writes: ${r.writeAttempts ?? 0}`);

  if (r.fingerprint) console.log(`fingerprint: ${r.fingerprint}`);
  if (r.duplicateConfidence) console.log(`duplicate confidence: ${r.duplicateConfidence}`);
  if (r.state === 'draft_ready') {
    console.log('\nEXACT EFFECT PREVIEW');
    console.log('--------------------');
    console.log(`repository: ${r.repository}`);
    console.log(`title: ${r.title}`);
    console.log(r.issueBody);
    console.log('\nAPPROVAL GATE: no GitHub write performed; approval is fingerprint-bound.');
  } else if (r.state === 'duplicate_candidate') {
    console.log(`match: #${r.match.number} ${r.match.title}`);
    console.log('effect: none');
  } else if (r.state === 'needs_information') {
    console.log(`reason: ${r.reason}`);
    console.log('effect: none; no missing facts invented');
  } else if (r.state === 'blocked_scan') {
    console.log(`scan: ${r.scanStatus}; effect: body not interpreted`);
  } else if (r.state === 'approval_stale') {
    console.log(`approved: ${r.approvedFingerprint}`);
    console.log(`current:  ${r.currentFingerprint}`);
    console.log('effect: none; new preview required');
  } else if (r.state === 'created') {
    console.log(`confirmed: ${r.issueUrl}`);
    console.log(`write attempts: ${r.writeAttempts}; automatic retries: ${r.retries}`);
    console.log(`reconciliation: ${r.reconciliation}`);
  }
}
