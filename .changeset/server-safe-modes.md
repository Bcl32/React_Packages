---
"@bcl32/themes": minor
"@bcl32/utils": minor
"@bcl32/navigation": minor
"@bcl32/command-palette": minor
---

feat: opt-in server-safe modes for prerendered pages, defaults unchanged. themes: `ThemeProvider gated` reads localStorage and matchMedia after mount, not during render, and ThemeGenerator imports SimpleDialog by subpath instead of the utils barrel. utils: `useIsMobile({ ssr: true })` returns false on the first render; StatusBanner guards `import.meta.env?.DEV`. navigation and command-palette: the react-router-dom peer accepts `^6.22.0 || ^7.0.0` (no code change; server-render tests under both lines).
