// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { isIP } from 'node:net';

const JOB_PATH_RE = /\/(?:jobs?|positions?|vacanc(?:y|ies)|careers?\/jobs?|recruit(?:ment)?\/(?:jobs?|positions?)|jobdetail)(?:\/|$)/i;
const GENERIC_LINK_RE = /^(?:jobs?|careers?|职位|岗位|社会招聘|校园招聘|加入我们|查看详情|了解更多)$/i;
const CONFIRMED_EMPTY_RE = /(?:暂无(?:开放)?(?:职位|岗位)|暂无招聘|no\s+(?:open\s+)?(?:positions?|jobs?|vacanc(?:y|ies))|currently\s+no\s+openings?)/i;
const ENTITY_MAP = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(value) {
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const hex = body[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITY_MAP[body.toLowerCase()] ?? match;
  });
}

function cleanText(value) {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function publicCareersUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || ''));
  } catch {
    throw new Error('official-careers: careers_url must be a public HTTPS URL');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !host || host === 'localhost' || host.endsWith('.local') || isIP(host) !== 0) {
    throw new Error('official-careers: careers_url must be a public HTTPS URL');
  }
  return url;
}

function absoluteUrl(raw, base) {
  if (!raw) return '';
  try {
    const url = new URL(String(raw), base);
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function typeIncludesJobPosting(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.some((type) => String(type || '').toLowerCase() === 'jobposting');
}

function locationText(value) {
  const locations = Array.isArray(value) ? value : value ? [value] : [];
  const parts = [];
  for (const location of locations) {
    if (!location || typeof location !== 'object') continue;
    const address = location.address && typeof location.address === 'object' ? location.address : location;
    for (const key of ['addressLocality', 'addressRegion', 'addressCountry']) {
      const raw = address[key];
      const text = typeof raw === 'object' && raw ? raw.name : raw;
      const clean = cleanText(text);
      if (clean && !parts.includes(clean)) parts.push(clean);
    }
  }
  return parts.join(', ');
}

function postedEpoch(value) {
  if (!value) return undefined;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
}

function jsonLdUrl(node) {
  if (typeof node.url === 'string') return node.url;
  if (typeof node.mainEntityOfPage === 'string') return node.mainEntityOfPage;
  if (node.mainEntityOfPage && typeof node.mainEntityOfPage === 'object') {
    return node.mainEntityOfPage['@id'] || node.mainEntityOfPage.url || '';
  }
  return '';
}

function collectJsonLdJobs(value, baseUrl, fallbackCompany, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdJobs(item, baseUrl, fallbackCompany, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeIncludesJobPosting(value['@type'])) {
    const title = cleanText(value.title || value.name);
    const url = absoluteUrl(jsonLdUrl(value), baseUrl);
    if (title && url) {
      out.push({
        title,
        url,
        company: cleanText(value.hiringOrganization?.name) || fallbackCompany,
        location: locationText(value.jobLocation),
        postedAt: postedEpoch(value.datePosted),
        description: cleanText(value.description),
      });
    }
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') collectJsonLdJobs(child, baseUrl, fallbackCompany, out);
  }
}

export function parsePublicCareerPage(html, baseUrl, fallbackCompany) {
  const base = publicCareersUrl(baseUrl);
  const jobs = [];
  const scripts = String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      collectJsonLdJobs(JSON.parse(match[1].trim()), base.href, fallbackCompany, jobs);
    } catch {
      // A malformed analytics/schema block must not hide other valid public data.
    }
  }

  const anchors = String(html || '').matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of anchors) {
    const url = absoluteUrl(decodeEntities(match[2]), base.href);
    const title = cleanText(match[3]);
    if (!url || !title || title.length > 160 || GENERIC_LINK_RE.test(title)) continue;
    const parsed = new URL(url);
    if (parsed.origin !== base.origin || !JOB_PATH_RE.test(parsed.pathname)) continue;
    jobs.push({ title, url, company: fallbackCompany, location: '' });
  }

  const seen = new Set();
  return jobs.filter((job) => {
    const key = job.url.toLowerCase().replace(/#.*$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** @type {Provider} */
export default {
  id: 'official-careers',

  // Explicit provider opt-in only. A generic parser must never pre-empt a
  // purpose-built provider that understands a specific public careers system.
  detect() {
    return null;
  },

  async fetch(entry, ctx) {
    const url = publicCareersUrl(entry.careers_url);
    const html = await ctx.fetchText(url.href, {
      redirect: 'error',
      headers: { accept: 'text/html,application/xhtml+xml' },
    });
    const jobs = parsePublicCareerPage(html, url.href, entry.name);
    if (jobs.length === 0 && !CONFIRMED_EMPTY_RE.test(cleanText(html))) {
      throw new Error(`official-careers: ${entry.name} exposes no readable public job data`);
    }
    return jobs;
  },
};
