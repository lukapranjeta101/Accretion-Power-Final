// Verified against all 12 original PDFs in assets/datasheets.
// Filenames are catalog references; drawing title-block IDs are retained as search terms.
const entries = [
    {
        id: 'a20', filename: 'Accretion Power - A20 Epoxy Insulators Rev1.pdf',
        title: 'A20 Series Epoxy Insulators', product: 'A20 Insulator Set', category: 'Series datasheets', pages: 2,
        models: ['A20', 'N-005-0115', 'N-008-0162', 'N-015-0230', 'N-020-0311', 'N-025-0394', 'N-035-0485', 'N-035-0496', 'N-035-0562', 'N-045-0639'],
        reference: 'A20', description: 'Insulator dimensions, ratings, and insert configurations.',
    },
    {
        id: 'a30', filename: 'Accretion Power - A30 Epoxy Insulators.pdf',
        title: 'A30 Series Epoxy Insulators', product: 'A30 Insulator Set', category: 'Series datasheets', pages: 2,
        models: ['A30', 'N-008-0158', 'N-015-0239', 'N-020-0295', 'N-025-0373', 'N-035-0462', 'N-035-0468', 'N-035-0556', 'N-045-0608'],
        reference: 'A30', description: 'Insulator dimensions, ratings, and insert configurations.',
    },
    {
        id: 'n-002-0082', filename: 'Accretion Power - N-002-0082.pdf',
        title: 'N-002-0082 — Epoxy Insulator', product: 'Epoxy resin insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-002-0082', models: ['N-002-0082', ...['ASR', 'AAR'].flatMap(insert => ['101', '201', '301', '501', '601', '701'].map(style => `N-002-0082-${insert}-${style}`))],
        description: 'Dimensional drawing with UNC and metric insert options.',
    },
    {
        id: 'n-015-0239-asg-004', filename: 'Accretion Power - N-015-0239-ASG-004.pdf',
        title: 'N-015-0239-ASG-004 — Indoor / Outdoor Insulator', product: 'Indoor / outdoor epoxy insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-015-0239-ASG-004', models: ['N-015-0239-ASG-004', 'NEIS-E-15-003'],
        description: 'Dimensional drawing and material notes.',
        note: 'The drawing mentions a second configuration page, but the supplied PDF contains one page.',
    },
    {
        id: 'n-015-0240-bbb-101', filename: 'Accretion Power - N-015-0240-BBB-101.pdf',
        title: 'N-015-0240-BBB-101 — Epoxy Insulator', product: 'Cycloaliphatic epoxy resin insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-015-0240-BBB-101', models: ['N-015-0240-BBB-101'],
        description: 'Dimensional drawing with material and electrical notes.',
    },
    {
        id: 'n-015-0241-asr', filename: 'Accretion Power - N-015-0241-ASR.pdf',
        title: 'N-015-0241-ASR — Support Insulator', product: 'Epoxy support insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-015-0241-ASR', models: ['N-015-0241-ASR', 'N-015-0241-ASR-101', 'N-015-0241-ASR-301', 'NEIS-13.5-003', '7000-XX'],
        description: 'Support insulator drawing with two insert variants.',
    },
    {
        id: 'n-020-0295-bsg-004', filename: 'Accretion Power - N-020-0295-BSG-004.pdf',
        title: 'N-020-0295-BSG-004 — Indoor / Outdoor Insulator', product: 'Indoor / outdoor epoxy insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-020-0295-BSG-004', models: ['N-020-0295-BSG-004'], description: 'Dimensional drawing and insert details.',
    },
    {
        id: 'n-025-0348-bag-105', filename: 'Accretion Power - N-025-0348-BAG-105.pdf',
        title: 'N-025-0348-BAG-105 — Insulator', product: '25 kV insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-025-0348-BAG-105', models: ['N-025-0348-BAG-105', 'NEIS-E-25-002'], description: 'Insulator drawing with mounting and material notes.',
    },
    {
        id: 'n-025-0413-bsg-004', filename: 'Accretion Power - N-025-0413-BSG-004.pdf',
        title: 'N-025-0413-BSG-004 — Standoff Insulator', product: 'Epoxy standoff insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-025-0413-BSG-004', models: ['N-025-0413-BSG-004', 'NEIS-E-25-003'], description: 'Standoff insulator dimensions and mounting details.',
    },
    {
        id: 'n-035-0555-bbb-1c3', filename: 'Accretion Power - N-035-0555-BBB-1C3.pdf',
        title: 'N-035-0555-BBB-1C3 — Support Insulator', product: 'Support insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-035-0555-BBB-1C3', models: ['N-035-0555-BBB-1C3', 'NEIS-33-002'], description: 'Support insulator drawing and insert details.',
        note: 'The drawing title states 33 kV; its rated-voltage note states 36 kV. Confirm the required rating with our team.',
    },
    {
        id: 'n-035-0720-bsg-405', filename: 'Accretion Power - N-035-0720-BSG-405.pdf',
        title: 'N-035-0720-BSG-405 — Support Insulator', product: 'Epoxy support insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-035-0720-BSG-405', models: ['N-035-0720-BSG-405', 'NEIS-E-35-003', '5855-35'], description: 'Support insulator dimensions and mounting details.',
        note: 'The drawing title states 35 kV; its rated-voltage note states 34.5 kV. Confirm the required rating with our team.',
    },
    {
        id: 'n-075-0800-bsg-405', filename: 'Accretion Power - N-075-0800-BSG-405.pdf',
        title: 'N-075-0800-BSG-405 — Support Insulator', product: 'Epoxy support insulator', category: 'Individual drawings', pages: 1,
        reference: 'N-075-0800-BSG-405', models: ['N-075-0800-BSG-405', 'NEIS-E-75-001'], description: 'Support insulator dimensions and mounting details.',
    },
];

export const datasheets = entries.map(item => ({
    ...item,
    url: `/assets/datasheets/${encodeURIComponent(item.filename)}`,
    pageLabel: `${item.pages} ${item.pages === 1 ? 'page' : 'pages'}`,
}));
export const datasheetCategories = [...new Set(datasheets.map(item => item.category))];
export const groupedDatasheets = datasheetCategories.map(category => ({
    category,
    items: datasheets.filter(item => item.category === category),
}));
const normalize = value => value.toLowerCase().replace(/[‐‑–—]/g, '-');
export function filterDatasheets(query = '', category = 'All') {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return datasheets.filter(item => (category === 'All' || item.category === category) &&
        terms.every(term => normalize([item.title, item.product, ...item.models].join(' ')).includes(term)));
}
