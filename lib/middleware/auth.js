import jwt from 'jsonwebtoken';

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userProfile = decoded.profile;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
