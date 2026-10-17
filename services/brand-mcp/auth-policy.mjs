const DOMAIN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Preset audiences. AUTH_PROFILE selects one; it does not combine them. */
export const EMAIL_DOMAIN_PROFILES = Object.freeze({
  demo: Object.freeze(['wateraidflow.org']),
  production: Object.freeze(['wateraid.org']),
});

function parseDomains(value) {
  const domains = value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  if (!domains.length || domains.some(domain => !DOMAIN.test(domain))) {
    throw new Error('AUTH_EMAIL_DOMAINS must be a comma-separated list of DNS names');
  }
  return Object.freeze([...new Set(domains)]);
}

function sameDomains(left, right) {
  if (left.length !== right.length) return false;
  const allowed = new Set(right);
  return left.every(domain => allowed.has(domain));
}

/**
 * Resolve the active email audience.
 * No profile and no explicit list disables Firebase auth (public MCP).
 * AUTH_PROFILE=demo admits wateraidflow.org.
 * AUTH_PROFILE=production admits wateraid.org.
 * AUTH_EMAIL_DOMAINS, when set alone, is an explicit list. When set with a profile, it must match that profile.
 */
export function resolveEmailPolicy(env = process.env) {
  const profile = String(env.AUTH_PROFILE || '').trim().toLowerCase();
  const explicit = String(env.AUTH_EMAIL_DOMAINS || '').trim();
  if (!profile && !explicit) return null;
  if (profile && !EMAIL_DOMAIN_PROFILES[profile]) throw new Error('AUTH_PROFILE must be demo or production');
  const domains = explicit ? parseDomains(explicit) : EMAIL_DOMAIN_PROFILES[profile];
  if (profile && explicit && !sameDomains(domains, EMAIL_DOMAIN_PROFILES[profile])) {
    throw new Error('AUTH_EMAIL_DOMAINS must match AUTH_PROFILE');
  }
  return { profile: profile || 'custom', domains };
}

/** Accept a verified mailbox whose domain is exactly one configured audience. */
export function identityFromEmail(email, emailVerified, domains) {
  if (emailVerified !== true) throw new Error('Email is not verified');
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(normalized)) throw new Error('Email is not allowed');
  const domain = normalized.slice(normalized.lastIndexOf('@') + 1);
  if (!domains.includes(domain)) throw new Error('Email is not allowed');
  return { email: normalized, domain };
}
