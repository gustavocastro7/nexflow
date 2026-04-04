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

/**
 * @swagger
 * /reports/phone-lines:
 *   get:
 *     summary: General phone number list (paginated)
 */
routes.get('/phone-lines', ReportController.getPhoneLines);

/**
 * @swagger
 * /reports/consumption-by-cost-center:
 *   get:
 *     summary: Consumption grouped by cost center and reference month (paginated)
 */
routes.get('/consumption-by-cost-center', ReportController.getConsumptionByCostCenter);

/**
 * @swagger
 * /reports/consumption-by-responsible:
 *   get:
 *     summary: Consumption by responsible person for a reference month (paginated)
 */
routes.get('/consumption-by-responsible', ReportController.getConsumptionByResponsible);

/**
 * @swagger
 * /reports/consumption-by-subsection:
 *   get:
 *     summary: Consumption by phone number and sub-section for a reference month (paginated)
 */
routes.get('/consumption-by-subsection', ReportController.getConsumptionBySubSection);

/**
 * @swagger
 * /reports/line-detail:
 *   get:
 *     summary: Get detailed items for a specific line and reference month (paginated)
 */
routes.get('/line-detail', ReportController.getLineDetail);

/**
 * @swagger
 * /reports/due-dates:
 *   get:
 *     summary: List available due dates from raw invoices
 */
routes.get('/due-dates', ReportController.getDueDates);

/**
 * @swagger
 * /reports/reference-months:
 *   get:
 *     summary: List available reference months
 */
routes.get('/reference-months', ReportController.getReferenceMonths);

module.exports = routes;

