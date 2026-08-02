// Lovable Monitor Content Script
// Analyzes Lovable projects and sends context to the extension

class LovableAnalyzer {
  constructor() {
    this.analysisInterval = null;
    this.lastAnalysis = null;
  }

  init() {
    console.log('[Lovable Monitor] Initialized on', window.location.href);
    this.startAnalysis();
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getAnalysis') {
        sendResponse({ analysis: this.lastAnalysis });
      }
      if (request.action === 'startMonitoring') {
        this.startAnalysis();
        sendResponse({ status: 'monitoring' });
      }
      if (request.action === 'stopMonitoring') {
        this.stopAnalysis();
        sendResponse({ status: 'stopped' });
      }
    });
  }

  startAnalysis() {
    if (this.analysisInterval) return;

    // Initial analysis
    this.analyze();

    // Analyze every 3 seconds
    this.analysisInterval = setInterval(() => {
      this.analyze();
    }, 3000);
  }

  stopAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  analyze() {
    const analysis = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      pageTitle: document.title,
      components: this.detectComponents(),
      aesthetic: this.detectAesthetic(),
      colorPalette: this.extractColors(),
      typography: this.extractTypography(),
      layout: this.detectLayout(),
      pageSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    this.lastAnalysis = analysis;

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'updateAnalysis',
      analysis: analysis
    }).catch(err => {
      // Ignore errors if background script isn't ready
    });
  }

  detectComponents() {
    const components = [];

    // Hero sections
    if (this.findElements('hero, [class*="hero"], h1 + p', 5)) {
      components.push('hero_section');
    }

    // Navigation
    if (this.findElements('nav, [class*="navbar"], [class*="navigation"]', 3)) {
      components.push('navigation');
    }

    // Cards
    if (this.findElements('[class*="card"], [class*="component"], article', 3)) {
      components.push('cards');
    }

    // Forms
    if (this.findElements('form, input, textarea, [class*="form"]', 2)) {
      components.push('form');
    }

    // Buttons
    if (this.findElements('button, [class*="btn"], [class*="cta"]', 3)) {
      components.push('buttons');
    }

    // Images
    if (this.findElements('img, [style*="background-image"]', 3)) {
      components.push('images');
    }

    // Modal/Dialog
    if (this.findElements('[class*="modal"], [class*="dialog"], [class*="popup"]', 1)) {
      components.push('modal');
    }

    // Footer
    if (this.findElements('footer, [class*="footer"]', 1)) {
      components.push('footer');
    }

    // Dashboard/Charts
    if (this.findElements('[class*="chart"], [class*="graph"], svg', 2)) {
      components.push('charts');
    }

    return [...new Set(components)];
  }

  detectAesthetic() {
    const aesthetic = {
      confidence: 0,
      types: []
    };

    const bodyText = document.body.innerText.toLowerCase();
    const htmlText = document.documentElement.innerHTML.toLowerCase();
    const fullContext = bodyText + ' ' + htmlText;

    // Check for design keywords
    if (/minimal|clean|simple|minimalist|white\s*space|spacious/.test(fullContext)) {
      aesthetic.types.push('minimal');
    }

    if (/premium|luxury|elegant|sophisticated|upscale/.test(fullContext)) {
      aesthetic.types.push('premium');
    }

    if (/bold|vibrant|expressive|dynamic|energetic|colorful/.test(fullContext)) {
      aesthetic.types.push('bold');
    }

    if (/playful|fun|casual|friendly|modern|trendy/.test(fullContext)) {
      aesthetic.types.push('playful');
    }

    // Analyze visual properties
    const styles = this.getComputedStyles();

    if (styles.hasHighContrast && styles.hasMinimalColors) {
      aesthetic.types.push('minimal');
    }

    if (styles.hasPastelColors || styles.hasLuxuryFonts) {
      aesthetic.types.push('premium');
    }

    if (styles.hasVibrantColors) {
      aesthetic.types.push('bold');
    }

    aesthetic.types = [...new Set(aesthetic.types)];
    aesthetic.confidence = Math.min(100, aesthetic.types.length * 30);

    return aesthetic;
  }

  extractColors() {
    const colors = new Set();
    const elements = document.querySelectorAll('*');

    let count = 0;
    for (let el of elements) {
      if (count > 100) break; // Limit to avoid performance issues

      const computed = window.getComputedStyle(el);
      const bgColor = computed.backgroundColor;
      const textColor = computed.color;

      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
        colors.add(bgColor);
      }
      if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
        colors.add(textColor);
      }

      count++;
    }

    return Array.from(colors).slice(0, 10);
  }

  extractTypography() {
    const fonts = new Set();
    const sizes = new Set();

    const elements = document.querySelectorAll('h1, h2, h3, h4, p, span, button');
    let count = 0;

    for (let el of elements) {
      if (count > 50) break;

      const computed = window.getComputedStyle(el);
      const fontFamily = computed.fontFamily;
      const fontSize = computed.fontSize;

      if (fontFamily) fonts.add(fontFamily);
      if (fontSize) sizes.add(fontSize);

      count++;
    }

    return {
      families: Array.from(fonts).slice(0, 5),
      sizes: Array.from(sizes).slice(0, 5)
    };
  }

  detectLayout() {
    const main = document.querySelector('main') || document.body;
    const computed = window.getComputedStyle(main);

    return {
      display: computed.display,
      maxWidth: computed.maxWidth,
      gridColumns: computed.gridTemplateColumns,
      columns: this.guessColumnLayout()
    };
  }

  guessColumnLayout() {
    const width = window.innerWidth;
    if (width < 768) return '1_column';
    if (width < 1024) return '2_column';
    return '3_plus_column';
  }

  getComputedStyles() {
    const body = document.body;
    const computed = window.getComputedStyle(body);

    const bgColor = computed.backgroundColor;
    const textColor = computed.color;

    return {
      hasHighContrast: this.hasHighContrast(bgColor, textColor),
      hasMinimalColors: this.countUniqueColors() < 5,
      hasVibrantColors: this.hasVibrantColors(),
      hasPastelColors: this.hasPastelColors(),
      hasLuxuryFonts: this.hasLuxuryFonts()
    };
  }

  hasHighContrast(bg, text) {
    // Simple check - would need proper contrast ratio calculation for production
    return (bg.includes('rgb(255') && text.includes('rgb(0')) ||
            (bg.includes('rgb(0') && text.includes('rgb(255'));
  }

  countUniqueColors() {
    return new Set(this.extractColors()).size;
  }

  hasVibrantColors() {
    const colors = this.extractColors();
    return colors.some(c => {
      const match = c.match(/\d+/g);
      if (!match || match.length < 3) return false;
      const [r, g, b] = match.map(Number);
      const sum = r + g + b;
      return sum > 600; // Bright colors
    });
  }

  hasPastelColors() {
    const colors = this.extractColors();
    return colors.some(c => {
      const match = c.match(/\d+/g);
      if (!match || match.length < 3) return false;
      const [r, g, b] = match.map(Number);
      return r > 200 && g > 200 && b > 200;
    });
  }

  hasLuxuryFonts() {
    const fonts = this.extractTypography().families.join(' ').toLowerCase();
    const luxuryFonts = ['georgia', 'garamond', 'serif', 'playfair', 'bodoni'];
    return luxuryFonts.some(f => fonts.includes(f));
  }

  findElements(selector, minCount = 1) {
    try {
      return document.querySelectorAll(selector).length >= minCount;
    } catch {
      return false;
    }
  }
}

// Initialize analyzer
const analyzer = new LovableAnalyzer();
analyzer.init();
