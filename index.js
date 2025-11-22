// 插件配置
const EXTENSION_NAME = "st_uno_game";
const VERSION = "1.0.0";

(async function() {
    // --- 1. 热重载清理 (关键步骤！) ---
    // 如果页面上已经有了我们的按钮（说明是更新或重复加载），先删掉旧的
    // 这样就能实现“更新后立即生效”而不用刷新页面
    $('#uno-launch-btn').remove();
    $('#uno-main-view').remove();
    $('style[id="uno-css"]').remove(); // 清理旧 CSS

    console.log(`🚀 [UNO] 插件 v${VERSION} 正在热加载...`);

    // --- 2. 等待环境就绪 ---
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let attempts = 0;
    while ((!window.SillyTavern || !window.jQuery) && attempts < 30) {
        await delay(200);
        attempts++;
    }
    if (!window.jQuery) return;
    const $ = window.jQuery;

    // --- 3. 注入 CSS (带 ID 方便清理) ---
    const cssStyles = `
        /* 启动悬浮球 */
        #uno-launch-btn {
            position: fixed; top: 60px; right: 20px; z-index: 20000;
            width: 45px; height: 45px;
            background: rgba(0,0,0,0.8); color: gold;
            border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 24px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            transition: transform 0.2s, background 0.2s;
            backdrop-filter: blur(2px);
        }
        #uno-launch-btn:active { transform: scale(0.9); }
        #uno-launch-btn:hover { background: black; border-color: gold; }
        
        /* 主界面 */
        #uno-main-view {
            position: fixed; 
            top: 120px; left: 20px; right: 20px;
            width: auto; max-width: 400px; margin: 0 auto;
            height: auto; max-height: 70vh;
            
            background: rgba(30, 35, 45, 0.98); 
            border: 1px solid #555; border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.9);
            z-index: 29999; 
            display: none; overflow: hidden;
            display: flex; flex-direction: column;
            animation: uno-fade-in 0.2s ease-out;
        }
        @keyframes uno-fade-in { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); }}

        /* 标题栏 */
        .uno-header {
            padding: 15px; background: #222;
            border-bottom: 1px solid #444;
            display: flex; justify-content: space-between; align-items: center;
            cursor: move; touch-action: none; /* 关键：防触摸冲突 */
        }
        .uno-title { font-weight: bold; color: #eee; letter-spacing: 1px; }
        
        /* 关闭按钮 */
        .uno-close {
            width: 30px; height: 30px; background: #333;
            border-radius: 50%; text-align: center; line-height: 30px;
            cursor: pointer; color: #ff5555; font-weight: bold;
        }

        /* 内容滚动区 */
        .uno-scroll-area {
            flex: 1; overflow-y: auto; padding: 20px;
            text-align: center;
        }

        /* 按钮组 */
        .uno-btn {
            width: 100%; padding: 12px; margin-top: 10px;
            background: linear-gradient(45deg, #2a9d8f, #264653);
            border: none; border-radius: 8px;
            color: white; font-weight: bold; font-size: 16px;
            box-shadow: 0 4px 0 #1a3a4a;
        }
        .uno-btn:active { transform: translateY(4px); box-shadow: none; }
    `;
    $('head').append(`<style id="uno-css">${cssStyles}</style>`);

    // --- 4. 注入 HTML ---
    $('body').append(`
        <div id="uno-launch-btn" title="UNO">🎲</div>
        
        <div id="uno-main-view">
            <div class="uno-header" id="uno-drag-handle">
                <span class="uno-title">UNO 对战</span>
                <div class="uno-close">✕</div>
            </div>
            
            <div class="uno-scroll-area">
                <div style="font-size: 40px; margin-bottom: 10px;">🎴</div>
                <h3 id="uno-player-display" style="color: gold; margin: 5px 0;">...</h3>
                <p style="color: #888; font-size: 12px; margin-bottom: 20px;">VS AI</p>
                
                <div id="uno-msg-box" style="background:#222; padding:10px; border-radius:8px; font-size:13px; color:#aaa; min-height:40px;">
                    等待开始...
                </div>

                <button class="uno-btn" id="uno-start-btn">发牌</button>
                <button class="uno-btn" id="uno-reload-btn" style="background:#444; box-shadow:0 4px 0 #222; margin-top:8px;">刷新插件</button>
            </div>
        </div>
    `);

    // --- 5. 拖拽功能 (复用之前的完美逻辑) ---
    const makeDraggable = (el, handle) => {
        let isDragging = false, startX, startY, initialLeft, initialTop;
        const start = (e) => {
            const evt = e.type === 'touchstart' ? e.touches[0] : e;
            isDragging = true; startX = evt.clientX; startY = evt.clientY;
            const rect = el.getBoundingClientRect();
            initialLeft = rect.left; initialTop = rect.top;
        };
        const move = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const evt = e.type === 'touchmove' ? e.touches[0] : e;
            const dx = evt.clientX - startX, dy = evt.clientY - startY;
            el.style.left = `${initialLeft + dx}px`; el.style.top = `${initialTop + dy}px`;
            el.style.margin = 0; /* 清除居中 */
        };
        const end = () => isDragging = false;
        handle.addEventListener('mousedown', start); handle.addEventListener('touchstart', start);
        document.addEventListener('mousemove', move); document.addEventListener('touchmove', move, {passive:false});
        document.addEventListener('mouseup', end); document.addEventListener('touchend', end);
    };
    makeDraggable(document.getElementById('uno-main-view'), document.getElementById('uno-drag-handle'));

    // --- 6. 交互逻辑 ---
    
    // 打开
    $(document).on('click', '#uno-launch-btn', function() {
        const ST = window.SillyTavern;
        // 尝试获取角色名
        let name = "玩家";
        if (ST && ST.getContext) {
            const ctx = ST.getContext();
            if (ctx.characterId) name = ctx.characters[ctx.characterId].name;
        }
        $('#uno-player-display').text(name);
        $('#uno-main-view').css('display', 'flex').hide().fadeIn(200);
    });

    // 关闭
    $(document).on('click', '.uno-close', function() {
        $('#uno-main-view').fadeOut(200);
    });

    // 测试游戏
    $(document).on('click', '#uno-start-btn', function() {
        $('#uno-msg-box').text("正在洗牌... (Native模式正常)");
        if(window.toastr) toastr.success("UNO 引擎连接成功");
    });

    // 强制刷新页面按钮 (留着以防万一)
    $(document).on('click', '#uno-reload-btn', function() {
        location.reload();
    });

    console.log("✅ [UNO] 插件加载完毕 (已启用热重载)");
})();
