const { Router } = require('express');
const CollaboratorController = require('../controllers/CollaboratorController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

routes.get('/', CollaboratorController.index);
routes.post('/', CollaboratorController.store);
routes.get('/:id', CollaboratorController.show);
routes.put('/:id', CollaboratorController.update);
routes.delete('/:id', CollaboratorController.destroy);

module.exports = routes;
