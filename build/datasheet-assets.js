import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { datasheets } from '../src/data/datasheets.js';

// One source of truth: serve/emit the untouched originals, without maintaining copies.
export function datasheetAssets() {
    const require = createRequire(import.meta.url);
    const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
    const resources = new Map(datasheets.map(doc => [
        `assets/datasheets/${doc.filename}`, path.resolve('assets/datasheets', doc.filename),
    ]));
    for (const dir of ['standard_fonts', 'cmaps', 'wasm', 'iccs']) {
        for (const name of fs.readdirSync(path.join(pdfjsRoot, dir))) {
            const file = path.join(pdfjsRoot, dir, name);
            if (fs.statSync(file).isFile()) resources.set(`assets/pdfjs/${dir}/${name}`, file);
        }
    }
    return {
        name: 'accretion-datasheet-assets',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                let key;
                try { key = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, ''); }
                catch { res.statusCode = 400; res.end('Invalid resource URL'); return; }
                const file = resources.get(key);
                if (!file) return next();
                if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
                res.setHeader('Content-Type', key.endsWith('.pdf') ? 'application/pdf' : key.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
                res.setHeader('Content-Length', fs.statSync(file).size);
                res.setHeader('X-Content-Type-Options', 'nosniff');
                if (req.method === 'HEAD') return res.end();
                fs.createReadStream(file).on('error', () => { res.statusCode = 500; res.end(); }).pipe(res);
            });
        },
        generateBundle() {
            for (const [fileName, file] of resources) this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(file) });
        },
    };
}
