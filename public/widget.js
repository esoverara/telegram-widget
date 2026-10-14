(function() {
    const scriptTag = document.currentScript;
    const widgetKey = scriptTag.getAttribute('data-widget-key');
    const apiBaseUrl = scriptTag.getAttribute('data-api-url') || window.location.origin;
    if (!widgetKey) return;

    const host = document.createElement('div');
    host.id = 'toa-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; font-family: -apple-system, sans-serif; }
        .toa-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; }
        .toa-button { background: #0088cc; color: white; border: none; border-radius: 50px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .toa-button:hover { background: #0077b5; }
        .toa-popup { position: absolute; bottom: 70px; right: 0; width: 650px; max-width: 95vw; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: none; flex-direction: column; border: 1px solid #e5e7eb; }
        .toa-popup.open { display: flex; }
        .toa-header { background: #0088cc; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .toa-header h3 { margin: 0; font-size: 16px; }
        .toa-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .toa-body { padding: 16px; max-height: 75vh; overflow-y: auto; }
        .toa-textarea { width: 100%; height: 120px; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 13px; box-sizing: border-box; }
        .toa-btn { background: #0088cc; color: white; border: none; border-radius: 6px; padding: 10px 16px; font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; margin-top: 10px; }
        .toa-btn:hover { background: #0077b5; }
        .toa-btn:disabled { background: #9ca3af; cursor: not-allowed; }
        .toa-btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .toa-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
        .toa-table th { text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280; }
        .toa-table td { padding: 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .toa-status-verified { color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .toa-status-review { color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .toa-status-error { color: #dc2626; background: #fee2e2; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .toa-select { padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; width: 100%; }
        .toa-output { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; white-space: pre-wrap; margin-top: 10px; max-height: 200px; overflow-y: auto; }
        .toa-help { font-size: 12px; color: #6b7280; margin-top: 8px; }
        .toa-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .toa-message { padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; }
        .toa-message-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .hidden { display: none !important; }
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'toa-container';
    container.innerHTML = `
        <button class="toa-button" id="toaToggle">💬 Telegram Order Assistant</button>
        <div class="toa-popup" id="toaPopup">
            <div class="toa-header">
                <h3 id="toaTitle">Telegram Order Assistant</h3>
                <button class="toa-close" id="toaClose">&times;</button>
            </div>
            <div class="toa-body">
                <div id="toaConfigMessage" class="toa-message toa-message-error hidden"></div>
                <label style="font-size:13px; font-weight:600; display:block; margin-bottom:6px;">Paste Targets & Quantities</label>
                <textarea class="toa-textarea" id="toaInput" placeholder="https://t.me/uletnaya_semya 100&#10;@juteunbot 50"></textarea>
                <div class="toa-help">Format: [Link or @username] [Quantity]. One per line.</div>
                <button class="toa-btn" id="toaAnalyze">Analyze Targets</button>
                <div id="toaResults" class="hidden">
                    <table class="toa-table">
                        <thead><tr><th>Target</th><th>Qty</th><th>Detected Type</th><th>Status</th><th>Service ID</th></tr></thead>
                        <tbody id="toaTableBody"></tbody>
                    </table>
                    <button class="toa-btn" id="toaGenerate" style="margin-top:16px;">Generate Mass Orders</button>
                </div>
                <div id="toaOutputSection" class="hidden">
                    <label style="font-size:13px; font-weight:600; display:block; margin-top:16px; margin-bottom:6px;">Generated Orders (Ready to Copy)</label>
                    <div class="toa-output" id="toaOutput"></div>
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        <button class="toa-btn" id="toaCopyAll" style="flex:1;">Copy All</button>
                        <button class="toa-btn toa-btn-secondary" id="toaReset" style="flex:1;">Reset</button>
                    </div>
                    <div id="toaWarning" class="toa-message toa-message-error hidden" style="margin-top:10px;"></div>
                </div>
            </div>
        </div>
    `;
    shadow.appendChild(container);

    let resellerConfig = null;
    let parsedRows = [];
    const els = {
        toggle: shadow.getElementById('toaToggle'), popup: shadow.getElementById('toaPopup'), close: shadow.getElementById('toaClose'),
        title: shadow.getElementById('toaTitle'), configMsg: shadow.getElementById('toaConfigMessage'), input: shadow.getElementById('toaInput'),
        analyzeBtn: shadow.getElementById('toaAnalyze'), results: shadow.getElementById('toaResults'), tableBody: shadow.getElementById('toaTableBody'),
        generateBtn: shadow.getElementById('toaGenerate'), outputSection: shadow.getElementById('toaOutputSection'), output: shadow.getElementById('toaOutput'),
        copyAllBtn: shadow.getElementById('toaCopyAll'), resetBtn: shadow.getElementById('toaReset'), warning: shadow.getElementById('toaWarning')
    };

    async function loadConfig() {
        try {
            const res = await fetch(apiBaseUrl + '/api/config?key=' + widgetKey);
            if (!res.ok) throw new Error('Failed to load');
            resellerConfig = await res.json();
            els.title.textContent = 'Order Assistant: ' + resellerConfig.name;
        } catch (e) {
            els.configMsg.textContent = 'Error: Invalid key or disabled. Contact website owner.';
            els.configMsg.classList.remove('hidden');
            els.analyzeBtn.disabled = true;
        }
    }
    loadConfig();

    els.toggle.addEventListener('click', () => els.popup.classList.toggle('open'));
    els.close.addEventListener('click', () => els.popup.classList.remove('open'));

    function getServiceId(type, quantity) {
        if (!resellerConfig) return null;
        if (type === 'TG_BOT') return resellerConfig.tg_bot_id;
        if (type === 'TG_BOT_START') return resellerConfig.tg_bot_start_id;
        if (type === 'TG_POST') return resellerConfig.tg_post_id;
        if (type === 'MAX_POST') return resellerConfig.max_post_id;
        if (type === 'MAX_CHANNEL') return resellerConfig.max_channel_id;
        if (type === 'TG_GROUP') return resellerConfig.tg_group_id;
        if (type === 'TG_CHANNEL') return (quantity > 100000) ? resellerConfig.tg_channel_large_id : resellerConfig.tg_channel_id;
        return null;
    }

    els.analyzeBtn.addEventListener('click', async () => {
        if (!resellerConfig) return;
        els.analyzeBtn.disabled = true;
        els.analyzeBtn.innerHTML = '<span class="toa-spinner"></span> Analyzing...';
        els.results.classList.add('hidden');
        els.outputSection.classList.add('hidden');

        const lines = els.input.value.trim().split('\n');
        parsedRows = [];
        els.tableBody.innerHTML = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const lastSpace = line.lastIndexOf(' ');
            let target, quantity, error = null;
            if (lastSpace === -1) { target = line; quantity = null; error = 'Missing quantity'; }
            else {
                target = line.substring(0, lastSpace).trim();
                quantity = parseInt(line.substring(lastSpace + 1).trim(), 10);
                if (isNaN(quantity) || quantity <= 0) error = 'Invalid quantity';
            }

            const row = { target, quantity, error, status: 'PENDING', serviceId: null, detectedType: null };
            parsedRows.push(row);

            const tr = document.createElement('tr');
            if (error) {
                tr.innerHTML = `<td style="word-break:break-all;">${target}</td><td>${quantity || '-'}</td><td>-</td><td><span class="toa-status-error">Invalid</span></td><td>-</td>`;
                row.status = 'INVALID';
                els.tableBody.appendChild(tr);
            } else {
                tr.innerHTML = `<td style="word-break:break-all;">${target}</td><td>${quantity}</td><td id="type-${i}">Detecting...</td><td id="status-${i}"><span class="toa-spinner"></span></td><td id="service-${i}">-</td>`;
                els.tableBody.appendChild(tr);

                try {
                    const res = await fetch(apiBaseUrl + '/api/detect', { 
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ target, quantity }) 
                    });
                    const detect = await res.json();
                    row.detectedType = detect.type;
                    row.status = detect.type === 'UNKNOWN' ? 'PENDING_MANUAL' : 'VERIFIED';
                    row.serviceId = getServiceId(detect.type, quantity);

                    const typeCell = shadow.getElementById('type-' + i);
                    const statusCell = shadow.getElementById('status-' + i);
                    const serviceCell = shadow.getElementById('service-' + i);

                    if (detect.type !== 'UNKNOWN') {
                        let typeLabel = detect.type.replace('TG_', 'Telegram ').replace('MAX_', 'MAX.RU ');
                        if (detect.type === 'TG_CHANNEL' && quantity > 100000) typeLabel += ' (>100k)';
                        typeCell.textContent = typeLabel;
                        statusCell.innerHTML = '<span class="toa-status-verified">Verified</span>';
                        serviceCell.textContent = row.serviceId || 'Missing Config';
                        if (!row.serviceId) statusCell.innerHTML = '<span class="toa-status-error">No ID Configured</span>';
                    } else {
                        typeCell.innerHTML = `<select class="toa-select" onchange="window.updateManualType(${i}, this.value)"><option value="">Select Type...</option><option value="TG_CHANNEL">Telegram Channel</option><option value="TG_GROUP">Telegram Group</option><option value="TG_BOT">Telegram Bot</option><option value="TG_BOT_START">Telegram Bot (Start)</option><option value="TG_POST">Telegram Post</option><option value="MAX_CHANNEL">MAX.RU Channel</option><option value="MAX_POST">MAX.RU Post</option></select>`;
                        statusCell.innerHTML = '<span class="toa-status-review">Manual Review</span>';
                        serviceCell.textContent = '-';
                    }
                } catch (e) {
                    shadow.getElementById('status-' + i).innerHTML = '<span class="toa-status-error">Network Error</span>';
                }
            }
        }

        els.analyzeBtn.disabled = false;
        els.analyzeBtn.textContent = 'Analyze Targets';
        els.results.classList.remove('hidden');
    });

    window.updateManualType = function(index, type) {
        if (!type) return;
        const row = parsedRows[index];
        row.detectedType = type;
        row.status = 'MANUAL_SELECTED';
        row.serviceId = getServiceId(type, row.quantity);
        
        const serviceCell = shadow.getElementById('service-' + index);
        serviceCell.textContent = row.serviceId || 'Missing Config';
        const statusCell = shadow.getElementById('status-' + index);
        statusCell.innerHTML = row.serviceId ? '<span class="toa-status-verified">Manual OK</span>' : '<span class="toa-status-error">No ID Configured</span>';
    };

    els.generateBtn.addEventListener('click', () => {
        const validRows = parsedRows.filter(r => r.serviceId && !r.error && r.status !== 'PENDING_MANUAL');
        const invalidCount = parsedRows.length - validRows.length;
        els.output.textContent = validRows.map(r => r.serviceId + '|' + r.target + '|' + r.quantity).join('\n');
        if (invalidCount > 0) {
            els.warning.textContent = 'Warning: ' + invalidCount + ' row(s) excluded due to errors or pending manual review.';
            els.warning.classList.remove('hidden');
        } else {
            els.warning.classList.add('hidden');
        }
        els.outputSection.classList.remove('hidden');
    });

    els.copyAllBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(els.output.textContent).then(() => {
            els.copyAllBtn.textContent = '✓ Copied!';
            setTimeout(() => els.copyAllBtn.textContent = 'Copy All', 2000);
        });
    });

    els.resetBtn.addEventListener('click', () => {
        els.input.value = '';
        els.results.classList.add('hidden');
        els.outputSection.classList.add('hidden');
        parsedRows = [];
    });
})();
