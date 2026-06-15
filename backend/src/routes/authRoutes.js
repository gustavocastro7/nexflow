const { Router } = require('express');
const AuthController = require('../controllers/AuthController');

const routes = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Performs user login
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
 *         description: Invalid credentials
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Performs registration of a new user
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
 *         description: User registered successfully
 */
routes.post('/register', AuthController.register);

/**
 * @swagger
 * /auth/check-user:
 *   get:
 *     summary: Checks if a user exists by email
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
routes.get('/check-user', AuthController.checkUserExists);

routes.post('/login', AuthController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Performs user logout
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
