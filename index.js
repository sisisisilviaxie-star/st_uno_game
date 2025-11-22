// 插件内部 ID
const EXTENSION_NAME = "st_uno_game";

(async function() {
    console.log("🚀 [UNO] 移动端优化版启动...");

    // 1. 等待环境就绪
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let attempts = 0;
    while ((!window.SillyTavern || !window.jQuery) && attempts < 20) {
        await delay(500);
        attempts++;
    }
    if (!window.jQuery) return;
    const $ = window.jQuery;

    // 2. 注入优化后的 CSS
    const cssStyles = `
        /* 启动按钮 (位置稍微下移，防止挡住返回键) */
        #uno-launch-btn {
            position: fixed; top: 60px; right: 20px; z-index: 20000;
            width: 45px; height: 45px;
            background: rgba(0,0,0,0.7); color: white;
            border: 2px solid rgba(255,255,255,0.5); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 1.5em; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            backdrop-filter: blur(5px);
        }
        
        /* 游戏主窗口 */
        #uno-main-view {
            position: fixed; 
            /* 初始位置设为绝对像素，不再用百分比，方便拖拽 */
            top: 150px; 
            left: 20px;
            right: 20px; /* 左右留边，保证不超出屏幕 */
            width: auto;
            
            max-width: 400px; /* 电脑上限制宽度 */
            margin: 0 auto;   /* 电脑上居中 */
            
            background: rgba(30, 35, 45, 0.98); 
            border: 1px solid #666; 
            border-radius: 15px;
            box-shadow: 0 10px 50px rgba(0,0,0,0.9);
            z-index: 29999; 
            color: #eee; 
            display: none;
            overflow: hidden; /* 防止圆角被子元素破坏 */
        }

        /* 标题栏 (可拖拽区域) */
        .uno-header {
            padding: 15px;
            background: linear-gradient(90deg, #444, #333);
            border-bottom: 1px solid #555;
            display: flex; justify-content: space-between; align-items: center;
            font-weight: bold; font-size: 1.1em;
            cursor: move; /* 鼠标手势 */
            touch-action: none; /* 关键：防止手机下拉刷新 */
        }

        /* 关闭按钮 (加大触控区域) */
        .uno-close-btn {
            padding: 5px 15px;
            background: #ff4444;
            color: white;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: normal;
        }

        /* 内容区 */
        .uno-content { padding: 20px; text-align: center; }
        
        .uno-btn {
            width: 100%; padding: 12px; margin-top: 15px;
            background: #2a9d8f; border: none; border-radius: 10px;
            color: white; font-size: 16px; font-weight: bold;
        }
    `;
    $('head').append(`<style>${cssStyles}</style>`);

    // 3. 注入 HTML
    if ($('#uno-launch-btn').length === 0) {
        $('body').append(`
            <div id="uno-launch-btn">🎲</div>
            <div id="uno-main-view">
                <div class="uno-header" id="uno-drag-area">
                    <span>UNO 游戏台</span>
                    <div class="uno-close-btn">关闭</div>
                </div>
                <div class="uno-content">
                    <h2 id="uno-char-display" style="color:gold; margin:0 0 10px 0;">...</h2>
                    <p id="uno-status" style="opacity:0.8; font-size:0.9em;">等待发牌...</p>
                    <button id="uno-action-btn" class="uno-btn">开始游戏</button>
                </div>
            </div>
        `);
    }

    // 4. 实现拖拽功能 (同时支持鼠标和触摸)
    const makeDraggable = (element, handle) => {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const startDrag = (e) => {
            // 获取触摸点或鼠标点
            const evt = e.type === 'touchstart' ? e.touches[0] : e;
            isDragging = true;
            startX = evt.clientX;
            startY = evt.clientY;
            
            // 获取当前元素位置
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault(); // 防止屏幕滚动
            
            const evt = e.type === 'touchmove' ? e.touches[0] : e;
            const dx = evt.clientX - startX;
            const dy = evt.clientY - startY;

            // 更新位置
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
            element.style.right = 'auto'; // 清除 right 属性以免冲突
            element.style.margin = '0';   // 清除 margin
        };

        const stopDrag = () => { isDragging = false; };

        // 绑定事件到标题栏 (Handle)
        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag);

        // 绑定移动事件到 document (防止拖出元素范围失效)
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    };

    // 启用拖拽
    const mainView = document.getElementById('uno-main-view');
    const dragHandle = document.getElementById('uno-drag-area');
    if (mainView && dragHandle) {
        makeDraggable(mainView, dragHandle);
    }

    // 5. 业务逻辑
    $(document).on('click', '#uno-launch-btn', function() {
        // 获取上下文
        const ST = window.SillyTavern;
        const context = ST.getContext();
        
        // 判断是否在角色聊天中
        if (context.characterId) {
            const name = context.characters[context.characterId].name;
            $('#uno-char-display').text(name);
            $('#uno-status').text("已连接，准备发牌");
            $('#uno-action-btn').prop('disabled', false).text("开始游戏");
        } else {
            // 如果在列表页
            $('#uno-char-display').text("未连接");
            $('#uno-status').html("⚠️ 请先点击进入<br>某个角色的聊天界面");
            $('#uno-action-btn').prop('disabled', true).text("请先选择角色");
        }
        
        $('#uno-main-view').fadeIn(200);
    });

    $(document).on('click', '.uno-close-btn', function() {
        $('#uno-main-view').fadeOut(200);
    });

    $(document).on('click', '#uno-action-btn', function() {
        $('#uno-status').text("🎲 正在洗牌... (逻辑测试通过)");
        if (window.toastr) toastr.success("游戏开始！");
    });

    console.log("✅ [UNO] 移动端适配加载完成");
})();
