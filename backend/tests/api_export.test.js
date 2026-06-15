const request = require('supertest');
const express = require('express');
const reportRoutes = require('../src/routes/reportRoutes');

// Create a minimal app to test the route
const app = express();
app.use('/api/reports', reportRoutes);

describe('GET /reports/export-csv', () => {
  it('should return 400 if workspaceId or type is missing', async () => {
    const res = await request(app).get('/api/reports/export-csv');
    expect(res.status).toBe(400);
  });
});
