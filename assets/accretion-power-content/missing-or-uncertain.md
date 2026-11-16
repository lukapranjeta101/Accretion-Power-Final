# Missing or uncertain content

## Scope and publication status

- Extraction uses the repository working tree as supplied on October 28, 2026, including pre-existing uncommitted content. It does not verify which revision is live on a production domain.
- No founding date, detailed history, mission statement formally labeled as such, street/postal address, office hours, verified social profiles, certifications, measured performance claims, named customer projects, or real team biographies/portraits were found in active content. The purpose and value propositions in company-information.md are grounded in existing marketing copy.
- Ben/Benjamin Vietmeier is the current published contact. “Owner” appears in the historical internal project brief/unused home content; obtain confirmation before using it as a public title.
- Original vector logo masters, a full company-name image wordmark, and approval/provenance documentation were not found. Three existing AP raster variants are bundled unchanged. Current headers use text branding, not the image logo. An old brief describes the text wordmark as temporary.

## Placeholder and legacy material

- The homepage testimonial identifies Daniel Mercer, Director of Procurement, Aldercrest Power Systems as fictional, along with its quote and AI portrait. The endorsement is excluded from usable copy. The used image `frontend/public/images/testimonial-fictional-daniel-mercer.png` is intentionally excluded as explicit placeholder imagery, not unavailable. Its existing alt is “AI-generated portrait of the fictional customer Daniel Mercer”; usage: frontend/src/features/home/landing-page.tsx. Do not treat it as a team/customer photo.
- `frontend/src/features/home/content.ts` and `home/components/*` are unused legacy content. Their sample Current Transformers / Bushings & Insulators / Electrical Accessories categories, pending contact details, and planned functionality are not authoritative current copy. Historical docs/project-brief.md explicitly calls those categories provisional.
- `frontend/src/features/products/content.ts` still says Bus Boots information is needed and should be withheld from the catalog, but current families.ts publishes a generic Bus Boots page. Specific models, materials, specifications, and available options remain missing. Both facts are recorded rather than silently resolving the discrepancy.
- Fiberglass barriers and springs exist in catalog data and the portal adapter but are excluded from the six public product families. Confirm intended public product scope.
- The FAQ still tells visitors to use a Products-page search; the current six-family Products page has no search control. Preserve as source copy, but review before reuse.

## Technical conflicts

Source: frontend/src/features/datasheets/content.ts comments and public table behavior.

- N-035-0555-BBB-1C3: drawing title is reported as 33 kV while the rated-voltage note is reported as 36 kV. The website displays “See drawing.” No authoritative value chosen.
- N-035-0720-BSG-405: drawing title is reported as 35 kV while the rated-voltage note is reported as 34.5 kV. The website displays “See drawing.” No authoritative value chosen.
- Some options and the 12-foot copper length statement refer to a “product presentation.” That presentation was not located as an independent source in this repository. Claims are preserved as website wording, not validated specifications.
- The 12 linked PDF files exist but are not bundled in the requested photo/logo folders. Their destinations, filenames, displayed models, and displayed ratings are documented. The handoff is self-contained for its extracted copy/photos/logos, not for the original downloadable drawing library. Full drawing content has not been transcribed or independently validated.

## Image qualifications and exclusions

- Ten active photographic/category assets are copied byte-for-byte. This count includes existing photorealistic product illustrations; it is not a claim that all ten originated in a camera. Exact image types and uncertainties are in asset-manifest.json.
- `copper-studio.png` is explicitly AI-generated according to docs/image-prompts/copper-studio.md. It illustrates a category and does not substantiate actual inventory, dimensional accuracy, or a delivered component.
- `grid-landscape.avif` is actively used on About and its supplied alt describes a survey drone on snow. Its business relevance is unclear; retained to avoid losing an active photo. No drone capability, ownership, project, or location claim is inferred.
- Pittsburgh photo and NASA Earth image illustrate location/global reach, not owned facilities or completed projects. NASA credit and its recorded public source are preserved. Rights/credits for other images are not individually documented; historical research notes group some product assets as downloads from the prior company site without per-file URLs. Do not infer ownership from appearance.
- `frontend/public/images/epoxy.png` is used on `/approach` as a technical drawing, not a photo. Alt: “Epoxy insulator drawing showing dimensions, mounting holes, and insert configurations.” It is intentionally excluded from photos; it is available in the source repository, not unavailable.
- `frontend/public/images/herosectionbackground.mp4` is the homepage photographic video background. Videos are outside the requested photo/logo export. No frames were extracted. No still poster is referenced.
- No CSS photographic backgrounds or active remote image URLs were found. No active photographic asset was unavailable. Consequently no remote downloads were required.
- Unused local imagery excluded: berkeley-county-exterior.jpg, power-lines.jpg, composite.png, porcelain.png, bushing.png, castings.png, boots.png. No current source references use these files. Their names do not establish projects or product claims. The active drone and other assets are not substituted with them.
- No higher-resolution version of an active local photo was clearly identified within the repository. Available used file bytes were retained exactly, without cropping, resizing, re-encoding, or generating new images.

## Links, policies, and portal

- Production URL is environment-dependent; the source fallback is localhost. Historical accretionpower.com links are recorded separately from current relative routes; live availability/redirects were not tested.
- Legal pages expressly show “Draft for review,” prepared October 8, 2026, awaiting company approval. Their no-registration/no-application-cookie statements predate the newer account portal and conflict with it. Effective dates, providers, retention details, and finalized policy terms remain unresolved. Existing legal copy is preserved as draft content, not final policy.
- Portal text is present and linked, but actual deployment/service configuration is not verified. Its own notices label demo estimates and simulated emails. Do not publish demo prices or claim production readiness from this extraction.
