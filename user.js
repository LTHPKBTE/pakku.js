// ==UserScript==
// @name         Pakku 已删除弹幕查看器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  通过与Pakku插件通信，获取并展示被合并/删除的弹幕列表，并按原因进行分类、高亮和展示。
// @author       Your Name
// @match        *://www.bilibili.com/video/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- 样式定义 ---
GM_addStyle(`
    #pakku-deleted-viewer-btn {
        position: fixed;
        right: 20px;
        bottom: 80px;
        z-index: 9999;
        padding: 8px 12px;
        background-color: #2a2a32; /* 暗色按钮背景 */
        color: #c4c4d2; /* 柔和文字颜色 */
        border: 1px solid #4a4a52; /* 边框 */
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        font-size: 14px;
        transition: background-color 0.2s;
    }
    #pakku-deleted-viewer-btn:hover {
        background-color: #3a3a42;
    }
    #pakku-deleted-viewer-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80vw;
        max-width: 800px;
        height: 70vh;
        background-color: #202124; /* 面板主背景色 */
        border: 1px solid #4a4a52; /* 面板边框 */
        border-radius: 8px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #e8eaed; /* 全局默认文字颜色 */
    }
    .pakku-panel-header {
        padding: 10px 15px;
        background-color: #28292d; /* 标题栏背景 */
        border-bottom: 1px solid #4a4a52; /* 标题栏下边框 */
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 8px 8px 0 0;
    }
    .pakku-panel-header h3 {
        margin: 0;
        font-size: 16px;
        color: #e8eaed; /* 标题文字颜色 */
    }
    .pakku-panel-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #9aa0a6; /* 关闭按钮颜色 */
    }
    .pakku-panel-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 15px;
        background-color: #202124; /* 内容区背景 */
    }
    .pakku-reason-group {
        margin-bottom: 15px;
        border: 1px solid #3c4043; /* 分组边框 */
        border-radius: 4px;
        background-color: #28292d; /* 分组背景 */
    }
    .pakku-reason-header {
        padding: 10px;
        background-color: transparent; /* 透明背景，由父元素决定 */
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        transition: background-color 0.2s;
    }
    .pakku-reason-header:hover {
        background-color: #3c4043;
    }
    .pakku-reason-title {
        font-weight: bold;
        color: #8ab4f8; /* 柔和的蓝色标题 */
    }
    .pakku-reason-title code {
        background-color: #3c4043; /* code块背景 */
        color: #f89a9b; /* 柔和的粉色代码文字 */
        padding: 2px 5px;
        border-radius: 3px;
        font-family: "SF Mono", "Courier New", Courier, monospace;
    }
    .pakku-reason-count {
        color: #9aa0a6; /* 计数器文字颜色 */
        font-size: 12px;
    }
    .pakku-danmaku-list {
        display: none;
        padding: 0;
        margin: 0;
        list-style: none;
        border-top: 1px solid #3c4043; /* 分割线 */
    }
    .pakku-danmaku-item {
        padding: 8px 12px;
        border-bottom: 1px solid #303134; /* 弹幕条目分割线 */
        display: flex;
        align-items: flex-start;
    }
    .pakku-danmaku-item:last-child {
        border-bottom: none;
    }
    .pakku-danmaku-meta {
        flex-shrink: 0;
        width: 180px;
        font-size: 12px;
        color: #bdc1c6; /* 元信息文字颜色 */
    }
    .pakku-danmaku-meta div {
        white-space: nowrap;
    }
    .pakku-danmaku-content {
        flex-grow: 1;
        word-break: break-all;
        color: #e8eaed; /* 弹幕内容文字颜色 */
    }
    /* --- 柔和化高亮 --- */
    .pakku-danmaku-content .highlight {
        background-color: rgba(138, 180, 248, 0.3); /* 柔和的蓝色背景，半透明 */
        color: #d2e3fc; /* 提亮的文字颜色 */
        padding: 1px 2px;
        border-radius: 3px;
        font-weight: normal; /* 去掉加粗，更柔和 */
    }
    .pakku-subtitle-tag {
        background-color: #5f6368; /* 更暗的标签背景 */
        color: #e8eaed;
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 3px;
        margin-left: 5px;
        vertical-align: middle;
    }
    #pakku-status-msg {
        text-align: center;
        color: #9aa0a6; /* 状态提示文字颜色 */
        padding: 20px;
    }
`);

    // --- HTML Elements ---
    const toggleButton = document.createElement('button');
    toggleButton.id = 'pakku-deleted-viewer-btn';
    toggleButton.textContent = '查看删除弹幕';
    document.body.appendChild(toggleButton);

    const panel = document.createElement('div');
    panel.id = 'pakku-deleted-viewer-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <div class="pakku-panel-header">
            <h3>Pakku 已删除弹幕列表</h3>
            <button class="pakku-panel-close-btn">×</button>
        </div>
        <div class="pakku-panel-content">
            <div id="pakku-status-msg">点击按钮获取数据...</div>
        </div>
    `;
    document.body.appendChild(panel);

    const contentDiv = panel.querySelector('.pakku-panel-content');
    const closeButton = panel.querySelector('.pakku-panel-close-btn');
    let isDataLoaded = false;

    // --- Event Handlers ---
    toggleButton.addEventListener('click', () => {
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
            if (!isDataLoaded) {
                requestDeletedDanmaku();
            }
        } else {
            panel.style.display = 'none';
        }
    });

    closeButton.addEventListener('click', () => {
        panel.style.display = 'none';
    });

    // --- Core Logic ---
    function requestDeletedDanmaku() {
        contentDiv.innerHTML = '<div id="pakku-status-msg">正在向 Pakku 插件请求数据...</div>';
        console.log('[Pakku Viewer] 正在向 Pakku 插件请求被合并的弹幕...');
        window.dispatchEvent(new CustomEvent('pakku:getDeletedDanmaku'));
    }

    window.addEventListener('pakku:deletedDanmakuResponse', (event) => {
        console.log('[Pakku Viewer] 收到响应:', event.detail);
        if (event.detail.error) {
            contentDiv.innerHTML = `<div id="pakku-status-msg">获取数据失败: ${event.detail.error}</div>`;
            return;
        }

        const xmlString = event.detail.data;
        if (!xmlString || !xmlString.trim()) {
            contentDiv.innerHTML = '<div id="pakku-status-msg">没有找到被删除的弹幕。</div>';
            return;
        }

        try {
            const groupedDanmaku = parseAndGroupDanmaku(xmlString);
            renderGroupedDanmaku(groupedDanmaku);
            isDataLoaded = true;
        } catch (e) {
            console.error('[Pakku Viewer] 解析或渲染弹幕时出错:', e);
            contentDiv.innerHTML = `<div id="pakku-status-msg">解析弹幕数据时出错: ${e.message}</div>`;
        }
    });

    function parseAndGroupDanmaku(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const danmakuNodes = xmlDoc.getElementsByTagName('d');
        const grouped = {};

        for (const node of danmakuNodes) {
            const p = node.getAttribute('p').split(',');
            const deletedReason = node.getAttribute('pakku_deleted_reason') || '未知原因';
            const content = node.textContent;

            const danmaku = {
                time_ms: parseInt(p[0]),
                mode: parseInt(p[1]),
                // fontsize: parseInt(p[2]),
                // color: parseInt(p[3]),
                sendtime: parseInt(p[4]),
                pool: parseInt(p[7]),
                content: content,
                reason: deletedReason,
            };

            let groupKey;
            let keyword;
            if (deletedReason.startsWith('命中黑名单： ')) {
                groupKey = deletedReason;
                keyword = deletedReason.replace('命中黑名单： ', '');
            } else {
                groupKey = '其他原因';
                keyword = deletedReason; // Use the full reason as keyword for 'others'
            }

            if (!grouped[groupKey]) {
                grouped[groupKey] = { danmaku: [], keyword: keyword };
            }
            grouped[groupKey].danmaku.push(danmaku);
        }

        // Sort danmaku within each group by video time
        for (const key in grouped) {
            grouped[key].danmaku.sort((a, b) => a.time_ms - b.time_ms);
        }

        return grouped;
    }

    function renderGroupedDanmaku(grouped) {
        contentDiv.innerHTML = ''; // Clear previous content

        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === '其他原因') return 1;
            if (b === '其他原因') return -1;
            return grouped[b].danmaku.length - grouped[a].danmaku.length;
        });

        for (const groupKey of sortedKeys) {
            const group = grouped[groupKey];
            const groupDiv = document.createElement('div');
            groupDiv.className = 'pakku-reason-group';

            const titleText = groupKey === '其他原因' ? '其他原因' : `命中黑名单： <code>${escapeHtml(group.keyword)}</code>`;

            groupDiv.innerHTML = `
                <div class="pakku-reason-header">
                    <span class="pakku-reason-title">${titleText}</span>
                    <span class="pakku-reason-count">${group.danmaku.length} 条</span>
                </div>
                <ul class="pakku-danmaku-list"></ul>
            `;

            const list = groupDiv.querySelector('.pakku-danmaku-list');
            group.danmaku.forEach(d => {
                list.appendChild(createDanmakuItem(d, group.keyword));
            });

            groupDiv.querySelector('.pakku-reason-header').addEventListener('click', (e) => {
                const targetList = e.currentTarget.nextElementSibling;
                targetList.style.display = targetList.style.display === 'block' ? 'none' : 'block';
            });

            contentDiv.appendChild(groupDiv);
        }
    }

    function createDanmakuItem(danmaku, keyword) {
        const item = document.createElement('li');
        item.className = 'pakku-danmaku-item';

        const videoTime = formatTime(danmaku.time_ms);
        const sendTime = new Date(danmaku.sendtime * 1000).toLocaleString();
        const modeText = getModeText(danmaku.mode);
        const subtitleTag = danmaku.pool === 1 ? '<span class="pakku-subtitle-tag">字幕</span>' : '';

        const highlightedContent = highlightKeyword(danmaku.content, keyword);

        item.innerHTML = `
            <div class="pakku-danmaku-meta">
                <div><strong>视频内:</strong> ${videoTime}</div>
                <div><strong>发送于:</strong> ${sendTime}</div>
            </div>
            <div class="pakku-danmaku-content">
                ${highlightedContent}
                <span style="color: #9499a0; font-size: 12px;">(${modeText})</span>
                ${subtitleTag}
            </div>
        `;
        return item;
    }

    // --- Helper Functions ---
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function getModeText(mode) {
        const modes = { 1: "滚动", 4: "底部", 5: "顶部", 6: "逆向", 7: "特殊", 8: "代码", 9: "BAS" };
        return modes[mode] || `未知(${mode})`;
    }


    function highlightKeyword(content, keyword) {
        content = escapeHtml(content);
        if (!keyword) return content;

        try {
            if (keyword.startsWith('/') && keyword.endsWith('/')) {
                // 正则表达式
                const regexPattern = keyword.slice(1, -1);
                const regex = new RegExp(regexPattern, 'g');
                return content.replace(regex, (match) => `<span class="highlight">${match}</span>`);
            } else {
                // 普通字符串
                // 使用 replaceAll 的 polyfill 思想，用 split 和 join 实现全局替换
                return content.split(escapeHtml(keyword)).join(`<span class="highlight">${escapeHtml(keyword)}</span>`);
            }
        } catch(e) {
            // 如果正则表达式无效，则作为普通文本处理
            console.warn(`[Pakku Viewer] 无效的正则表达式: ${keyword}`, e);
            return content.split(escapeHtml(keyword)).join(`<span class="highlight">${escapeHtml(keyword)}</span>`);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

})();