# Add Logo

Replace the current `Globe` icon + text wordmark in `SiteHeader` with the uploaded brand logo.

## Steps

1. Copy `user-uploads://ChatGPT_Image_May_18_2026_12_58_57_PM.png` → `src/assets/logo.png`.
2. In `src/routes/index.tsx`:
   - Import: `import logo from "@/assets/logo.png"`.
   - Replace the header's `<Globe>` icon + "Weltweiturlaub.de" span with `<img src={logo} alt="Weltweiturlaub.de — Reise planen in 2 Minuten" className="h-10 w-auto" />`.
   - Remove the now-unused `Globe` import.
3. Optional: also use the logo in the `Footer` as a small mark above the tagline.

No other changes — chat, packages, APIs untouched.
