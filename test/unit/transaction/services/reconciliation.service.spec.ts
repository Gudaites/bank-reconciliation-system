import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconciliationService } from '../../../../src/transaction/services/reconciliation.service';
import { PrismaTransactionRepository, PrismaMatchRepository } from '../../../../src/prisma/repositories';
import { Transaction, TransactionSource, TransactionStatus, TransactionType } from '@prisma/client';

describe('ReconciliationService', () => {
	let service: ReconciliationService;
	let transactionRepository: PrismaTransactionRepository;
	let matchRepository: PrismaMatchRepository;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ReconciliationService,
				{
					provide: PrismaTransactionRepository,
					useValue: {
						findMany: vi.fn(),
						update: vi.fn(),
					},
				},
				{
					provide: PrismaMatchRepository,
					useValue: {
						create: vi.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ReconciliationService>(ReconciliationService);
		transactionRepository = module.get<PrismaTransactionRepository>(PrismaTransactionRepository);
		matchRepository = module.get<PrismaMatchRepository>(PrismaMatchRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should reconcile transactions with matching criteria', async () => {
		const mockBankTransactions: Transaction[] = [
			{
				id: 'bank1',
				date: new Date('2023-01-15'),
				description: 'Pagamento Fornecedor',
				amount: 1000.5,
				type: TransactionType.DEBIT,
				source: TransactionSource.BANK,
				status: TransactionStatus.PENDING,
				createdAt: undefined,
				updatedAt: undefined,
			},
			{
				id: 'bank2',
				date: new Date('2023-01-20'),
				description: 'Recebimento Cliente',
				amount: 2000.75,
				type: TransactionType.CREDIT,
				source: TransactionSource.BANK,
				status: TransactionStatus.PENDING,
				createdAt: undefined,
				updatedAt: undefined,
			},
		];

		const mockAccountingTransaction1: Transaction = {
			id: 'accounting1',
			date: new Date('2023-01-14'),
			description: 'Pagamento (Contabilidade)',
			amount: 1000.5,
			type: TransactionType.DEBIT,
			source: TransactionSource.ACCOUNTING,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		const mockAccountingTransaction2: Transaction = {
			id: 'accounting2',
			date: new Date('2023-01-21'),
			description: 'Recebimento (Contabilidade)',
			amount: 2000.75,
			type: TransactionType.CREDIT,
			source: TransactionSource.ACCOUNTING,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		vi.spyOn(transactionRepository, 'findMany')
			.mockResolvedValueOnce(mockBankTransactions)
			.mockResolvedValueOnce([mockAccountingTransaction1])
			.mockResolvedValueOnce([mockAccountingTransaction2]);

		const result = await service.execute();

		expect(result).toBe(2);

		expect(transactionRepository.findMany).toHaveBeenCalledWith(
			{
				source: TransactionSource.BANK,
				status: TransactionStatus.PENDING,
			},
			{ orderBy: { date: 'asc' } },
		);

		expect(matchRepository.create).toHaveBeenCalledWith({
			bankTransaction: { connect: { id: 'bank1' } },
			accountingTransaction: { connect: { id: 'accounting1' } },
		});

		expect(matchRepository.create).toHaveBeenCalledWith({
			bankTransaction: { connect: { id: 'bank2' } },
			accountingTransaction: { connect: { id: 'accounting2' } },
		});

		expect(transactionRepository.update).toHaveBeenCalledWith('bank1', {
			status: TransactionStatus.MATCHED,
		});

		expect(transactionRepository.update).toHaveBeenCalledWith('accounting1', {
			status: TransactionStatus.MATCHED,
		});

		expect(transactionRepository.update).toHaveBeenCalledWith('bank2', {
			status: TransactionStatus.MATCHED,
		});

		expect(transactionRepository.update).toHaveBeenCalledWith('accounting2', {
			status: TransactionStatus.MATCHED,
		});
	});

	it('should handle transactions without matches', async () => {
		const mockBankTransactions: Transaction[] = [
			{
				id: 'bank3',
				date: new Date('2023-01-25'),
				description: 'Transação sem correspondência',
				amount: 500.0,
				type: TransactionType.DEBIT,
				source: TransactionSource.BANK,
				status: TransactionStatus.PENDING,
				createdAt: undefined,
				updatedAt: undefined,
			},
		];

		vi.spyOn(transactionRepository, 'findMany').mockResolvedValueOnce(mockBankTransactions).mockResolvedValueOnce([]);

		const result = await service.execute();

		expect(result).toBe(0);

		expect(transactionRepository.findMany).toHaveBeenCalledTimes(2);

		expect(matchRepository.create).not.toHaveBeenCalled();
		expect(transactionRepository.update).not.toHaveBeenCalled();
	});

	it('should respect date tolerance of ±2 days', async () => {
		const bankTransaction: Transaction = {
			id: 'bank4',
			date: new Date('2023-01-15'),
			description: 'Teste de tolerância de data',
			amount: 1500.0,
			type: TransactionType.CREDIT,
			source: TransactionSource.BANK,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		const accountingTransactionWithinTolerance: Transaction = {
			id: 'accounting3',
			date: new Date('2023-01-17'),
			description: 'Contabilidade - Dentro da tolerância',
			amount: 1500.0,
			type: TransactionType.CREDIT,
			source: TransactionSource.ACCOUNTING,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		vi.spyOn(transactionRepository, 'findMany')
			.mockResolvedValueOnce([bankTransaction])
			.mockResolvedValueOnce([accountingTransactionWithinTolerance]);

		const result = await service.execute();

		expect(result).toBe(1);

		expect(transactionRepository.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				source: TransactionSource.ACCOUNTING,
				status: TransactionStatus.PENDING,
				type: TransactionType.CREDIT,
				amount: 1500.0,
				date: {
					gte: expect.any(Date),
					lte: expect.any(Date),
				},
			}),
			expect.any(Object),
		);
	});

	it('should match transactions with exact amount and type, regardless of description', async () => {
		const bankTransaction: Transaction = {
			id: 'bank5',
			date: new Date('2023-01-10'),
			description: 'Descrição bancária diferente',
			amount: 3000.0,
			type: TransactionType.DEBIT,
			source: TransactionSource.BANK,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		const accountingTransaction: Transaction = {
			id: 'accounting4',
			date: new Date('2023-01-10'),
			description: 'Descrição contábil totalmente diferente',
			amount: 3000.0,
			type: TransactionType.DEBIT,
			source: TransactionSource.ACCOUNTING,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		vi.spyOn(transactionRepository, 'findMany')
			.mockResolvedValueOnce([bankTransaction])
			.mockResolvedValueOnce([accountingTransaction]);

		const result = await service.execute();

		expect(result).toBe(1);

		expect(matchRepository.create).toHaveBeenCalledWith({
			bankTransaction: { connect: { id: 'bank5' } },
			accountingTransaction: { connect: { id: 'accounting4' } },
		});
	});

	it('should take the first match when multiple potential matches exist', async () => {
		const bankTransaction: Transaction = {
			id: 'bank6',
			date: new Date('2023-01-30'),
			description: 'Transação com múltiplas correspondências',
			amount: 5000.0,
			type: TransactionType.CREDIT,
			source: TransactionSource.BANK,
			status: TransactionStatus.PENDING,
			createdAt: undefined,
			updatedAt: undefined,
		};

		const potentialMatches: Transaction[] = [
			{
				id: 'accounting5',
				date: new Date('2023-01-29'),
				description: 'Opção 1',
				amount: 5000.0,
				type: TransactionType.CREDIT,
				source: TransactionSource.ACCOUNTING,
				status: TransactionStatus.PENDING,
				createdAt: undefined,
				updatedAt: undefined,
			},
			{
				id: 'accounting6',
				date: new Date('2023-01-30'),
				description: 'Opção 2',
				amount: 5000.0,
				type: TransactionType.CREDIT,
				source: TransactionSource.ACCOUNTING,
				status: TransactionStatus.PENDING,
				createdAt: undefined,
				updatedAt: undefined,
			},
		];

		vi.spyOn(transactionRepository, 'findMany')
			.mockResolvedValueOnce([bankTransaction])
			.mockResolvedValueOnce(potentialMatches);

		const result = await service.execute();

		expect(result).toBe(1);

		expect(matchRepository.create).toHaveBeenCalledWith({
			bankTransaction: { connect: { id: 'bank6' } },
			accountingTransaction: { connect: { id: 'accounting5' } },
		});

		expect(matchRepository.create).not.toHaveBeenCalledWith(
			expect.objectContaining({
				accountingTransaction: { connect: { id: 'accounting6' } },
			}),
		);
	});
});
