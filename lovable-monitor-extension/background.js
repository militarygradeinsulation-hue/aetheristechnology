// Lovable Monitor Background Service Worker
// Handles screenshots, storage, and communication

class LovableMonitor {
  constructor() {
    this.currentAnalysis = null;
    this.analysisHistory = [];
    this.isMonitoring = false;
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.checkActiveTab();
    });

    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) {
        this.checkActiveTab();
      }
    });

    console.log('[Lovable Monitor] Background service worker initialized');
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'updateAnalysis':
        this.handleAnalysisUpdate(request.analysis, sender.tab.id);
        break;

      case 'getAnalysis':
        this.getAnalysis(sendResponse);
        break;

      case 'getAnalysisHistory':
        this.getAnalysisHistory(sendResponse);
        break;

      case 'captureScreenshot':
        this.captureScreenshot(sendResponse);
        break;

      case 'startMonitoring':
        this.startMonitoring(sendResponse);
        break;

      case 'stopMonitoring':
        this.stopMonitoring(sendResponse);
        break;

      case 'getStatus':
        sendResponse({
          isMonitoring: this.isMonitoring,
          currentAnalysis: this.currentAnalysis,
          historyCount: this.analysisHistory.length
        });
        break;
    }

    return true; // Keep channel open for async response
  }

  handleAnalysisUpdate(analysis, tabId) {
    this.currentAnalysis = {
      ...analysis,
      tabId: tabId,
      capturedAt: new Date().toISOString()
    };

    // Keep last 50 analyses in history
    this.analysisHistory.unshift(this.currentAnalysis);
    if (this.analysisHistory.length > 50) {
      this.analysisHistory.pop();
    }

    // Save to storage
    chrome.storage.local.set({
      currentAnalysis: this.currentAnalysis,
      analysisHistory: this.analysisHistory
    });

    // Notify all listening tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'analysisUpdated',
          analysis: this.currentAnalysis
        }).catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
      });
    });
  }

  getAnalysis(sendResponse) {
    sendResponse({ analysis: this.currentAnalysis });
  }

  getAnalysisHistory(sendResponse) {
    sendResponse({ history: this.analysisHistory });
  }

  async captureScreenshot(sendResponse) {
    try {
      const tab = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab[0]) {
        sendResponse({ error: 'No active tab' });
        return;
      }

      const screenshot = await chrome.tabs.captureVisibleTab(tab[0].windowId, {
        format: 'png'
      });

      if (this.currentAnalysis) {
        this.currentAnalysis.screenshot = screenshot;
        chrome.storage.local.set({ currentAnalysis: this.currentAnalysis });
      }

      sendResponse({ screenshot: screenshot });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  startMonitoring(sendResponse) {
    this.isMonitoring = true;
    sendResponse({ status: 'monitoring' });
  }

  stopMonitoring(sendResponse) {
    this.isMonitoring = false;
    sendResponse({ status: 'stopped' });
  }

  checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) return;

      const isLovable = activeTab.url && (
        activeTab.url.includes('lovable.dev') ||
        activeTab.url.includes('lovable.app')
      );

      chrome.storage.local.set({ activeTabIsLovable: isLovable });
    });
  }
}

// Initialize monitor
const monitor = new LovableMonitor();
monitor.init();
