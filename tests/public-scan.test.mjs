import { pass, fail, ROOT } from './helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';

console.log('\nPublic target-company scan contract');

try {
  const scan = await import(pathToFileURL(join(ROOT, 'scripts/scan/scan.mjs')).href);
  const now = Date.parse('2026-07-10T12:00:00Z');
  const recent = scan.buildPostedAfterFilter(7, now);

  if (recent(Date.parse('2026-07-09T00:00:00Z')) && !recent(Date.parse('2026-06-01T00:00:00Z')) && recent(undefined)) {
    pass('public scan applies recency when available and keeps unknown dates');
  } else {
    fail('public scan recency filter has the wrong boundary behavior');
  }

  const line = scan.formatWebScanResult({ companiesScanned: 2, offers: [{ title: 'AI 产品经理' }] });
  const prefix = '@@CAREER_ONE_SCAN_JSON@@';
  if (line.startsWith(prefix)) {
    const payload = JSON.parse(line.slice(prefix.length));
    if (payload.companiesScanned === 2 && payload.offers[0].title === 'AI 产品经理') {
      pass('public scan emits a stable machine-readable result marker');
    } else {
      fail(`public scan marker payload is wrong: ${JSON.stringify(payload)}`);
    }
  } else {
    fail(`public scan result is missing its marker: ${line}`);
  }
} catch (error) {
  fail(`public target-company scan tests crashed: ${error.message}`);
}
