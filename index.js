// import { extensions } from "../../../script.js";

// 你的专属 CDN 地址
const CDN_BASE = "https://cdn.jsdelivr.net/gh/sisisisilviaxie-star/st-uno-game@main/";

(function() {
    console.log("🎲 UNO 云插件正在启动...");

    // 加载 CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    // 加时间戳避免缓存，方便你后续更新样式
    link.href = `${CDN_BASE}style.css?v=${Date.now()}`;
    document.head.appendChild(link);

    // 加载核心 JS
    const script = document.createElement("script");
    script.src = `${CDN_BASE}core.js?v=${Date.now()}`;
    script.type = "module";
    script.async = true;
    
    script.onload = () => {
        console.log("✅ UNO 游戏核心已从云端加载完毕！");
        // 这里的 toast 是 ST 内置的提示功能，如果报错说明 ST 版本差异，可以注释掉
        if(typeof toastr !== 'undefined') toastr.success("UNO 游戏资源加载成功");
    };

    script.onerror = () => {
        console.error("❌ 无法从 CDN 加载 UNO 游戏文件，请检查 GitHub 仓库或网络。");
    };

    document.body.appendChild(script);
})();
