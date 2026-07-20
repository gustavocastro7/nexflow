import { connectDB } from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import User from '../models/User.js';
import UserConfig from '../models/UserConfig.js';

class AuthService {
  async authenticate(email, password) {
    await connectDB();

    const user = await User.findOne({ email });

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

    let config = await UserConfig.findOne({ user_id: user.id });
    if (!config) {
      config = await UserConfig.create({
        user_id: user.id,
        last_login: new Date()
      });
    } else {
      config.last_login = new Date();
      await config.save();
    }

    const token = signToken(
      { id: user.id, email: user.email, profile: user.profile },
      { expiresIn: '1d' }
    );

    const userJson = user.toObject();
    userJson.config = config.toObject();

    return { user: userJson, token };
  }
}

export default new AuthService();
