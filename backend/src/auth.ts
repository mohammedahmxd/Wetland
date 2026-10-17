import { createRemoteJWKSet, jwtVerify } from 'jose';
export type Identity = { subject: string };
export function createVerifier(env = process.env): (authorization?: string) => Promise<Identity> {
  if (env.AUTH_MODE === 'demo') {
    if (env.DEMO_AUTH_ENABLED !== 'true' || env.NODE_ENV === 'production' || env.K_SERVICE || env.AWS_EXECUTION_ENV)
      throw new Error('Demo authentication is limited to explicitly enabled local development');
    const users = new Set(['demo-staff', 'demo-contributor', 'demo-maintainer', 'demo-backup', 'demo-approver', 'demo-outsider']);
    return async header => { const subject = header?.replace(/^Bearer /, ''); if (!subject || !users.has(subject)) throw new Error('Invalid token'); return { subject }; };
  }
  if (!env.OIDC_ISSUER || !env.OIDC_AUDIENCE || !env.OIDC_JWKS_URL) throw new Error('OIDC_ISSUER, OIDC_AUDIENCE and OIDC_JWKS_URL are required');
  if (new URL(env.OIDC_JWKS_URL).protocol !== 'https:') throw new Error('JWKS URL must use HTTPS');
  const keys = createRemoteJWKSet(new URL(env.OIDC_JWKS_URL));
  return async header => {
    if (!header?.startsWith('Bearer ')) throw new Error('Missing bearer token');
    const { payload } = await jwtVerify(header.slice(7), keys, { issuer: env.OIDC_ISSUER, audience: env.OIDC_AUDIENCE, algorithms: ['RS256','ES256'], requiredClaims: ['sub','exp','iat'] });
    if (!payload.sub) throw new Error('Missing subject');
    return { subject: payload.sub };
  };
}
