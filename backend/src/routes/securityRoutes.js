const { Router } = require('express');
const UserSecurityController = require('../controllers/UserSecurityController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /security/{userId}:
 *   get:
 *     summary: Busca as configurações de segurança do usuário
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
 *         description: Configurações retornadas com sucesso
 */
routes.get('/:userId', UserSecurityController.show);

/**
 * @swagger
 * /security/{userId}:
 *   put:
 *     summary: Atualiza as configurações de segurança do usuário
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
 *         description: Configurações atualizadas com sucesso
 */
routes.put('/:userId', UserSecurityController.update);

/**
 * @swagger
 * /security/{userId}/check:
 *   get:
 *     summary: Verifica se o usuário tem configurações de segurança
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
 *         description: Resultado da verificação
 */
routes.get('/:userId/check', UserSecurityController.checkConfigured);

module.exports = routes;
