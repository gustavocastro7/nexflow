const ReportController = require('./backend/src/controllers/ReportController');
const sequelize = require('./backend/src/config/database');

async function testDataConsumptionReport() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Get a workspace ID from the database
    const [workspaces] = await sequelize.query(`
      SELECT id FROM workspaces LIMIT 1
    `);
    
    if (workspaces.length === 0) {
      console.log('No workspaces found in database');
      return;
    }
    
    const workspaceId = workspaces[0].id;
    console.log(`Testing with workspace ID: ${workspaceId}`);
    
    // Get a due date to test with
    const [dueDates] = await sequelize.query(`
      SELECT DISTINCT due_date
      FROM raw_invoices
      WHERE workspace_id = :workspaceId AND due_date IS NOT NULL
      ORDER BY due_date DESC
      LIMIT 1
    `, { replacements: { workspaceId } });
    
    if (dueDates.length === 0) {
      console.log('No due dates found for this workspace');
      return;
    }
    
    const dueDate = dueDates[0].due_date;
    console.log(`Testing with due date: ${dueDate}`);
    
    // Create a mock request object
    const mockReq = {
      query: {
        workspaceId: workspaceId,
        dueDate: dueDate,
        page: 0
      },
      userId: 'test-user'
    };
    
    const mockRes = {
      json: (data) => {
        console.log('\\nData Consumption Report Result:');
        console.log(JSON.stringify(data, null, 2));
      },
      status: (code) => {
        return {
          json: (data) => {
            console.log(`\\nError Response (Status ${code}):`);
            console.log(JSON.stringify(data, null, 2));
          }
        };
      }
    };
    
    // Test the data consumption report
    console.log('\\nExecuting data consumption report...');
    await ReportController.getDataConsumption(mockReq, mockRes);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error testing data consumption report:', error);
  }
}

testDataConsumptionReport();