import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTransactionRepository } from '../../prisma/repositories';
import { FilterTransactionDto } from '../dto/filter-transaction.dto';

@Injectable()
export class FindAllTranscationsService {
	constructor(private readonly transactionRepository: PrismaTransactionRepository) {}

	async execute(filters: FilterTransactionDto) {
		const { source, type, status, startDate, endDate, page = 1, limit = 10 } = filters;

		const where: Prisma.TransactionWhereInput = {};

		if (source) where.source = source;
		if (type) where.type = type;
		if (status) where.status = status;

		if (startDate || endDate) {
			where.date = {};
			if (startDate) where.date.gte = new Date(startDate);
			if (endDate) where.date.lte = new Date(endDate);
		}

		const skip = (page - 1) * limit;

		const [transactions, total] = await Promise.all([
			this.transactionRepository.findMany(where, {
				orderBy: { date: 'desc' },
				take: limit,
				skip: skip,
				include: {
					matchedWith: true,
					matches: true,
				},
			}),
			this.transactionRepository.count(where),
		]);

		return {
			data: transactions,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}
}
