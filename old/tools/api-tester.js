
const BASE_URL = 'http://localhost:3000/api';

async function testApi() {
  console.log('🚀 Starting API Test Tool...');
  console.log('💡 Note: Make sure the backend server is running on port 3000!');

  let token = '';
  let workspaceId = '';

  // 1. Login
  try {
    console.log('🔐 Testing Login...');
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gustavocastro73@gmail.com',
        password: 'castro'
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    const data = await response.json();
    token = data.token;
    console.log('✅ Login successful!');
  } catch (error) {
    console.error('❌ Login Error:', error.message);
    console.log('   (Did you start the server with "npm run dev"?)');
    process.exit(1);
  }

  // 2. Get Workspaces
  try {
    console.log('🏢 Fetching Workspaces...');
    const response = await fetch(`${BASE_URL}/workspaces`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Fetching workspaces failed with status ${response.status}`);
    }

    const workspaces = await response.json();
    if (workspaces.length === 0) {
      throw new Error('No workspaces found for the user');
    }

    workspaceId = workspaces[0].id;
    console.log(`✅ Found ${workspaces.length} workspaces. Using: ${workspaces[0].name}`);
  } catch (error) {
    console.error('❌ Workspace Error:', error.message);
    process.exit(1);
  }

  const reports = [
    { name: 'Phone Lines', endpoint: '/reports/phone-lines' },
    { name: 'Consumption by Cost Center', endpoint: '/reports/consumption-by-cost-center' },
    { name: 'Consumption by Responsible', endpoint: '/reports/consumption-by-responsible', needsMonth: true }
  ];

  // 3. Get Reference Months
  let referenceMonth = '';
  try {
    console.log('📅 Fetching Reference Months...');
    const response = await fetch(`${BASE_URL}/reports/reference-months?workspaceId=${workspaceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const months = await response.json();
      if (months.length > 0) {
        referenceMonth = months[0];
        console.log(`✅ Found reference months. Using: ${referenceMonth}`);
      } else {
        console.log('⚠️ No reference months found. Some reports might return empty results.');
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch reference months:', error.message);
  }

  // 4. Test Reports
  for (const report of reports) {
    try {
      console.log(`📊 Testing Report: ${report.name}...`);
      let url = `${BASE_URL}${report.endpoint}?workspaceId=${workspaceId}`;
      if (report.needsMonth && referenceMonth) {
        url += `&referenceMonth=${referenceMonth}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`${report.name} failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Basic structure validation
      if (!Array.isArray(data.items)) {
        throw new Error(`${report.name} response "items" is not an array`);
      }
      if (typeof data.total !== 'number') {
        throw new Error(`${report.name} response "total" is not a number`);
      }

      console.log(`✅ ${report.name} successful! Found ${data.items.length} items (Total: ${data.total})`);
      
      // Check if fallback worked for Phone Lines
      if (report.endpoint === '/reports/phone-lines' && data.items.length > 0) {
        const itemWithFallback = data.items.find(i => i.id.startsWith('temp-'));
        if (itemWithFallback) {
          console.log(`   💡 Verified: Fallback working for line ${itemWithFallback.phoneNumber} (Responsible: ${itemWithFallback.responsibleName})`);
        }
      }
    } catch (error) {
      console.error(`❌ ${report.name} Error:`, error.message);
    }
  }

  console.log('\n✨ API Test finished!');
}

testApi();
