// Lovable Monitor - Optimizer Integration Script
// Add this to your Lovable Optimizer page to receive real-time analysis from the extension

class LovableMonitorIntegration {
  constructor() {
    this.currentAnalysis = null;
    this.listeners = [];
  }

  init() {
    // Listen for messages from the extension
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'lovable_analysis') {
        this.handleAnalysisUpdate(event.data.analysis);
      }
    });

    // Also listen via chrome.runtime if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'lovable_analysis') {
          this.handleAnalysisUpdate(request.analysis);
        }
      });
    }

    console.log('[Lovable Monitor] Optimizer integration initialized');
  }

  handleAnalysisUpdate(analysis) {
    this.currentAnalysis = analysis;
    console.log('[Lovable Monitor] Received analysis:', analysis);

    // Notify all listeners
    this.listeners.forEach(callback => {
      callback(analysis);
    });

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('lovableAnalysisUpdated', {
      detail: analysis
    }));
  }

  /**
   * Subscribe to analysis updates
   * @param {Function} callback - Called with analysis object when updated
   */
  onAnalysisUpdate(callback) {
    this.listeners.push(callback);
  }

  /**
   * Get current analysis
   */
  getCurrentAnalysis() {
    return this.currentAnalysis;
  }

  /**
   * Request analysis from extension
   */
  requestAnalysis() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'getAnalysis' }, (response) => {
        if (response && response.analysis) {
          this.handleAnalysisUpdate(response.analysis);
        }
      });
    }
  }

  /**
   * Enhance prompt based on current analysis
   */
  enhancePromptWithAnalysis(userPrompt) {
    if (!this.currentAnalysis) return userPrompt;

    const analysis = this.currentAnalysis;
    const enhancements = [];

    // Add component context
    if (analysis.components && analysis.components.length > 0) {
      enhancements.push(
        `I noticed you have ${analysis.components.join(', ')} components.`
      );
    }

    // Add aesthetic context
    if (analysis.aesthetic && analysis.aesthetic.types && analysis.aesthetic.types.length > 0) {
      enhancements.push(
        `Your current design uses a ${analysis.aesthetic.types.join(' and ')} aesthetic.`
      );
    }

    // Add layout context
    if (analysis.layout && analysis.layout.columns) {
      enhancements.push(
        `You're using a ${analysis.layout.columns.replace(/_/g, ' ')} layout.`
      );
    }

    // Add color context
    if (analysis.colorPalette && analysis.colorPalette.length > 0) {
      enhancements.push(
        `Consider maintaining your current color palette.`
      );
    }

    // Combine with user prompt
    if (enhancements.length > 0) {
      return `${userPrompt}\n\n[Context from Lovable Monitor: ${enhancements.join(' ')}]`;
    }

    return userPrompt;
  }

  /**
   * Get a credit-saving suggestion based on analysis
   */
  getCreditSavingSuggestion(userPrompt) {
    if (!this.currentAnalysis) return null;

    const analysis = this.currentAnalysis;
    const lowerPrompt = userPrompt.toLowerCase();

    // Check for redundant requests
    if (analysis.components) {
      if ((lowerPrompt.includes('hero') || lowerPrompt.includes('hero section')) &&
          analysis.components.includes('hero_section')) {
        return '💰 Credit-Saving Tip: You already have a hero section. Use Edit to modify it instead of creating a new one.';
      }

      if ((lowerPrompt.includes('form') || lowerPrompt.includes('input')) &&
          analysis.components.includes('form')) {
        return '💰 Credit-Saving Tip: You already have a form. Use Edit to adjust it instead of creating a new one.';
      }

      if ((lowerPrompt.includes('nav') || lowerPrompt.includes('navigation')) &&
          analysis.components.includes('navigation')) {
        return '💰 Credit-Saving Tip: You already have navigation. Use Edit to customize it instead of creating a new one.';
      }

      if ((lowerPrompt.includes('button') || lowerPrompt.includes('cta')) &&
          analysis.components.includes('buttons')) {
        return '💰 Credit-Saving Tip: You already have buttons. Use Edit to restyle them instead of creating new ones.';
      }
    }

    // Check for aesthetic consistency
    if (analysis.aesthetic && analysis.aesthetic.types && analysis.aesthetic.types.length > 0) {
      const aesthetic = analysis.aesthetic.types[0];
      if (!lowerPrompt.includes(aesthetic) && !lowerPrompt.includes('minimal') &&
          !lowerPrompt.includes('premium') && !lowerPrompt.includes('bold')) {
        return `💰 Consistency Tip: Specify "${aesthetic}" aesthetic to match your current design.`;
      }
    }

    return null;
  }
}

// Global instance
window.lovableMonitor = new LovableMonitorIntegration();
window.lovableMonitor.init();

// Example usage in your Lovable Optimizer:
//
// // Get real-time updates
// lovableMonitor.onAnalysisUpdate((analysis) => {
//   console.log('Analysis updated:', analysis);
//   // Update UI with analysis info
// });
//
// // Enhance a prompt with context
// const userPrompt = "Create a button";
// const enhancedPrompt = lovableMonitor.enhancePromptWithAnalysis(userPrompt);
//
// // Get credit-saving suggestions
// const suggestion = lovableMonitor.getCreditSavingSuggestion(userPrompt);
// if (suggestion) {
//   showToast(suggestion);
// }
