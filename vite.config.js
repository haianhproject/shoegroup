import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { defineConfig } from "vite"

// Cau hinh Vite cho ShoeGroup.
// Da bo cac doan rieng cua AI Studio (DISABLE_HMR) va chuyen tu .ts sang .js
// de du an khong con phu thuoc TypeScript.
export default defineConfig({
	plugins: [vue(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		port: 3000,
		strictPort: true,
		open: false,
		proxy: {
			"/api": {
				target: "http://localhost:5000",
				changeOrigin: true
			}
		}
	},
	preview: {
		port: 4173,
	},
	build: {
		outDir: "dist",
		// Tach rieng thu vien lon ra khoi code ung dung -> cache tot hon.
		chunkSizeWarningLimit: 900,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules")) {
						if (id.includes("chart.js")) return "vendor-chart"
						if (id.includes("vue")) return "vendor-vue"
						return "vendor"
					}
				},
			},
		},
	},
})
