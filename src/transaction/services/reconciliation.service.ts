import { Injectable, Logger } from '@nestjs/common';
import { Transaction, TransactionSource, TransactionStatus } from '@prisma/client';
import { PrismaMatchRepository, PrismaTransactionRepository } from '../../prisma/repositories';

@Injectable()
export class ReconciliationService {
	private readonly logger = new Logger(ReconciliationService.name);

	constructor(
		private readonly transactionRepository: PrismaTransactionRepository,
		private readonly matchRepository: PrismaMatchRepository,
	) {}

	async execute(): Promise<number> {
		this.logger.log('Iniciando processo de conciliação');

		const bankTransactions = await this.transactionRepository.findMany(
			{
				source: TransactionSource.BANK,
				status: TransactionStatus.PENDING,
			},
			{ orderBy: { date: 'asc' } },
		);

		let matchCount = 0;

		for (const bankTransaction of bankTransactions) {
			const potentialMatches = await this.findPotentialMatches(bankTransaction);

			if (potentialMatches.length > 0) {
				const accountingTransaction = potentialMatches[0];

				await this.createMatch(bankTransaction.id, accountingTransaction.id);
				matchCount++;
			}
		}

		this.logger.log(`Conciliação completa. ${matchCount} transações conciliadas.`);
		return matchCount;
	}

	private async findPotentialMatches(bankTransaction: Transaction) {
		const startDate = new Date(bankTransaction.date);
		startDate.setDate(startDate.getDate() - 2);

		const endDate = new Date(bankTransaction.date);
		endDate.setDate(endDate.getDate() + 2);

		return await this.transactionRepository.findMany(
			{
				source: TransactionSource.ACCOUNTING,
				status: TransactionStatus.PENDING,
				type: bankTransaction.type,
				amount: bankTransaction.amount,
				date: {
					gte: startDate,
					lte: endDate,
				},
			},
			{ orderBy: { date: 'asc' }, take: 1 },
		);
	}

	private async createMatch(bankTransactionId: string, accountingTransactionId: string) {
		await this.matchRepository.create({
			bankTransaction: { connect: { id: bankTransactionId } },
			accountingTransaction: { connect: { id: accountingTransactionId } },
		});

		await this.transactionRepository.update(bankTransactionId, {
			status: TransactionStatus.MATCHED,
		});

		await this.transactionRepository.update(accountingTransactionId, {
			status: TransactionStatus.MATCHED,
		});
	}
}
