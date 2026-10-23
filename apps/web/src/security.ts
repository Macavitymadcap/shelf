import { NONCE, secureHeaders } from 'hono/secure-headers';

export const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", NONCE],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
  },
});
