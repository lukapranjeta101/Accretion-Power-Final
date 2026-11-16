// Server-owned sample customer prices. No internal costs or margins belong in public assets.
export const catalogVersion = 'sample-usd-v1';
const samples = [
    ['SAMPLE-EP-001', 'Epoxy post insulator', 'Epoxy Components', 4800],
    ['SAMPLE-PO-001', 'Porcelain standoff', 'Porcelain Products', 6250],
    ['SAMPLE-CO-001', 'Composite line insulator', 'Composite Insulators', 9500],
    ['SAMPLE-CU-001', 'Fabricated copper bus bar', 'Copper', 12500],
    ['SAMPLE-BB-001', 'Switchgear bus boot', 'Bus Boots', 2850],
    ['SAMPLE-CA-001', 'Aluminum component casting', 'Castings', 7800],
];
export const catalog = samples.map(([partNumber, name, category, unitPriceCents]) => ({
    partNumber, name, category, unitPriceCents, currency: 'USD', samplePricing: true,
    inventory: 'Simulated inventory — availability requires confirmation',
}));
export const disclaimer = 'Pricing estimate only. Availability and final order details require confirmation from Accretion Power.';
