const { execSync } = require('child_process');

const testDatabaseUrl = 'postgresql://postgres:postgres@localhost:5433/test';

console.log('Executando migrações no banco de dados de teste...');
try {
  execSync(`npx prisma migrate deploy --schema=./prisma/schema.prisma`, {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: 'inherit',
  });
  console.log('Migrações executadas com sucesso!');
} catch (error) {
  console.error('Erro ao executar migrações:', error.message);
  process.exit(1);
}
