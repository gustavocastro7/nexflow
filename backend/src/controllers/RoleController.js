const Role = require('../models/Role');
const User = require('../models/User');

class RoleController {
  async store(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Role name is required' });
      }

      const roleExists = await Role.findOne({ where: { name } });
      if (roleExists) {
        return res.status(400).json({ error: 'Role already exists' });
      }

      const role = await Role.create({ name });
      return res.status(201).json(role);
    } catch (error) {
      return res.status(500).json({ error: 'Error creating role' });
    }
  }

  async assign(req, res) {
    try {
      const { userId, roleName } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // In this simple implementation, we update the 'profile' field
      // but in a more robust RBAC, we'd use a many-to-many relationship.
      // Following visionCTO.md, 'profile' is a field in the User model.
      user.profile = roleName;
      await user.save();

      return res.json({ message: 'Role assigned successfully', user });
    } catch (error) {
      return res.status(500).json({ error: 'Error assigning role' });
    }
  }

  async check(req, res) {
    try {
      const { userId, requiredRole } = req.query;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hasRole = user.profile === requiredRole || user.profile === 'jedi';
      return res.json({ hasRole });
    } catch (error) {
      return res.status(500).json({ error: 'Error checking role' });
    }
  }
}

module.exports = new RoleController();
