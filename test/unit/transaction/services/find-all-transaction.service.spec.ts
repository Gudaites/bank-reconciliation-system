import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FindAllTranscationsService } from '../../../../src/transaction/services/find-all-transaction.service';
import { PrismaTransactionRepository } from '../../../../src/prisma/repositories';
import {
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

describe('FindAllTranscationsService', () => {
  let service: FindAllTranscationsService;
  let transactionRepository: PrismaTransactionRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllTranscationsService,
        {
          provide: PrismaTransactionRepository,
          useValue: {
            findMany: vi.fn(),
            count: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FindAllTranscationsService>(
      FindAllTranscationsService,
    );
    transactionRepository = module.get<PrismaTransactionRepository>(
      PrismaTransactionRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty transaction list with default pagination', async () => {
    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(0);

    const result = await service.execute({});

    expect(result).toEqual({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    });

    expect(transactionRepository.findMany).toHaveBeenCalledWith(
      {},
      {
        orderBy: { date: 'desc' },
        take: 10,
        skip: 0,
        include: {
          matchedWith: true,
          matches: true,
        },
      },
    );
    expect(transactionRepository.count).toHaveBeenCalledWith({});
  });

  it('should filter transactions by source', async () => {
    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(0);

    const filters = { source: TransactionSource.BANK };
    await service.execute(filters);

    expect(transactionRepository.findMany).toHaveBeenCalledWith(
      { source: TransactionSource.BANK },
      expect.any(Object),
    );
    expect(transactionRepository.count).toHaveBeenCalledWith({
      source: TransactionSource.BANK,
    });
  });

  it('should filter transactions by type', async () => {
    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(0);

    const filters = { type: TransactionType.CREDIT };
    await service.execute(filters);

    expect(transactionRepository.findMany).toHaveBeenCalledWith(
      { type: TransactionType.CREDIT },
      expect.any(Object),
    );
    expect(transactionRepository.count).toHaveBeenCalledWith({
      type: TransactionType.CREDIT,
    });
  });

  it('should filter transactions by status', async () => {
    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(0);

    const filters = { status: TransactionStatus.MATCHED };
    await service.execute(filters);

    expect(transactionRepository.findMany).toHaveBeenCalledWith(
      { status: TransactionStatus.MATCHED },
      expect.any(Object),
    );
    expect(transactionRepository.count).toHaveBeenCalledWith({
      status: TransactionStatus.MATCHED,
    });
  });

  it('should filter transactions by date range', async () => {
    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(0);

    const startDate = '2023-01-01';
    const endDate = '2023-12-31';
    const filters = { startDate, endDate };

    await service.execute(filters);

    const expectedDateFilter = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    expect(transactionRepository.findMany).toHaveBeenCalledWith(
      expectedDateFilter,
      expect.any(Object),
    );
    expect(transactionRepository.count).toHaveBeenCalledWith(
      expectedDateFilter,
    );
  });

  it('should handle pagination correctly', async () => {
    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(25);

    const filters = { page: 2, limit: 5 };
    const result = await service.execute(filters);

    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 5,
      totalPages: 5,
    });

    expect(transactionRepository.findMany).toHaveBeenCalledWith(
      {},
      {
        orderBy: { date: 'desc' },
        take: 5,
        skip: 5,
        include: {
          matchedWith: true,
          matches: true,
        },
      },
    );
  });

  it('should return transactions with metadata', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Transaction 1',
        amount: 100,
        date: new Date('2023-01-15'),
        source: TransactionSource.BANK,
        type: TransactionType.CREDIT,
        status: TransactionStatus.MATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
        matchedWith: null,
        matches: [],
      },
      {
        id: '2',
        description: 'Transaction 2',
        amount: 200,
        date: new Date('2023-01-10'),
        source: TransactionSource.ACCOUNTING,
        type: TransactionType.DEBIT,
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        matchedWith: null,
        matches: [],
      },
    ];

    vi.spyOn(transactionRepository, 'findMany').mockResolvedValue(
      mockTransactions,
    );
    vi.spyOn(transactionRepository, 'count').mockResolvedValue(2);

    const result = await service.execute({});

    expect(result).toEqual({
      data: mockTransactions,
      meta: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });
});
