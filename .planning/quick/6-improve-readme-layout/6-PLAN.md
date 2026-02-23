---
phase: quick
plan: 6
type: execute
wave: 1
depends_on: []
files_modified: [README.md]
autonomous: true
requirements: [QUICK-6]

must_haves:
  truths:
    - "README has a visual hero section with a screenshot of the app"
    - "Tech stack is presented in a structured table, not a flat comma list"
    - "Features section uses visual structure with clear hierarchy"
    - "README looks polished and professional when rendered on GitHub"
  artifacts:
    - path: "README.md"
      provides: "Polished project README"
      contains: "OpenFGA Viewer"
    - path: "docs/screenshot.png"
      provides: "App screenshot for README hero"
  key_links:
    - from: "README.md"
      to: "docs/screenshot.png"
      via: "markdown image embed"
      pattern: "!\\[.*\\]\\(docs/screenshot\\.png\\)"
---

<objective>
Improve the README layout to make it visually polished and professional on GitHub.

Purpose: The current README is functional but visually flat — comma-separated tech stack, no screenshot, no visual hierarchy. A well-structured README improves first impressions and communicates project quality.
Output: Updated README.md with hero screenshot, structured sections, and improved visual layout.
</objective>

<execution_context>
@/Users/thedoc/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thedoc/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@README.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Capture app screenshot for README hero</name>
  <files>docs/screenshot.png</files>
  <action>
    Use Playwright (already in devDependencies) to capture a screenshot of the live app at https://openfga-viewer.vercel.app.

    Write a small inline Playwright script that:
    1. Navigates to https://openfga-viewer.vercel.app
    2. Waits for the graph canvas to be fully rendered (wait for `.react-flow__renderer` element, then a 2-second settle delay for ELK layout to complete)
    3. Takes a full-page screenshot at 1280x720 viewport
    4. Saves to `docs/screenshot.png`

    Run the script via `npx playwright install chromium` (if needed) then execute the script. Delete the script after capture — only keep the PNG.

    The screenshot should show the default FGA model rendered as a graph with the editor panel visible, giving viewers an immediate sense of what the tool does.
  </action>
  <verify>
    <automated>test -f docs/screenshot.png && file docs/screenshot.png | grep -q PNG && echo "PASS" || echo "FAIL"</automated>
    <manual>Open docs/screenshot.png and confirm it shows the app with a rendered graph</manual>
  </verify>
  <done>docs/screenshot.png exists, is a valid PNG, and shows the OpenFGA Viewer app with a rendered authorization graph</done>
</task>

<task type="auto">
  <name>Task 2: Restructure README with improved visual layout</name>
  <files>README.md</files>
  <action>
    Rewrite README.md with the following structure and improvements. Keep all existing content but reorganize and enhance presentation:

    **1. Header section (keep existing, minor tweaks):**
    - Keep title, subtitle, badges, and live demo link as-is
    - Add the screenshot immediately after the live demo link as a hero image: `![OpenFGA Viewer screenshot](docs/screenshot.png)` — make it a clickable link to the live demo

    **2. Features section — use a visual grid with bold labels:**
    Instead of a plain bullet list, use a structure with bold feature names and descriptions:
    ```
    - **DSL Editor** — Inline FGA editor with syntax highlighting and autocomplete
    - **Graph Visualization** — Interactive dependency graph powered by React Flow and ELK layout
    ```
    Keep all 6 existing features. Reword slightly for punchiness if needed (keep concise).

    **3. Getting Started section (rename from "Building from Source"):**
    - Rename to "Getting Started" — more inviting
    - Keep prerequisites and commands exactly as-is
    - Combine the two code blocks into one with comments separating clone/install from run commands

    **4. Tech Stack section — convert to a table:**
    Replace the flat comma-separated line with a compact table:

    | Category | Technology |
    |----------|-----------|
    | Framework | React 19 + TypeScript 5.9 |
    | Build | Vite 7 |
    | Graph | React Flow v12 + elkjs |
    | State | Zustand 5 |
    | Editor | CodeMirror 6 |
    | Styling | Tailwind CSS v4 |

    **5. Contributing section (NEW — brief, inviting):**
    Add a short contributing section between Tech Stack and Author:
    ```
    Contributions welcome! Open an issue or submit a PR.
    ```
    Keep it to 1-2 lines. No elaborate contributing guide.

    **6. Author and License sections:**
    - Keep Author as-is
    - Keep License as-is

    **Formatting rules:**
    - Use `---` horizontal rules between major sections (after hero, before Author) for visual separation
    - Do NOT use HTML tables or complex HTML — stick to standard GitHub-flavored Markdown
    - Do NOT add emojis
    - Keep the overall tone professional and concise
  </action>
  <verify>
    <automated>grep -q "screenshot" README.md && grep -q "Getting Started" README.md && grep -q "| Category" README.md && grep -q "Contributing" README.md && echo "PASS" || echo "FAIL"</automated>
    <manual>View README.md on GitHub (or local markdown preview) and confirm visual polish</manual>
  </verify>
  <done>README.md contains hero screenshot, restructured features with bold labels, "Getting Started" section, tech stack table, and contributing section. All original content preserved, no information lost.</done>
</task>

</tasks>

<verification>
- README.md renders correctly in GitHub-flavored Markdown
- Screenshot displays properly (relative path from repo root)
- All original information is preserved (features, commands, tech stack, author, license)
- No broken links or image references
</verification>

<success_criteria>
- docs/screenshot.png exists and shows the app
- README.md has hero screenshot, structured features, tech stack table, Getting Started section
- `npm run build` still passes (no source changes)
</success_criteria>

<output>
After completion, create `.planning/quick/6-improve-readme-layout/6-SUMMARY.md`
</output>
