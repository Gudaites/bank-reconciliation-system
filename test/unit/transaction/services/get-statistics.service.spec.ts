import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetStatisticsService } from '../../../../src/transaction/services/get-statistics.service';
import { PrismaTransactionRepository } from '../../../../src/prisma/repositories';
import { TransactionSource, TransactionStatus } from '@prisma/client';

describe('GetStatisticsService', () => {
	let service: GetStatisticsService;
	let transactionRepository: PrismaTransactionRepository;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetStatisticsService,
				{
					provide: PrismaTransactionRepository,
					useValue: {
						count: vi.fn(),
					},
				},
			],
		}).compile();

		service = module.get<GetStatisticsService>(GetStatisticsService);
		transactionRepository = module.get<PrismaTransactionRepository>(PrismaTransactionRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should return statistics with zero reconciliation rate when no transactions exist', async () => {
		vi.spyOn(transactionRepository, 'count').mockImplementation(() => Promise.resolve(0));

		const result = await service.execute();

		expect(result).toEqual({
			totalBankTransactions: 0,
			totalAccountingTransactions: 0,
			totalMatchedTransactions: 0,
			totalPendingTransactions: 0,
			reconciliationRate: '0.00',
		});

		expect(transactionRepository.count).toHaveBeenCalledTimes(4);
	});

	it('should calculate reconciliation rate correctly with existing transactions', async () => {
		vi.spyOn(transactionRepository, 'count').mockImplementation((criteria) => {
			if (criteria?.source === TransactionSource.BANK) return Promise.resolve(50);
			if (criteria?.source === TransactionSource.ACCOUNTING) return Promise.resolve(50);
			if (criteria?.status === TransactionStatus.MATCHED) return Promise.resolve(40);
			if (criteria?.status === TransactionStatus.PENDING) return Promise.resolve(60);
			return Promise.resolve(0);
		});

		const result = await service.execute();

		expect(result).toEqual({
			totalBankTransactions: 50,
			totalAccountingTransactions: 50,
			totalMatchedTransactions: 40,
			totalPendingTransactions: 60,
			reconciliationRate: '40.00',
		});

		expect(transactionRepository.count).toHaveBeenCalledWith({
			source: TransactionSource.BANK,
		});
		expect(transactionRepository.count).toHaveBeenCalledWith({
			source: TransactionSource.ACCOUNTING,
		});
		expect(transactionRepository.count).toHaveBeenCalledWith({
			status: TransactionStatus.MATCHED,
		});
		expect(transactionRepository.count).toHaveBeenCalledWith({
			status: TransactionStatus.PENDING,
		});
	});

	it('should handle partial reconciliation rate correctly', async () => {
		vi.spyOn(transactionRepository, 'count').mockImplementation((criteria) => {
			if (criteria?.source === TransactionSource.BANK) return Promise.resolve(100);
			if (criteria?.source === TransactionSource.ACCOUNTING) return Promise.resolve(100);
			if (criteria?.status === TransactionStatus.MATCHED) return Promise.resolve(25);
			if (criteria?.status === TransactionStatus.PENDING) return Promise.resolve(175);
			return Promise.resolve(0);
		});

		const result = await service.execute();

		expect(result).toEqual({
			totalBankTransactions: 100,
			totalAccountingTransactions: 100,
			totalMatchedTransactions: 25,
			totalPendingTransactions: 175,
			reconciliationRate: '12.50',
		});
	});
});
