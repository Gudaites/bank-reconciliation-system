import { Injectable } from '@nestjs/common';
import { Match, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaMatchRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: Prisma.MatchCreateInput): Promise<Match> {
		return await this.prisma.match.create({
			data,
			include: {
				bankTransaction: true,
				accountingTransaction: true,
			},
		});
	}

	async findByBankTransactionId(bankTransactionId: string): Promise<Match | null> {
		return await this.prisma.match.findUnique({
			where: { bankTransactionId },
			include: {
				bankTransaction: true,
				accountingTransaction: true,
			},
		});
	}

	async findByAccountingTransactionId(accountingTransactionId: string): Promise<Match | null> {
		return await this.prisma.match.findUnique({
			where: { accountingTransactionId },
			include: {
				bankTransaction: true,
				accountingTransaction: true,
			},
		});
	}

	async findById(id: string): Promise<Match | null> {
		return await this.prisma.match.findUnique({
			where: { id },
			include: {
				bankTransaction: true,
				accountingTransaction: true,
			},
		});
	}

	async delete(id: string): Promise<Match> {
		return await this.prisma.match.delete({
			where: { id },
		});
	}

	async count(): Promise<number> {
		return await this.prisma.match.count();
	}
}
