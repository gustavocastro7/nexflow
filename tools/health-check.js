const http = require('http');
const { exec } = require('child_process');

const SERVICES = [
  { name: 'Backend', url: 'http://localhost:3000', timeout: 30000 },
  { name: 'Frontend', url: 'http://localhost:8080', timeout: 60000 }
];

function checkService(service) {
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > service.timeout) {
        clearInterval(interval);
        console.error(`\n[!] Timeout waiting for ${service.name} at ${service.url}`);
        resolve(false);
      }

      http.get(service.url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404) {
          clearInterval(interval);
          console.log(`\n[✓] ${service.name} is UP!`);
          resolve(true);
        }
      }).on('error', () => {
        process.stdout.write('.');
      });
    }, 2000);
  });
}

async function run() {
  console.log('Checking service health...');
  
  const backendUp = await checkService(SERVICES[0]);
  const frontendUp = await checkService(SERVICES[1]);

  if (frontendUp) {
    console.log('\nAll services ready. Attempting to force-open browser...');
    const url = 'http://localhost:8080';
    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
    exec(`${start} ${url}`);
  } else {
    console.error('\n[X] Critical failure: Frontend did not start in time.');
    process.exit(1);
  }
}

run();
