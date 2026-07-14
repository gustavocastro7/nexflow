const MockSeeder = require('./src/utils/MockSeeder');

async function seed() {
  try {
    await MockSeeder.run();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding mock data:', error);
    process.exit(1);
  }
}

seed();
