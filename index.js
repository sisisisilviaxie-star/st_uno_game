const EXTENSION_NAME = "st_uno_game";

(async function() {
    // --- 0. 热重载清理 ---
    $('#uno-launch-btn').remove();      // 移除悬浮球
    $('#uno-settings-block').remove();  // 移除旧的设置面板
    $('#uno-menu-btn').remove();        // 移除旧顶部按钮
    $('#uno-main-view').remove();       // 移除界面
    $('style[id="uno-css"]').remove();  // 移除样式

    console.log("🚀 [UNO] v8.0 (扩展面板集成版) 启动...");

    // --- 1. 环境等待 ---
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    while ((!window.SillyTavern || !window.jQuery)) await delay(500);
    const $ = window.jQuery;

    // --- 2. 游戏核心逻辑 (Model) - 保持不变 ---
    class UnoEngine {
        constructor() {
            this.deck = []; this.handPlayer = []; this.handAI = [];
            this.topCard = null; this.turn = 'player';
            this.colors = ['red', 'yellow', 'blue', 'green'];
            this.types = ['0','1','2','3','4','5','6','7','8','9','skip','draw2'];
        }
        startNewGame() {
            this.deck = this.createDeck();
            this.handPlayer = this.drawCards(7);
            this.handAI = this.drawCards(7);
            this.topCard = this.drawCards(1)[0];
            while(isNaN(this.topCard.value)) { 
                this.deck.push(this.topCard);
                this.topCard = this.drawCards(1)[0];
            }
            this.turn = 'player';
        }
        createDeck() {
            let deck = [];
            this.colors.forEach(color => {
                this.types.forEach(type => {
                    let count = (type === '0') ? 1 : 2;
                    for(let i=0; i<count; i++) deck.push({ color, type, value: type });
                });
            });
            return deck.sort(() => Math.random() - 0.5);
        }
        drawCards(count) {
            let drawn = [];
            for(let i=0; i<count; i++) {
                if(this.deck.length === 0) this.deck = this.createDeck();
                drawn.push(this.deck.pop());
            }
            return drawn;
        }
        isValidMove(card, top) {
            return card.color === top.color || card.type === top.type;
        }
        aiThink() {
            const validMoves = this.handAI.filter(card => this.isValidMove(card, this.topCard));
            if (validMoves.length > 0) {
                const card = validMoves[Math.floor(Math.random() * validMoves.length)];
                const index = this.handAI.indexOf(card);
                this.handAI.splice(index, 1);
                let extra = null;
                if(card.type === 'draw2') extra = 'player_draw_2';
                if(card.type === 'skip') extra = 'skip_player';
                this.topCard = card;
                return { action: 'play', card: card, extra: extra };
            } else {
                const drawn = this.drawCards(1);
                this.handAI.push(drawn[0]);
                return { action: 'draw', card: null };
            }
        }
    }
    const Game = new UnoEngine();

    // --- 3. 样式系统 (View) ---
    const cssStyles = `
        /* 悬浮球 */
        #uno-launch-btn {
            position: fixed; top: 150px; right: 10px; z-index: 2147483640;
            width: 40px; height: 40px; 
            background: rgba(0,0,0,0.8); color: gold;
            border: 2px solid gold; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 20px; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            transition: transform 0.2s;
        }
        #uno-launch-btn:hover { transform: scale(1.1); background: black; }
        
        /* 关闭悬浮球的小叉叉 */
        #uno-float-close {
            position: absolute; top: -5px; left: -5px;
            width: 16px; height: 16px; background: #ff4444; color: white;
            border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center;
            border: 1px solid white;
        }

        /* 游戏主界面 */
        #uno-main-view {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 95%; max-width: 420px; height: 600px; max-height: 90vh;
            background: #2c3e50; border: 2px solid #666; border-radius: 16px;
            z-index: 2147483647; /* 保证在最最上层 */
            display: none; flex-direction: column;
            box-shadow: 0 20px 100px rgba(0,0,0,0.95); overflow: hidden;
        }
        
        /* 其他游戏样式 */
        .uno-header { padding: 10px; background: #222; display: flex; justify-content: space-between; cursor: move; color: #ddd;}
        .uno-table { 
            flex: 1; position: relative;
            background: radial-gradient(circle, #27ae60, #145a32); 
            display: flex; flex-direction: column; justify-content: space-between; padding: 10px;
        }
        .char-zone { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .user-zone { display: flex; align-items: flex-end; gap: 10px; justify-content: flex-end; margin-top: 10px; }
        .avatar { 
            width: 50px; height: 50px; border-radius: 50%; 
            border: 2px solid white; object-fit: cover; background: #555;
        }
        .bubble {
            background: white; color: #333; padding: 8px 12px; border-radius: 12px;
            font-size: 13px; max-width: 180px; position: relative;
            opacity: 0; transition: opacity 0.3s; line-height: 1.3;
        }
        .bubble-ai { border-top-left-radius: 0; }
        .bubble-user { border-bottom-right-radius: 0; background: #dcf8c6; }
        .bubble.show { opacity: 1; }
        .center-area { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
            display: flex; gap: 15px; align-items: center;
        }
        .card {
            width: 45px; height: 68px; background: white; border-radius: 5px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 18px; border: 1px solid #ccc;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.4); cursor: pointer;
        }
        .card-back { background: #34495e; border: 2px solid #fff; color: transparent; }
        .c-red { background: #e74c3c; color: white; }
        .c-blue { background: #3498db; color: white; }
        .c-green { background: #2ecc71; color: white; }
        .c-yellow { background: #f1c40f; color: black; }
        .my-hand { display: flex; gap: 5px; overflow-x: auto; padding: 5px 0; width: 100%; height: 80px; align-items: center; }
        .my-hand .card { flex-shrink: 0; }
        .input-bar { padding: 8px; background: #333; display: flex; gap: 5px; }
        .input-bar input { flex: 1; padding: 8px; border-radius: 20px; border: none; outline: none; }
        .input-bar button { padding: 8px 15px; background: #2980b9; color: white; border: none; border-radius: 20px; }
    `;
    $('head').append(`<style id="uno-css">${cssStyles}</style>`);

    // --- 4. 注入扩展面板菜单 (Settings Panel Integration) ---
    
    // 寻找扩展设置容器 (SillyTavern 标准容器 ID 是 extensions_settings)
    const settingsContainer = $('#extensions_settings');
    
    const extensionHtml = `
        <div id="uno-settings-block" class="extension_block">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>🎲 UNO Game</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="display:none;">
                    <div style="padding:10px;">
                        <div id="uno-panel-open" class="menu_button" style="text-align:center;">
                            <i class="fa-solid fa-play"></i> 打开游戏界面
                        </div>
                        <div style="margin-top:10px; display:flex; gap:10px;">
                            <div id="uno-panel-reset" class="menu_button" style="flex:1; text-align:center; font-size:0.9em;">
                                恢复悬浮球
                            </div>
                            <div id="uno-panel-hide" class="menu_button" style="flex:1; text-align:center; font-size:0.9em;">
                                隐藏悬浮球
                            </div>
                        </div>
                        <hr>
                        <small style="opacity:0.6;">v8.0 Native | 作者: sisisisilviaxie-star</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 插入到扩展列表的最上方
    if (settingsContainer.length) {
        settingsContainer.prepend(extensionHtml);
    }

    // 手动实现折叠/展开逻辑 (防止 ST 原生 JS 没加载到我们动态插入的元素)
    $(document).on('click', '#uno-settings-block .inline-drawer-toggle', function() {
        const content = $(this).next('.inline-drawer-content');
        const icon = $(this).find('.inline-drawer-icon');
        content.slideToggle(200);
        icon.toggleClass('down').toggleClass('up'); // 旋转箭头
    });

    // --- 5. 注入悬浮球和游戏界面 ---
    
    // 悬浮球
    $('body').append(`
        <div id="uno-launch-btn" title="UNO">
            🎲
            <div id="uno-float-close">×</div>
        </div>
    `);

    // 主界面
    $('body').append(`
        <div id="uno-main-view">
            <div class="uno-header" id="uno-drag-handle">
                <span>UNO</span>
                <div class="uno-close" style="cursor:pointer; padding:0 10px;">✕</div>
            </div>
            <div class="uno-table">
                <div class="char-zone">
                    <img id="ai-avatar" class="avatar" src="">
                    <div class="bubble bubble-ai" id="ai-bubble">...</div>
                </div>
                <div style="position:absolute; top:10px; right:10px; color:white; font-size:12px;">
                    AI: <span id="ai-card-count" style="color:gold">7</span>
                </div>
                <div class="center-area">
                    <div class="card c-red" id="table-card">?</div>
                    <div class="card card-back" id="draw-deck">UNO</div>
                </div>
                <div>
                    <div class="user-zone">
                        <div class="bubble bubble-user" id="user-bubble">...</div>
                        <img id="user-avatar" class="avatar" src="">
                    </div>
                    <div class="my-hand" id="player-hand-area"></div>
                </div>
            </div>
            <div class="input-bar">
                <input type="text" id="uno-chat-input" placeholder="输入对话..." autocomplete="off">
                <button id="uno-send-btn">发送</button>
            </div>
        </div>
    `);

    // --- 6. 功能逻辑 ---

    function openGame() {
        const context = window.SillyTavern.getContext();
        if (!context.characterId) {
            if(window.toastr) toastr.warning("请先进入角色聊天界面");
            return;
        }
        
        // 设置头像
        const char = context.characters[context.characterId];
        $('#ai-avatar').attr('src', `/characters/${char.avatar}`);
        $('#user-avatar').attr('src', context.userAvatar ? context.userAvatar : 'img/user-default.png');

        // 初始化游戏 (如果还没开始)
        if(Game.deck.length === 0) {
            Game.startNewGame();
            renderUI();
            generateAISpeech("游戏开始了！发牌！").then(t => showBubble('ai', t));
        }
        
        $('#uno-main-view').fadeIn(200);
    }

    // 绑定扩展面板里的按钮
    $(document).on('click', '#uno-panel-open', openGame);
    $(document).on('click', '#uno-panel-reset', () => $('#uno-launch-btn').fadeIn());
    $(document).on('click', '#uno-panel-hide', () => $('#uno-launch-btn').fadeOut());

    // 绑定悬浮球
    $(document).on('click', '#uno-launch-btn', function(e) {
        if(e.target.id === 'uno-float-close') {
            e.stopPropagation();
            $(this).fadeOut();
            return;
        }
        openGame();
    });

    // 绑定游戏内关闭
    $(document).on('click', '.uno-close', () => $('#uno-main-view').fadeOut());

    // --- LLM 与 游戏逻辑 ---
    async function generateAISpeech(situation) {
        if (!window.SillyTavern || !window.SillyTavern.generateRaw) return "...";
        const context = window.SillyTavern.getContext();
        const charName = context.characters[context.characterId].name;
        const prompt = `[系统指令: 正在玩UNO。情况: ${situation}。请以 ${charName} 口吻用10个字以内简短回应。]`;
        try {
            const res = await window.SillyTavern.generateRaw({'user_input': prompt, 'max_new_tokens': 30, 'skip_wian': true});
            return res.trim().replace(/^["']|["']$/g, '');
        } catch (e) { return "..."; }
    }

    function renderUI() {
        const top = Game.topCard;
        const colorClass = `c-${top.color}`;
        let displayValue = top.value;
        if(top.type === 'skip') displayValue = '⊘';
        if(top.type === 'draw2') displayValue = '+2';
        $('#table-card').removeClass().addClass(`card ${colorClass}`).text(displayValue);
        $('#ai-card-count').text(Game.handAI.length);
        
        $('#player-hand-area').empty();
        Game.handPlayer.forEach((card, index) => {
            let val = card.value;
            if(card.type === 'skip') val = '⊘';
            if(card.type === 'draw2') val = '+2';
            const el = $(`<div class="card c-${card.color}">${val}</div>`);
            el.on('click', () => handlePlayerCard(index));
            $('#player-hand-area').append(el);
        });
    }

    function showBubble(who, text) {
        const id = who === 'ai' ? '#ai-bubble' : '#user-bubble';
        $(id).text(text).addClass('show');
        setTimeout(() => $(id).removeClass('show'), 4000);
    }

    async function handlePlayerCard(index) {
        if (Game.turn !== 'player') return;
        const card = Game.handPlayer[index];
        if (!Game.isValidMove(card, Game.topCard)) {
            if(window.toastr) toastr.warning("牌不匹配");
            return;
        }
        Game.handPlayer.splice(index, 1);
        Game.topCard = card;
        renderUI();

        if (card.type === 'draw2') {
            Game.handAI.push(...Game.drawCards(2));
            generateAISpeech("玩家出+2，你摸2张牌，生气。").then(t => showBubble('ai', t));
        } else if (card.type === 'skip') {
            generateAISpeech("玩家出禁止牌，你被跳过，不爽。").then(t => showBubble('ai', t));
            Game.turn = 'player'; return;
        }

        Game.turn = 'ai';
        await aiMove();
    }

    async function aiMove() {
        await delay(1000);
        const move = Game.aiThink();
        renderUI();
        
        let desc = move.action === 'play' ? `你出了${move.card.color}色${move.card.value}` : "没牌出，摸牌";
        generateAISpeech(desc).then(t => showBubble('ai', t));

        if (move.action === 'play') {
            if (move.extra === 'player_draw_2') {
                Game.handPlayer.push(...Game.drawCards(2));
                renderUI();
            }
            if (move.extra === 'skip_player') {
                Game.turn = 'ai'; await aiMove(); return;
            }
        }
        Game.turn = 'player';
    }

    $('#draw-deck').on('click', () => {
        if (Game.turn !== 'player') return;
        Game.handPlayer.push(...Game.drawCards(1));
        renderUI();
        showBubble('user', "(摸牌)");
        Game.turn = 'ai';
        aiMove();
    });

    $('#uno-send-btn').on('click', () => {
        const text = $('#uno-chat-input').val();
        if (text) {
            showBubble('user', text);
            $('#uno-chat-input').val('');
            generateAISpeech(`玩家说: "${text}"。`).then(t => showBubble('ai', t));
        }
    });

    // 拖拽支持
    const handle = document.getElementById('uno-drag-handle');
    const el = document.getElementById('uno-main-view');
    let isD=false,sx,sy,ix,iy;
    if(handle){
        handle.addEventListener('touchstart',e=>{isD=true;sx=e.touches[0].clientX;sy=e.touches[0].clientY;ix=el.offsetLeft;iy=el.offsetTop;});
        handle.addEventListener('touchmove',e=>{if(isD){e.preventDefault();el.style.left=(ix+e.touches[0].clientX-sx)+'px';el.style.top=(iy+e.touches[0].clientY-sy)+'px';el.style.margin=0;}},{passive:false});
        handle.addEventListener('touchend',()=>isD=false);
    }

    console.log("✅ [UNO] 扩展菜单集成完毕");
})();
