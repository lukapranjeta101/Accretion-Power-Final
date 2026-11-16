import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

export function loadPDF(bytes) {
    return getDocument({
        data: bytes.slice(),
        cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true,
        standardFontDataUrl: '/assets/pdfjs/standard_fonts/',
        wasmUrl: '/assets/pdfjs/wasm/',
        iccUrl: '/assets/pdfjs/iccs/',
        isEvalSupported: false,
    });
}
