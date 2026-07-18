# Lovable Monitor - Browser Extension

A Chrome/Firefox browser extension that monitors your Lovable projects in real-time and provides context to your Lovable Prompt Optimizer.

## Features

✅ **Real-Time Analysis**
- Detects components (hero, forms, cards, navigation, etc.)
- Identifies design aesthetic (minimal, premium, bold, playful)
- Analyzes colors, fonts, and layout patterns
- Updates every 2-3 seconds

✅ **Smart Context**
- Captures what you're building in Lovable
- Shares visual context with your optimizer
- Prevents credit-wasting redundant prompts
- Suggests using Edit vs. new prompts

✅ **Easy Integration**
- Simple popup UI to view current analysis
- One-click send to Lovable Optimizer
- Copy analysis to clipboard
- Screenshot capture

## Installation (Chrome)

1. **Download/Extract Files**
   - Save the extension folder to your computer
   - Keep all files together in one folder

2. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)

3. **Load Extension**
   - Click **Load unpacked**
   - Select the lovable-monitor-extension folder
   - Extension should now appear with icon in toolbar

4. **Grant Permissions**
   - Chrome will ask for permissions to access Lovable pages
   - Click **Allow** to enable monitoring

## Installation (Firefox)

1. **Open Firefox Add-ons**
   - Go to `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on**
   - Select `manifest.json` from the extension folder

2. **Test Installation**
   - Open any Lovable project
   - Click the extension icon in toolbar
   - Should show "Monitoring" status

## Usage

### Basic Workflow

1. **Open Lovable Project**
   - Go to your Lovable project (lovable.dev or your-project.lovable.app)

2. **Start Monitoring**
   - Click extension icon in toolbar
   - Click "Start Monitoring" button
   - Extension analyzes page every 2-3 seconds

3. **View Analysis**
   - See detected components, colors, fonts
   - Check detected aesthetic and layout
   - View all analyzed data in popup

4. **Send to Optimizer**
   - Open your Lovable Optimizer in another tab
   - Click "📤 Send to Lovable Optimizer" button
   - Optimizer receives real-time context

### Advanced Features

**Capture Screenshot**
- Click "Capture Screenshot" button
- Stores current page screenshot
- Use for reference or debugging

**Copy Analysis**
- Click "Copy Analysis" button
- Copies formatted analysis to clipboard
- Paste into notes or share with team

**Monitor Multiple Projects**
- Works with any Lovable project URL
- Automatically detects when you switch tabs
- Keeps analysis synchronized

## Integration with Lovable Optimizer

### Option 1: Auto-Integration (Recommended)

Add this to your Lovable Optimizer HTML:

```html
<script src="https://your-domain.com/optimizer-integration.js"></script>
```

Then in your Lovable Optimizer code:

```javascript
// Listen for analysis updates
lovableMonitor.onAnalysisUpdate((analysis) => {
  console.log('New analysis:', analysis);
  // Update your UI
  updatePromptPreview(analysis);
});

// Enhance prompts with context
const userPrompt = "Create a hero section";
const enhanced = lovableMonitor.enhancePromptWithAnalysis(userPrompt);
// Use enhanced prompt for better optimization

// Get credit-saving suggestions
const suggestion = lovableMonitor.getCreditSavingSuggestion(userPrompt);
if (suggestion) {
  showToast(suggestion);
}
```

### Option 2: Manual Integration

The extension sends messages that your Lovable Optimizer can listen to:

```javascript
// Listen for analysis updates from extension
window.addEventListener('lovableAnalysisUpdated', (event) => {
  const analysis = event.detail;
  console.log('Analysis received:', analysis);
});
```

## How It Works

### Analysis Types

**Components Detected:**
- hero_section - Hero banners with headline + CTA
- navigation - Nav bars, headers
- cards - Card components, tiles
- form - Forms, inputs, validation
- buttons - CTA buttons, actions
- images - Image containers, media
- modal - Modals, dialogs, popups
- footer - Footers, bottom sections
- charts - Analytics, data visualization

**Aesthetics Detected:**
- minimal - Clean, simple, spacious designs
- premium - Luxury, elegant, sophisticated
- bold - Vibrant, expressive, energetic
- playful - Fun, casual, friendly, modern

**Layout Types:**
- 1_column - Mobile-style single column
- 2_column - Tablet-style two columns
- 3_plus_column - Desktop multi-column

### Data Collected

Per analysis:
- Component types present
- Detected aesthetic and confidence
- Color palette (up to 10 colors)
- Typography (font families, sizes)
- Layout type
- Page dimensions
- Timestamp

All data stored locally in browser storage.

## Performance

- Minimal CPU/memory impact
- Analyzes in background
- 2-3 second refresh interval (adjustable)
- No external API calls
- Works offline

## Privacy

- ✅ All analysis happens locally in your browser
- ✅ No data sent to external servers (except to your own Lovable Optimizer)
- ✅ No tracking or analytics
- ✅ Clear cache with browser data deletion

## Troubleshooting

### Extension Not Detecting Lovable

**Solution:** Make sure you're on a valid Lovable URL:
- `https://lovable.dev/...`
- `https://your-project.lovable.app`
- `https://*.lovable.app`

### Analysis Not Updating

**Solution:** Click "Start Monitoring" button or refresh the page

### Can't Send to Optimizer

**Solution:** 
- Make sure Lovable Optimizer tab is open
- Optimizer must include `optimizer-integration.js`
- Both tabs must be in same browser window

### Low Analysis Accuracy

**Solution:**
- Give extension time to analyze (wait 5+ seconds)
- Refresh Lovable page to reset analysis
- Components only detect if clearly visible on page

## File Structure

```
lovable-monitor-extension/
├── manifest.json              # Extension configuration
├── content.js                 # Page analyzer (runs in Lovable)
├── background.js              # Background service worker
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup interaction logic
├── popup.css                  # Popup styling
├── optimizer-integration.js   # Integration for Lovable Optimizer
└── README.md                  # This file
```

## Development

To modify the extension:

1. Edit files as needed
2. Go to `chrome://extensions/`
3. Click refresh button on Lovable Monitor
4. Changes take effect immediately

Common modifications:
- **Change analysis interval**: Edit `content.js` line 23 (currently 3000ms)
- **Add new component detectors**: Add to `detectComponents()` method
- **Customize aesthetic keywords**: Edit arrays in `detectAesthetic()`
- **Change colors extracted**: Modify `extractColors()` limit (line 61, currently 10)

## Support

For issues or feature requests:
- Check that you're on a supported Lovable URL
- Verify extension has proper permissions
- Check browser console for errors (F12)
- Make sure latest Chrome/Firefox version

## License

MIT - Feel free to modify and distribute

## Credits

Built to enhance the Lovable Prompt Optimizer workflow.

---

**Happy building!** 🎨

The extension monitors your work so your Lovable Optimizer can give smarter prompts and save you credits.
