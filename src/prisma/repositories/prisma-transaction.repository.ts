import { Injectable } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaTransactionRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Transaction | null> {
		return await this.prisma.transaction.findUnique({
			where: { id },
			include: {
				matchedWith: true,
				matches: true,
			},
		});
	}

	async findMany(
		where?: Prisma.TransactionWhereInput,
		options?: {
			orderBy?: Prisma.TransactionOrderByWithRelationInput;
			take?: number;
			skip?: number;
			include?: Prisma.TransactionInclude;
		},
	): Promise<Transaction[]> {
		return await this.prisma.transaction.findMany({
			where,
			orderBy: options?.orderBy,
			take: options?.take,
			skip: options?.skip,
			include: options?.include,
		});
	}

	async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
		return await this.prisma.transaction.create({ data });
	}

	async createMany(data: Prisma.TransactionCreateManyInput[]): Promise<Prisma.BatchPayload> {
		return await this.prisma.transaction.createMany({ data });
	}

	async update(id: string, data: Prisma.TransactionUpdateInput): Promise<Transaction> {
		return await this.prisma.transaction.update({
			where: { id },
			data,
		});
	}

	async updateMany(
		where: Prisma.TransactionWhereInput,
		data: Prisma.TransactionUpdateInput,
	): Promise<Prisma.BatchPayload> {
		return await this.prisma.transaction.updateMany({
			where,
			data,
		});
	}

	async delete(id: string): Promise<Transaction> {
		return await this.prisma.transaction.delete({
			where: { id },
		});
	}

	async count(where?: Prisma.TransactionWhereInput): Promise<number> {
		return await this.prisma.transaction.count({ where });
	}
}
