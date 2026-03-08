# Bloomberg Terminal Single-Page Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the multi-page personal site into a single no-scroll Bloomberg Terminal-style dashboard with a dense 4-column grid layout.

**Architecture:** Replace the current multi-page layout (index, bio, resume, blog) with a single `index.astro` page using a CSS Grid that fills exactly 100vh. The layout wrapper in `Main.astro` is simplified to remove sidebar/header/footer and use a ticker-top/content/statusbar-bottom structure. Existing components (Panel, DataCard, SkillsPanel, Timeline, Whoami, Matrix, Glitch) are reused with minor modifications for density. New components are not needed - just restructured layout.

**Tech Stack:** Astro, CSS Grid, existing component library

---

### Task 1: Update global.css for no-scroll Bloomberg layout

**Files:**
- Modify: `src/styles/global.css`

**Step 1: Add no-scroll body styles and Bloomberg density tokens**

Add to the end of the `:root`/`html` block:
```css
--font-size-xxs: 0.6rem;
```

Add after the existing `img` rule:
```css
/* Bloomberg terminal: no scroll on desktop */
@media (min-width: 769px) {
    html, body {
        height: 100vh;
        overflow: hidden;
    }
}
```

**Step 2: Verify dev server shows no scrollbar**

Run: `npm run dev` (already running)
Check: http://localhost:4321 — body should not scroll on desktop viewports.

**Step 3: Commit**
```bash
git add src/styles/global.css
git commit -m "style: add no-scroll desktop constraint and xxs font token"
```

---

### Task 2: Simplify Main.astro layout wrapper

**Files:**
- Modify: `src/layouts/Main.astro`

**Step 1: Replace the layout structure**

Remove sidebar, header, footer grid areas. The new layout is:
```
ticker (full width)
main content (fills remaining space)
status bar (full width)
```

Replace the entire `Main.astro` with:

```astro
---
import "../styles/global.css";
import StatusBar from "../components/StatusBar.astro";
import DynamicContent from "../components/DynamicContent.astro";
import MatrixEffect from "../components/Matrix.astro";
import { siteMetadata } from "../siteMetadata";
import GlitchEffect from "../components/GlitchEffect.astro";
import LiveClock from "../components/LiveClock.astro";

type Props = {
    title: string;
    last_modified: string;
};

const timeout = siteMetadata.config.matrixEffect.timeout;
const { randomMaxDelayMs, durationMs } = siteMetadata.config.fatalErrorWip;
const { title, last_modified } = Astro.props;
---

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Language" content="en" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="generator" content={Astro.generator} />
    <meta name="description" content="Daniele D'Agnelli — Senior Engagement Manager, AI & Cybersecurity. 14+ years in tech." />
    <meta property="og:title" content={title} />
    <meta property="og:description" content="Senior Engagement Manager specializing in AI deployments and cybersecurity." />
    <meta property="og:type" content="website" />
    <title>{title}</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body>
    <MatrixEffect delay={timeout} />
    <GlitchEffect randomMaxDelayMs={randomMaxDelayMs} durationMs={durationMs} />

    <div class="bloomberg">
        <div class="bloomberg__ticker"><StatusBar /></div>
        <main class="bloomberg__main">
            <DynamicContent delay={timeout}>
                <slot />
            </DynamicContent>
        </main>
        <div class="bloomberg__status">
            <span>&copy; 2025 {siteMetadata.title}</span>
            <span>last modified: {last_modified}</span>
            <span class="bloomberg__status-online">
                <span class="bloomberg__status-dot"></span>
                system online
            </span>
            <LiveClock id="statusClock" />
        </div>
    </div>
</body>
</html>

<style>
    .bloomberg {
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100vh;
        overflow: hidden;
    }

    .bloomberg__ticker {
        grid-row: 1;
    }

    .bloomberg__main {
        grid-row: 2;
        overflow: hidden;
        padding: 0.5em;
    }

    .bloomberg__status {
        grid-row: 3;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border-color);
        padding: 0.3em 1em;
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        text-transform: uppercase;
    }

    .bloomberg__status-online {
        display: flex;
        align-items: center;
        gap: 0.4em;
        color: var(--accent-secondary);
    }

    .bloomberg__status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent-secondary);
        display: inline-block;
        animation: statusPulse 2s ease-in-out infinite;
    }

    @keyframes statusPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    @media (max-width: 768px) {
        .bloomberg {
            height: auto;
            min-height: 100vh;
        }
        .bloomberg__main {
            overflow: auto;
        }
    }
</style>
```

**Step 2: Update DynamicContent to remove min-height**

In `src/components/DynamicContent.astro`, change `.dynamic__content` style:
- Remove `min-height: 60vh`
- Add `height: 100%`

**Step 3: Verify the simplified layout renders**

Check: http://localhost:4321 — should show ticker at top, content in middle, status bar at bottom. No sidebar, no header.

**Step 4: Commit**
```bash
git add src/layouts/Main.astro src/components/DynamicContent.astro
git commit -m "layout: simplify Main.astro to Bloomberg ticker/content/status structure"
```

---

### Task 3: Rewrite index.astro with Bloomberg 4-column grid

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Replace index.astro with Bloomberg grid layout**

The grid layout:
```
Col:     1          2          3          4
Row 1: [PROFILE ] [METRICS   METRICS   METRICS  ]
Row 2: [PROFILE ] [CAREER  ] [TECH    ] [TERMINAL]
Row 3: [PROFILE ] [CAREER  ] [CERTS   ] [TERMINAL]
Row 4: [PROFILE ] [EDUCATN ] [INDUSTRY] [TERMINAL]
```

```astro
---
import Main from "../layouts/Main.astro";
import ProfilePanel from "../components/ProfilePanel.astro";
import Whoami from "../components/Whoami.astro";
import Panel from "../components/Panel.astro";
import DataCard from "../components/DataCard.astro";
import Timeline from "../components/Timeline.astro";
import SkillsPanel from "../components/SkillsPanel.astro";
import { siteMetadata } from "../siteMetadata";
import { getCachedLastCommitTimestamp } from "../utils/github.js";
import { metrics, industries, certifications, skills, education } from "../data/resume";

const lastModified = await getCachedLastCommitTimestamp();
---

<Main title={`${siteMetadata.title}`} last_modified={lastModified}>
    <div class="bb-grid">
        <div class="bb-profile">
            <ProfilePanel />
        </div>
        <div class="bb-metrics">
            <Panel title="KEY METRICS" status="live">
                <div class="bb-metrics-row">
                    {metrics.map(m => <DataCard value={m.value} label={m.label} />)}
                </div>
            </Panel>
        </div>
        <div class="bb-career">
            <Panel title="CAREER">
                <Timeline compact={true} />
            </Panel>
        </div>
        <div class="bb-education">
            <Panel title="EDUCATION">
                {education.map(edu => (
                    <div class="bb-edu-entry">
                        <span class="bb-edu-degree">{edu.degree}</span>
                        <span class="bb-edu-meta">{edu.institution} // {edu.period}</span>
                        {edu.distinction && <span class="bb-edu-distinction">{edu.distinction}</span>}
                    </div>
                ))}
            </Panel>
        </div>
        <div class="bb-skills">
            <Panel title="TECH STACK">
                <SkillsPanel items={skills} />
            </Panel>
        </div>
        <div class="bb-certs">
            <Panel title="CERTIFICATIONS">
                <SkillsPanel items={certifications} />
            </Panel>
        </div>
        <div class="bb-industries">
            <Panel title="INDUSTRIES">
                <SkillsPanel items={industries} />
            </Panel>
        </div>
        <div class="bb-terminal">
            <Whoami />
        </div>
    </div>
</Main>

<style>
    .bb-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1.2fr;
        grid-template-rows: auto 1fr 1fr 1fr;
        gap: 0.5em;
        height: 100%;
    }

    /* Profile: left column, spans all rows */
    .bb-profile { grid-column: 1; grid-row: 1 / -1; }

    /* Metrics: top row, spans cols 2-4 */
    .bb-metrics { grid-column: 2 / -1; grid-row: 1; }

    /* Career: col 2, rows 2-3 */
    .bb-career { grid-column: 2; grid-row: 2 / 4; }

    /* Education: col 2, row 4 */
    .bb-education { grid-column: 2; grid-row: 4; }

    /* Tech stack: col 3, row 2 */
    .bb-skills { grid-column: 3; grid-row: 2; }

    /* Certs: col 3, row 3 */
    .bb-certs { grid-column: 3; grid-row: 3; }

    /* Industries: col 3, row 4 */
    .bb-industries { grid-column: 3; grid-row: 4; }

    /* Terminal: col 4, rows 2-4 */
    .bb-terminal { grid-column: 4; grid-row: 2 / -1; }

    .bb-metrics-row {
        display: flex;
        gap: 0.5em;
        justify-content: space-around;
    }

    .bb-edu-entry {
        display: flex;
        flex-direction: column;
        gap: 0.15em;
        margin-bottom: 0.5em;
    }

    .bb-edu-entry:last-child {
        margin-bottom: 0;
    }

    .bb-edu-degree {
        color: var(--text-primary);
        font-size: var(--font-size-sm);
    }

    .bb-edu-meta {
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
    }

    .bb-edu-distinction {
        color: var(--accent-primary);
        font-size: var(--font-size-xs);
        text-transform: uppercase;
    }

    /* Make all panels and whoami fill their grid cells */
    .bb-grid > div {
        min-height: 0;
        overflow: hidden;
    }

    .bb-grid > div > :global(.panel),
    .bb-grid > div > :global(.whoami) {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .bb-grid > div > :global(.panel) :global(.panel__content) {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
    }

    /* Mobile: single column, allow scroll */
    @media (max-width: 768px) {
        .bb-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            height: auto;
        }
        .bb-profile,
        .bb-metrics,
        .bb-career,
        .bb-education,
        .bb-skills,
        .bb-certs,
        .bb-industries,
        .bb-terminal {
            grid-column: 1;
            grid-row: auto;
        }
    }
</style>
```

**Step 2: Verify the Bloomberg grid renders correctly**

Check: http://localhost:4321 — should show dense 4-column grid filling the viewport. All panels visible without scrolling. Profile on left spanning full height, metrics across top, terminal on right.

**Step 3: Commit**
```bash
git add src/pages/index.astro
git commit -m "feat: Bloomberg 4-column grid layout for index page"
```

---

### Task 4: Make components Bloomberg-dense

**Files:**
- Modify: `src/components/DataCard.astro` — reduce padding
- Modify: `src/components/Panel.astro` — reduce padding, tighter spacing
- Modify: `src/components/SkillsPanel.astro` — smaller badges
- Modify: `src/components/Timeline.astro` — tighter spacing
- Modify: `src/components/ProfilePanel.astro` — smaller avatar, add languages
- Modify: `src/components/Whoami.astro` — ensure it fills height

**Step 1: DataCard — reduce padding for Bloomberg density**

In `src/components/DataCard.astro`, update `.data-card` styles:
```css
.data-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--panel-radius);
    padding: 0.5em;
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2em;
}

.data-card__value {
    color: var(--accent-primary);
    font-size: var(--font-size-lg);
    font-weight: bold;
    font-family: var(--font-mono);
}

.data-card__label {
    color: var(--text-secondary);
    font-size: var(--font-size-xxs);
    text-transform: uppercase;
    font-family: var(--font-mono);
}
```

**Step 2: Panel — tighter padding**

In `src/components/Panel.astro`, update:
- `.panel__title-bar` padding: `0.3em 0.6em`
- `.panel__content` padding: `0.5em`

**Step 3: SkillsPanel — smaller gaps and badges**

In `src/components/SkillsPanel.astro`, update:
- `.skills-panel` gap: `0.3em`
- `.skills-panel__badges` gap: `0.3em`
- `.skills-panel__badge` padding: `0.2em 0.4em`, font-size: `var(--font-size-xxs)`

**Step 4: Timeline — reduce spacing**

In `src/components/Timeline.astro`, update:
- `.timeline__entry` gap: `0.4em`
- `.timeline__entry + .timeline__entry` margin-top: `0.4em`
- `.timeline__period` font-size: `var(--font-size-xxs)`
- `.timeline__company` font-size: `var(--font-size-xs)`
- `.timeline__role` font-size: `var(--font-size-xs)`

**Step 5: ProfilePanel — smaller avatar, add languages**

In `src/components/ProfilePanel.astro`:
1. Import languages: add `import { languages } from "../data/resume";` to frontmatter (use .ts extension: `../data/resume`)
2. Reduce avatar to 80x80px
3. Add languages after socials:
```html
<div class="profile__languages">
    {languages.map(lang => <span class="profile__lang">{lang}</span>)}
</div>
```
4. Add styles:
```css
.profile__languages {
    display: flex;
    gap: 0.5em;
    border-top: 1px solid var(--border-color);
    padding-top: 0.5em;
    flex-wrap: wrap;
}
.profile__lang {
    color: var(--text-secondary);
    font-size: var(--font-size-xxs);
    text-transform: uppercase;
}
```

**Step 6: Whoami — ensure full height**

In `src/components/Whoami.astro`, add to `.whoami`:
```css
display: flex;
flex-direction: column;
height: 100%;
```

**Step 7: Verify all panels are compact and fit viewport**

Check: http://localhost:4321 — everything should fit in one screen without scrolling.

**Step 8: Commit**
```bash
git add src/components/DataCard.astro src/components/Panel.astro src/components/SkillsPanel.astro src/components/Timeline.astro src/components/ProfilePanel.astro src/components/Whoami.astro
git commit -m "style: make all components Bloomberg-dense with tighter spacing"
```

---

### Task 5: Add Bloomberg color-coding to panels

**Files:**
- Modify: `src/components/Panel.astro`

**Step 1: Add color prop to Panel**

Add a `color` prop that sets the top border color. This gives each section a distinct Bloomberg-style color accent.

In the frontmatter:
```typescript
type Props = {
    title: string;
    status?: string;
    fullWidth?: boolean;
    color?: 'orange' | 'green' | 'blue' | 'red';
};

const { title, status, fullWidth = false, color = 'orange' } = Astro.props;

const colorMap = {
    orange: 'var(--accent-primary)',
    green: 'var(--accent-secondary)',
    blue: 'var(--accent-tertiary)',
    red: 'var(--accent-danger)',
};
const borderColor = colorMap[color];
```

In the template, add `style={\`border-top-color: ${borderColor}\`}` to the `.panel` div.

Update the `.panel__title` style to use `color: inherit` and set it via the same mechanism:
```html
<span class="panel__title" style={`color: ${borderColor}`}>{title}</span>
```

**Step 2: Apply colors in index.astro**

Update each Panel usage:
- KEY METRICS: `color="orange"`
- CAREER: `color="green"`
- EDUCATION: `color="green"`
- TECH STACK: `color="blue"`
- CERTIFICATIONS: `color="blue"`
- INDUSTRIES: `color="red"`

ProfilePanel's internal Panel keeps default orange.

**Step 3: Verify colored panel borders**

Check: http://localhost:4321 — each section should have a distinct colored top border and matching title color.

**Step 4: Commit**
```bash
git add src/components/Panel.astro src/pages/index.astro
git commit -m "style: add Bloomberg color-coding to panel sections"
```

---

### Task 6: Remove unused pages and components

**Files:**
- Delete: `src/pages/bio.astro`
- Delete: `src/pages/blog.astro`
- Delete: `src/pages/resume.astro`
- Delete: `src/components/Header.astro`
- Delete: `src/components/SidebarNav.astro`
- Delete: `src/components/Footer.astro`
- Delete: `src/components/LastChanged.astro` (if exists)

**Step 1: Delete the files**

```bash
rm src/pages/bio.astro src/pages/blog.astro src/pages/resume.astro
rm src/components/Header.astro src/components/SidebarNav.astro src/components/Footer.astro
```

Also check if `LastChanged.astro` exists and remove it:
```bash
rm src/components/LastChanged.astro 2>/dev/null
```

**Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Clean build with no missing import errors.

**Step 3: Commit**
```bash
git add -u
git commit -m "chore: remove unused pages and components (bio, blog, resume, header, sidebar, footer)"
```

---

### Task 7: Visual polish and viewport fit verification

**Files:**
- Possibly adjust: `src/pages/index.astro`, `src/styles/global.css`, various components

**Step 1: Build and test**

Run: `npm run build && npm run preview`

**Step 2: Check viewport fit**

Open http://localhost:4321 at 1920x1080, 1440x900, and 1280x720 viewport sizes. All content must be visible without scrolling.

**Step 3: Check mobile**

At 375px width, content should stack in a single column and scrolling should work.

**Step 4: Adjust grid ratios if needed**

If panels overflow or leave too much whitespace, tune:
- `grid-template-columns` ratios in `.bb-grid`
- `grid-template-rows` ratios
- Font sizes within panels
- Panel padding

**Step 5: Final commit**
```bash
git add -A
git commit -m "style: Bloomberg terminal layout polish and viewport fit adjustments"
```
