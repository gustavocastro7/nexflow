const { Router } = require('express');
const UserConfigController = require('../controllers/UserConfigController');
const authMiddleware = require('../middlewares/authMiddleware'); // Assuming authMiddleware exists

const routes = Router();

/**
 * @swagger
 * /user/config:
 *   get:
 *     summary: Obtém a configuração do usuário logado
 *     tags: [UserConfig]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuração do usuário retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserConfig'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
routes.get('/', authMiddleware, UserConfigController.getConfig);

/**
 * @swagger
 * /user/config:
 *   put:
 *     summary: Atualiza a configuração do usuário logado
 *     tags: [UserConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme_mode:
 *                 type: string
 *                 enum: ['light', 'dark']
 *               language:
 *                 type: string
 *               last_workspace_id:
 *                 type: string
 *                 format: uuid
 *               menu_behavior:
 *                 type: string
 *                 enum: ['always_open', 'hover', 'collapsible']
 *     responses:
 *       200:
 *         description: Configuração do usuário atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserConfig'
 *       400:
 *         description: Requisição inválida
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
routes.put('/', authMiddleware, UserConfigController.updateConfig);

module.exports = routes;
