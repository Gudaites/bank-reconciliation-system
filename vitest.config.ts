import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// biome-ignore lint/style/noDefaultExport: <explanation>
export default defineConfig({
	test: {
		globals: true,
		root: './',
		exclude: [
			'node_modules',
			'**/*.js',
			'**/*.dto.ts',
			'**/*.module.ts',
			'**/*.config.ts',
			'**/swagger.ts',
			'**/index.ts',
			'**/*.enum.ts',
			'**/configuration.ts',
			'**/*.interface.ts',
			'**/*.controller.ts',
			'**/*.type.ts',
			'**/*.mock.ts',
		],
		coverage: {
			provider: 'v8',
			exclude: [
				'**/*.js',
				'**/*.dto.ts',
				'**/*.module.ts',
				'**/*.config.ts',
				'**/swagger.ts',
				'**/index.ts',
				'**/*.enum.ts',
				'**/configuration.ts',
				'**/*.interface.ts',
				'**/*.controller.ts',
				'**/*.type.ts',
				'**/*.mock.ts',
				'prisma/seeds/**',
			],
		},
	},
	plugins: [swc.vite()],
});
