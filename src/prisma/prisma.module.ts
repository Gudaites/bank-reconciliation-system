import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaMatchRepository, PrismaTransactionRepository } from './repositories';

@Module({
	providers: [PrismaService, PrismaTransactionRepository, PrismaMatchRepository],
	exports: [PrismaService, PrismaTransactionRepository, PrismaMatchRepository],
})
export class PrismaModule {}
