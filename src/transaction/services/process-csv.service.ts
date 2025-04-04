import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';
import { TransactionSource, TransactionStatus, TransactionType } from '@prisma/client';
import { parse } from 'csv-parse';
import { PrismaTransactionRepository } from '../../prisma/repositories';
import { ReconciliationService } from './reconciliation.service';

@Injectable()
export class ProcessCsvService {
	private readonly logger = new Logger(ProcessCsvService.name);

	constructor(
		private readonly transactionRepository: PrismaTransactionRepository,
		private readonly reconciliationService: ReconciliationService,
	) {}

	async execute(fileBuffer: Buffer, source: TransactionSource): Promise<number> {
		try {
			const processedCount = await this.processBufferCsv(fileBuffer, source);

			if (source === TransactionSource.ACCOUNTING) {
				await this.reconciliationService.execute();
			}

			return processedCount;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
			this.logger.error(`Erro ao processar arquivo CSV: ${errorMessage}`);
			throw error;
		}
	}

	private async processBufferCsv(fileBuffer: Buffer, source: TransactionSource): Promise<number> {
		const transactions: {
			date: Date;
			description: string;
			amount: number;
			type: TransactionType;
			source: TransactionSource;
			status: TransactionStatus;
		}[] = [];
		let processedCount = 0;

		return new Promise((resolve, reject) => {
			const bufferStream = new Readable();
			bufferStream.push(fileBuffer);
			bufferStream.push(null);

			const parser = parse({
				delimiter: ',',
				columns: true,
				skip_empty_lines: true,
				trim: true,
			});

			parser.on('readable', () => {
				let record;
				while ((record = parser.read() as Record<string, unknown> | null) !== null) {
					try {
						const transaction = this.mapRecordToTransaction(record as Record<string, unknown>, source);
						transactions.push(transaction);

						if (transactions.length >= 1000) {
							void (async () => {
								await this.transactionRepository.createMany(transactions);
								processedCount += transactions.length;
								transactions.length = 0;
							})();
						}
					} catch (error) {
						this.logger.error(`Erro ao processar registro: ${JSON.stringify(record)}`, error);
					}
				}
			});

			parser.on('end', () => {
				void (async () => {
					if (transactions.length > 0) {
						await this.transactionRepository.createMany(transactions);
						processedCount += transactions.length;
					}
					resolve(processedCount);
				})();
			});

			parser.on('error', (error) => {
				this.logger.error('Erro ao analisar CSV:', error);
				reject(error);
			});

			bufferStream.pipe(parser);
		});
	}

	private mapRecordToTransaction(record: Record<string, unknown>, source: TransactionSource) {
		const dateStr = record.data as string | undefined;
		const description = record.descricao as string | undefined;
		const amountStr = record.valor as string | undefined;
		const typeStr = record.tipo as string | undefined;

		if (!dateStr || !description || !amountStr || !typeStr) {
			throw new Error(`Invalid record format: ${JSON.stringify(record)}`);
		}

		const date = new Date(dateStr);
		const amount = parseFloat(amountStr);
		const type = typeStr.toUpperCase() === 'CREDIT' ? TransactionType.CREDIT : TransactionType.DEBIT;

		return {
			date,
			description,
			amount,
			type,
			source,
			status: TransactionStatus.PENDING,
		};
	}
}
