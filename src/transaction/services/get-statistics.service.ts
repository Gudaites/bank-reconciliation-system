import { Injectable } from '@nestjs/common';
import { TransactionSource, TransactionStatus } from '@prisma/client';
import { PrismaTransactionRepository } from '../../prisma/repositories';

@Injectable()
export class GetStatisticsService {
	constructor(private readonly transactionRepository: PrismaTransactionRepository) {}

	async execute() {
		const [totalBankTransactions, totalAccountingTransactions, totalMatchedTransactions, totalPendingTransactions] =
			await Promise.all([
				this.transactionRepository.count({ source: TransactionSource.BANK }),
				this.transactionRepository.count({
					source: TransactionSource.ACCOUNTING,
				}),
				this.transactionRepository.count({ status: TransactionStatus.MATCHED }),
				this.transactionRepository.count({ status: TransactionStatus.PENDING }),
			]);

		return {
			totalBankTransactions,
			totalAccountingTransactions,
			totalMatchedTransactions,
			totalPendingTransactions,
			reconciliationRate: totalMatchedTransactions
				? ((totalMatchedTransactions / (totalBankTransactions + totalAccountingTransactions)) * 100).toFixed(2)
				: '0.00',
		};
	}
}
