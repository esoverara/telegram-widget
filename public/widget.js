(function() {
    const scriptTag = document.currentScript;
    const widgetKey = scriptTag.getAttribute('data-widget-key');
    const apiBaseUrl = scriptTag.getAttribute('data-api-url') || window.location.origin;
    
    if (!widgetKey) {
        console.error('Telegram Order Assistant: Missing data-widget-key');
        return;
    }

    // Create a simple floating button that opens the tool in a new tab
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;';
    
    const button = document.createElement('a');
    button.href = apiBaseUrl + '/tool.html?key=' + widgetKey;
    button.target = '_blank';
    button.rel = 'noreferrer';
    button.style.cssText = 'display:inline-block;background:#0088cc;color:white;text-decoration:none;border-radius:50px;padding:12px 24px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:background 0.2s;';
    button.innerHTML = '💬 Telegram Order Assistant';
    button.onmouseover = function() { this.style.background = '#0077b5'; };
    button.onmouseout = function() { this.style.background = '#0088cc'; };
    
    container.appendChild(button);
    document.body.appendChild(container);
})();
