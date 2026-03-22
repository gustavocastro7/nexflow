const { Router } = require('express');
const ReportController = require('../controllers/ReportController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /reports/spending-by-cc:
 *   get:
 *     summary: Get spending by cost center
 */
routes.get('/spending-by-cc', ReportController.getSpendingByCostCenter);

/**
 * @swagger
 * /reports/dashboard-stats:
 *   get:
 *     summary: Get dashboard statistics
 */
routes.get('/dashboard-stats', ReportController.getDashboardStats);

module.exports = routes;

