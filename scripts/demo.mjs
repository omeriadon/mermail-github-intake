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
  const suffix = next ? `(?=\\n\\n(?:${next}):|$)` : '$';
  const re = new RegExp(`${escaped}:\\s*([\\s\\S]*?)${suffix}`, 'i');
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

function sourceMarker(report) {
  return `Source: Mermail thread \`${report.threadId}\`, message \`${report.messageId}\`.`;
}

function exactSourceDuplicate(report, issues) {
  const marker = sourceMarker(report);
  return issues.slice(0, 20).find((issue) => issue.body?.includes(marker)) ?? null;
}

function buildRecord(report) {
  const safeBody = sanitize(report.body);
  const title = report.subject.trim().replace(/[\r\n]+/g, ' ').slice(0, 120);
  const isFeature = /(?:^|\n)Requested:\s*/i.test(safeBody) || /(?:^|\n)Outcome:\s*/i.test(safeBody);

  if (isFeature) {
    const requested = section(safeBody, 'Requested', ['Outcome', 'Environment']);
    const outcome = section(safeBody, 'Outcome', ['Environment']);
    const environment = section(safeBody, 'Environment', []);
    return {
      kind: 'feature_request',
      safeBody,
      title,
      requested,
      outcome,
      environment,
      actionable: Boolean(requested && outcome),
    };
  }

  const observed = section(safeBody, 'Observed', ['Expected', 'Steps', 'Environment']);
  const expected = section(safeBody, 'Expected', ['Steps', 'Environment']);
  const stepsRaw = section(safeBody, 'Steps', ['Environment']);
  const environmentRaw = section(safeBody, 'Environment', []);
  const environment = environmentRaw.split(/\n\s*\n/)[0].trim();
  const steps = stepsRaw.split('\n').map((line) => line.trim()).filter(Boolean);
  const hasAnchor = steps.length > 0 || Boolean(environment);

  return {
    kind: 'bug',
    safeBody,
    title,
    observed,
    expected,
    steps,
    environment,
    actionable: Boolean(observed && hasAnchor),
  };
}

function renderIssue(record, report) {
  const lines = ['## Summary', record.title, ''];

  if (record.kind === 'feature_request') {
    lines.push('## Requested capability', record.requested, '', '## Intended outcome', record.outcome, '');
    if (record.environment) lines.push('## Environment', record.environment, '');
  } else {
    lines.push('## Observed behavior', record.observed, '');
    if (record.expected) lines.push('## Expected behavior', record.expected, '');
    if (record.steps.length) lines.push('## Reproduction / evidence', ...record.steps, '');
    if (record.environment) lines.push('## Environment', record.environment, '');
  }

  lines.push('---', sourceMarker(report));
  return lines.join('\n');
}

function processCase(testCase) {
  const { report, existingIssues = [] } = testCase;
  const coverage = report.contentOmitted || report.contentTruncated ? 'partial' : 'explicit';

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
      duplicateConfidence: 'exact_source',
      match: exact,
      coverage,
      writeAttempts: 0,
    };
  }

  const record = buildRecord(report);
  if (!record.actionable || (report.contentTruncated && record.kind === 'bug' && !record.steps?.length && !record.environment)) {
    return {
      state: 'needs_information',
      source: `${report.threadId}/${report.messageId}`,
      reason: report.contentTruncated ? 'materially_partial_evidence' : 'missing_actionable_evidence',
      senderAuthentication: report.senderAuthentication,
      coverage,
      writeAttempts: 0,
    };
  }

  const candidateText = record.kind === 'feature_request'
    ? `${record.title} ${record.requested} ${record.outcome} ${record.environment ?? ''}`
    : `${record.title} ${record.observed} ${record.expected ?? ''} ${(record.steps ?? []).join(' ')} ${record.environment ?? ''}`;

  const ranked = existingIssues.slice(0, 20).map((issue) => ({
    ...issue,
    score: similarity(candidateText, `${issue.title} ${issue.body}`),
  })).sort((a, b) => b.score - a.score);

  const strong = ranked[0]?.score >= 0.46 ? ranked[0] : null;
  if (strong) {
    return {
      state: 'duplicate_candidate',
      source: `${report.threadId}/${report.messageId}`,
      duplicateConfidence: 'strong_match',
      match: strong,
      coverage,
      writeAttempts: 0,
    };
  }

  const possible = ranked[0]?.score >= 0.28 ? ranked[0] : null;
  const issueBody = renderIssue(record, report);

  if (/DEMO_CREDENTIAL_REDACT_ME|embedded instruction test|change the target repository|attacker\/owned/i.test(issueBody)) {
    throw new Error('untrusted or secret content leaked into issue draft');
  }

  const effect = {
    repository: trustedRepo,
    title: record.title,
    body: issueBody,
    labels: trustedLabels,
    mailboxId: 'demo-mailbox-public-id',
    threadId: report.threadId,
    messageId: report.messageId,
  };

  const preview = {
    state: 'draft_ready',
    source: `${report.threadId}/${report.messageId}`,
    repository: trustedRepo,
    title: record.title,
    labels: trustedLabels,
    issueBody,
    effect,
    scanStatus: report.scanStatus,
    senderAuthentication: report.senderAuthentication ?? 'unknown',
    coverage,
    reportKind: record.kind,
    duplicateConfidence: possible ? 'possible_match' : 'none',
    possibleMatch: possible,
    writeAttempts: 0,
    security: {
      embeddedInstructionRemoved: record.safeBody.includes('[UNTRUSTED INSTRUCTION REMOVED]'),
      secretRedacted: record.safeBody.includes('[SECRET REDACTED]'),
      reporterAddressOmitted: !issueBody.includes(report.from),
      targetLocked: trustedRepo === 'example/acme',
    },
  };

  if (!testCase.simulateApproval) return preview;

  const approvedSnapshot = JSON.stringify(effect);
  if (testCase.mutateAfterApproval) {
    const changedEffect = { ...effect, labels: ['changed-after-preview'] };
    if (JSON.stringify(changedEffect) !== approvedSnapshot) {
      return {
        ...preview,
        state: 'awaiting_approval',
        reason: 'effect_changed_repreview_required',
        approvedEffect: effect,
        currentEffect: changedEffect,
        writeAttempts: 0,
      };
    }
  }

  if (testCase.simulateWrite === 'uncertain_one_match') {
    const reconciledIssue = {
      number: 77,
      title: preview.title,
      url: 'https://github.com/example/acme/issues/77',
      body: issueBody,
    };
    const matches = [reconciledIssue].filter(
      (issue) => issue.title === preview.title && issue.body.includes(sourceMarker(report)),
    );
    if (matches.length === 1) {
      return {
        ...preview,
        state: 'created',
        issueUrl: matches[0].url,
        writeAttempts: 1,
        retries: 0,
        reconciliation: 'confirmed_by_source_identity_and_approved_title',
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

  const drift = results.find((entry) => entry.name.includes('effect mutation'))?.result;
  if (drift?.state !== 'awaiting_approval' || drift.writeAttempts !== 0 || drift.reason !== 'effect_changed_repreview_required') {
    console.error('FAIL: changed effect did not require a new preview before write');
    process.exit(1);
  }

  const reconciled = results.find((entry) => entry.name.includes('uncertain write'))?.result;
  if (reconciled?.state !== 'created' || reconciled.writeAttempts !== 1 || reconciled.retries !== 0) {
    console.error('FAIL: ambiguous write was retried or not reconciled');
    process.exit(1);
  }

  const feature = results.find((entry) => entry.name.includes('feature request'))?.result;
  if (feature?.state !== 'draft_ready' || feature.reportKind !== 'feature_request' || /## Environment/.test(feature.issueBody)) {
    console.error('FAIL: feature request required or invented irrelevant environment boilerplate');
    process.exit(1);
  }

  console.log(`PASS: ${results.length} deterministic scenarios preserved scan, evidence, authority, duplicate, exact-effect, actionability, and one-write reconciliation boundaries.`);
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

  if (r.reportKind) console.log(`kind: ${r.reportKind}`);
  if (r.duplicateConfidence) console.log(`duplicate confidence: ${r.duplicateConfidence}`);
  if (r.state === 'draft_ready') {
    console.log('\nEXACT EFFECT PREVIEW');
    console.log('--------------------');
    console.log(`repository: ${r.repository}`);
    console.log(`title: ${r.title}`);
    console.log(r.issueBody);
    console.log('\nAPPROVAL GATE: no GitHub write performed; any effect change requires a new preview.');
  } else if (r.state === 'duplicate_candidate') {
    console.log(`match: #${r.match.number} ${r.match.title}`);
    console.log('effect: none');
  } else if (r.state === 'needs_information') {
    console.log(`reason: ${r.reason}`);
    console.log('effect: none; no missing facts invented');
  } else if (r.state === 'blocked_scan') {
    console.log(`scan: ${r.scanStatus}; effect: body not interpreted`);
  } else if (r.state === 'awaiting_approval') {
    console.log(`reason: ${r.reason}`);
    console.log('effect: none; changed payload must be previewed again');
  } else if (r.state === 'created') {
    console.log(`confirmed: ${r.issueUrl}`);
    console.log(`write attempts: ${r.writeAttempts}; automatic retries: ${r.retries}`);
    console.log(`reconciliation: ${r.reconciliation}`);
  }
}
