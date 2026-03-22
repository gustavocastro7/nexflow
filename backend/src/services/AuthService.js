const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserConfig = require('../models/UserConfig');

class AuthService {
  async authenticate(email, password) {
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: UserConfig, as: 'config' }]
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.active === false) {
      throw new Error('User deactivated. Please contact the administrator.');
    }

    const isValid = await user.checkPassword(password);

    if (!isValid) {
      throw new Error('Invalid password');
    }

    // Update or create UserConfig
    let config = await UserConfig.findOne({ where: { user_id: user.id } });
    if (!config) {
      config = await UserConfig.create({ 
        user_id: user.id, 
        last_login: new Date() 
      });
    } else {
      await config.update({ last_login: new Date() });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, profile: user.profile },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Re-fetch user with config if not already present or updated
    user.config = config;

    return { user, token };
  }
}

module.exports = new AuthService();
