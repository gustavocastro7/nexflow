const UserConfig = require('../models/UserConfig');
const Workspace = require('../models/Workspace'); // To validate last_workspace_id if provided

class UserConfigController {
  async getConfig(req, res) {
    try {
      const userId = req.userId; // authMiddleware populates req.userId

      const config = await UserConfig.findOne({
        where: { user_id: userId },
        include: [{ model: Workspace, as: 'lastWorkspace' }] // Include workspace details if needed
      });

      if (!config) {
        // If no config exists, create a default one (should ideally be handled by User creation/login)
        // For now, return a default structure or indicate no config found
        return res.status(404).json({ error: 'User configuration not found' });
      }

      // Return only relevant config details
      return res.json({
        theme_mode: config.theme_mode,
        language: config.language,
        last_workspace_id: config.last_workspace_id,
        menu_behavior: config.menu_behavior,
        last_login: config.last_login,
        // Add other config fields as needed
      });
    } catch (error) {
      console.error('Error fetching user config:', error.stack);
      res.status(500).json({ error: 'Internal Server Error while fetching configuration' });
    }
  }

  async updateConfig(req, res) {
    try {
      const userId = req.userId; // authMiddleware populates req.userId
      const { theme_mode, language, last_workspace_id, menu_behavior } = req.body;

      // Find the existing config or create if it doesn't exist
      let config = await UserConfig.findOne({ where: { user_id: userId } });

      if (!config) {
        // This case should ideally not happen if config is created on user creation/login,
        // but as a fallback:
        config = await UserConfig.create({
          user_id: userId,
          theme_mode,
          language,
          last_workspace_id,
          menu_behavior,
        });
      } else {
        // Update existing config
        // Only update fields that are provided in the request body
        if (theme_mode !== undefined) config.theme_mode = theme_mode;
        if (language !== undefined) config.language = language;
        if (last_workspace_id !== undefined) {
          // Optional: Validate if last_workspace_id is a valid workspace for the user
          // For simplicity, we'll assume it's valid if provided
          config.last_workspace_id = last_workspace_id;
        }
        if (menu_behavior !== undefined) config.menu_behavior = menu_behavior;

        await config.save();
      }

      // Return the updated config
      return res.json(config.toJSON());

    } catch (error) {
      console.error('Error updating user config:', error.stack);
      // Check for specific validation errors if necessary
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
      }
      res.status(500).json({ error: 'Internal Server Error while updating configuration' });
    }
  }
}

module.exports = new UserConfigController();
