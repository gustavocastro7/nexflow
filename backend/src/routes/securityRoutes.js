const { Router } = require('express');
const UserSecurityController = require('../controllers/UserSecurityController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /security/{userId}:
 *   get:
 *     summary: Retrieves user security settings
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Settings returned successfully
 */
routes.get('/:userId', UserSecurityController.show);

/**
 * @swagger
 * /security/{userId}:
 *   put:
 *     summary: Updates user security settings
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               two_factor_enabled:
 *                 type: boolean
 *               is_locked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
routes.put('/:userId', UserSecurityController.update);

/**
 * @swagger
 * /security/{userId}/check:
 *   get:
 *     summary: Checks if the user has security settings
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
routes.get('/:userId/check', UserSecurityController.checkConfigured);

module.exports = routes;
