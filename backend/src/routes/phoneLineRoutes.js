const { Router } = require('express');
const PhoneLineController = require('../controllers/PhoneLineController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

routes.get('/', PhoneLineController.index);
routes.put('/:id', PhoneLineController.update);

module.exports = routes;
