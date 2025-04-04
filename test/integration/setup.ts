import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { prismaTestClient } from './prisma-test-environment';

class PrismaServiceMock {
	transaction = prismaTestClient.transaction;
	match = prismaTestClient.match;
	$connect = () => Promise.resolve();
	$disconnect = () => Promise.resolve();
	cleanDatabase = async () => {
		await prismaTestClient.match.deleteMany();
		await prismaTestClient.transaction.deleteMany();
	};
}

export async function setupTestApp(): Promise<{
	app: INestApplication;
	prismaService: PrismaServiceMock;
}> {
	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	})
		.overrideProvider(PrismaService)
		.useClass(PrismaServiceMock)
		.compile();

	const app = moduleFixture.createNestApplication();
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		}),
	);

	await app.init();

	const prismaService = app.get(PrismaService) as PrismaServiceMock;

	await prismaService.cleanDatabase();

	return { app, prismaService };
}
