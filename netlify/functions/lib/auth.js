const crypto = require('crypto');
const { jsonResponse } = require('./response');

const TOKEN_VERSION = 'v1';
const TOKEN_TTL_SECONDS = parseInt(process.env.SESSION_TOKEN_TTL || '1800', 10);

function getSecret() {
  if (!process.env.SESSION_TOKEN_SECRET) {
    throw new Error('SESSION_TOKEN_SECRET environment variable is required');
  }
  return process.env.SESSION_TOKEN_SECRET;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signTokenPayload(payload) {
  const secret = getSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
}

function issueSessionToken(subject, customTtlSeconds = TOKEN_TTL_SECONDS) {
  const expiresAt = Date.now() + customTtlSeconds * 1000;
  const payload = {
    sub: subject,
    exp: expiresAt,
  };
  const serializedPayload = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(serializedPayload);
  const signature = signTokenPayload(`${TOKEN_VERSION}.${encodedPayload}`);
  const token = `${TOKEN_VERSION}.${encodedPayload}.${signature}`;

  return { token, expiresAt };
}

function verifySessionToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [version, encodedPayload, providedSignature] = parts;
  if (version !== TOKEN_VERSION) {
    throw new Error('Invalid token version');
  }

  const expectedSignature = signTokenPayload(`${version}.${encodedPayload}`);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (!payload.exp || payload.exp <= Date.now()) {
    throw new Error('Token expired');
  }

  return payload;
}

function requireAuthentication(event) {
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return {
      isAuthorized: false,
      response: jsonResponse(401, { message: 'Missing authorization header' }),
    };
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifySessionToken(token);
    return {
      isAuthorized: true,
      payload,
    };
  } catch (error) {
    return {
      isAuthorized: false,
      response: jsonResponse(401, { message: error.message || 'Unauthorized' }),
    };
  }
}

module.exports = {
  issueSessionToken,
  verifySessionToken,
  requireAuthentication,
};
