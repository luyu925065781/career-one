#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const MARKET_ROOT = join(ROOT, 'markets', 'china-mainland');
const TRACKER = join(MARKET_ROOT, 'data', 'applications.md');
const REPORTS = join(MARKET_ROOT, 'reports');
const ADDITIONS = join(MARKET_ROOT, 'batch', 'tracker-additions');
const REQUIRED = [
  join(MARKET_ROOT, 'README.md'),
  join(MARKET_ROOT, 'config', 'profile.yml'),
  join(MARKET_ROOT, 'modes', '_profile.md'),
  join(MARKET_ROOT, 'portals.yml'),
  join(MARKET_ROOT, 'data', 'pipeline.md'),
  TRACKER,
];

const env = {
  ...process.env,
  CAREER_ONE_TRACKER: TRACKER,
  CAREER_ONE_REPORTS: REPORTS,
  CAREER_ONE_ADDITIONS: ADDITIONS,
};

function rel(path) {
  return relative(ROOT, path) || '.';
}

function pendingTsvs() {
  if (!existsSync(ADDITIONS)) return [];
  return readdirSync(ADDITIONS)
    .filter((name) => name.endsWith('.tsv'))
    .map((name) => join(ADDITIONS, name));
}

function missingRequired() {
  return REQUIRED.filter((path) => !existsSync(path));
}

function run(script, args = []) {
  const result = spawnSync(process.execPath, [join(ROOT, script), ...args], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  return result.status ?? 0;
}

function status() {
  const missing = missingRequired();
  console.log('China mainland market workspace');
  console.log('================================');
  console.log(`root: ${rel(MARKET_ROOT)}`);
  console.log(`profile: ${rel(join(MARKET_ROOT, 'config', 'profile.yml'))}`);
  console.log(`portals: ${rel(join(MARKET_ROOT, 'portals.yml'))}`);
  console.log(`pipeline: ${rel(join(MARKET_ROOT, 'data', 'pipeline.md'))}`);
  console.log(`tracker: ${rel(TRACKER)}`);
  console.log(`reports: ${rel(REPORTS)}`);
  console.log(`additions: ${rel(ADDITIONS)}`);
  console.log('');

  if (missing.length > 0) {
    console.log('Missing required files:');
    for (const path of missing) console.log(`- ${rel(path)}`);
    return 1;
  }

  const pending = pendingTsvs();
  console.log(`pending tracker TSVs: ${pending.length}`);
  for (const file of pending) {
    const size = statSync(file).size;
    console.log(`- ${rel(file)} (${size} bytes)`);
  }
  return 0;
}

function verify() {
  const missing = missingRequired();
  if (missing.length > 0) {
    console.error('Missing required China mainland files:');
    for (const path of missing) console.error(`- ${rel(path)}`);
    return 1;
  }

  const statusCode = run('scripts/system/verify-pipeline.mjs');
  const pending = pendingTsvs();
  if (pending.length > 0) {
    console.error('\nPending China mainland tracker TSVs:');
    for (const file of pending) console.error(`- ${rel(file)}`);
    return 1;
  }
  return statusCode;
}

function merge(args) {
  const statusCode = run('scripts/tracker/merge-tracker.mjs', args);
  if (statusCode !== 0) return statusCode;
  return verify();
}

function find(args) {
  if (args.length === 0) {
    console.error('Usage: npm run cn:find -- <company | role | tracker# | report#>');
    return 1;
  }
  return run('scripts/tracker/find.mjs', args);
}

function help() {
  console.log(`Usage: node career-one.mjs cn <command>

Commands:
  doctor   Check the China mainland workspace and tracker integrity
  status   Print China mainland workspace paths and pending additions
  verify   Verify the China mainland applications tracker
  merge    Merge China mainland batch tracker additions, then verify
  find     Search the China mainland tracker
`);
}

const [command = 'help', ...args] = process.argv.slice(2);
let statusCode = 0;

switch (command) {
  case 'doctor':
    statusCode = status();
    if (statusCode === 0) statusCode = verify();
    break;
  case 'status':
    statusCode = status();
    break;
  case 'verify':
    statusCode = verify();
    break;
  case 'merge':
    statusCode = merge(args);
    break;
  case 'find':
    statusCode = find(args);
    break;
  case 'help':
  case '--help':
  case '-h':
    help();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    help();
    statusCode = 1;
}

process.exit(statusCode);
