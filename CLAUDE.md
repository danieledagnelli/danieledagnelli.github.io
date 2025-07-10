# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is Daniele D'Agnelli's personal website built with Astro, featuring a retro terminal/hacker aesthetic. The site is deployed on GitHub Pages at https://dagnelli.net.

## Development Commands

```bash
# Start development server (http://localhost:4321)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

## Architecture & Key Patterns

### Project Structure
```
src/
├── components/    # Reusable Astro components (Navigation, Matrix effect, etc.)
├── layouts/       # Page layout templates (Main.astro wraps all pages)
├── pages/         # File-based routing (index.astro → /, bio.astro → /bio)
└── styles/        # Global CSS (global.css defines CSS variables)

public/            # Static assets served as-is
└── assets/        # Images, PDFs (resume, favicon)
```

### Astro Component Pattern
Components follow this structure:
```astro
---
// Frontmatter: imports, props, logic
import { siteMetadata } from "../siteMetadata";

type Props = {
    title: string;
};

const { title } = Astro.props;
---

<!-- HTML template -->
<div>{title}</div>

<style>
    /* Scoped component styles */
</style>

<script>
    /* Client-side JavaScript */
</script>
```

### Page Creation Pattern
All pages use the Main layout:
```astro
---
import Main from "../layouts/Main.astro";
import { siteMetadata } from "../siteMetadata";
---

<Main title={`${siteMetadata.title} → page-name`} last_modified="2024-01-01">
    <!-- Page content -->
</Main>
```

### Styling Approach
- **Global variables** in `src/styles/global.css` define the terminal aesthetic:
  - Background: `#101010` (dark)
  - Text color: `#39ff14` (terminal green)
  - Font: `Courier New` monospace
  - Text transform: lowercase
- **Component styles** are scoped within `<style>` blocks
- **No CSS frameworks** - pure CSS with flexbox for layouts

### Key Features & Effects
1. **Matrix Effect**: Terminal-style falling characters (3-second timeout)
2. **Glitch Effect**: Random text glitching animation
3. **Dynamic Content**: Fade-in animation after effects complete
4. **Responsive Design**: Media queries adjust layout for mobile

### Site Configuration
The `siteMetadata.js` file contains all site configuration:
- Author information (name, email, location)
- Social handles (GitHub, Bluesky, LinkedIn)
- Effect timings and configurations
- Site title and description

### Deployment
- Deployed via GitHub Pages to custom domain (dagnelli.net)
- CNAME file must contain: `dagnelli.net`
- Build output goes to `dist/` directory
- No CI/CD workflow - uses GitHub Pages default build

## Important Notes

1. **Minimalist Approach**: This project intentionally uses only Astro with no additional dependencies. Maintain this philosophy when adding features.

2. **Terminal Aesthetic**: All UI elements should maintain the retro terminal look with green-on-black color scheme and monospace fonts.

3. **File-Based Routing**: New pages are created by adding `.astro` files to `src/pages/`. The file path becomes the URL route.

4. **TypeScript**: Configured but primarily using JavaScript. Type checking is strict when TypeScript is used.

5. **No Testing Framework**: Project has no tests configured. Manual testing via dev server is the current approach.

6. **Static Site**: All pages are pre-rendered at build time. No server-side functionality.