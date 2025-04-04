import {
	BadRequestException,
	Controller,
	Get,
	HttpStatus,
	Post,
	Query,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionSource } from '@prisma/client';
import { memoryStorage } from 'multer';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

import { FindAllTranscationsService, GetStatisticsService, ProcessCsvService } from './services';

@Controller('transactions')
export class TransactionController {
	constructor(
		private readonly processCsvService: ProcessCsvService,
		private readonly findAllTranscationsService: FindAllTranscationsService,
		private readonly getStatisticsService: GetStatisticsService,
	) {}

	@Post('upload-csv')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
		}),
	)
	async uploadCsv(@UploadedFile() file: Express.Multer.File, @Query('source') sourceParam: TransactionSource) {
		if (!file) {
			throw new BadRequestException('Nenhum arquivo enviado');
		}

		if (file.mimetype !== 'text/csv') {
			throw new BadRequestException('O arquivo deve ser um CSV');
		}

		if (!file.buffer) {
			throw new BadRequestException('Buffer do arquivo não disponível');
		}

		try {
			const processedCount = await this.processCsvService.execute(file.buffer, sourceParam);

			return {
				statusCode: HttpStatus.OK,
				message: `Processadas com sucesso ${processedCount} transações ${sourceParam}`,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
			throw new BadRequestException(`Erro ao processar CSV: ${errorMessage}`);
		}
	}

	@Get()
	async findAll(@Query() filters: FilterTransactionDto) {
		return await this.findAllTranscationsService.execute(filters);
	}

	@Get('statistics')
	async getStatistics() {
		return await this.getStatisticsService.execute();
	}
}
