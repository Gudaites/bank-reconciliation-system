import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessCsvService } from '../../../../src/transaction/services/process-csv.service';
import { PrismaTransactionRepository } from '../../../../src/prisma/repositories';
import { ReconciliationService } from '../../../../src/transaction/services/reconciliation.service';
import { TransactionSource, TransactionStatus, TransactionType } from '@prisma/client';

describe('ProcessCsvService', () => {
	let service: ProcessCsvService;
	let transactionRepository: PrismaTransactionRepository;
	let reconciliationService: ReconciliationService;

	beforeEach(() => {
		vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
		vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
		vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProcessCsvService,
				{
					provide: PrismaTransactionRepository,
					useValue: {
						createMany: vi.fn().mockResolvedValue({ count: 0 }),
					},
				},
				{
					provide: ReconciliationService,
					useValue: {
						execute: vi.fn().mockResolvedValue(0),
					},
				},
			],
		}).compile();

		service = module.get<ProcessCsvService>(ProcessCsvService);
		transactionRepository = module.get<PrismaTransactionRepository>(PrismaTransactionRepository);
		reconciliationService = module.get<ReconciliationService>(ReconciliationService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should process bank CSV file correctly', async () => {
		const csvContent =
			'data,descricao,valor,tipo\n' +
			'2023-01-10,Pagamento Fornecedor,1000.50,DEBIT\n' +
			'2023-01-15,Recebimento Cliente,2000.75,CREDIT';

		const buffer = Buffer.from(csvContent);

		vi.spyOn(transactionRepository, 'createMany').mockResolvedValue({
			count: 2,
		});

		const result = await service.execute(buffer, TransactionSource.BANK);

		expect(result).toBe(2);
		expect(transactionRepository.createMany).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					date: expect.any(Date),
					description: 'Pagamento Fornecedor',
					amount: 1000.5,
					type: TransactionType.DEBIT,
					source: TransactionSource.BANK,
					status: TransactionStatus.PENDING,
				}),
				expect.objectContaining({
					date: expect.any(Date),
					description: 'Recebimento Cliente',
					amount: 2000.75,
					type: TransactionType.CREDIT,
					source: TransactionSource.BANK,
					status: TransactionStatus.PENDING,
				}),
			]),
		);

		expect(reconciliationService.execute).not.toHaveBeenCalled();
	});

	it('should process accounting CSV file and trigger reconciliation', async () => {
		const csvContent =
			'data,descricao,valor,tipo\n' +
			'2023-01-20,Pagamento Salários,5000.00,DEBIT\n' +
			'2023-01-25,Venda de Serviço,3000.25,CREDIT';

		const buffer = Buffer.from(csvContent);

		vi.spyOn(transactionRepository, 'createMany').mockResolvedValue({
			count: 2,
		});

		const result = await service.execute(buffer, TransactionSource.ACCOUNTING);

		expect(result).toBe(2);
		expect(transactionRepository.createMany).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					date: expect.any(Date),
					description: 'Pagamento Salários',
					amount: 5000.0,
					type: TransactionType.DEBIT,
					source: TransactionSource.ACCOUNTING,
					status: TransactionStatus.PENDING,
				}),
				expect.objectContaining({
					date: expect.any(Date),
					description: 'Venda de Serviço',
					amount: 3000.25,
					type: TransactionType.CREDIT,
					source: TransactionSource.ACCOUNTING,
					status: TransactionStatus.PENDING,
				}),
			]),
		);

		expect(reconciliationService.execute).toHaveBeenCalled();
	});

	it('should handle large datasets by creating transactions in batches', async () => {
		let csvContent = 'data,descricao,valor,tipo\n';

		for (let i = 0; i < 1200; i++) {
			csvContent += `2023-01-01,Transação ${i},${i}.00,DEBIT\n`;
		}

		const buffer = Buffer.from(csvContent);

		vi.spyOn(transactionRepository, 'createMany').mockResolvedValue({ count: 6 });

		const result = await service.execute(buffer, TransactionSource.BANK);

		expect(result).toBe(1200);
		expect(transactionRepository.createMany).toHaveBeenCalled();
	});

	it('should handle invalid CSV records gracefully', async () => {
		const csvContent =
			'data,descricao,valor,tipo\n' +
			'2023-01-10,Transação Válida,1000.00,DEBIT\n' +
			'data-invalida,Sem Valor,,DEBIT\n' +
			'2023-01-15,Outra Transação,2000.00,CREDIT';

		const buffer = Buffer.from(csvContent);

		vi.spyOn(transactionRepository, 'createMany').mockResolvedValue({
			count: 2,
		});

		const result = await service.execute(buffer, TransactionSource.BANK);

		expect(result).toBe(2);
		expect(transactionRepository.createMany).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					description: 'Transação Válida',
					amount: 1000.0,
				}),
				expect.objectContaining({
					description: 'Outra Transação',
					amount: 2000.0,
				}),
			]),
		);
	});

	it('should handle errors during CSV processing', async () => {
		vi.spyOn(service as any, 'processBufferCsv').mockRejectedValue(new Error('Erro de Teste'));

		const csvContent = 'data,descricao,valor,tipo\n2023-01-01,Teste,100.00,DEBIT';
		const buffer = Buffer.from(csvContent);

		await expect(service.execute(buffer, TransactionSource.BANK)).rejects.toThrow('Erro de Teste');
	});
});
