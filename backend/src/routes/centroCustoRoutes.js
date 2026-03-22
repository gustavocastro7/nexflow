const { Router } = require('express');
const CostCenterController = require('../controllers/CostCenterController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /cost-centers:
 *   get:
 *     summary: List cost centers for a workspace
 *     tags: [CostCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of cost centers
 */
routes.get('/', CostCenterController.index);

/**
 * @swagger
 * /cost-centers:
 *   post:
 *     summary: Create a new cost center
 *     tags: [CostCenters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               workspaceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cost center created
 */
routes.post('/', CostCenterController.store);

/**
 * @swagger
 * /cost-centers/{id}:
 *   get:
 *     summary: Get a cost center by ID
 *     tags: [CostCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cost center data
 */
routes.get('/:id', CostCenterController.show);

/**
 * @swagger
 * /cost-centers/{id}:
 *   put:
 *     summary: Update a cost center
 *     tags: [CostCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cost center updated
 */
routes.put('/:id', CostCenterController.update);

/**
 * @swagger
 * /cost-centers/{id}:
 *   delete:
 *     summary: Remove a cost center
 *     tags: [CostCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cost center removed
 */
routes.delete('/:id', CostCenterController.destroy);

module.exports = routes;
