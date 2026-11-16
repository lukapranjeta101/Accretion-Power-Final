# Contact information and links

## Published contact

| Item | Published value | Source |
|---|---|---|
| Company | Accretion Power, LLC | frontend/src/components/layout/closing-footer.tsx; frontend/src/lib/schema.ts |
| Contact | Benjamin Vietmeier (also “Ben Vietmeier”) | frontend/src/features/faq/faq-page.tsx; frontend/src/features/approach/approach-page.tsx |
| Email | benjamin.vietmeier@accretionpower.com | closing-footer.tsx; faq-page.tsx |
| Telephone | +1 412 510 6454; destination tel:+14125106454 | closing-footer.tsx |
| Location | Pittsburgh, Pennsylvania, United States | frontend/src/lib/schema.ts; frontend/src/features/information/legal-page.tsx |

No street address, postal code, manufacturing street address, business hours, or confirmed social profile destinations were found. The schema’s hyphenated phone formatting represents the same number, not a conflicting contact.

## Email destinations

- mailto:benjamin.vietmeier@accretionpower.com — direct contact links.
- mailto:benjamin.vietmeier@accretionpower.com?subject=Project%20enquiry — shared closing contact invitation.
- mailto:benjamin.vietmeier@accretionpower.com?subject=Product%20question — FAQ contact invitation.
- Product enquiry links use the same address with a URL-encoded subject of “Request Information: ” followed by the family or component name. Source: frontend/src/features/products/content.ts (requestInfoHref).

## Website destinations

Current relative routes: /, /products, /products/epoxy-components, /products/porcelain-products, /products/composite-insulators, /products/copper, /products/bus-boots, /products/castings, /datasheets, /approach, /about, /resources, /faq, /terms-of-service, /privacy-policy, /cookie-policy.

Customer routes linked in the source: /portal, /portal/login, /portal/apply, /portal/verify, /portal/new, /portal/estimates, and estimate-specific paths. /portal/admin is role-restricted, not a public business resource. These are references only; no portal functionality or private links are transferred.

Homepage anchors include #top, #products, #contact, #intro, #approach, and #about; interior pages use /#contact. Approach uses #how-we-work. Datasheets use #a20-series, #a30-series, #individual-drawings. These identify existing content, not destination architecture requirements.

Sources: frontend/src/components/layout/site-header.tsx; closing-footer.tsx; frontend/src/features/home/landing-page.tsx; products/families.ts; datasheets/content.ts; portal/portal.tsx.

## Domain and historical public source links

The historical research document (docs/landing-page-research.md) records https://accretionpower.com/about, /epoxy-components, /porcelain-products, /composite-insulators, /copper, /bus-boots, /castings, and /contact on that domain as company sources. Those older product paths differ from the repository’s /products/… paths. They were not fetched for this source-only extraction; current redirect/live status is unverified.

frontend/src/lib/site-config.ts falls back to http://localhost:3000 if the production site URL is not supplied. This is an incomplete production configuration, not a public company destination. No environment files were exported or used to resolve it. Current source has no bare “#” destination placeholders in the inspected public content. Legacy #cut-sheets belongs to unused home content; it is not a current resource route.

## Technical PDF destinations

These are site-relative references, not files included in this handoff. All 12 source files exist under frontend/public/datasheets/. Rehosting PDFs would be a separate addition to the requested photos/logos structure.

| Resource | Existing destination | Repository source |
|---|---|---|
| A20 Series Epoxy Insulators | /datasheets/Accretion%20Power%20-%20A20%20Epoxy%20Insulators%20Rev1.pdf | frontend/public/datasheets/Accretion Power - A20 Epoxy Insulators Rev1.pdf |
| A30 Series Epoxy Insulators | /datasheets/Accretion%20Power%20-%20A30%20Epoxy%20Insulators.pdf | frontend/public/datasheets/Accretion Power - A30 Epoxy Insulators.pdf |
| N-002-0082 | /datasheets/Accretion%20Power%20-%20N-002-0082.pdf | frontend/public/datasheets/Accretion Power - N-002-0082.pdf |
| N-015-0239-ASG-004 | /datasheets/Accretion%20Power%20-%20N-015-0239-ASG-004.pdf | frontend/public/datasheets/Accretion Power - N-015-0239-ASG-004.pdf |
| N-015-0240-BBB-101 | /datasheets/Accretion%20Power%20-%20N-015-0240-BBB-101.pdf | frontend/public/datasheets/Accretion Power - N-015-0240-BBB-101.pdf |
| N-015-0241-ASR | /datasheets/Accretion%20Power%20-%20N-015-0241-ASR.pdf | frontend/public/datasheets/Accretion Power - N-015-0241-ASR.pdf |
| N-020-0295-BSG-004 | /datasheets/Accretion%20Power%20-%20N-020-0295-BSG-004.pdf | frontend/public/datasheets/Accretion Power - N-020-0295-BSG-004.pdf |
| N-025-0348-BAG-105 | /datasheets/Accretion%20Power%20-%20N-025-0348-BAG-105.pdf | frontend/public/datasheets/Accretion Power - N-025-0348-BAG-105.pdf |
| N-025-0413-BSG-004 | /datasheets/Accretion%20Power%20-%20N-025-0413-BSG-004.pdf | frontend/public/datasheets/Accretion Power - N-025-0413-BSG-004.pdf |
| N-035-0555-BBB-1C3 | /datasheets/Accretion%20Power%20-%20N-035-0555-BBB-1C3.pdf | frontend/public/datasheets/Accretion Power - N-035-0555-BBB-1C3.pdf |
| N-035-0720-BSG-405 | /datasheets/Accretion%20Power%20-%20N-035-0720-BSG-405.pdf | frontend/public/datasheets/Accretion Power - N-035-0720-BSG-405.pdf |
| N-075-0800-BSG-405 | /datasheets/Accretion%20Power%20-%20N-075-0800-BSG-405.pdf | frontend/public/datasheets/Accretion Power - N-075-0800-BSG-405.pdf |

## Image credit links

NASA Apollo 17 Blue Marble credit: Earth Science and Remote Sensing Unit, NASA Johnson Space Center. Source page: https://svs.gsfc.nasa.gov/30613/ . Original download recorded in docs/image-credits.md: https://svs.gsfc.nasa.gov/vis/a030000/a030600/a030613/blue_marble_apollo_17_19721207_print.jpg . Existing local bytes are bundled.

Historical asset notes mention img1.wsimg.com and https://images.unsplash.com/photo-1473341304170-971dccb5ac1e . No active source directly requests these remote photos; the historical Unsplash image is not exported because its local counterpart is unused.

