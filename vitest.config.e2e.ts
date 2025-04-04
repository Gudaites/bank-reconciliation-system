import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// biome-ignore lint/style/noDefaultExport: <explanation>
export default defineConfig({
	plugins: [swc.vite()],
	test: {
		include: ['**/*.e2e-spec.ts', '**/integration/**/*.spec.ts'],
		globals: true,
		root: './',
		environment: 'node',
	},
});
