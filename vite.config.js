import { sync } from "glob";
import { defineConfig } from "vite";
import path, { resolve } from "path";
import tailwindcss from '@tailwindcss/vite';
import handlebars from "vite-plugin-handlebars";
import { products } from "./src/data/products.js";
import { datasheets, datasheetCategories, groupedDatasheets } from "./src/data/datasheets.js";
import { datasheetAssets } from "./build/datasheet-assets.js";

export default defineConfig(({ mode }) => {
    const list = [];

    if (mode === "production") {
        sync("src/*.html", { ignore: "src/client-preview.html" }).forEach((file) => { list.push(file); });
    }

    return {
        root: "src",
        base: "/",
        // publicDir: "../public",
        server: {
            open: false,
            fs: {
                allow: [resolve('src'), resolve('node_modules')],
                deny: ['.env', '.env.*', '**/*.pem', '**/*.crt', '**/.git/**', '**/server/**', '**/var/**', '**/tests/**'],
            },
        },
        plugins: [
            datasheetAssets(),
            tailwindcss(),
            handlebars({
                partialDirectory: resolve("./src/partials"),
                context(pagePath) {
                    if (path.basename(pagePath) === 'datasheets.html') return { datasheets, datasheetCategories, groupedDatasheets };
                    const product = products.find((item) => item.href === path.basename(pagePath));
                    return product ? {
                        product,
                        pageTitle: `${product.name} | Accretion Power`,
                        relatedProducts: products.filter((item) => item.slug !== product.slug),
                    } : {};
                },
            }),
        ],
        resolve: {
            alias: {
                "@/*": path.resolve("./*"),
                "@css": path.resolve("./src/assets/css/"),
            },
        },
        build: {
            outDir: "../dist",
            emptyOutDir: true,
            rollupOptions: {
                input: [...list],

                // optional
                // output: {
                //     // Entry JS files
                //     entryFileNames: 'assets/[name].js',

                //     // Dynamic chunks
                //     chunkFileNames: 'assets/[name].js',

                //     // CSS, images, fonts
                //     assetFileNames: (assetInfo) => {
                //         if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                //             return 'assets/[name][extname]'
                //         }
                //         return 'assets/[name][extname]'
                //     }
                // },
            }
        },
    };
});
