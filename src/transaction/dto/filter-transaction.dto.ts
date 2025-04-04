import { TransactionSource, TransactionStatus, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class FilterTransactionDto {
	@IsOptional()
	@IsEnum(TransactionSource)
	source?: TransactionSource;

	@IsOptional()
	@IsEnum(TransactionType)
	type?: TransactionType;

	@IsOptional()
	@IsEnum(TransactionStatus)
	status?: TransactionStatus;

	@IsOptional()
	@IsDateString()
	startDate?: string;

	@IsOptional()
	@IsDateString()
	endDate?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number = 10;
}
