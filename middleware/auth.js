const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    console.log('Received token:', token);
    console.log('Using JWT_SECRET:', process.env.JWT_SECRET.substring(0, 5) + '...');  // Log first 5 chars of secret
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decodedToken);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};