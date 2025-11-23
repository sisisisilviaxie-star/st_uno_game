// =================================================
// 📡 UNO 云端连接器 (Local Loader)
// 作用：只负责去 GitHub 下载最新代码，本身不含游戏逻辑
// =================================================

const EXTENSION_NAME = "st_uno_game";

// ✅ 你的 GitHub 仓库地址 (请确认用户名和仓库名正确)
// 使用 jsDelivr 加速 CDN
const USER = "sisisisilviaxie-star";
const REPO = "st_uno_game";
const BRANCH = "main";

const REMOTE_SCRIPT = `https://cdn.jsdelivr.net/gh/${USER}/${REPO}@${BRANCH}/core.js`;
const REMOTE_CSS = `https://cdn.jsdelivr.net/gh/${USER}/${REPO}@${BRANCH}/style.css`;

(async function() {
    console.log(`🚀 [UNO] 正在连接云端引擎... (${REMOTE_SCRIPT})`);

    // 1. 等待酒馆核心环境就绪
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    let attempts = 0;
    while ((!window.SillyTavern || !window.jQuery) && attempts < 30) {
        await delay(500);
        attempts++;
    }
    if (!window.jQuery) {
        console.error("❌ [UNO] jQuery 未加载，无法启动。");
        return;
    }

    // 2. 清理旧的残留 (如果有)
    // 这一步保证了我们从“悬浮球模式”切换到“楼层模式”时，旧按钮会被删掉
    $('#uno-launch-btn, #uno-main-view, #uno-cloud-css').remove();

    // 3. 加载云端样式表 (CSS)
    // 加上时间戳 ?t=... 是为了防止 CDN 缓存，让你每次更新 GitHub 后能立刻看到效果
    const link = document.createElement("link");
    link.id = "uno-cloud-css";
    link.rel = "stylesheet";
    link.href = `${REMOTE_CSS}?t=${Date.now()}`; 
    document.head.appendChild(link);

    // 4. 加载并执行云端核心代码 (JS)
    try {
        const response = await fetch(`${REMOTE_SCRIPT}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const scriptContent = await response.text();
        
        // 使用 Function 构造器安全地执行云端代码
        // 我们把 window.SillyTavern 和 jQuery 传进去，方便云端代码调用
        const runCloudGame = new Function('SillyTavern', '$', scriptContent);
        runCloudGame(window.SillyTavern, window.jQuery);
        
        console.log("✅ [UNO] 云端引擎同步成功！");
        if(window.toastr) toastr.success("UNO 组件已就绪", "系统消息");

    } catch (err) {
        console.error("❌ [UNO] 云端加载失败:", err);
        alert(`UNO 插件无法连接 GitHub CDN。\n请检查网络或仓库地址。\n错误: ${err.message}`);
    }
})();
