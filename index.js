const EXTENSION_NAME = "st_uno_game";

(async function() {
    try {
        console.log("🚀 [UNO] v8.1 布局修复版启动...");

        // --- 1. 强力清理 ---
        const oldIds = ['uno-launch-btn', 'uno-main-view', 'uno-css'];
        oldIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // --- 2. 注入修复后的 CSS ---
        const cssStyles = `
            /* 启动按钮 */
            #uno-launch-btn {
                position: fixed; 
                top: 80px; right: 20px; 
                z-index: 2147483647;
                width: 50px; height: 50px; 
                background: rgba(0,0,0,0.8); color: gold;
                border: 2px solid gold; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; font-size: 28px; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
            }
            
            /* 主界面 (核心修复) */
            #uno-main-view {
                position: fixed; 
                
                /* 关键修改：不再使用 top:50% + translateY(-50%) */
                /* 而是固定距离顶部 15%，保证标题栏永远可见 */
                top: 15%; 
                left: 50%; 
                transform: translateX(-50%); /* 只水平居中 */
                
                width: 90%; max-width: 450px; 
                height: auto; max-height: 80vh; /* 防止太高溢出 */
                
                background: #2c3e50; border: 2px solid #444; border-radius: 16px;
                z-index: 2147483640; 
                display: none; flex-direction: column;
                box-shadow: 0 10px 100px rgba(0,0,0,0.95); 
                overflow: hidden; /* 内部滚动 */
            }

            /* 标题栏 (加高一点，方便手指按) */
            .uno-header { 
                padding: 15px; background: #222; 
                display: flex; justify-content: space-between; align-items: center;
                cursor: move; touch-action: none; /* 防止拖动时页面滚动 */
                border-bottom: 1px solid #444;
            }
            
            /* 内容区域 (可滚动) */
            .uno-table { 
                flex: 1; position: relative;
                background: radial-gradient(circle, #27ae60, #145a32); 
                display: flex; flex-direction: column; justify-content: space-between;
                padding: 10px;
                overflow-y: auto; /* 只有这里滚动 */
            }

            /* 其他样式保持不变 */
            .char-zone { display: flex; align-items: flex-start; gap: 10px; }
            .user-zone { display: flex; align-items: flex-end; gap: 10px; justify-content: flex-end; }
            .avatar { width: 50px; height: 50px; border-radius: 50%; border: 2px solid white; object-fit: cover; background: #555; }
            .bubble {
                background: white; color: #333; padding: 8px; border-radius: 12px;
                font-size: 13px; max-width: 160px; position: relative;
                opacity: 0; transition: opacity 0.3s;
            }
            .bubble-ai { border-top-left-radius: 0; margin-top: 5px; }
            .bubble-user { border-bottom-right-radius: 0; background: #dcf8c6; margin-bottom: 5px; }
            .bubble.show { opacity: 1; }
            .thinking { background: #eee; color: #888; font-style: italic; }
            .center-area { display: flex; gap: 15px; justify-content: center; margin: 20px 0; }
            .card {
                width: 45px; height: 65px; background: white; border-radius: 4px;
                display: flex; align-items: center; justify-content: center;
                font-weight: 900; font-size: 18px; border: 1px solid #ccc;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.4); cursor: pointer;
                flex-shrink: 0;
            }
            .c-red { background: #e74c3c; color: white; }
            .c-blue { background: #3498db; color: white; }
            .c-green { background: #2ecc71; color: white; }
            .c-yellow { background: #f1c40f; color: black; }
            .my-hand { display: flex; gap: 5px; overflow-x: auto; padding: 10px 0; height: 85px; align-items: center; }
            .input-bar { padding: 8px; background: #333; display: flex; gap: 5px; }
            .input-bar input { flex: 1; padding: 8px; border-radius: 20px; border:none; font-size: 14px; }
            .input-bar button { padding: 8px 15px; background: #2980b9; color: white; border:none; border-radius: 20px; white-space: nowrap; }
        `;
        const styleEl = document.createElement('style');
        styleEl.id = 'uno-css';
        styleEl.innerHTML = cssStyles;
        document.head.appendChild(styleEl);

        // --- 3. 注入按钮 ---
        const launchBtn = document.createElement('div');
        launchBtn.id = 'uno-launch-btn';
        launchBtn.innerText = '🎲';
        document.body.appendChild(launchBtn);

        // --- 4. 等待依赖 ---
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        let attempts = 0;
        while ((!window.SillyTavern || !window.jQuery) && attempts < 30) {
            await delay(300);
            attempts++;
        }
        if (!window.jQuery) return;
        const $ = window.jQuery;

        // --- 5. 注入主界面 ---
        $('body').append(`
            <div id="uno-main-view">
                <div class="uno-header" id="uno-drag-handle">
                    <span style="color:gold; font-weight:bold;">UNO 桌游</span>
                    <div class="uno-close" style="cursor:pointer; padding: 5px 10px; background:#ff4444; border-radius:10px; font-size:12px;">关闭</div>
                </div>
                <div class="uno-table">
                    <div class="char-zone">
                        <img id="ai-avatar" class="avatar" src="">
                        <div class="bubble bubble-ai" id="ai-bubble">Ready?</div>
                    </div>
                    <div style="text-align:right; color:white; font-size:12px; padding-right:10px;">AI: <span id="ai-card-count">7</span>张</div>
                    
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
                    <input type="text" id="uno-chat-input" placeholder="发送消息...">
                    <button id="uno-send-btn">发送</button>
                </div>
            </div>
        `);

        // --- 6. 游戏引擎 (Model) ---
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

        // --- 7. LLM 桥接 ---
        const LLMBridge = {
            async askAIDecision(gameState, validMoves) {
                const ST = window.SillyTavern;
                const context = ST.getContext();
                const charName = context.characters[context.characterId]?.name || "AI";
                const user = context.name1 || "Player";

                const handStr = gameState.handAI.map((c, i) => `[${i}: ${c.color} ${c.value}]`).join(', ');
                const topCardStr = `[${gameState.topCard.color} ${gameState.topCard.value}]`;
                
                const prompt = `
[System Command: UNO Game Logic]
You are ${charName} playing UNO against ${user}.
Your Hand: ${handStr}
Table Card: ${topCardStr}
Valid Moves: ${validMoves.map((c, i) => `- Index ${gameState.handAI.indexOf(c)}: Play ${c.color} ${c.value}`).join('\n')}
- Or choose "draw".

### TASK:
1. Choose a move based on personality.
2. Speak a short line.

### FORMAT (JSON):
{ "action": "play" or "draw", "index": <number>, "speech": "..." }
`;
                try {
                    if (ST.generateQuietPrompt) {
                        const response = await ST.generateQuietPrompt(prompt, true, false);
                        const jsonMatch = response.match(/\{[\s\S]*\}/);
                        if (jsonMatch) return JSON.parse(jsonMatch[0]);
                    }
                } catch (e) { console.error(e); }
                return null;
            }
        };

        // --- 8. UI 逻辑 ---
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
            if(!isThinking) setTimeout(() => $(id).removeClass('show'), 5000);
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
                showBubble('ai', "(被+2了)");
            }
            if (card.type === 'skip' || card.type === 'reverse') {
                showBubble('ai', "(被跳过了)");
                return;
            }
            Game.turn = 'ai';
            await aiMove();
        }

        async function aiMove() {
            showBubble('ai', "思考中...", true);
            const validMoves = Game.handAI.filter(c => Game.isValidMove(c, Game.topCard));
            let llmResult = await LLMBridge.askAIDecision({ handAI: Game.handAI, topCard: Game.topCard }, validMoves);

            let cardToPlay = null;
            let speech = "";

            if (llmResult && llmResult.action === 'play' && llmResult.index !== undefined) {
                const targetCard = Game.handAI[llmResult.index];
                if (targetCard && Game.isValidMove(targetCard, Game.topCard)) {
                    cardToPlay = targetCard;
                    speech = llmResult.speech || "出牌！";
                }
            }

            if (!cardToPlay && validMoves.length > 0) {
                cardToPlay = validMoves[Math.floor(Math.random() * validMoves.length)];
                speech = llmResult ? llmResult.speech : "出这张。";
            }

            renderUI();
            
            if (cardToPlay) {
                showBubble('ai', speech);
                const idx = Game.handAI.indexOf(cardToPlay);
                if (idx > -1) Game.handAI.splice(idx, 1);
                Game.topCard = cardToPlay;
                if(cardToPlay.type === 'draw2') Game.handPlayer.push(...Game.drawCards(2));
                if(cardToPlay.type === 'skip' || cardToPlay.type === 'reverse') {
                    renderUI();
                    Game.turn = 'ai';
                    await aiMove();
                    return;
                }
            } else {
                Game.handAI.push(...Game.drawCards(1));
                showBubble('ai', (llmResult && llmResult.speech) ? llmResult.speech : "摸牌...");
            }
            renderUI();
            Game.turn = 'player';
        }

        // --- 9. 绑定交互 ---
        $('#draw-deck').on('click', () => {
            if(Game.turn !== 'player') return;
            Game.handPlayer.push(...Game.drawCards(1));
            renderUI();
            Game.turn = 'ai';
            aiMove();
        });

        $('#uno-send-btn').on('click', () => {
            const txt = $('#uno-chat-input').val();
            if(txt) { showBubble('user', txt); $('#uno-chat-input').val(''); }
        });

        // 打开并重置
        launchBtn.onclick = () => {
            const ctx = window.SillyTavern.getContext();
            if(ctx.characterId) {
                const char = ctx.characters[ctx.characterId];
                $('#ai-avatar').attr('src', `/characters/${char.avatar}`);
            }
            $('#user-avatar').attr('src', ctx.userAvatar || 'img/user-default.png');
            
            Game.startNewGame();
            renderUI();
            $('#uno-main-view').css('display', 'flex').hide().fadeIn();
        };

        $('.uno-close').on('click', () => $('#uno-main-view').fadeOut());

        // 拖拽逻辑
        const h = document.getElementById('uno-drag-handle');
        const v = document.getElementById('uno-main-view');
        if(h){
            let d=false,x,y,ix,iy;
            h.addEventListener('touchstart',e=>{d=true;x=e.touches[0].clientX;y=e.touches[0].clientY;ix=v.offsetLeft;iy=v.offsetTop});
            h.addEventListener('touchmove',e=>{if(d){e.preventDefault();v.style.left=(ix+e.touches[0].clientX-x)+'px';v.style.top=(iy+e.touches[0].clientY-y)+'px';v.style.margin=0}},{passive:false});
            h.addEventListener('touchend',()=>d=false);
            h.addEventListener('mousedown',e=>{d=true;x=e.clientX;y=e.clientY;ix=v.offsetLeft;iy=v.offsetTop});
            document.addEventListener('mousemove',e=>{if(d){e.preventDefault();v.style.left=(ix+e.clientX-x)+'px';v.style.top=(iy+e.clientY-y)+'px';v.style.margin=0}});
            document.addEventListener('mouseup',()=>d=false);
        }

        console.log("✅ [UNO] v8.1 布局修复完成");

    } catch (err) {
        console.error(err);
        alert("加载失败: " + err.message);
    }
})();
