const EXTENSION_NAME = "st_uno_game";

(async function() {
    // --- 0. 清理旧环境 ---
    $('#uno-launch-btn').remove();
    $('#uno-main-view').remove();
    $('style[id="uno-css"]').remove();

    console.log("🚀 [UNO] AI 沉浸版 v7.0 (接入LLM) 启动...");

    // --- 1. 依赖检查 ---
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    while ((!window.SillyTavern || !window.jQuery)) await delay(500);
    const $ = window.jQuery;

    // --- 2. 游戏逻辑核心 (Model) ---
    class UnoEngine {
        constructor() {
            this.deck = []; this.handPlayer = []; this.handAI = [];
            this.topCard = null; this.turn = 'player';
            this.colors = ['red', 'yellow', 'blue', 'green'];
            // 为了游戏节奏，稍微减少了功能牌的比例
            this.types = ['0','1','2','3','4','5','6','7','8','9','skip','draw2'];
        }

        startNewGame() {
            this.deck = this.createDeck();
            this.handPlayer = this.drawCards(7);
            this.handAI = this.drawCards(7);
            this.topCard = this.drawCards(1)[0];
            while(isNaN(this.topCard.value)) { // 确保开局是数字牌
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
            // 优先出功能牌搞心态
            const specialCards = this.handAI.filter(c => this.isValidMove(c, this.topCard) && isNaN(c.value));
            const normalCards = this.handAI.filter(c => this.isValidMove(c, this.topCard));
            
            let card = null;
            if (specialCards.length > 0 && Math.random() > 0.3) {
                card = specialCards[Math.floor(Math.random() * specialCards.length)];
            } else if (normalCards.length > 0) {
                card = normalCards[Math.floor(Math.random() * normalCards.length)];
            }

            if (card) {
                const index = this.handAI.indexOf(card);
                this.handAI.splice(index, 1);
                
                let extraAction = null;
                if(card.type === 'draw2') extraAction = 'player_draw_2';
                if(card.type === 'skip') extraAction = 'skip_player';
                
                this.topCard = card;
                return { action: 'play', card: card, extra: extraAction };
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
        .uno-header { padding: 10px; background: #222; display: flex; justify-content: space-between; cursor: move; color: #ddd;}
        .uno-table { 
            flex: 1; position: relative;
            background: radial-gradient(circle, #27ae60, #145a32); 
            display: flex; flex-direction: column; justify-content: space-between; padding: 10px;
        }
        .char-zone { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .user-zone { display: flex; align-items: flex-end; gap: 10px; justify-content: flex-end; margin-top: 10px; }
        .avatar { 
            width: 60px; height: 60px; border-radius: 50%; 
            border: 3px solid white; object-fit: cover; background: #555; box-shadow: 0 2px 5px rgba(0,0,0,0.5);
        }
        .bubble {
            background: white; color: #333; padding: 10px 14px; border-radius: 15px;
            font-size: 14px; max-width: 200px; position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s;
            line-height: 1.4; font-family: sans-serif;
        }
        .bubble-ai { border-top-left-radius: 0; }
        .bubble-user { border-bottom-right-radius: 0; background: #dcf8c6; }
        .bubble.show { opacity: 1; }
        
        /* 牌堆 */
        .center-area { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
            display: flex; gap: 20px; align-items: center;
        }
        .card {
            width: 50px; height: 75px; background: white; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 20px; border: 2px solid #eee;
            box-shadow: 2px 2px 6px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.1s;
        }
        .card:active { transform: scale(0.9); }
        .card-back { background: #34495e; border: 2px solid #fff; color: transparent; }
        .c-red { background: #e74c3c; color: white; }
        .c-blue { background: #3498db; color: white; }
        .c-green { background: #2ecc71; color: white; }
        .c-yellow { background: #f1c40f; color: black; }
        
        .my-hand { display: flex; gap: -10px; overflow-x: auto; padding: 10px 0; width: 100%; height: 90px; }
        .my-hand .card { margin-right: 5px; flex-shrink: 0; }
        .input-bar { padding: 8px; background: #333; display: flex; gap: 5px; }
        .input-bar input { flex: 1; padding: 8px; border-radius: 20px; border: none; outline: none; }
        .input-bar button { padding: 8px 15px; background: #2980b9; color: white; border: none; border-radius: 20px; }
    `;
    $('head').append(`<style id="uno-css">${cssStyles}</style>`);

    // --- 4. HTML 结构 ---
    $('body').append(`
        <div id="uno-launch-btn">🎲</div>
        <div id="uno-main-view">
            <div class="uno-header" id="uno-drag-handle">
                <span>UNO 对战 (AI 增强版)</span>
                <div class="uno-close" style="cursor:pointer;">✕</div>
            </div>
            <div class="uno-table">
                <div class="char-zone">
                    <img id="ai-avatar" class="avatar" src="">
                    <div class="bubble bubble-ai" id="ai-bubble">...</div>
                </div>
                <div style="position:absolute; top:10px; right:10px; color:white; font-size:12px;">
                    AI剩余: <span id="ai-card-count" style="font-weight:bold; color:gold">7</span>
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
                <input type="text" id="uno-chat-input" placeholder="和AI对话..." autocomplete="off">
                <button id="uno-send-btn">发送</button>
            </div>
        </div>
    `);

    // --- 5. 控制逻辑 (Controller & LLM) ---
    
    // 调用 LLM 生成对话
    async function generateAISpeech(situation) {
        if (!window.SillyTavern || !window.SillyTavern.generateRaw) {
            return "我的大脑好像断线了..."; // Fallback
        }

        const context = window.SillyTavern.getContext();
        const charName = context.characters[context.characterId].name;
        const userName = context.name1 || "玩家";

        // 构造提示词：这是整个功能的灵魂
        const prompt = `
[系统指令: 你正在和 ${userName} 玩 UNO 纸牌游戏。
当前情况: ${situation}
请以 ${charName} 的口吻，用一句话简短地回应这个操作。
要求: 生动、符合人设、不要带动作描写、不要带星号，只说话。字数在20字以内。]
`;
        try {
            // 使用 generateRaw，它不会把内容直接插入聊天记录，适合做游戏对话
            const response = await window.SillyTavern.generateRaw({
                'user_input': prompt,
                'max_new_tokens': 50, // 限制生成长度，反应更快
                'skip_wian': true // 跳过世界书扫描，加快速度
            });
            return response.trim().replace(/^["']|["']$/g, ''); // 去掉可能的引号
        } catch (e) {
            console.error("LLM 生成失败", e);
            return "(思考中...)";
        }
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

    function showBubble(who, text, duration = 4000) {
        const id = who === 'ai' ? '#ai-bubble' : '#user-bubble';
        $(id).text(text).addClass('show');
        // 每次显示都重置定时器，防止闪烁
        if ($(id).data('timer')) clearTimeout($(id).data('timer'));
        const timer = setTimeout(() => $(id).removeClass('show'), duration);
        $(id).data('timer', timer);
    }

    // 玩家出牌
    async function handlePlayerCard(index) {
        if (Game.turn !== 'player') return;
        const card = Game.handPlayer[index];
        if (!Game.isValidMove(card, Game.topCard)) {
            if(window.toastr) toastr.warning("打不出去！");
            return;
        }

        // 执行
        Game.handPlayer.splice(index, 1);
        Game.topCard = card;
        renderUI();

        // 功能牌判定
        if (card.type === 'draw2') {
            Game.handAI.push(...Game.drawCards(2));
            // 触发 AI 抱怨
            showBubble('ai', "..."); // 先显示思考
            const speech = await generateAISpeech(`对手打出了 +2，你被迫摸了2张牌。你现在的牌数变成了 ${Game.handAI.length}。你可能有点生气或无奈。`);
            showBubble('ai', speech);
        } else if (card.type === 'skip') {
            showBubble('ai', "...");
            const speech = await generateAISpeech(`对手打出了禁止牌，跳过了你的回合。`);
            showBubble('ai', speech);
            Game.turn = 'player'; // 还是玩家回合
            return;
        }

        // 轮到 AI
        Game.turn = 'ai';
        await aiMove();
    }

    // AI 出牌逻辑
    async function aiMove() {
        // 1. AI 思考时间
        await delay(1000); 
        
        // 2. 逻辑计算
        const move = Game.aiThink();
        renderUI(); // 先执行动作，让界面动起来

        // 3. 显示气泡正在生成
        showBubble('ai', "..."); 

        // 4. 构造情况描述给 LLM
        let situation = "";
        if (move.action === 'play') {
            const cardName = (move.card.type === 'draw2') ? "【+2功能牌】" : 
                             (move.card.type === 'skip') ? "【禁止牌】" : 
                             `【${move.card.color}色的 ${move.card.value}】`;
            
            situation = `轮到你了。你打出了一张 ${cardName}。`;
            if (Game.handAI.length === 1) situation += " 你手里只剩最后一张牌了，非常激动！";
            if (move.card.type === 'draw2') situation += " 你成功坑了对手，让他摸了2张牌，非常得意。";
        } else {
            situation = "轮到你了。但是你手里没有能出的牌，只好无奈地摸了一张牌。";
        }

        // 5. 请求 AI 说话
        const speech = await generateAISpeech(situation);
        showBubble('ai', speech, 5000); // 话语显示稍微久一点

        // 6. 后续逻辑处理
        if (move.action === 'play') {
            if (move.extra === 'player_draw_2') {
                Game.handPlayer.push(...Game.drawCards(2));
                renderUI();
            }
            if (move.extra === 'skip_player') {
                Game.turn = 'ai';
                await aiMove(); // AI 连动
                return;
            }
        }

        Game.turn = 'player';
    }

    // 摸牌事件
    $('#draw-deck').on('click', () => {
        if (Game.turn !== 'player') return;
        Game.handPlayer.push(...Game.drawCards(1));
        renderUI();
        showBubble('user', "(摸了一张)");
        Game.turn = 'ai';
        aiMove();
    });

    // 聊天发送事件
    $('#uno-send-btn').on('click', async () => {
        const text = $('#uno-chat-input').val();
        if (text) {
            showBubble('user', text);
            $('#uno-chat-input').val('');
            
            // 玩家说话也会触发 AI 回应
            if (Game.turn === 'ai') return; // 如果正轮到 AI，它等会儿自己会说话
            
            // 如果是玩家回合闲聊，AI 也可以插嘴
            showBubble('ai', "...");
            const reply = await generateAISpeech(`玩家一边打牌一边对你说：“${text}”。请回应他，同时催促他快点出牌。`);
            showBubble('ai', reply);
        }
    });

    // 启动逻辑
    $(document).on('click', '#uno-launch-btn', function() {
        const context = window.SillyTavern.getContext();
        if (context.characterId) {
            const char = context.characters[context.characterId];
            $('#ai-avatar').attr('src', `/characters/${char.avatar}`);
        }
        $('#user-avatar').attr('src', context.userAvatar ? context.userAvatar : 'img/user-default.png');
        
        Game.startNewGame();
        renderUI();
        $('#uno-main-view').fadeIn(200);
        
        // 开场白
        showBubble('ai', "...");
        generateAISpeech("游戏刚开始，你拿到了7张手牌。热情地邀请玩家开始对局。").then(text => showBubble('ai', text));
    });

    $(document).on('click', '.uno-close', () => $('#uno-main-view').fadeOut());

    const handle = document.getElementById('uno-drag-handle');
    const el = document.getElementById('uno-main-view');
    let isD=false,sx,sy,ix,iy;
    if(handle){
        handle.addEventListener('touchstart',e=>{isD=true;sx=e.touches[0].clientX;sy=e.touches[0].clientY;ix=el.offsetLeft;iy=el.offsetTop;});
        handle.addEventListener('touchmove',e=>{if(isD){e.preventDefault();el.style.left=(ix+e.touches[0].clientX-sx)+'px';el.style.top=(iy+e.touches[0].clientY-sy)+'px';el.style.margin=0;}},{passive:false});
        handle.addEventListener('touchend',()=>isD=false);
    }

    console.log("✅ [UNO] LLM 连接就绪");
})();
