
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function checkDatabase() {
  console.log('🔍 Checking Database...');

  try {
    // 1. Check connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // 2. Check counts
    const [counts] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM invoices) AS invoice_count,
        (SELECT COUNT(*) FROM phone_lines) AS phoneline_count,
        (SELECT COUNT(*) FROM cost_centers) AS costcenter_count,
        (SELECT COUNT(*) FROM users) AS user_count
    `);
    
    console.log('📊 Database Statistics:');
    console.table(counts[0]);

    // 3. Check reports logic (preview)
    console.log('🧪 Testing Reports Logic (Raw SQL)...');

    // Test unique phones from invoices + phone_lines
    const [uniquePhones] = await sequelize.query(`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT source_phone FROM invoices WHERE source_phone IS NOT NULL AND source_phone != ''
        UNION
        SELECT DISTINCT phone_number FROM phone_lines
      ) AS t
    `);
    console.log(`✅ Unique phone numbers found: ${uniquePhones[0].count}`);

    // Test original_user fallback
    const [fallbacks] = await sequelize.query(`
      SELECT source_phone, original_user 
      FROM invoices 
      WHERE original_user IS NOT NULL AND original_user != ''
      LIMIT 5
    `);
    if (fallbacks.length > 0) {
      console.log('✅ Found original_user data in invoices for fallback:');
      console.table(fallbacks);
    } else {
      console.log('⚠️ No original_user data found in invoices yet.');
    }

    console.log('\n✨ Database check finished!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
