import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
	path: path.resolve(process.cwd(), '.env.test'),
});

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/test';

const prismaTestClient = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
});

export { prismaTestClient };
