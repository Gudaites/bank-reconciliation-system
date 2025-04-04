# Sistema de Conciliação Bancária

## Descrição

Sistema desenvolvido para conciliar automaticamente transações bancárias com registros contábeis internos de uma empresa. Utilizando uma API RESTful construída com NestJS e Prisma, o sistema permite importar arquivos CSV de transações, realizar a conciliação automática e consultar os resultados através de endpoints com filtros diversos.

## Tecnologias Utilizadas

- **Backend**: NestJS (framework Node.js)
- **ORM**: Prisma
- **Banco de Dados**: PostgreSQL
- **Containerização**: Docker e Docker Compose
- **Testes**: Vitest

## Funcionalidades Principais

- **Importação de CSV**: Upload de arquivos CSV de transações bancárias e contábeis
- **Conciliação Automática**: Algoritmo que identifica transações correspondentes com tolerância de ±2 dias
- **API RESTful**: Endpoints para consulta, filtros e estatísticas
- **Processamento Eficiente**: Uso de streams para processamento de arquivos grandes
- **Containerização Completa**: Ambiente isolado e pronto para execução

## Estrutura do Projeto

```
├── exemplos/                # Arquivos CSV de exemplo para testes
├── prisma/                  # Schema e migrações do Prisma
├── scripts/                 # Scripts utilitários
├── src/
│   ├── prisma/              # Módulo Prisma e repositórios
│   ├── transaction/         # Módulo de transações
│   │   ├── dto/             # Objetos de transferência de dados
│   │   ├── services/        # Serviços de negócio e reconciliação
│   │   ├── transaction.controllers.ts/    # Controlador da API
│   │   └── transaction.module.ts
│   ├── app.module.ts        # Módulo principal
│   └── main.ts              # Ponto de entrada da aplicação
├── test/                    # Testes unitários e de integração
├── uploads/                 # Diretório temporário para uploads
├── docker-compose.yml       # Configuração do Docker Compose
└── Dockerfile               # Configuração do container da aplicação
```

## Algoritmo de Conciliação

O algoritmo de conciliação implementado compara transações bancárias e contábeis com base em três critérios:

1. **Valor**: Montantes exatamente iguais
2. **Tipo**: Mesmo tipo de operação (CREDIT/DEBIT)
3. **Data**: Dentro de uma janela de tolerância de ±2 dias

Quando uma correspondência é encontrada, ambas as transações são marcadas como `MATCHED` e vinculadas através de um registro na tabela de correspondências.

## Requisitos

- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)

## Como Executar

### Usando Docker Compose (Recomendado)

```bash
# Clonar o repositório
git clone https://github.com/gudaites/sistema-conciliacao-bancaria.git
cd sistema-conciliacao-bancaria

# Iniciar os containers
docker-compose up -d

# Verificar logs
docker-compose logs -f api
```

A API estará disponível em: http://localhost:3000

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as configurações do banco de dados

# Gerar cliente Prisma
npx prisma generate

# Aplicar migrações
npx prisma migrate dev

# Iniciar em modo de desenvolvimento
npm run start:dev
```

## Formato dos Arquivos CSV

Os arquivos CSV devem seguir o seguinte formato:

### Transações Bancárias
```
date,description,amount,type
2023-01-15,Pagamento Fornecedor A,1000.50,DEBIT
2023-01-20,Recebimento Cliente X,2000.75,CREDIT
```

### Transações Contábeis
```
date,description,amount,type
2023-01-14,Pagamento Fornecedor A (Contabilidade),1000.50,DEBIT
2023-01-21,Recebimento Cliente X (Contabilidade),2000.75,CREDIT
```

## Como Testar a API

### Importação de Arquivos CSV

```bash
# Importar transações bancárias
curl -X POST -F "file=@./exemplos/transacoes_bancarias.csv" http://localhost:3000/transactions/upload-csv?source=BANK

# Importar transações contábeis e disparar reconciliação
curl -X POST -F "file=@./exemplos/transacoes_contabeis.csv" http://localhost:3000/transactions/upload-csv?source=ACCOUNTING
```

### Consultar Transações

```bash
# Listar todas as transações
curl http://localhost:3000/transactions

# Filtrar por status (MATCHED ou PENDING)
curl http://localhost:3000/transactions?status=MATCHED

# Filtrar por origem (BANK ou ACCOUNTING)
curl http://localhost:3000/transactions?source=BANK

# Filtrar por período
curl http://localhost:3000/transactions?startDate=2023-01-01&endDate=2023-01-31
```

### Estatísticas

```bash
# Obter estatísticas de conciliação
curl http://localhost:3000/transactions/statistics
```

## Executando Testes

```bash
# Executar testes unitários
npm run test

# Executar testes de integração
npm run test:e2e

# Verificar cobertura de testes
npm run test:cov
```

### Testes de Integração

Os testes de integração verificam o funcionamento completo da API, incluindo a interação com o banco de dados. Para executar esses testes:

1. Inicie o banco de dados de teste usando Docker:
   ```bash
   # Inicia o container PostgreSQL para testes
   docker-compose -f docker-compose.test.yml up -d
   ```

2. Configure o banco de dados de teste executando o script de setup:
   ```bash
   # Executa as migrações no banco de dados de teste
   node scripts/setup-test-db.js
   ```

3. Execute os testes de integração:
   ```bash
   npm run test:e2e
   ```

4. Para executar um teste específico:
   ```bash
   npm run test:e2e -- transaction.controller
   ```

5. Para executar em modo de observação (watch mode):
   ```bash
   npm run test:e2e -- --watch
   ```

Os testes de integração utilizam um banco de dados de teste separado que é limpo antes de cada suite de testes. O ambiente de teste é configurado pelo script `prisma-test-environment.ts` que garante o isolamento dos testes.

## Otimizações de Performance

A aplicação foi projetada para lidar com grandes volumes de dados:

- **Processamento em Memória**: Uso de streams para processar arquivos CSV sem armazenamento temporário em disco
- **Operações em Lote**: Inserções em batch para reduzir o número de operações no banco de dados
- **Índices Otimizados**: Índices estratégicos no banco de dados para consultas rápidas
- **Paginação**: Controle de volume de dados nas respostas da API
- **Processamento Assíncrono**: Uso de promises e processamento paralelo quando possível

## Licença

MIT
