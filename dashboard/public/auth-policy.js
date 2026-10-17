const DOMAIN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Preset audiences. A profile selects one list; it does not combine them. */
export const EMAIL_DOMAIN_PROFILES = Object.freeze({
  demo: Object.freeze(['wateraidflow.org']),
  production: Object.freeze(['wateraid.org']),
});

function parseDomains(value) {
  const domains = String(value).split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
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
 * No profile and no explicit list leaves sign-in unconfigured.
 * demo admits wateraidflow.org. production admits wateraid.org.
 * An explicit list must match the selected profile.
 */
export function resolveEmailPolicy({ profile = '', domains = '' } = {}) {
  const selected = String(profile || '').trim().toLowerCase();
  const explicit = String(domains || '').trim();
  if (!selected && !explicit) return null;
  if (selected && !EMAIL_DOMAIN_PROFILES[selected]) throw new Error('AUTH_PROFILE must be demo or production');
  const allowed = explicit ? parseDomains(explicit) : EMAIL_DOMAIN_PROFILES[selected];
  if (selected && explicit && !sameDomains(allowed, EMAIL_DOMAIN_PROFILES[selected])) {
    throw new Error('AUTH_EMAIL_DOMAINS must match AUTH_PROFILE');
  }
  return { profile: selected || 'custom', domains: allowed };
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

/** Demo keeps the email fallback. Production is Google only. */
export function providerAllowed(profile, provider) {
  if (provider === 'google.com') return true;
  return provider === 'password' && profile !== 'production';
}

function safeHost(value) {
  const host = String(value || '').trim().toLowerCase();
  return DOMAIN.test(host) ? host : '';
}

/** Public sign-in settings. Never include signing secrets. */
export function publicAuthConfig(env = {}) {
  const policy = resolveEmailPolicy({ profile: env.AUTH_PROFILE || '', domains: env.AUTH_EMAIL_DOMAINS || '' });
  if (!policy) return null;
  const apiKey = String(env.FIREBASE_API_KEY || '').trim();
  const authDomain = safeHost(env.FIREBASE_AUTH_DOMAIN);
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const firebase = apiKey && authDomain && projectId ? { apiKey, authDomain, projectId } : null;
  return {
    profile: policy.profile,
    allowedDomains: [...policy.domains],
    hostedDomain: policy.domains[0],
    passwordSignIn: policy.profile === 'demo',
    demoUser: policy.profile === 'demo' ? 'flow-demo@wateraidflow.org' : null,
    firebase,
  };
}

/** Browser policy that allows the Firebase web SDK and Google sign-in frames. */
export function contentSecurityPolicy(env = {}) {
  const authDomain = safeHost(env.FIREBASE_AUTH_DOMAIN) || 'wateraid-flow.firebaseapp.com';
  return [
    "default-src 'self'",
    "script-src 'self' https://www.gstatic.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://accounts.google.com https://www.gstatic.com",
    `frame-src https://accounts.google.com https://apis.google.com https://${authDomain}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
