const { Router } = require('express');
const AuthController = require('../controllers/AuthController');

const routes = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza o login do usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Realiza o registro de um novo usuário
 *     tags: [Auth]
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
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 */
routes.post('/register', AuthController.register);

/**
 * @swagger
 * /auth/check-user:
 *   get:
 *     summary: Verifica se um usuário existe pelo email
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultado da verificação
 */
routes.get('/check-user', AuthController.checkUserExists);

routes.post('/login', AuthController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza o logout do usuário
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
routes.post('/logout', (req, res) => {
  return res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = routes;
