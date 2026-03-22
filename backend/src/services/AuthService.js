const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserConfig = require('../models/UserConfig');

class AuthService {
  async authenticate(email, password) {
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: UserConfig, as: 'config' }]
    });

    console.log(`Authenticating user: ${email}`);

    if (!user) {
      console.log(`User not found: ${email}`);
      throw new Error('User not found');
    }

    if (user.active === false) {
      console.log(`User deactivated: ${email}`);
      throw new Error('User deactivated. Please contact the administrator.');
    }

    const isValid = await user.checkPassword(password);

    if (!isValid) {
      console.log(`Invalid password for user: ${email}`);
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

    console.log(`User config updated for: ${email}`);

    const token = jwt.sign(
      { id: user.id, email: user.email, profile: user.profile },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '1d' }
    );

    console.log(`Token generated for: ${email}`);

    // Return as plain objects to avoid Sequelize instance issues
    const userJson = user.toJSON();
    userJson.config = config.toJSON();

    return { user: userJson, token };
  }
}

module.exports = new AuthService();
