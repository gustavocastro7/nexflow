const { Router } = require('express');
const InvoiceController = require('../controllers/InvoiceController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = Router();

routes.use(authMiddleware);

/**
 * @swagger
 * /invoices/claro/import:
 *   post:
 *     summary: Import invoices Claro (Positional)
 */
routes.post('/claro/import', InvoiceController.importClaro);

/**
 * @swagger
 * /invoices/vivo/import:
 *   post:
 *     summary: Import invoices Vivo (Tabulated)
 */
routes.post('/vivo/import', InvoiceController.importVivo);

/**
 * @swagger
 * /invoices/claro-txt/import:
 *   post:
 *     summary: Import invoices Claro TXT (Delimited)
 */
routes.post('/claro-txt/import', InvoiceController.importClaroTXT);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List unified invoices
 */
routes.get('/', InvoiceController.index);

// Compatibility
routes.get('/claro', InvoiceController.indexClaro);
routes.get('/vivo', InvoiceController.indexVivo);

module.exports = routes;

