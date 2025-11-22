// 插件名称
const EXTENSION_NAME = "st_uno_game";

// 使用立即执行函数，不依赖 import
(async function() {
    console.log("🚀 [UNO] 插件加载中...");

    // 1. 简单的等待函数
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 2. 等待酒馆核心加载 (最长等待 10 秒)
    let attempts = 0;
    while (!window.SillyTavern && !window.jQuery && attempts < 20) {
        await delay(500);
        attempts++;
    }

    if (!window.jQuery) {
        console.error("❌ [UNO] jQuery 未加载，插件停止运行");
        return;
    }

    const $ = window.jQuery;

    // 3. 注入 CSS (直接写在 JS 里，避免 fetch 或 import.meta 报错)
    const cssStyles = `
        #uno-launch-btn {
            position: fixed; top: 10px; right: 100px; z-index: 20000;
            width: 35px; height: 35px;
            background: rgba(0,0,0,0.6); color: white;
            border: 1px solid rgba(255,255,255,0.3); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 1.2em; transition: 0.2s;
        }
        #uno-launch-btn:hover { background: #000; transform: scale(1.1); border-color: gold; }
        
        #uno-main-view {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 300px; padding: 20px;
            background: rgba(20, 20, 30, 0.95); 
            border: 1px solid #444; border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            z-index: 20001; color: #eee; text-align: center;
            display: none;
        }
        .uno-btn {
            margin-top: 15px; padding: 8px 20px;
            background: #2a4; color: white; border: none; border-radius: 5px;
            cursor: pointer; font-size: 14px;
        }
    `;
    $('head').append(`<style>${cssStyles}</style>`);

    // 4. 注入 HTML
    if ($('#uno-launch-btn').length === 0) {
        $('body').append(`
            <div id="uno-launch-btn" title="UNO">🎲</div>
            <div id="uno-main-view">
                <h3 style="margin:0 0 15px 0; border-bottom:1px solid #555; padding-bottom:10px;">UNO 游戏台</h3>
                <p>当前角色: <b id="uno-char-name" style="color:gold">...</b></p>
                <button id="uno-test-action" class="uno-btn">测试连接</button>
                <div style="position:absolute; top:5px; right:10px; cursor:pointer;" id="uno-close">❌</div>
            </div>
        `);
    }

    // 5. 绑定事件
    $(document).on('click', '#uno-launch-btn', function() {
        // 尝试获取角色名
        let charName = "未找到";
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            if (ctx.characterId && ctx.characters) {
                charName = ctx.characters[ctx.characterId].name;
            }
        }
        $('#uno-char-name').text(charName);
        $('#uno-main-view').fadeIn();
    });

    $(document).on('click', '#uno-close', function() {
        $('#uno-main-view').fadeOut();
    });

    $(document).on('click', '#uno-test-action', function() {
        alert("🎉 成功！代码运行正常！");
    });

    console.log("✅ [UNO] 启动成功");
})();
