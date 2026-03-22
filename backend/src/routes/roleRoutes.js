const { Router } = require('express');
const RoleController = require('../controllers/RoleController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Cria um novo papel
 *     tags: [Roles]
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
 *     responses:
 *       201:
 *         description: Papel criado com sucesso
 */
routes.post('/', RoleController.store);

/**
 * @swagger
 * /roles/assign:
 *   post:
 *     summary: Atribui um papel a um usuário
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               roleName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Papel atribuído com sucesso
 */
routes.post('/assign', RoleController.assign);

/**
 * @swagger
 * /roles/check:
 *   get:
 *     summary: Verifica se um usuário tem um papel
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: requiredRole
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultado da verificação
 */
routes.get('/check', RoleController.check);

module.exports = routes;
