const { Router } = require('express');
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista usuários de um workspace
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
routes.get('/', UserController.index);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cria um novo usuário e associa ao workspace
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               profile:
 *                 type: string
 *               workspaceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário criado
 */
routes.post('/', UserController.store);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     tags: [Users]
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
 *         description: Dados do usuário
 */
routes.get('/:id', UserController.show);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza o profile do usuário
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *               profile:
 *                 type: string
 *               default_workspace_id:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 */
routes.put('/:id', UserController.update);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Desativa um usuário (Soft delete)
 *     tags: [Users]
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
 *         description: Usuário desativado com sucesso
 */
routes.delete('/:id', UserController.delete);

/**
 * @swagger
 * /users/{id}/change-password:
 *   put:
 *     summary: Altera a senha do usuário
 *     tags: [Users]
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
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 */
routes.put('/:id/change-password', UserController.changePassword);

/**
 * @swagger
 * /users/{id}/config:
 *   put:
 *     summary: Atualiza as configurações do usuário (tema, idioma, etc)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               last_workspace_id:
 *                 type: string
 *               theme_mode:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configurações atualizadas
 */
routes.put('/:id/config', UserController.updateConfig);

module.exports = routes;
