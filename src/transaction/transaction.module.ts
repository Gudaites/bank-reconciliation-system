import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FindAllTranscationsService, GetStatisticsService, ProcessCsvService, ReconciliationService } from './services';
import { TransactionController } from './transaction.controller';

@Module({
	imports: [PrismaModule],
	controllers: [TransactionController],
	providers: [ProcessCsvService, ReconciliationService, FindAllTranscationsService, GetStatisticsService],
	exports: [],
})
export class TransactionModule {}
