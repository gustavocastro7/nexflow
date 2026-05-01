const AuthService = require('../services/AuthService');
const User = require('../models/User');
const { logOperation } = require('../utils/auditLogger');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
      }

      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = await User.create({
        name,
        email,
        password_hash: password,
        profile: 'user', // Default role
      });

      // Log registration
      await logOperation({
        user_id: user.id,
        workspace_id: user.default_workspace_id || '00000000-0000-0000-0000-000000000000',
        action: 'REGISTER',
        entity: 'User',
        entity_id: user.id,
        ip_address: req.ip,
        payload: { email: user.email, name: user.name }
      });

      return res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error registering user' });
    }
  }

  async checkUserExists(req, res) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await User.findOne({ where: { email } });
      return res.json({ exists: !!user });
    } catch (error) {
      return res.status(500).json({ error: 'Error checking user existence' });
    }
  }

  async login(req, res) {
    const { email, password } = req.body;
    try {
      console.log(`Login attempt for email: ${email}`);

      if (!email || !password) {
        console.error('Login failed: Missing email or password');
        return res.status(400).json({ error: 'Email and password are required' });
      }

      console.log(`Calling AuthService.authenticate for ${email}`);
      const { user, token } = await AuthService.authenticate(email, password);
      console.log(`AuthService.authenticate successful for ${email}`);

      // Log successful login
      await logOperation({
        user_id: user.id,
        workspace_id: user.default_workspace_id || '00000000-0000-0000-0000-000000000000',
        action: 'LOGIN',
        entity: 'User',
        entity_id: user.id,
        ip_address: req.ip,
        payload: { email: user.email }
      });

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profile: user.profile,
          default_workspace_id: user.default_workspace_id,
          config: user.config,
        },
        token,
      });
    } catch (error) {
      console.error(`Login failed for ${email}: ${error.message}`);
      
      // Attempt to log failed login if we can find the user
      try {
        const attemptedUser = await User.findOne({ where: { email } });
        if (attemptedUser) {
           await logOperation({
            user_id: attemptedUser.id,
            workspace_id: attemptedUser.default_workspace_id || '00000000-0000-0000-0000-000000000000',
            action: 'LOGIN_FAILED',
            entity: 'User',
            entity_id: attemptedUser.id,
            ip_address: req.ip,
            payload: { email, error: error.message }
          });
        }
      } catch (logErr) {
        // Ignore logging error
      }

      return res.status(500).json({ error: error.message || 'Internal Server Error during login' });
    }
  }
}

module.exports = new AuthController();
