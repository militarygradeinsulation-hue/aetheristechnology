

# Add HubSpot Meeting Scheduler to Contact Page

## What We'll Build
Add the HubSpot meetings embed below the existing contact section on the Contact page, giving visitors a second way to reach out — by booking a meeting directly.

## Changes

### 1. Create `src/components/HubSpotMeeting.tsx`
- A component that loads the HubSpot meetings embed script and renders the `meetings-iframe-container` div
- Uses `useEffect` to dynamically inject the `MeetingsEmbedCode.js` script on mount and clean it up on unmount
- Wrapped in a styled section with a heading like "Book a Meeting" for context

### 2. Modify `src/pages/ContactPage.tsx`
- Import and render `<HubSpotMeeting />` between the `<Contact />` component and `<Footer />`

## Technical Details
- The HubSpot script (`MeetingsEmbedCode.js`) is loaded dynamically via a `<script>` tag appended to `document.body` inside a `useEffect`, ensuring it only runs client-side
- The `data-src` attribute on the container div points to `https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true`
- No database or backend changes needed

