import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'vitest';
import { setupTestApp } from './setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TransactionSource, TransactionStatus, TransactionType } from '@prisma/client';

describe('TransactionController (e2e)', () => {
	let app: INestApplication;
	let prismaService: PrismaService;

	beforeAll(async () => {
		const setup = await setupTestApp();
		app = setup.app;
		prismaService = setup.prismaService;
	});

	beforeEach(async () => {
		await prismaService.transaction.deleteMany();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('POST /transactions/upload-csv', () => {
		it('deve rejeitar quando nenhum arquivo é enviado', async () => {
			const response = await request(app.getHttpServer())
				.post('/transactions/upload-csv')
				.query({ source: TransactionSource.BANK })
				.expect(400);

			expect(response.body.message).toBe('Nenhum arquivo enviado');
		});

		it('deve rejeitar quando o arquivo não é um CSV', async () => {
			const response = await request(app.getHttpServer())
				.post('/transactions/upload-csv')
				.query({ source: TransactionSource.BANK })
				.attach('file', Buffer.from('test'), {
					filename: 'test.txt',
					contentType: 'text/plain',
				})
				.expect(400);

			expect(response.body.message).toBe('O arquivo deve ser um CSV');
		});

		it('deve processar um arquivo CSV válido de banco', async () => {
			const csvContent = 'date,description,amount\n2023-01-15,Pagamento,100.00\n2023-01-20,Recebimento,-50.00';

			const response = await request(app.getHttpServer())
				.post('/transactions/upload-csv')
				.query({ source: TransactionSource.BANK })
				.attach('file', Buffer.from(csvContent), {
					filename: 'bank.csv',
					contentType: 'text/csv',
				})
				.expect(201);

			expect(response.body.message).toContain('Processadas com sucesso');

			expect(response.body.statusCode).toBe(200);
		});

		it('deve processar um arquivo CSV válido de contabilidade', async () => {
			const csvContent = 'date,description,amount\n2023-01-15,Fatura,100.00\n2023-01-20,Pagamento,-50.00';

			const response = await request(app.getHttpServer())
				.post('/transactions/upload-csv')
				.query({ source: TransactionSource.ACCOUNTING })
				.attach('file', Buffer.from(csvContent), {
					filename: 'accounting.csv',
					contentType: 'text/csv',
				})
				.expect(201);

			expect(response.body.message).toContain('Processadas com sucesso');

			expect(response.body.statusCode).toBe(200);
		});
	});

	describe('GET /transactions', () => {
		beforeEach(async () => {
			await prismaService.transaction.createMany({
				data: [
					{
						id: '1',
						description: 'Transação 1',
						amount: 100,
						date: new Date('2023-01-15'),
						source: TransactionSource.BANK,
						type: TransactionType.CREDIT,
						status: TransactionStatus.PENDING,
					},
					{
						id: '2',
						description: 'Transação 2',
						amount: -50,
						date: new Date('2023-01-20'),
						source: TransactionSource.BANK,
						type: TransactionType.DEBIT,
						status: TransactionStatus.PENDING,
					},
					{
						id: '3',
						description: 'Transação 3',
						amount: 75,
						date: new Date('2023-02-10'),
						source: TransactionSource.ACCOUNTING,
						type: TransactionType.CREDIT,
						status: TransactionStatus.MATCHED,
					},
				],
			});
		});

		it('deve retornar todas as transações com paginação padrão', async () => {
			const response = await request(app.getHttpServer()).get('/transactions').expect(200);

			expect(response.body.data).toHaveLength(3);
			expect(response.body.meta.total).toBe(3);
			expect(response.body.meta.page).toBe(1);
			expect(response.body.meta.limit).toBe(10);
		});

		it('deve filtrar transações por fonte', async () => {
			const response = await request(app.getHttpServer())
				.get('/transactions')
				.query({ source: TransactionSource.BANK })
				.expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data[0].source).toBe(TransactionSource.BANK);
			expect(response.body.data[1].source).toBe(TransactionSource.BANK);
		});

		it('deve filtrar transações por tipo', async () => {
			const response = await request(app.getHttpServer())
				.get('/transactions')
				.query({ type: TransactionType.CREDIT })
				.expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data[0].type).toBe(TransactionType.CREDIT);
			expect(response.body.data[1].type).toBe(TransactionType.CREDIT);
		});

		it('deve filtrar transações por status', async () => {
			const response = await request(app.getHttpServer())
				.get('/transactions')
				.query({ status: TransactionStatus.MATCHED })
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].status).toBe(TransactionStatus.MATCHED);
		});

		it('deve filtrar transações por intervalo de data', async () => {
			const response = await request(app.getHttpServer())
				.get('/transactions')
				.query({
					startDate: '2023-01-01',
					endDate: '2023-01-31',
				})
				.expect(200);

			expect(response.body.data).toHaveLength(2);
		});

		it('deve aplicar paginação corretamente', async () => {
			const response = await request(app.getHttpServer()).get('/transactions').query({ page: 1, limit: 2 }).expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.meta.page).toBe(1);
			expect(response.body.meta.limit).toBe(2);
			expect(response.body.meta.total).toBe(3);
			expect(response.body.meta.totalPages).toBe(2);
		});
	});

	describe('GET /transactions/statistics', () => {
		beforeEach(async () => {
			await prismaService.transaction.createMany({
				data: [
					{
						id: '1',
						description: 'Transação 1',
						amount: 100,
						date: new Date('2023-01-15'),
						source: TransactionSource.BANK,
						type: TransactionType.CREDIT,
						status: TransactionStatus.PENDING,
					},
					{
						id: '2',
						description: 'Transação 2',
						amount: -50,
						date: new Date('2023-01-20'),
						source: TransactionSource.BANK,
						type: TransactionType.DEBIT,
						status: TransactionStatus.PENDING,
					},
					{
						id: '3',
						description: 'Transação 3',
						amount: 75,
						date: new Date('2023-02-10'),
						source: TransactionSource.ACCOUNTING,
						type: TransactionType.CREDIT,
						status: TransactionStatus.MATCHED,
					},
					{
						id: '4',
						description: 'Transação 4',
						amount: -25,
						date: new Date('2023-02-15'),
						source: TransactionSource.ACCOUNTING,
						type: TransactionType.DEBIT,
						status: TransactionStatus.MATCHED,
					},
				],
			});

			await prismaService.match.create({
				data: {
					bankTransactionId: '1',
					accountingTransactionId: '3',
				},
			});

			await prismaService.transaction.update({
				where: { id: '1' },
				data: { status: TransactionStatus.MATCHED },
			});

			await prismaService.transaction.update({
				where: { id: '3' },
				data: { status: TransactionStatus.MATCHED },
			});
		});

		it('deve retornar estatísticas corretas', async () => {
			const response = await request(app.getHttpServer()).get('/transactions/statistics').expect(200);

			expect(response.body).toHaveProperty('totalBankTransactions');
			expect(response.body).toHaveProperty('totalAccountingTransactions');
			expect(response.body).toHaveProperty('totalMatchedTransactions');
			expect(response.body).toHaveProperty('totalPendingTransactions');
			expect(response.body).toHaveProperty('reconciliationRate');

			expect(typeof response.body.totalBankTransactions).toBe('number');
			expect(typeof response.body.totalAccountingTransactions).toBe('number');
			expect(typeof response.body.totalMatchedTransactions).toBe('number');
			expect(typeof response.body.totalPendingTransactions).toBe('number');
			expect(typeof response.body.reconciliationRate).toBe('string');
		});
	});
});
