const UserSecurity = require('../models/UserSecurity');

class UserSecurityController {
  async show(req, res) {
    try {
      const { userId } = req.params;
      let security = await UserSecurity.findOne({ where: { user_id: userId } });

      if (!security) {
        // If not exists, create a default one
        security = await UserSecurity.create({ user_id: userId });
      }

      return res.json(security);
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching security configurations' });
    }
  }

  async update(req, res) {
    try {
      const { userId } = req.params;
      const { two_factor_enabled, is_locked } = req.body;

      let security = await UserSecurity.findOne({ where: { user_id: userId } });

      if (!security) {
        security = await UserSecurity.create({ 
          user_id: userId,
          two_factor_enabled,
          is_locked
        });
      } else {
        await security.update({
          two_factor_enabled,
          is_locked
        });
      }

      return res.json(security);
    } catch (error) {
      return res.status(500).json({ error: 'Error updating security configurations' });
    }
  }

  async checkConfigured(req, res) {
    try {
      const { userId } = req.params;
      const security = await UserSecurity.findOne({ where: { user_id: userId } });

      return res.json({ configured: !!security });
    } catch (error) {
      return res.status(500).json({ error: 'Error checking security configurations' });
    }
  }
}

module.exports = new UserSecurityController();
