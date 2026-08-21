/**
 * followup-cadence.test.mjs — tests for computeNextFollowupDate cadence selection.
 *
 * Focuses on the `responded` branch, where the first follow-up after a recruiter
 * reply must be scheduled with `responded_initial`, not `responded_subsequent`.
 *
 * Run: node followup-cadence.test.mjs
 */

import {
  computeNextFollowupDate,
  addDays,
  groupApplicationsForFollowup,
  parseDate,
  DEFAULT_CADENCE,
} from '../../scripts/analysis/followup-cadence.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let passed = 0;
let failed = 0;
const failures = [];

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.log(`  FAIL: ${label}`);
    console.log(`    expected: ${e}`);
    console.log(`    actual:   ${a}`);
  }
}

const APP = '2026-06-30';

// The first follow-up after a recruiter response is due at appDate + responded_initial.
// responded_initial (and its profile override responded_initial_days) is otherwise only
// read by computeUrgency, so before the fix it had no effect on the scheduled date.
eq(
  'responded, no prior follow-up uses responded_initial',
  computeNextFollowupDate('responded', APP, null, 0),
  addDays(parseDate(APP), DEFAULT_CADENCE.responded_initial),
);

// Subsequent follow-ups still use responded_subsequent, counted from the last follow-up.
eq(
  'responded, with prior follow-up uses responded_subsequent',
  computeNextFollowupDate('responded', APP, '2026-07-02', 1),
  addDays(parseDate('2026-07-02'), DEFAULT_CADENCE.responded_subsequent),
);

// The initial next-date must not land after the overdue threshold, otherwise a row can be
// flagged "overdue" (daysSinceApp >= responded_subsequent) while its own next-follow-up
// date is still in the future, which is impossible for a date meant to trigger "overdue".
eq(
  'initial next follow-up is not later than the overdue threshold',
  computeNextFollowupDate('responded', APP, null, 0) <=
    addDays(parseDate(APP), DEFAULT_CADENCE.responded_subsequent),
  true,
);

// Regression: the applied branch is unchanged.
eq(
  'applied, no follow-ups uses applied_first',
  computeNextFollowupDate('applied', APP, null, 0),
  addDays(parseDate(APP), DEFAULT_CADENCE.applied_first),
);

const groupedApplications = groupApplicationsForFollowup([
  {
    num: 1,
    date: '2026-07-10',
    company: 'Wispr Flow',
    role: 'Ex-Founder',
    via: '—',
    notes: '[Applied 2026-07-10] English report',
  },
  {
    num: 2,
    date: '2026-07-10',
    company: ' WISPR   FLOW ',
    role: 'Ex–Founder',
    via: '',
    notes: '[Applied 2026-07-10] Chinese report',
  },
  {
    num: 3,
    date: '2026-07-11',
    company: 'Wispr Flow',
    role: 'Ex-Founder',
    via: '—',
    notes: '[Applied 2026-07-11] Re-application',
  },
  {
    num: 4,
    date: '2026-07-10',
    company: 'Wispr Flow',
    role: 'Ex-Founder',
    via: 'Hays',
    notes: '[Applied 2026-07-10] Agency application',
  },
]);

eq(
  'same real application groups translated reports under one follow-up identity',
  groupedApplications.map((group) => group.applicationNums),
  [[1, 2], [3], [4]],
);

eq(
  'follow-up grouping keeps the first tracker row as the canonical report',
  groupedApplications[0].num,
  1,
);

const isolatedRoot = mkdtempSync(join(tmpdir(), 'career-one-followup-isolation-'));
try {
  mkdirSync(join(isolatedRoot, 'data'), { recursive: true });
  writeFileSync(join(isolatedRoot, 'data', 'applications.md'), [
    '# Applications Tracker',
    '',
    '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '|---|------|---------|------|-------|--------|-----|--------|-------|',
    '| 91 | 2026-08-01 | Isolation Fixture Co | Test Role | 4.5/5 | Applied | no | - | Applied 2026-08-01 |',
    '',
  ].join('\n'));

  const script = fileURLToPath(new URL('../../scripts/analysis/followup-cadence.mjs', import.meta.url));
  const output = execFileSync(process.execPath, [script, '--json'], {
    cwd: isolatedRoot,
    env: { ...process.env, CAREER_ONE_ROOT: isolatedRoot },
    encoding: 'utf8',
  });
  const result = JSON.parse(output);
  eq(
    'CAREER_ONE_ROOT keeps follow-up analysis inside the isolated user-data workspace',
    result.entries?.map((entry) => [entry.num, entry.company]),
    [[91, 'Isolation Fixture Co']],
  );
} finally {
  rmSync(isolatedRoot, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Failures:', failures.join(', '));
  process.exit(1);
}
