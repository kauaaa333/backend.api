// Testes sem banco não podem herdar a conexão real do .env.
process.env.DATABASE_URL = 'postgresql://teste:teste@127.0.0.1:1/taskflow_sem_banco';
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = 'chave-local-exclusiva-dos-testes-unitarios';
process.env.AMBIENTE = 'teste';
process.env.TASKFLOW_PRODUCTION_SECURITY = 'false';
