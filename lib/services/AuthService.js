import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserConfig from '../models/UserConfig.js';

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
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '1d' }
    );

    const userJson = user.toJSON();
    userJson.config = config.toJSON();

    return { user: userJson, token };
  }
}

export default new AuthService();
