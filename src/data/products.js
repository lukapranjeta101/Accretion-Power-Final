// Product information from assets/accretion-power-content/website-copy.md.
export const products = [
    {
        slug: 'epoxy-components', name: 'Epoxy Components', image: 'epoxy components.png',
        summary: 'Cast resin insulators, bushings, and components for electrical applications.',
        description: 'Standoffs, insulators, thru bushings, and wall bushings for switchgear applications. Manufactured at our facility in India, with in-house tooling for custom designs.',
        details: [
            { label: 'Material', value: 'Cast epoxy resin' },
            { label: 'Manufacturing', value: 'Our facility in India' },
            { label: 'Design support', value: 'In-house tooling for custom parts' },
        ],
        groups: [
            { title: 'Epoxy insulators', items: ['Low-voltage post insulators', 'Medium-voltage support and tubular insulators', 'Resistive and capacitive voltage-detecting insulators'] },
            { title: 'Epoxy bushings', items: ['Terminal and oil seal bushings', 'Transformer and primary roof bushings', 'RMU and three-phase bushings'] },
            { title: 'Other epoxy components', items: ['R, Y, B phase spouts', 'Epoxy oil insulator components', 'Custom components built to your drawing'] },
        ],
        enquiry: 'Share your application, voltage requirements, dimensions, and mounting details. Include a drawing or part number where available.',
    },
    {
        slug: 'porcelain-products', name: 'Porcelain Products', image: 'porcelain product.png',
        summary: 'Insulators and bushings for transmission and distribution.',
        description: 'Porcelain standoffs, outdoor distribution insulators, ceramics, and transformer bushings. Find the right fit for your electrical application.',
        details: [
            { label: 'Material', value: 'Porcelain' },
            { label: 'Applications', value: 'Transmission and distribution' },
            { label: 'Support', value: 'Component selection for your requirements' },
        ],
        groups: [
            { title: 'Transmission', items: ['Hollow core insulators', 'Solid core post insulators', 'Line post insulators', 'Long rod and disc insulators'] },
            { title: 'Distribution', items: ['Standoff, spool, and guy strain insulators', 'Pin and suspension insulators', 'Railway insulators'] },
            { title: 'Bushings', items: ['Porcelain transformer bushings', 'Porcelain wall bushings'] },
        ],
        enquiry: 'Share the insulator or bushing type, application, electrical requirements, and mounting dimensions so we can discuss a suitable component.',
    },
    {
        slug: 'composite-insulators', name: 'Composite Insulators', image: 'composite insulator.png',
        summary: 'Composite insulators for outdoor electrical applications.',
        description: 'Explore composite insulators for transmission, railway, and metro applications. Work directly with our team to align your component selection with your project requirements.',
        details: [
            { label: 'Product family', value: 'Composite insulators' },
            { label: 'Applications', value: 'Transmission, railway, and metro' },
            { label: 'Support', value: 'Application and component review' },
        ],
        groups: [
            { title: 'Post and line insulators', items: ['Composite solid core post insulators', 'Composite line post insulators'] },
            { title: 'Long rod insulators', items: ['Composite long rod insulators', 'Options for AC and DC applications'] },
            { title: 'Railway and metro', items: ['Composite railway insulators', 'Composite metro insulators'] },
        ],
        enquiry: 'Tell us about the installation, electrical and mechanical requirements, and connection details. A drawing or existing part reference helps start the review.',
    },
    {
        slug: 'copper', name: 'Copper', image: 'Copper.png',
        summary: 'Copper bus bar fabricated for your design.',
        description: 'C110 copper bus bar in bare, tin-plated, or silver-plated finishes. Custom cutting, milling, punching, and bending to suit your design.',
        details: [
            { label: 'Material', value: 'C110 copper' },
            { label: 'Finishes', value: 'Bare, tin-plated, or silver-plated' },
            { label: 'Requirements', value: 'OEM-specific dimensions and designs' },
        ],
        groups: [
            { title: 'Bus bar options', items: ['Bare copper bus bar', 'Tin-plated bus bar', 'Silver-plated bus bar', 'Insulated bus bar'] },
            { title: 'Fabrication', items: ['Custom cutting and milling', 'Punching and bending', 'Parts made to your drawing'] },
            { title: 'Sizing and supply', items: ['Standard 12-foot lengths in varying sizes', 'Custom dimensions for OEM requirements', 'Contact our team about availability and timing'] },
        ],
        enquiry: 'Send your drawing with dimensions, hole patterns, bend details, and finish requirements. Include quantities and your required delivery date.',
    },
    {
        slug: 'bus-boots', name: 'Bus Boots', image: 'busboots.png',
        summary: 'Bus boots for your switchgear assembly.',
        description: 'Explore bus boots for your switchgear assembly. Share your application and drawings with our team to discuss the right configuration.',
        details: [
            { label: 'Application', value: 'Switchgear assemblies' },
            { label: 'Support', value: 'Configuration review' },
            { label: 'Starting point', value: 'Your application and drawings' },
        ],
        groups: [
            { title: 'Application review', items: ['Describe the switchgear assembly', 'Identify the connection to be covered', 'Share your operating requirements'] },
            { title: 'Drawing review', items: ['Provide component and connection dimensions', 'Include a drawing or existing part reference', 'Identify clearance and fit requirements'] },
            { title: 'Project requirements', items: ['Confirm the quantity you need', 'Share your target delivery date', 'Discuss the configuration with our team'] },
        ],
        optionsTitle: 'Find the right configuration',
        enquiry: 'Share your switchgear application, connection geometry, and drawings. Our team will work with you to review the configuration and next steps.',
    },
    {
        slug: 'castings', name: 'Castings', image: 'Castings.png',
        summary: 'Aluminum castings made to OEM requirements.',
        description: 'Aluminum permanent mold and die castings for electrical applications, including current-carrying and pressure-retaining designs to OEM requirements.',
        details: [
            { label: 'Material', value: 'A356-T6 aluminum' },
            { label: 'Processes', value: 'Gravity and low-pressure die casting' },
            { label: 'Requirements', value: 'OEM-specific designs' },
        ],
        groups: [
            { title: 'Flanges', items: ['Flanges for switchgear', 'Flanges for in-tank tap changers'] },
            { title: 'Mounts and covers', items: ['Interrupter mounts', 'Front covers', 'End covers'] },
            { title: 'Casting capabilities', items: ['Gravity Die Casting (GDC)', 'Low Pressure Die Casting (LPDC)', 'Current-carrying and pressure-retaining designs'] },
        ],
        enquiry: 'Share your part drawing, material specification, quantities, and application requirements so we can discuss the right casting approach.',
    },
].map((product) => ({
    ...product,
    href: `${product.slug}.html`,
    image: `assets/images/accretion-power-products/${product.image}`,
    optionsTitle: product.optionsTitle || 'Product options',
}));
