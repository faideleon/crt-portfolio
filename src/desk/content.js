// Portfolio content, taken from Desktop/Projects/Portfolio.
const IMG = (name) => `${import.meta.env.BASE_URL}img/dithered/${name}.png`;

export const CONTENT = {
  about: {
    name: 'Faisal D. Khan',
    greeting: "Hi, I'm Faisal.",
    role: 'Full-Stack Developer',
    location: 'Baguio City · Philippines',
    status: 'Available for work!',
    photo: IMG('Faisal-Profile'),
    bio: [
      "I'm a full-stack developer building clean interfaces, PostgreSQL backends, and data-driven systems.",
      'From a crowdsourced transit map to a hand-built web portfolio, shipped end to end, solo.',
    ],
    skills: ['JavaScript', 'HTML & CSS', 'PostgreSQL', 'Supabase', 'PostGIS', 'Flutter', 'GSAP', 'C#'],
  },

  experience: [
    {
      kind: 'Work',
      role: 'Software Engineer',
      org: 'Zer0ed',
      text:
        'Building Zer0ed: 100 Years Later solo in Unity, a hex-map survival game with a real-time auto-battler. Every stat, recipe, and balancing value lives in data, not code, with editor tools that set up, check, and generate it in one click.',
      highlights: ['Architecture & Logic', 'Data-Driven Design', 'End-to-End Development', 'Editor Tooling'],
    },
    {
      kind: 'Personal project',
      role: 'Full-Stack Developer',
      org: 'Ruta',
      text:
        'Built Ruta end to end: a crowdsourced, GPS-verified jeepney route map for Baguio City on Flutter, Supabase, and PostGIS. Designed a deduplication engine that merges routes above 90% path overlap, and battery-light trip tracking that keeps GPS data to about 40 KB per two-hour trip.',
      highlights: ['Geospatial Architecture', 'Route Deduplication', 'Battery-Light Tracking', 'Full-Stack Delivery'],
    },
  ],

  projects: [
    {
      id: 'zer0ed',
      title: 'Zer0ed',
      tag: 'Game',
      role: 'Software Engineer',
      summary:
        'Zer0ed: 100 Years Later. A 2D hex-map survival game with a real-time auto-battler, built solo in Unity.',
      shots: [
        { src: IMG('Zer0ed-day'), caption: 'The island: travel the hex map, scavenge, watch your vitals.' },
        { src: IMG('Zer0ed-battle'), caption: 'Auto-battler: your squad fights in real time, tile by tile.' },
        { src: IMG('Zer0ed-night'), caption: 'Day and night: a world clock turns the island dark.' },
      ],
      contributions: [
        'Built the hex-map world: movement, travel modes, a day-night clock, and points of interest.',
        'Designed survival, crafting, research, and base-building as connected systems.',
        'Made every number tunable through ScriptableObject data, not code.',
        'Wrote editor tools that set up, check, and generate game data in one click.',
      ],
      stats: [['3/4', 'Phases built'], ['12', 'Planned milestones']],
      tech: ['Unity 6', 'C#', 'URP 2D', 'Tilemap', 'Input System', 'ScriptableObjects'],
    },
    {
      id: 'ruta',
      title: 'Ruta',
      tag: 'Full-Stack',
      role: 'Founder / Full-Stack Developer',
      summary:
        "A live map and rider community for Baguio's jeepney routes, so anyone, local or first-timer, can get across the city with confidence.",
      shots: [
        { src: IMG('Ruta-screens'), caption: 'Live map & community: verified routes, fares, travel time.' },
        { src: IMG('Ruta-post'), caption: 'Post a route with AI: describe it, AI drafts the stops.' },
        { src: IMG('Ruta-travel'), caption: 'Travel Pack: an offline guide for tourists.' },
      ],
      contributions: [
        'Designed the product and every screen, from splash to Travel Pack.',
        'Built the app on Flutter and Supabase with PostGIS geospatial queries.',
        'Created a deduplication engine that merges routes above 90% path overlap.',
        'Shipped battery-light trip tracking with geofencing and adaptive timeouts.',
      ],
      stats: [['90%', 'Overlap to auto-merge'], ['~40 KB', 'GPS per 2-hour trip']],
      tech: ['Flutter', 'Dart', 'Supabase', 'PostgreSQL', 'PostGIS'],
    },
    {
      id: 'portfolio',
      title: 'Personal Portfolio',
      tag: 'Web',
      role: 'Full-Stack Developer',
      summary:
        'A hand-built portfolio where smooth scrolling, small details, and plenty of space let the work speak first.',
      shots: [
        { src: IMG('portfolio-hero'), caption: 'Home: a halftone portrait, a blinking cursor, room to breathe.' },
        { src: IMG('portfolio-projects'), caption: 'Project index: every project, filterable by discipline.' },
        { src: IMG('portfolio-detail'), caption: 'Project pages: just enough story to appreciate the work.' },
      ],
      contributions: [
        'Designed and built every page by hand with HTML, CSS, and JavaScript.',
        'Added scroll-driven reveals and a pinned horizontal section with GSAP.',
        'Paired it with Lenis for smooth, consistent scrolling.',
        'Pulled live GitHub contributions into a custom activity graph.',
      ],
      stats: [['0', 'Frameworks'], ['Live', 'GitHub contribution data']],
      tech: ['HTML', 'CSS', 'JavaScript', 'GSAP', 'Lenis'],
    },
  ],

  contact: {
    email: 'faideleon25@gmail.com',
    github: { label: 'github.com/faideleon', href: 'https://github.com/faideleon' },
    handle: '@faii.dl',
    place: 'Baguio, PH',
  },

  // The source portfolio's resume link is still "#", so this is a placeholder.
  resume: { href: null },
};
