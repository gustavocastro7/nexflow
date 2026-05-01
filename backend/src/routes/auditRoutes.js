const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/AuditController');
const authMiddleware = require('../middlewares/authMiddleware');

// All audit routes are protected and for Jedi only
router.use(authMiddleware);

// Middleware to check if user is Jedi
const jediOnly = (req, res, next) => {
  if (req.userProfile === 'jedi') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Jedi profile required.' });
};

router.get('/', jediOnly, AuditController.list);
router.get('/actions', jediOnly, AuditController.getActionTypes);
router.get('/entities', jediOnly, AuditController.getEntityTypes);

module.exports = router;
