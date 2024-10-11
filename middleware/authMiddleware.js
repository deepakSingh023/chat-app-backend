const jwt = require('jsonwebtoken');
require('dotenv').config(); // To load environment variables

const auth = (req, res, next) => {
  let token;

  // Check for authorization header and if it starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; // Extract the token after 'Bearer'
  }

  // If no token was found, send an unauthorized response
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user info (typically id) to the request object
    req.user = { id: decoded.id }; 
    
    // Proceed to the next middleware/controller
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = auth;  // Use `auth` directly as middleware
