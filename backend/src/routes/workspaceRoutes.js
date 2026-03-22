const { Router } = require('express');
const WorkspaceController = require('../controllers/WorkspaceController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /workspaces:
 *   get:
 *     summary: Lista todos os workspaces (Jedi)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
routes.get('/', WorkspaceController.index);

/**
 * @swagger
 * /workspaces:
 *   post:
 *     summary: Cria um novo workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
routes.post('/', WorkspaceController.store);

/**
 * @swagger
 * /workspaces/{id}:
 *   get:
 *     summary: Busca um workspace pelo ID
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
routes.get('/:id', WorkspaceController.show);

/**
 * @swagger
 * /workspaces/{id}:
 *   put:
 *     summary: Atualiza um workspace (Admin Master)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
routes.put('/:id', WorkspaceController.update);

/**
 * @swagger
 * /workspaces/{id}:
 *   delete:
 *     summary: Exclui um workspace (Admin Master)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
routes.delete('/:id', WorkspaceController.destroy);

routes.get('/user/:userId', WorkspaceController.listByUser);
routes.post('/set-session', WorkspaceController.setSession);
routes.post('/associate-unique', WorkspaceController.associateUnique);
routes.post('/remove-association', WorkspaceController.removeAssociation);
routes.get('/verify', WorkspaceController.verifyAssociation);
routes.post('/notify-problem', WorkspaceController.notifyAssociationProblem);
routes.post('/associate', WorkspaceController.associate);
routes.get('/check-association', WorkspaceController.checkAssociation);

module.exports = routes;
