const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(morgan('dev'));

// Static files (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nexflow API',
      version: '1.0.0',
      description: 'API para o sistema Nexflow',
    },
    servers: [
      {
        url: '/api',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [], // Empty for now to avoid ENOMEM in Docker
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Fallback for SPA (Redirect all other routes to index.html)
app.get('*path', (req, res) => {
  // If the request starts with /api, it's a 404 for the API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Otherwise, serve the frontend index.html
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
