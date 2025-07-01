import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		proxy: {
			'/api/anthropic': {
				target: 'https://api.anthropic.com',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
				secure: false,
				configure: (proxy) => {
					proxy.on('proxyReq', (proxyReq, req) => {
						// Remove any existing headers that might cause issues
						proxyReq.removeHeader('origin');
						proxyReq.removeHeader('referer');
						
						// Forward only the essential headers
						if (req.headers['x-api-key']) {
							proxyReq.setHeader('x-api-key', req.headers['x-api-key'] as string);
						}
						if (req.headers['anthropic-version']) {
							proxyReq.setHeader('anthropic-version', req.headers['anthropic-version'] as string);
						}
						if (req.headers['anthropic-dangerous-direct-browser-access']) {
							proxyReq.setHeader('anthropic-dangerous-direct-browser-access', req.headers['anthropic-dangerous-direct-browser-access'] as string);
						}
					});
				}
			}
		}
	},
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true
			}
		}
	}
});
