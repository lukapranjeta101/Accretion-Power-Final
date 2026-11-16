import { datasheets, filterDatasheets } from '../../data/datasheets.js';

const $ = id => document.getElementById(id);
const docs = new Map(datasheets.map(doc => [doc.id, doc]));
const search = $('datasheet-search');
const filters = $('datasheet-filters');
const rows = [...document.querySelectorAll('[data-document]')];
const categorySections = [...document.querySelectorAll('[data-category-section]')];
const modal = $('pdf-modal');
const scroller = $('pdf-scroll');
const pages = $('pdf-pages');
const printButton = $('pdf-print');
const downloadButton = $('pdf-download');
const status = $('pdf-status');
let category = 'All';
let session = null;
let zoom = 1;
let resizeTimer;
let viewerModule;
const transfers = new Set();
const temporaryURLs = new Set();

function filterDirectory() {
    const matches = filterDatasheets(search.value, category);
    const ids = new Set(matches.map(doc => doc.id));
    rows.forEach(row => { row.hidden = !ids.has(row.dataset.document); });
    categorySections.forEach(section => {
        section.hidden = ![...section.querySelectorAll('[data-document]')].some(row => !row.hidden);
    });
    $('datasheet-count').textContent = `${matches.length} of ${datasheets.length} documents`;
    $('datasheet-empty').hidden = matches.length !== 0;
    $('datasheet-content').hidden = matches.length === 0;
    $('clear-datasheet-filters').hidden = !search.value && category === 'All';
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
}
search.addEventListener('input', filterDirectory);
filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (button) { category = button.dataset.category; filterDirectory(); }
});
function clearFilters() {
    search.value = ''; category = 'All'; filterDirectory(); search.focus();
}
$('clear-datasheet-filters').addEventListener('click', clearFilters);
$('reset-datasheet-filters').addEventListener('click', clearFilters);

async function fetchPDF(doc, signal) {
    const response = await fetch(doc.url, { signal, credentials: 'same-origin' });
    if (!response.ok) throw new Error(`PDF request failed (${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error('The server did not return a PDF.');
    return bytes;
}
function revoke(url) { URL.revokeObjectURL(url); temporaryURLs.delete(url); }
function makeURL(bytes) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    temporaryURLs.add(url);
    return url;
}
async function download(doc, button) {
    if (!doc || button.disabled) return;
    const targetSession = session;
    const message = modal.open ? status : $('datasheet-action-status');
    const controller = new AbortController();
    transfers.add(controller);
    button.disabled = true;
    message.textContent = `Preparing ${doc.filename}…`;
    try {
        const bytes = targetSession?.doc.id === doc.id && targetSession.bytes
            ? targetSession.bytes : await fetchPDF(doc, controller.signal);
        const url = makeURL(bytes);
        const link = document.createElement('a');
        link.href = url; link.download = doc.filename; link.hidden = true;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => revoke(url), 60_000);
        if (message !== status || session === targetSession) message.textContent = `Download started: ${doc.filename}`;
    } catch (error) {
        if (error.name !== 'AbortError' && (message !== status || session === targetSession)) {
            message.textContent = 'Download could not start. Please try again, or contact our team for this document.';
        }
    } finally { transfers.delete(controller); button.disabled = false; }
}

function isCurrent(current) { return session === current && !current.closed; }
function enableZoom(enabled) {
    for (const id of ['pdf-zoom-in', 'pdf-zoom-out', 'pdf-fit']) $(id).disabled = !enabled;
    if (enabled) { $('pdf-zoom-in').disabled = zoom >= 2.5; $('pdf-zoom-out').disabled = zoom <= 0.5; }
}
async function cancelRenders(current) {
    const version = ++current.renderVersion;
    const renders = [...current.renders];
    renders.forEach(task => task.cancel());
    await Promise.allSettled(renders.map(task => task.promise));
    current.renders.clear();
    return version;
}
async function renderPages(current) {
    const version = await cancelRenders(current);
    if (!isCurrent(current) || !current.pdf) return;
    if (version !== current.renderVersion) return;
    const valid = () => isCurrent(current) && version === current.renderVersion;
    const padding = parseFloat(getComputedStyle(scroller).paddingLeft) * 2;
    const availableWidth = Math.max(120, scroller.clientWidth - padding);
    current.lastWidth = scroller.clientWidth;
    const scrollRatio = scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    const fragment = document.createDocumentFragment();
    scroller.setAttribute('aria-busy', 'true');
    status.textContent = 'Rendering document…';
    enableZoom(false);
    try {
        for (let number = 1; number <= current.pdf.numPages; number++) {
            const page = await current.pdf.getPage(number);
            if (!valid()) return;
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: (availableWidth / base.width) * zoom });
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            const figure = document.createElement('figure'); figure.className = 'pdf-page';
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width * pixelRatio); canvas.height = Math.ceil(viewport.height * pixelRatio);
            canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
            canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${current.doc.title}, page ${number} of ${current.pdf.numPages}`);
            const caption = document.createElement('figcaption'); caption.textContent = `Page ${number} of ${current.pdf.numPages}`;
            figure.append(canvas, caption); fragment.append(figure);
            const task = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
            current.renders.add(task);
            await task.promise;
            current.renders.delete(task);
        }
        if (!valid()) return;
        pages.replaceChildren(fragment);
        scroller.scrollTop = scrollRatio * Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        $('pdf-page-count').textContent = `${current.pdf.numPages} ${current.pdf.numPages === 1 ? 'page' : 'pages'}`;
        $('pdf-zoom-label').textContent = zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`;
        status.textContent = '';
    } catch (error) {
        if (valid() && error.name !== 'RenderingCancelledException') {
            status.textContent = 'This PDF could not be displayed. Download the original document using the Download button above.';
        }
    } finally {
        if (valid()) { scroller.setAttribute('aria-busy', 'false'); enableZoom(true); }
    }
}

function preparePrint(current) {
    const frame = document.createElement('iframe');
    frame.className = 'pdf-print-frame'; frame.title = 'Original PDF for printing';
    frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true');
    current.printURL = makeURL(current.bytes);
    current.frame = frame;
    frame.addEventListener('load', () => {
        if (isCurrent(current)) { current.printReady = true; printButton.disabled = false; }
    }, { once: true });
    frame.addEventListener('error', () => {
        if (isCurrent(current)) status.textContent = 'Direct printing is unavailable. Download the original PDF and print it from your PDF reader.';
    }, { once: true });
    frame.src = current.printURL;
    modal.append(frame);
    current.printTimeout = setTimeout(() => {
        if (isCurrent(current) && !current.printReady) status.textContent = 'Your browser has not loaded the original PDF for printing. Download it and print from your PDF reader.';
    }, 15_000);
}

async function openPDF(doc, opener) {
    if (session) closePDF();
    const current = {
        doc, opener, controller: new AbortController(), renders: new Set(), renderVersion: 0,
        scrollX: window.scrollX, scrollY: window.scrollY,
        bodyStyle: document.body.getAttribute('style'), htmlOverflow: document.documentElement.style.overflow,
    };
    session = current; zoom = 1;
    $('pdf-modal-title').textContent = doc.title;
    $('pdf-modal-description').textContent = `${doc.category} · Original PDF · ${doc.pageLabel}`;
    $('pdf-page-count').textContent = '';
    $('pdf-zoom-label').textContent = 'Fit';
    $('pdf-note').textContent = doc.note || ''; $('pdf-note').hidden = !doc.note;
    status.textContent = 'Loading PDF…'; pages.replaceChildren();
    printButton.disabled = true; downloadButton.disabled = false; enableZoom(false);
    scroller.setAttribute('aria-busy', 'true');
    document.body.style.position = 'fixed'; document.body.style.top = `-${current.scrollY}px`;
    document.body.style.width = '100%'; document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    modal.showModal(); scroller.scrollTop = 0; $('pdf-close').focus();
    try {
        viewerModule ||= import('./components/pdf-viewer.js').catch(error => { viewerModule = null; throw error; });
        const [bytes, viewer] = await Promise.all([fetchPDF(doc, current.controller.signal), viewerModule]);
        if (!isCurrent(current)) return;
        current.bytes = bytes;
        current.task = viewer.loadPDF(bytes);
        current.pdf = await current.task.promise;
        if (!isCurrent(current)) return;
        preparePrint(current);
        await renderPages(current);
    } catch (error) {
        if (isCurrent(current) && error.name !== 'AbortError') {
            status.textContent = 'The preview could not load. Try Download to get the original PDF, or close this window and try again.';
            scroller.setAttribute('aria-busy', 'false');
        }
    }
}
function closePDF() {
    const current = session;
    if (!current) return;
    current.closed = true; session = null;
    clearTimeout(resizeTimer); clearTimeout(current.printTimeout);
    current.controller.abort();
    current.frame?.remove();
    if (current.printURL) revoke(current.printURL);
    void cancelRenders(current).then(() => current.task?.destroy()).catch(() => {});
    pages.replaceChildren();
    if (modal.open) modal.close();
    if (current.bodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', current.bodyStyle);
    document.documentElement.style.overflow = current.htmlOverflow;
    window.scrollTo({ left: current.scrollX, top: current.scrollY, behavior: 'instant' });
    current.opener?.focus({ preventScroll: true });
}
$('pdf-close').addEventListener('click', closePDF);
modal.addEventListener('cancel', event => { event.preventDefault(); closePDF(); });
modal.addEventListener('close', () => { if (session) closePDF(); });
let backdropDown = false;
modal.addEventListener('pointerdown', event => { backdropDown = event.target === modal; });
modal.addEventListener('click', event => { if (backdropDown && event.target === modal) closePDF(); backdropDown = false; });
// Native modal dialogs make the rest of the page inert; explicitly wrap Tab for consistent keyboard behavior.
modal.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('datasheet-content').addEventListener('click', event => {
    const view = event.target.closest('[data-view]');
    const save = event.target.closest('[data-download]');
    if (view) void openPDF(docs.get(view.dataset.view), view);
    if (save) void download(docs.get(save.dataset.download), save);
});
downloadButton.addEventListener('click', () => { if (session) void download(session.doc, downloadButton); });
printButton.addEventListener('click', () => {
    if (!session?.printReady) return;
    try {
        session.frame.contentWindow.focus();
        session.frame.contentWindow.print();
        status.textContent = 'If the print dialog did not open, download the original PDF and print it from your PDF reader.';
    } catch {
        status.textContent = 'Your browser blocked direct PDF printing. Download the original PDF and print it from your PDF reader.';
    }
});
for (const [id, change] of [['pdf-zoom-in', .25], ['pdf-zoom-out', -.25], ['pdf-fit', 0]]) {
    $(id).addEventListener('click', () => {
        if (!session?.pdf) return;
        zoom = change === 0 ? 1 : Math.max(.5, Math.min(2.5, zoom + change));
        void renderPages(session);
    });
}
new ResizeObserver(() => {
    if (!session?.pdf) return;
    // Rendering a page can toggle the scrollbar, which changes scroller.clientWidth by its
    // width and re-fires this observer. Ignore changes too small to be a real container
    // resize so that doesn't turn into a render -> resize -> render feedback loop.
    if (session.lastWidth !== undefined && Math.abs(scroller.clientWidth - session.lastWidth) < 16) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (session?.pdf) void renderPages(session); }, 150);
}).observe(scroller);
window.addEventListener('pagehide', () => {
    closePDF(); transfers.forEach(controller => controller.abort()); temporaryURLs.forEach(revoke);
});
filterDirectory();
