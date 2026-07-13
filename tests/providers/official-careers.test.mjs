// Public target-company career pages: JSON-LD first, conservative same-origin links second.
import { pass, fail, ROOT } from '../helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';

console.log('\nProvider — official-careers');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'providers/official-careers.mjs')).href);
  const provider = mod.default;
  const { parsePublicCareerPage } = mod;

  if (provider.id === 'official-careers') pass('official-careers has a stable provider id');
  else fail(`official-careers id is ${JSON.stringify(provider.id)}`);

  if (provider.detect({ name: 'Acme', careers_url: 'https://careers.acme.cn/jobs' }) === null) {
    pass('official-careers requires explicit opt-in and never steals another provider URL');
  } else {
    fail('official-careers detect() must stay null');
  }

  const html = `
    <script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"Organization","name":"Acme"},
        {"@type":"JobPosting","title":"AI 产品负责人","url":"/jobs/ai-product","datePosted":"2026-07-09",
         "hiringOrganization":{"name":"Acme AI"},
         "jobLocation":{"address":{"addressLocality":"深圳","addressRegion":"广东"}}}
      ]}
    </script>
    <a href="/positions/agent-ops">智能体产品运营</a>
    <a href="https://outside.example/jobs/copied">外站岗位</a>
    <a href="/about">关于我们</a>`;
  const jobs = parsePublicCareerPage(html, 'https://careers.acme.cn/careers', 'Acme');

  const structured = jobs.find((job) => job.url === 'https://careers.acme.cn/jobs/ai-product');
  if (structured
      && structured.title === 'AI 产品负责人'
      && structured.company === 'Acme AI'
      && structured.location === '深圳, 广东'
      && structured.postedAt === Date.parse('2026-07-09')) {
    pass('official-careers parses and normalizes public JobPosting JSON-LD');
  } else {
    fail(`official-careers JSON-LD result is wrong: ${JSON.stringify(structured)}`);
  }

  const linked = jobs.find((job) => job.url === 'https://careers.acme.cn/positions/agent-ops');
  if (linked?.title === '智能体产品运营' && linked.company === 'Acme') {
    pass('official-careers keeps conservative same-origin job links');
  } else {
    fail(`official-careers link result is wrong: ${JSON.stringify(linked)}`);
  }

  if (!jobs.some((job) => job.url.includes('outside.example')) && jobs.length === 2) {
    pass('official-careers drops cross-origin and non-job navigation links');
  } else {
    fail(`official-careers returned unsafe/noisy links: ${JSON.stringify(jobs)}`);
  }

  let requested = '';
  let options;
  const fetched = await provider.fetch(
    { name: 'Acme', provider: 'official-careers', careers_url: 'https://careers.acme.cn/careers' },
    { fetchText: async (url, opts) => { requested = url; options = opts; return html; } },
  );
  if (requested === 'https://careers.acme.cn/careers' && options?.redirect === 'error' && fetched.length === 2) {
    pass('official-careers fetches one public page without following redirects');
  } else {
    fail(`official-careers fetch contract wrong: ${requested} ${JSON.stringify(options)} ${fetched.length}`);
  }

  let called = false;
  try {
    await provider.fetch(
      { name: 'Local', provider: 'official-careers', careers_url: 'http://127.0.0.1/jobs' },
      { fetchText: async () => { called = true; return ''; } },
    );
    fail('official-careers should reject non-public URLs');
  } catch (error) {
    if (!called && /public HTTPS/.test(error.message)) pass('official-careers blocks private/non-HTTPS URLs before fetching');
    else fail(`official-careers URL guard failed: called=${called}, error=${error.message}`);
  }

  if (parsePublicCareerPage('<html><a href="/about">About</a></html>', 'https://acme.cn/careers', 'Acme').length === 0) {
    pass('official-careers returns an empty list for a public page with no job data');
  } else {
    fail('official-careers should not invent jobs from a generic page');
  }

  try {
    await provider.fetch(
      { name: 'Shell', provider: 'official-careers', careers_url: 'https://careers.shell.cn/' },
      { fetchText: async () => '<html><div id="app"></div><script src="/app.js"></script></html>' },
    );
    fail('official-careers should not report an unreadable app shell as an empty board');
  } catch (error) {
    if (/no readable public job data/.test(error.message)) pass('official-careers distinguishes unreadable pages from confirmed-empty boards');
    else fail(`official-careers unreadable-page error is wrong: ${error.message}`);
  }

  const confirmedEmpty = await provider.fetch(
    { name: 'Empty', provider: 'official-careers', careers_url: 'https://careers.empty.cn/' },
    { fetchText: async () => '<html><main>暂无开放职位</main></html>' },
  );
  if (Array.isArray(confirmedEmpty) && confirmedEmpty.length === 0) pass('official-careers accepts an explicit no-openings message as confirmed empty');
  else fail(`official-careers confirmed-empty result is wrong: ${JSON.stringify(confirmedEmpty)}`);
} catch (error) {
  fail(`official-careers provider tests crashed: ${error.message}`);
}
