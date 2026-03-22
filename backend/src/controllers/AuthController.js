const AuthService = require('../services/AuthService');
const User = require('../models/User');

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
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { user, token } = await AuthService.authenticate(email, password);

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
      return res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
