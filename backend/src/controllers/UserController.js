const User = require('../models/User');
const UserConfig = require('../models/UserConfig');
const UserWorkspace = require('../models/UserWorkspace');
const Workspace = require('../models/Workspace');

class UserController {
  async index(req, res) {
    try {
      const { workspaceId, includeInactive } = req.query;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }

      const whereClause = {};
      if (includeInactive !== 'true') {
        whereClause.active = true;
      }

      const workspace = await Workspace.findByPk(workspaceId, {
        include: [
          {
            model: User,
            as: 'users',
            where: whereClause,
            through: { attributes: [] },
            attributes: ['id', 'name', 'email', 'profile', 'active', 'default_workspace_id']
          }
        ]
      });

      if (!workspace) {
        const wsExists = await Workspace.findByPk(workspaceId);
        if (!wsExists) {
          return res.status(404).json({ error: 'Workspace not found' });
        }
        return res.json([]);
      }

      return res.json(workspace.users || []);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error listing users' });
    }
  }

  async store(req, res) {
    try {
      // Role Check
      if (req.userProfile !== 'admin' && req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Permission denied. Only admins can create users.' });
      }

      const { name, email, password, profile, workspaceId } = req.body;

      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }

      // Check if user already exists
      let user = await User.findOne({ where: { email } });

      if (user) {
        // If user exists, check if already in workspace
        const association = await UserWorkspace.findOne({
          where: { user_id: user.id, workspace_id: workspaceId }
        });

        if (association) {
          return res.status(400).json({ error: 'User already associated with this workspace' });
        }
      } else {
        // Create new user
        user = await User.create({
          name,
          email,
          password_hash: password,
          profile: profile || 'user',
          default_workspace_id: workspaceId
        });
      }

      // Associate with workspace
      await UserWorkspace.create({
        user_id: user.id,
        workspace_id: workspaceId
      });

      return res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        active: user.active
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error creating user' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      
      // Role Check
      if (req.userProfile !== 'admin' && req.userProfile !== 'jedi' && req.userId !== id) {
        return res.status(403).json({ error: 'Permission denied.' });
      }

      const { name, email, profile, default_workspace_id, active } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent non-admin from changing profile or status
      const updatedData = {
        name,
        email,
        default_workspace_id,
      };

      // Admin can change profile and status
      if (req.userProfile === 'admin' || req.userProfile === 'jedi') {
        if (profile) updatedData.profile = profile;
        if (active !== undefined) updatedData.active = active;
      }

      await user.update(updatedData);

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        default_workspace_id: user.default_workspace_id,
        active: user.active,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error updating user' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        include: [{ model: UserConfig, as: 'config' }]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        active: user.active,
        default_workspace_id: user.default_workspace_id,
        config: user.config
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching user' });
    }
  }

  async delete(req, res) {
    try {
      // Role Check
      if (req.userProfile !== 'admin' && req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Permission denied.' });
      }

      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await user.update({ active: false });

      return res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error deactivating user' });
    }
  }

  async changePassword(req, res) {
    try {
      const { id } = req.params;
      
      if (req.userId !== id) {
        return res.status(403).json({ error: 'Permission denied.' });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const checkPassword = await user.checkPassword(currentPassword);
      if (!checkPassword) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      user.password_hash = newPassword;
      await user.save();

      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error changing password' });
    }
  }

  async updateConfig(req, res) {
    try {
      const { id } = req.params;
      if (req.userId !== id && req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Permission denied.' });
      }

      const { last_workspace_id, theme_mode, language } = req.body;

      let config = await UserConfig.findOne({ where: { user_id: id } });
      if (!config) {
        config = await UserConfig.create({ 
          user_id: id,
          last_workspace_id,
          theme_mode,
          language
        });
      } else {
        await config.update({ 
          last_workspace_id, 
          theme_mode, 
          language 
        });
      }

      return res.json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error updating configuration' });
    }
  }
}

module.exports = new UserController();
