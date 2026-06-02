const sequelize = require('./backend/src/config/database');

async function checkQuantityValues() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Check what the quantity values actually look like
    const [quantitySamples] = await sequelize.query(`
      SELECT 
        i.quantity,
        typeof(i.quantity) as quantity_type,
        i.section,
        i.sub_section,
        i.description
      FROM invoices i
      WHERE (i.section ILIKE '%DADOS%' OR i.sub_section ILIKE '%DADOS%' 
             OR i.description ILIKE '%DADOS%' OR i.description ILIKE '%INTERNET%')
        AND i.quantity IS NOT NULL
      LIMIT 20
    `);
    
    console.log('Quantity value samples:');
    console.log(quantitySamples);
    
    // Check if any have non-numeric characters
    const [nonNumericCheck] = await sequelize.query(`
      SELECT 
        i.quantity,
        CASE 
          WHEN i.quantity ~ '[^0-9.]' THEN 'HAS NON-NUMERIC'
          ELSE 'NUMERIC ONLY'
        END as check_result
      FROM invoices i
      WHERE (i.section ILIKE '%DADOS%' OR i.sub_section ILIKE '%DADOS%' 
             OR i.description ILIKE '%DADOS%' OR i.description ILIKE '%INTERNET%')
        AND i.quantity IS NOT NULL
      LIMIT 20
    `);
    
    console.log('\\nNon-numeric check:');
    console.log(nonNumericCheck);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error checking quantity values:', error);
  }
}

checkQuantityValues();