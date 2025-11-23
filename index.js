const EXTENSION_NAME = "st_uno_game";

(async function() {
    // --- 0. 清理旧环境 ---
    $('#uno-launch-btn').remove();
    $('#uno-main-view').remove();
    $('style[id="uno-css"]').remove();

    console.log("🚀 [UNO] v7.1 逻辑闭环版启动...");

    // --- 1. 环境等待 ---
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    while ((!window.SillyTavern || !window.jQuery)) await delay(500);
    const $ = window.jQuery;

    // ==========================================
    // 🧠 LLM 桥接层 (核心逻辑修正)
    // ==========================================
    const LLMBridge = {
        async askAIDecision(gameState, validMoves) {
            const ST = window.SillyTavern;
            const context = ST.getContext();
            
            // 1. 获取角色基础信息 (用于 Prompt 增强)
            // 注意：generateQuietPrompt 默认就会带上角色卡内容，
            // 但我们在这里显式强调一下，效果更好。
            const charName = context.characters[context.characterId].name;
            const user = context.name1;

            // 2. 把游戏数据翻译成文本
            const handStr = gameState.handAI.map((c, i) => `[Index ${i}: ${c.color} ${c.value}]`).join(', ');
            const topCardStr = `[${gameState.topCard.color} ${gameState.topCard.value}]`;
            
            // 3. 构建“上帝视角”的系统指令
            // 告诉 AI：这是游戏逻辑层，不需要你描写动作，只需要你做决策和说话
            const prompt = `
[System Command: UNO Game Logic Layer]
You are currently playing UNO against ${user}.
Your Hand: ${handStr}
Table Card: ${topCardStr}

Valid Moves (You MUST choose one of these indices):
${validMoves.map((c, i) => `- Index ${gameState.handAI.indexOf(c)}: Play ${c.color} ${c.value}`).join('\n')}
- Or choose "draw" if you want/need to draw a card.

### TASK:
1. Select a move based on your personality (${charName}).
2. Write a short dialogue line (1-2 sentences) reacting to this move. Be in character!

### OUTPUT FORMAT (Strict JSON only):
{
    "action": "play" or "draw",
    "index": <number_from_hand>, 
    "speech": "<your_dialogue_here>"
}
`;
            
            console.log("[UNO] Prompting LLM:", prompt);

            try {
                // --- 关键点：静默生成 ---
                // 参数1: Prompt
                // 参数2: quiet=true (不发到聊天框)
                // 参数3: skip_wian=false (是否跳过世界书？否，我们要读取世界书！)
                if (ST.generateQuietPrompt) {
                    const response = await ST.generateQuietPrompt(prompt, true, false);
                    console.log("[UNO] LLM Response:", response);
                    
                    // JSON 提取与清洗 (防止 AI 在 JSON 前后加废话)
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                }
            } catch (e) {
                console.error("[UNO] LLM Error:", e);
            }
            return null; // 失败回退
        }
    };

    // ==========================================
    // 🎮 游戏引擎 (Model) - 保持不变
    // ==========================================
    class UnoEngine {
        constructor() {
            this.deck = []; this.handPlayer = []; this.handAI = [];
            this.topCard = null; this.turn = 'player';
            this.colors = ['red', 'yellow', 'blue', 'green'];
            this.types = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
        }
        startNewGame() {
            this.deck = this.createDeck();
            this.handPlayer = this.drawCards(7);
            this.handAI = this.drawCards(7);
            this.topCard = this.drawCards(1)[0];
            while(['draw2','skip','reverse'].includes(this.topCard.type)) {
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
    }
    const Game = new UnoEngine();

    // ==========================================
    // 🎨 样式 (View) - 保持 v6.0 样式，微调布局
    // ==========================================
    const cssStyles = `
        #uno-launch-btn {
            position: fixed; top: 80px; right: 20px; z-index: 20000;
            width: 50px; height: 50px; background: rgba(0,0,0,0.7);
            border: 2px solid gold; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 28px; backdrop-filter: blur(2px);
        }
        #uno-main-view {
            position: fixed; top: 100px; left: 20px; right: 20px;
            max-width: 450px; margin: 0 auto; height: 600px;
            background: #2c3e50; border: 2px solid #444; border-radius: 16px;
            z-index: 21000; display: none; flex-direction: column;
            box-shadow: 0 10px 100px rgba(0,0,0,0.8); overflow: hidden;
        }
        .uno-header { padding: 10px; background: #222; display: flex; justify-content: space-between; cursor: move; }
        .uno-table { 
            flex: 1; position: relative;
            background: radial-gradient(circle, #27ae60, #145a32); 
            display: flex; flex-direction: column; justify-content: space-between;
            padding: 10px;
        }
        .char-zone { display: flex; align-items: flex-start; gap: 10px; }
        .user-zone { display: flex; align-items: flex-end; gap: 10px; justify-content: flex-end; }
        .avatar { 
            width: 60px; height: 60px; border-radius: 50%; 
            border: 3px solid white; object-fit: cover; background: #555; 
        }
        .bubble {
            background: white; color: #333; padding: 10px; border-radius: 15px;
            font-size: 14px; max-width: 180px; position: relative;
            opacity: 0; transition: opacity 0.3s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .bubble-ai { border-top-left-radius: 0; margin-top: 10px; }
        .bubble-user { border-bottom-right-radius: 0; background: #dcf8c6; margin-bottom: 10px; }
        .bubble.show { opacity: 1; }
        .thinking { background: #eee; color: #888; font-style: italic; }

        .center-area { 
            position: absolute; top: 50%; left: 50%; 
            transform: translate(-50%, -50%); 
            display: flex; gap: 20px; 
        }
        .card {
            width: 50px; height: 75px; background: white; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 20px; border: 2px solid #eee;
            box-shadow: 2px 2px 6px rgba(0,0,0,0.4); cursor: pointer;
        }
        .c-red { background: #e74c3c; color: white; }
        .c-blue { background: #3498db; color: white; }
        .c-green { background: #2ecc71; color: white; }
        .c-yellow { background: #f1c40f; color: black; }
        .my-hand { display: flex; gap: 5px; overflow-x: auto; padding: 10px 0; height: 90px; }
        
        .input-bar { padding: 8px; background: #333; display: flex; gap: 5px; }
        .input-bar input { flex: 1; padding: 8px; border-radius: 20px; border:none; }
        .input-bar button { padding: 8px 15px; background: #2980b9; color: white; border:none; border-radius: 20px; }
    `;
    $('head').append(`<style id="uno-css">${cssStyles}</style>`);

    // --- 4. HTML ---
    $('body').append(`
        <div id="uno-launch-btn">🎲</div>
        <div id="uno-main-view">
            <div class="uno-header" id="uno-drag-handle">
                <span style="color:gold; font-weight:bold;">UNO 沉浸对战</span>
                <div class="uno-close" style="cursor:pointer;">✕</div>
            </div>
            <div class="uno-table">
                <div class="char-zone">
                    <img id="ai-avatar" class="avatar" src="">
                    <div class="bubble bubble-ai" id="ai-bubble">来战！</div>
                </div>
                <div style="position:absolute;top:10px;right:10px;color:white;font-size:12px;">AI手牌: <span id="ai-card-count">7</span></div>
                <div class="center-area">
                    <div class="card c-red" id="table-card">?</div>
                    <div class="card" style="background:#34495e;border:2px solid white;color:transparent" id="draw-deck">UNO</div>
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
                <input type="text" id="uno-chat-input" placeholder="发送消息 (不消耗Token)">
                <button id="uno-send-btn">发送</button>
            </div>
        </div>
    `);

    // ==========================================
    // 🕹️ 控制器 (Controller)
    // ==========================================
    
    function renderUI() {
        const top = Game.topCard;
        const colorClass = `c-${top.color}`;
        let displayVal = top.value;
        if(top.type==='skip') displayVal='⊘';
        if(top.type==='reverse') displayVal='⇄';
        if(top.type==='draw2') displayVal='+2';

        $('#table-card').removeClass().addClass(`card ${colorClass}`).text(displayVal);
        $('#ai-card-count').text(Game.handAI.length);

        $('#player-hand-area').empty();
        Game.handPlayer.forEach((card, index) => {
            let v = card.value;
            if(card.type==='skip') v='⊘';
            if(card.type==='draw2') v='+2';
            const el = $(`<div class="card c-${card.color}">${v}</div>`);
            el.on('click', () => handlePlayerCard(index));
            $('#player-hand-area').append(el);
        });
    }

    function showBubble(who, text, isThinking = false) {
        const id = who === 'ai' ? '#ai-bubble' : '#user-bubble';
        $(id).text(text).addClass('show');
        if(isThinking) $(id).addClass('thinking');
        else $(id).removeClass('thinking');
        
        // 气泡停留时间
        if(!isThinking) setTimeout(() => $(id).removeClass('show'), 6000);
    }

    async function handlePlayerCard(index) {
        if (Game.turn !== 'player') return;
        const card = Game.handPlayer[index];
        if (!Game.isValidMove(card, Game.topCard)) {
            if(window.toastr) toastr.warning("无法出牌");
            return;
        }

        Game.handPlayer.splice(index, 1);
        Game.topCard = card;
        renderUI();

        if (card.type === 'draw2') {
            Game.handAI.push(...Game.drawCards(2));
            showBubble('ai', "(AI 被迫摸了2张)");
        }
        if (card.type === 'skip' || card.type === 'reverse') {
            showBubble('ai', "(AI 被跳过了)");
            return;
        }

        Game.turn = 'ai';
        await aiMove();
    }

    // --- AI 核心逻辑 (整合了 LLM) ---
    async function aiMove() {
        showBubble('ai', "思考中...", true);
        
        const validMoves = Game.handAI.filter(c => Game.isValidMove(c, Game.topCard));
        
        // 1. 请求 LLM 决策
        let llmResult = await LLMBridge.askAIDecision({
            handAI: Game.handAI,
            topCard: Game.topCard
        }, validMoves);

        let cardToPlay = null;
        let speech = "";

        // 2. 处理决策 (如果 LLM 返回了有效数据)
        if (llmResult && llmResult.action === 'play' && llmResult.index !== undefined) {
            // 校验 AI 是否胡乱出牌 (容错)
            const targetCard = Game.handAI[llmResult.index];
            if (targetCard && Game.isValidMove(targetCard, Game.topCard)) {
                cardToPlay = targetCard;
                speech = llmResult.speech || "出牌！";
            } else {
                console.warn("AI 试图出非法牌，已纠正");
            }
        }

        // 3. 兜底逻辑 (如果 LLM 失败或瞎出牌)
        if (!cardToPlay && validMoves.length > 0) {
            // 随机出一张
            cardToPlay = validMoves[Math.floor(Math.random() * validMoves.length)];
            speech = llmResult ? llmResult.speech : "那就这张吧。";
        }

        // 4. 执行操作
        renderUI();
        
        if (cardToPlay) {
            showBubble('ai', speech);
            
            // 移除手牌
            const idx = Game.handAI.indexOf(cardToPlay);
            if (idx > -1) Game.handAI.splice(idx, 1);
            Game.topCard = cardToPlay;

            // 功能牌效果
            if(cardToPlay.type === 'draw2') Game.handPlayer.push(...Game.drawCards(2));
            if(cardToPlay.type === 'skip' || cardToPlay.type === 'reverse') {
                renderUI();
                Game.turn = 'ai';
                await aiMove(); // 连动
                return;
            }
        } else {
            // 摸牌
            Game.handAI.push(...Game.drawCards(1));
            const drawSpeech = (llmResult && llmResult.speech) ? llmResult.speech : "没牌了...";
            showBubble('ai', drawSpeech);
        }

        renderUI();
        Game.turn = 'player';
    }

    // 交互绑定
    $('#draw-deck').on('click', () => {
        if(Game.turn !== 'player') return;
        Game.handPlayer.push(...Game.drawCards(1));
        renderUI();
        Game.turn = 'ai';
        aiMove();
    });

    $('#uno-send-btn').on('click', () => {
        const txt = $('#uno-chat-input').val();
        if(txt) {
            showBubble('user', txt);
            $('#uno-chat-input').val('');
        }
    });

    $(document).on('click', '#uno-launch-btn', function() {
        const ctx = window.SillyTavern.getContext();
        if(ctx.characterId) {
            const char = ctx.characters[ctx.characterId];
            $('#ai-avatar').attr('src', `/characters/${char.avatar}`);
        }
        $('#user-avatar').attr('src', ctx.userAvatar || 'img/user-default.png');
        
        Game.startNewGame();
        renderUI();
        $('#uno-main-view').fadeIn();
    });

    $(document).on('click', '.uno-close', () => $('#uno-main-view').fadeOut());

    // 拖拽
    const h = document.getElementById('uno-drag-handle');
    const v = document.getElementById('uno-main-view');
    if(h){
        let d=false,x,y,ix,iy;
        h.addEventListener('touchstart',e=>{d=true;x=e.touches[0].clientX;y=e.touches[0].clientY;ix=v.offsetLeft;iy=v.offsetTop});
        h.addEventListener('touchmove',e=>{if(d){e.preventDefault();v.style.left=(ix+e.touches[0].clientX-x)+'px';v.style.top=(iy+e.touches[0].clientY-y)+'px';v.style.margin=0}},{passive:false});
        h.addEventListener('touchend',()=>d=false);
    }

    console.log("✅ [UNO] v7.1 逻辑闭环版加载完毕");
})();
