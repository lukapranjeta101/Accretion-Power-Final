# Content inventory

Repository inspection date: October 28, 2026. This is a topic/source index, not a page plan or instruction to reproduce the existing website structure. Active routes were traced through frontend/src/app and their imported feature/data/shared components. The full frontend/src tree was searched for image paths, external URLs, and CSS url() references; frontend/public/images and app icon files were inventoried. Supporting docs were used only for provenance and qualification, not copied wholesale.

## Content coverage

| Topic | Source location | Extracted destination / qualification |
|---|---|---|
| Identity, purpose, market and partnership | frontend/src/features/home/landing-page.tsx; about/about-page.tsx | company-information.md; website-copy.md |
| Manufacturing, inventory, custom production, enquiry requirements | frontend/src/features/approach/approach-page.tsx | company-information.md; website-copy.md |
| Six product introductions | frontend/src/features/home/products.ts; home/product-showcase.tsx | website-copy.md; displayed descriptions, not unused label/title/tag fields |
| Detailed product options and applications | frontend/src/features/products/content.ts; families.ts; product-detail-page.tsx; products-page.tsx | website-copy.md; supplemental categories labeled separately |
| Public answers and engineering services | frontend/src/features/faq/faq-page.tsx | website-copy.md; company-information.md |
| A20/A30 models and individual drawing listings | frontend/src/features/datasheets/content.ts; datasheets-page.tsx | website-copy.md tables; contact-and-links.md PDF destinations |
| Technical PDF files | frontend/public/datasheets/ (12 files) | Existence verified; references only; binaries not exported |
| Resource summaries | frontend/src/app/resources/page.tsx | website-copy.md |
| Legal identity and contact location | frontend/src/lib/schema.ts; components/layout/closing-footer.tsx | company-information.md; contact-and-links.md |
| Contact details and current navigation destinations | frontend/src/components/layout/site-header.tsx; closing-footer.tsx | contact-and-links.md |
| Site metadata and domain fallback | frontend/src/app/layout.tsx; lib/site-config.ts; app route metadata | Business description in website-copy.md; domain qualification in contact-and-links.md |
| Legal drafts and notice | frontend/src/features/information/legal-content.ts; legal-page.tsx | website-copy.md; conflicts in missing-or-uncertain.md |
| Account/estimate business copy | frontend/src/features/portal/auth-forms.tsx; portal.tsx; types.ts; catalog.ts | Selected substantive customer copy; demo/approval limitations retained; no prices or private data |
| Legacy unused content | frontend/src/features/home/content.ts; home/components/*; older layout components | Not mixed into current copy; provisional categories/contact fields noted in missing-or-uncertain.md |
| Historical company sources | docs/landing-page-research.md; docs/project-brief.md | Provenance and uncertainty only, not current deployment evidence |
| Photo provenance | docs/image-credits.md; docs/image-prompts/copper-studio.md | Credit and AI status retained, design prompts excluded |

## Exported assets

See asset-manifest.json for full metadata, source paths, source usage, and checksums. Empty alt strings are preserved as empty, not replaced with invented descriptions.

| Exported file | Type | Original source |
|---|---|---|
| photos/epoxy-components.jpg | photo | frontend/public/images/epoxycomponents.jpg |
| photos/porcelain-products.png | photo | frontend/public/images/Porcelainproducts.png |
| photos/composite-insulators.png | photo | frontend/public/images/compositeinsulator.png |
| photos/copper-bus-bar.png | photo | frontend/public/images/copper.png |
| photos/copper-bus-bar-ai-studio.png | photo | frontend/public/images/copper-studio.png |
| photos/bus-boots.png | photo | frontend/public/images/busboots.png |
| photos/aluminum-castings.png | photo | frontend/public/images/castingsimage.png |
| photos/survey-drone-on-snow.avif | photo | frontend/public/images/grid-landscape.avif |
| photos/pittsburgh-fort-pitt-bridge.webp | photo | frontend/public/images/Downtown-Pittsburgh-Pennsylvania-Fort-Pitt-Bridge-Monongahela.webp |
| photos/earth-blue-marble.jpg | photo | frontend/public/images/earth-blue-marble.jpg |
| logos/accretion-power-ap-original.png | logo | frontend/public/images/ap-logo-white-on-black.png |
| logos/accretion-power-ap-icon.png | logo | frontend/src/app/icon.png |
| logos/accretion-power-ap-favicon.ico | logo | frontend/src/app/favicon.ico |

## Complete active image-reference accounting

All 12 unique still-image paths referenced by active source are accounted for: 10 copied assets above, plus the two exclusions below. The AP original logo is available but not used by current page components; the app icon/favicon are automatically served metadata variants and are also copied. Dynamic image consumers in product listings, product details, the homepage showcase, and datasheets were checked against their data definitions. The portal catalog also carries image references, but no current rendered portal image consumer was found; these are data references, not additional appearances.

| Active non-exported visual | Usage | Disposition |
|---|---|---|
| /images/testimonial-fictional-daniel-mercer.png | Home sample testimonial | Intentionally excluded explicit fictional placeholder; available, not a missing download |
| /images/epoxy.png | Approach drawing illustration | Technical line drawing, not a photograph; intentionally excluded |
| /images/herosectionbackground.mp4 | Homepage background | Video, outside requested photo/logo scope; no still poster or extracted frames |

CSS inspection found no external/local photographic url() backgrounds. Inline media/image references were included in the scan. No active remote photo requires downloading, and no active local referenced image is missing. Historical remote asset links are provenance only. Unused local image filenames and qualifications are listed in missing-or-uncertain.md.

## Verification

- All 13 exported asset paths resolve within this handoff folder.
- Every exported asset is byte-identical to its local source; SHA-256 checksums are recorded.
- No duplicate file bytes appear among the exported assets.
- Dimensions were read from the original image metadata, not component display sizes; favicon sizes were read from its ICO directory.
- All 12 referenced PDF filenames resolve in the source public/datasheets directory; PDFs are not packaged.
- Output is limited to seven requested Markdown/JSON documents and the photos/logos directories. No implementation, dependency, configuration, font, private data, or design-system file was copied.
