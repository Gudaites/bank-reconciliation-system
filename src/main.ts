import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	);

	app.use(json({ limit: '50mb' }));

	app.enableCors();

	const prismaService = app.get(PrismaService);
	prismaService.enableShutdownHooks(app);

	await app.listen(process.env.PORT ?? 3000);
	console.log(`Aplicação está rodando em: ${await app.getUrl()}`);
}
void bootstrap();
