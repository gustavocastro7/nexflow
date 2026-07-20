import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return 'dev_only_insecure_secret';
}

export function signToken(payload, options) {
  return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}
