(function() {
    const scriptTag = document.currentScript;
    const widgetKey = scriptTag.getAttribute('data-widget-key');
    const apiBaseUrl = scriptTag.getAttribute('data-api-url') || window.location.origin;
    
    if (!widgetKey) {
        console.error('Telegram Order Assistant: Missing data-widget-key');
        return;
    }

    // Create container for the floating button
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;';
    
    // Create the link that opens the tool
    const button = document.createElement('a');
    button.href = apiBaseUrl + '/tool.html?key=' + widgetKey;
    button.target = '_blank';
    button.rel = 'noreferrer';
    button.style.cssText = 'display:inline-block;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;';
    
    // Create the image element
    const img = document.createElement('img');
    img.src = apiBaseUrl + '/widget-icon.png';
    img.alt = 'Telegram Order Assistant';
    img.style.cssText = 'width:60px;height:60px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.15);cursor:pointer;';
    
    // Add hover effects
    button.onmouseover = function() { 
        this.style.transform = 'scale(1.1)';
        this.querySelector('img').style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
    };
    button.onmouseout = function() { 
        this.style.transform = 'scale(1)';
        this.querySelector('img').style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
