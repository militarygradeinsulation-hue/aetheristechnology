// Lovable Monitor Popup Script

class PopupController {
  constructor() {
    this.currentAnalysis = null;
    this.isMonitoring = false;
    this.setupElements();
    this.setupEventListeners();
    this.init();
  }

  setupElements() {
    this.elements = {
      statusBadge: document.getElementById('statusBadge'),
      monitoringStatus: document.getElementById('monitoringStatus'),
      lastUpdate: document.getElementById('lastUpdate'),
      projectUrl: document.getElementById('projectUrl'),
      analysisSection: document.getElementById('analysisSection'),
      components: document.getElementById('components'),
      aesthetic: document.getElementById('aesthetic'),
      layoutType: document.getElementById('layoutType'),
      colorPalette: document.getElementById('colorPalette'),
      fonts: document.getElementById('fonts'),
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      screenshotBtn: document.getElementById('screenshotBtn'),
      copyBtn: document.getElementById('copyBtn'),
      sendToOptimizerBtn: document.getElementById('sendToOptimizerBtn')
    };
  }

  setupEventListeners() {
    this.elements.startBtn.addEventListener('click', () => this.startMonitoring());
    this.elements.stopBtn.addEventListener('click', () => this.stopMonitoring());
    this.elements.screenshotBtn.addEventListener('click', () => this.captureScreenshot());
    this.elements.copyBtn.addEventListener('click', () => this.copyAnalysis());
    this.elements.sendToOptimizerBtn.addEventListener('click', () => this.sendToOptimizer());
  }

  async init() {
    // Get initial status
    await this.updateStatus();

    // Refresh every 2 seconds
    setInterval(() => this.updateStatus(), 2000);
  }

  async updateStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (!response) return;

      this.isMonitoring = response.isMonitoring;
      this.currentAnalysis = response.currentAnalysis;

      // Update buttons
      this.elements.startBtn.disabled = this.isMonitoring;
      this.elements.stopBtn.disabled = !this.isMonitoring;

      // Update status
      this.elements.monitoringStatus.textContent = this.isMonitoring ? '✅ Active' : '⏸️ Inactive';
      this.elements.statusBadge.textContent = this.isMonitoring ? 'Active' : 'Inactive';
      this.elements.statusBadge.className = `status-badge ${this.isMonitoring ? 'active' : 'inactive'}`;

      if (this.currentAnalysis) {
        this.displayAnalysis(this.currentAnalysis);
      }
    });
  }

  displayAnalysis(analysis) {
    if (!analysis) return;

    // Show analysis section
    this.elements.analysisSection.style.display = 'block';

    // Update basic info
    this.elements.lastUpdate.textContent = new Date(analysis.timestamp).toLocaleTimeString();
    const urlMatch = analysis.url.match(/lovable\.app\/[^\/]*/);
    this.elements.projectUrl.textContent = urlMatch ? urlMatch[0] : analysis.url;

    // Components
    this.displayTags(this.elements.components, analysis.components || []);

    // Aesthetic
    const aestheticTags = analysis.aesthetic?.types || [];
    this.displayTags(this.elements.aesthetic, aestheticTags);

    // Layout
    this.elements.layoutType.textContent = analysis.layout?.columns || '—';

    // Colors
    this.displayColorPalette(analysis.colorPalette || []);

    // Fonts
    this.displayFonts(analysis.typography || {});
  }

  displayTags(container, tags) {
    container.innerHTML = '';
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = this.formatTag(tag);
      container.appendChild(span);
    });
    if (tags.length === 0) {
      container.textContent = 'None detected';
    }
  }

  displayColorPalette(colors) {
    this.elements.colorPalette.innerHTML = '';
    colors.slice(0, 6).forEach(color => {
      const div = document.createElement('div');
      div.className = 'color-swatch';
      div.style.backgroundColor = color;
      div.title = color;
      this.elements.colorPalette.appendChild(div);
    });
  }

  displayFonts(typography) {
    this.elements.fonts.innerHTML = '';
    if (typography.families && typography.families.length > 0) {
      const text = typography.families.slice(0, 3).join(', ');
      this.elements.fonts.textContent = this.sanitizeFontName(text);
    } else {
      this.elements.fonts.textContent = 'System fonts';
    }
  }

  formatTag(tag) {
    return tag
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  sanitizeFontName(font) {
    return font.replace(/['"`]/g, '').split(',')[0].trim();
  }

  startMonitoring() {
    chrome.runtime.sendMessage({ action: 'startMonitoring' }, () => {
      this.updateStatus();
    });
  }

  stopMonitoring() {
    chrome.runtime.sendMessage({ action: 'stopMonitoring' }, () => {
      this.updateStatus();
    });
  }

  captureScreenshot() {
    chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
      if (response.error) {
        alert('Could not capture screenshot: ' + response.error);
      } else {
        alert('Screenshot captured!');
      }
    });
  }

  copyAnalysis() {
    if (!this.currentAnalysis) {
      alert('No analysis to copy');
      return;
    }

    const text = this.formatAnalysisForCopy(this.currentAnalysis);
    navigator.clipboard.writeText(text).then(() => {
      alert('Analysis copied to clipboard!');
    }).catch(() => {
      alert('Could not copy to clipboard');
    });
  }

  formatAnalysisForCopy(analysis) {
    const lines = [
      '📊 Lovable Monitor Analysis',
      `Time: ${new Date(analysis.timestamp).toLocaleString()}`,
      `Project: ${analysis.url}`,
      '',
      '🎨 Components:',
      analysis.components?.join(', ') || 'None detected',
      '',
      '🌈 Aesthetic:',
      analysis.aesthetic?.types?.join(', ') || 'Not detected',
      '',
      '📐 Layout:',
      analysis.layout?.columns || 'Unknown',
      '',
      '🎨 Colors:',
      analysis.colorPalette?.slice(0, 5)?.join(', ') || 'None',
      '',
      '✍️ Fonts:',
      analysis.typography?.families?.slice(0, 3)?.join(', ') || 'System'
    ];

    return lines.join('\n');
  }

  sendToOptimizer() {
    if (!this.currentAnalysis) {
      alert('No analysis to send. Start monitoring first.');
      return;
    }

    // Create message for optimizer
    const message = {
      type: 'lovable_analysis',
      analysis: this.currentAnalysis,
      timestamp: new Date().toISOString()
    };

    // Send to all tabs (Lovable Optimizer will listen)
    chrome.tabs.query({}, (tabs) => {
      let sent = false;
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab doesn't have listener
        });
        if (tab.url && tab.url.includes('prompt-forge-ai')) {
          sent = true;
        }
      });

      if (sent) {
        alert('✅ Analysis sent to Lovable Optimizer!');
      } else {
        alert('Open your Lovable Optimizer to receive the analysis');
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
