

## What you're asking

Replace the current Vimeo video of Joseph Toney on the About page with the new MP4 you just uploaded (`video_2026-04-20_13-48-31.mp4`).

## Where the video appears today

The CEO video lives in `src/components/CEOProfile.tsx` (Vimeo iframe ID `1169431542`), embedded in a circular avatar frame on `/about`. It autoplays, loops, and is muted with a click-to-unmute button.

## The plan

### 1. Add the uploaded MP4 as a project asset
- Copy `user-uploads://video_2026-04-20_13-48-31.mp4` → `src/assets/joseph-toney-intro.mp4`
- Imported as an ES module so Vite bundles + hashes it (matches the existing `crm-demo-video.mp4` pattern already in `src/assets/`).

### 2. Swap the Vimeo iframe for a native `<video>` element in `CEOProfile.tsx`
- Replace the entire `<iframe src="https://player.vimeo.com/video/1169431542...">` block with:
  ```tsx
  <video
    src={josephToneyVideo}
    autoPlay
    muted
    loop
    playsInline
    poster={josephToney}  // existing JPG as fallback frame
    className="absolute inset-0 w-full h-full object-cover"
  />
  ```
- Keep the circular crop, amber border, and the existing mute toggle button — but rewire it to flip `videoEl.muted` instead of swapping iframe src params (cleaner, no reload flash).
- Drop the now-unused Vimeo-specific `padding: 100% 0 0 0` wrapper since `<video>` handles aspect ratio with the parent's `aspect-square`-equivalent box.

### 3. Leave everything else alone
- `OperatorBio.tsx` (the new forensic bio on `/about`) keeps using the still photo `joseph-toney.jpg` — the photo there reads better in the case-file aesthetic than a looping video. Confirm if you want that one swapped to video too.
- `Services.tsx` Vimeo embeds (services explainers, not Joseph) — untouched.
- `LeakAuditPage` HubSpot link — untouched.

## Files touched

**Created**
- `src/assets/joseph-toney-intro.mp4` (copied from upload)

**Edited**
- `src/components/CEOProfile.tsx` (Vimeo iframe → native `<video>` with new asset; mute button rewired)

## Validation

- Load `/about` (or wherever `CEOProfile` is mounted) → new video autoplays muted in the circular avatar frame, loops cleanly.
- Click the speaker button → audio toggles without a reload flash.
- Network tab → no request to `player.vimeo.com/video/1169431542`; one request for the bundled `joseph-toney-intro.[hash].mp4`.
- Mobile Safari → `playsInline` keeps it inside the frame instead of forcing fullscreen.

## One quick question before I build

The `OperatorBio` block on `/about` (the forensic operator dossier) currently uses the **still photo**. Want me to also swap that to the new video, or keep the still there and only update the `CEOProfile` component? Default if you don't reply: still photo stays in `OperatorBio`, video only replaces in `CEOProfile`.

