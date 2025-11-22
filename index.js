// 引入酒馆核心模块
// 路径层级：/public/scripts/extensions/st_uno_game/index.js
import { extension_settings, getContext } from "../../extensions.js";
import { saveSettingsDebounced } from "../../../script.js";

// 插件的内部 ID (必须和仓库名/文件夹名一致)
const EXTENSION_NAME = "st_uno_game";

jQuery(async () => {
    console.log("🚀 [UNO] 原生插件正在初始化...");

    // 1. 注入 HTML (直接嵌入，确保移动端加载最快)
    const htmlTemplate = `
        <!-- 启动按钮 (图标是一个骰子) -->
        <div id="uno-launch-btn" title="开始 UNO 游戏">
            🎲
        </div>

        <!-- 游戏主界面 (默认隐藏) -->
        <div id="uno-main-view" style="display:none;">
            <div class="uno-header">
                <span>UNO 游戏台</span>
                <div class="uno-close-btn">关闭</div>
            </div>
            <div class="uno-content">
                <p>👋 你好，<span id="uno-player-name" style="font-weight:bold; color:gold;">玩家</span></p>
                <p>当前对手: <span id="uno-opponent-name" style="font-weight:bold; color:cyan;">AI</span></p>
                
                <div id="uno-status-text" style="margin: 20px 0; font-size: 1.2em; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
                    点击下方按钮开始
                </div>
                
                <button id="uno-start-game" class="uno-btn menu_button">开始新游戏</button>
            </div>
        </div>
    `;

    // 2. 将 HTML 插入到页面底部
    $('body').append(htmlTemplate);

    // 3. 放置启动按钮
    // 尝试放在顶部扩展栏，如果找不到就浮动显示
    const extensionMenu = $('#extensions_menu');
    if (extensionMenu.length) {
        extensionMenu.after($('#uno-launch-btn'));
    } else {
        // 移动端或无菜单时的浮动样式
        $('#uno-launch-btn').css({
            position: 'fixed', 
            top: '10px', 
            right: '80px', 
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            border: '1px solid white'
        });
    }

    // 4. 绑定事件：打开界面
    $(document).on('click', '#uno-launch-btn', function() {
        // 获取当前酒馆上下文（角色名）
        const context = getContext();
        const charName = context.characterId ? context.characters[context.characterId].name : "未选择角色";
        
        // 更新界面文字
        $('#uno-opponent-name').text(charName);
        $('#uno-player-name').text(context.name1 || "玩家"); // name1 是用户名字
        
        // 显示弹窗
        $('#uno-main-view').fadeIn(200);
    });

    // 5. 绑定事件：关闭界面
    $(document).on('click', '.uno-close-btn', function() {
        $('#uno-main-view').fadeOut(200);
    });

    // 6. 绑定事件：开始游戏 (测试按钮)
    $(document).on('click', '#uno-start-game', function() {
        $('#uno-status-text').text("🃏 正在发牌... (环境测试成功)");
        
        // 发送一个系统提示给用户 (Toast)
        if (window.toastr) toastr.success("UNO 游戏逻辑已触发！");
    });

    // 初始化设置（预留）
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }

    console.log("✅ [UNO] 插件加载完成");
});
