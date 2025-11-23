const EXTENSION_NAME = "st_uno_game";

(async function() {
    try {
        // --- 1. 清理环境 ---
        const ids = ['uno-launch-btn', 'uno-main-view', 'uno-css'];
        ids.forEach(id => { const el = document.getElementById(id); if(el) el.remove(); });

        console.log("🚀 [UNO] v9.0 修复版启动...");

        // --- 2. CSS 修复 (重点修复头像和布局) ---
        const cssStyles = `
            /* 启动按钮 */
            #uno-launch-btn {
                position: fixed; top: 80px; right: 20px; z-index: 2147483647;
                width: 50px; height: 50px; background: rgba(0,0,0,0.8); color: gold;
                border: 2px solid gold; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; font-size: 28px; backdrop-filter: blur(4px);
            }
            
            /* 主界面 */
            #uno-main-view {
                position: fixed; top: 15%; left: 50%; transform: translateX(-50%);
                width: 95%; max-width: 400px; height: auto; max-height: 80vh;
                background: #2c3e50; border: 2px solid #444; border-radius: 16px;
                z-index: 2147483640; display: none; flex-direction: column;
                box-shadow: 0 20px 100px rgba(0,0,0,0.9); overflow: hidden;
            }

            .uno-header { 
                padding: 12px; background: #222; display: flex; justify-content: space-between; 
                align-items: center; cursor: move; touch-action: none; flex-shrink: 0;
            }

            /* 桌面区域 */
            .uno-table { 
                flex: 1; position: relative; padding: 15px;
                background: radial-gradient(circle, #27ae60, #145a32); 
                display: flex; flex-direction: column; justify-content: space-between;
                overflow-y: auto;
            }

            /* --- 修复1: 头像容器 (防止变形) --- */
            .avatar-wrapper {
                width: 60px; height: 60px; flex-shrink: 0; /* 禁止压缩 */
                border-radius: 50%; border: 2px solid white; 
                overflow: hidden; background: #555;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            .avatar { 
                width: 100%; height: 100%; 
                object-fit: cover; /* 关键：保持比例填充 */
                display: block;
            }

            /* 布局区域 */
            .char-zone { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
            .user-zone { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 10px; flex-direction: row; }

            /* 气泡 */
            .bubble {
                background: white; color: #333; padding: 8px 12px; border-radius: 12px;
                font-size: 13px; max-width: 180px; position: relative;
                opacity: 0; transition: opacity 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .bubble-ai { border-top-left-radius: 0; }
            .bubble-user { border-bottom-right-radius: 0; background: #dcf8c6; }
            .bubble.show { opacity: 1; }

            /* 中间牌堆 */
            .center-area { 
                display: flex; gap: 20px; justify-content: center; align-items: center; 
                margin: 10px 0;
            }

            /* 卡牌 */
            .card {
                width: 50px; height: 75px; background: white; border-radius: 6px;
                display: flex; align-items: center; justify-content: center;
                font-weight: 900; font-size: 20px; border: 2px solid #eee;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.4); cursor: pointer;
                flex-shrink: 0; user-select: none;
            }
            /* 颜色 */
            .c-red { background: #e74c3c; color: white; }
            .c-blue { background: #3498db; color: white; }
            .c-green { background: #2ecc71; color: white; }
            .c-yellow { background: #f1c40f; color: black; }
            .c-back { background: #34495e; border: 2px solid white; color: transparent; }

            /* 玩家手牌 */
            .my-hand { 
                display: flex; gap: 5px; overflow-x: auto; 
                padding: 10px 5px; height: 95px; align-items: center;
                background: rgba(0,0,0,0.1); border-radius: 8px;
            }

            /* 遮罩层 (AI 思考时显示) */
            #ai-thinking-mask {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.4); z-index: 10;
                display: none; justify-content: center; align-items: center;
                color: white; font-weight: bold; font-size: 1.2em;
                pointer-events: auto; /* 拦截点击 */
            }
        `;
        const styleEl = document.createElement('style');
        styleEl.id = 'uno-css';
        styleEl.innerHTML = cssStyles;
        document.head.appendChild(styleEl);

        // --- 3. 依赖检查 ---
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        let attempts = 0;
        while ((!window.SillyTavern || !window.jQuery) && attempts < 20) { await delay(300); attempts++; }
        if (!window.jQuery) return;
        const $ = window.jQuery;

        // --- 4. 注入 HTML ---
        $('body').append(`
            <div id="uno-launch-btn" title="UNO">🎲</div>
            <div id="uno-main-view">
                <!-- AI 思考遮罩 -->
                <div id="ai-thinking-mask">AI 思考中...</div>

                <div class="uno-header" id="uno-drag-handle">
                    <span style="color:gold; font-weight:bold;">UNO</span>
                    <div style="color:#ccc; font-size:12px;">VS <span id="uno-char-name">AI</span></div>
                    <div class="uno-close" style="cursor:pointer; background:#ff4444; padding:2px 8px; border-radius:4px;">X</div>
                </div>
                
                <div class="uno-table">
                    <!-- 上方：角色 -->
                    <div class="char-zone">
                        <div class="avatar-wrapper">
                            <img id="ai-avatar" class="avatar" src="">
                        </div>
                        <div class="bubble bubble-ai" id="ai-bubble">...</div>
                    </div>
                    
                    <div style="text-align:right; color:#ddd; font-size:12px;">
                        AI 手牌: <span id="ai-card-count" style="font-size:16px; font-weight:bold; color:gold;">7</span>
                    </div>

                    <!-- 中间：牌桌 -->
                    <div class="center-area">
                        <div class="card c-red" id="table-card">Start</div>
                        <!-- 摸牌堆 -->
                        <div class="card c-back" id="draw-deck" title="摸牌">UNO</div>
                    </div>

                    <!-- 下方：玩家 -->
                    <div>
                        <div class="user-zone">
                            <div class="bubble bubble-user" id="user-bubble">...</div>
                            <div class="avatar-wrapper">
                                <img id="user-avatar" class="avatar" src="">
                            </div>
                        </div>
                        <!-- 玩家手牌 -->
                        <div class="my-hand" id="player-hand-area"></div>
                    </div>
                </div>
            </div>
        `);

        // --- 5. 游戏引擎 (Model) ---
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
                // 确保开局不是功能牌
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
        }
        const Game = new UnoEngine();

        // --- 6. LLM 桥接 (核心修复：确保发送) ---
        const LLMBridge = {
            async askAIDecision(gameState, validMoves) {
                const ST = window.SillyTavern;
                const context = ST.getContext();
                const charName = context.characters[context.characterId]?.name || "AI";
                
                // 构建 Prompt
                const handStr = gameState.handAI.map((c, i) => `[${i}: ${c.color} ${c.value}]`).join(', ');
                const topCardStr = `[${gameState.topCard.color} ${gameState.topCard.value}]`;
                
                const prompt = `
[UNO Game Context]
You are playing UNO.
Your Hand: ${handStr}
Table Card: ${topCardStr}
Allowed Moves: ${validMoves.map((c, i) => `- Index ${gameState.handAI.indexOf(c)}: ${c.color} ${c.value}`).join('\n')}
${validMoves.length === 0 ? "- You MUST Draw a card." : ""}

### TASK
1. Pick a move.
2. Say something as ${charName}.

### FORMAT (JSON Only)
{ "action": "play" | "draw", "index": <number>, "speech": "..." }
`;
                console.log("[UNO] 发送 Prompt:", prompt);

                try {
                    if (ST.generateQuietPrompt) {
                        // 调用 LLM
                        const response = await ST.generateQuietPrompt(prompt, true, false);
                        console.log("[UNO] LLM 返回:", response);
                        
                        // 解析
                        const jsonMatch = response.match(/\{[\s\S]*\}/);
                        if (jsonMatch) return JSON.parse(jsonMatch[0]);
                    } else {
                        if(window.toastr) toastr.error("错误：酒馆版本过低，不支持 generateQuietPrompt");
                    }
                } catch (e) {
                    console.error("[UNO] LLM 调用失败:", e);
                    if(window.toastr) toastr.error("LLM 连接失败，转为本地逻辑");
                }
                return null;
            }
        };

        // --- 7. UI 控制器 ---
        function setThinking(thinking) {
            if (thinking) {
                $('#ai-thinking-mask').css('display', 'flex');
                $('#ai-bubble').text("Thinking...").addClass('show');
            } else {
                $('#ai-thinking-mask').hide();
            }
        }

        function renderUI() {
            const top = Game.topCard;
            let disp = top.value;
            if(top.type==='skip') disp='⊘';
            if(top.type==='reverse') disp='⇄';
            if(top.type==='draw2') disp='+2';

            $('#table-card').removeClass().addClass(`card c-${top.color}`).text(disp);
            $('#ai-card-count').text(Game.handAI.length);

            // 玩家手牌渲染
            $('#player-hand-area').empty();
            Game.handPlayer.forEach((card, index) => {
                let v = card.value;
                if(card.type==='skip') v='⊘';
                if(card.type==='draw2') v='+2';
                if(card.type==='reverse') v='⇄';
                
                const el = $(`<div class="card c-${card.color}">${v}</div>`);
                
                // 样式：能不能出？
                if (Game.turn === 'player' && Game.isValidMove(card, Game.topCard)) {
                    el.css('border', '2px solid gold').css('transform', 'translateY(-5px)');
                    el.on('click', () => handlePlayerCard(index));
                } else {
                    el.css('opacity', '0.6'); // 不能出的牌变暗
                }
                
                $('#player-hand-area').append(el);
            });
        }

        function showBubble(who, text) {
            const id = who === 'ai' ? '#ai-bubble' : '#user-bubble';
            $(id).text(text).addClass('show');
            setTimeout(() => $(id).removeClass('show'), 5000);
        }

        // 玩家出牌
        async function handlePlayerCard(index) {
            if (Game.turn !== 'player') return;
            
            const card = Game.handPlayer[index];
            // 双重检查
            if (!Game.isValidMove(card, Game.topCard)) return;

            // 执行出牌
            Game.handPlayer.splice(index, 1);
            Game.topCard = card;
            renderUI();

            // 触发功能
            if(card.type === 'draw2') {
                Game.handAI.push(...Game.drawCards(2));
                showBubble('ai', "(AI 被+2)");
            }
            if(card.type === 'skip' || card.type === 'reverse') {
                showBubble('ai', "(AI 被跳过)");
                // 还是玩家回合
                Game.turn = 'player';
                renderUI();
                return;
            }

            // 切换到 AI
            Game.turn = 'ai';
            renderUI(); // 更新 UI 禁用玩家操作
            await aiMove();
        }

        // 玩家摸牌 (修复无限摸牌 BUG)
        $('#draw-deck').on('click', async () => {
            if (Game.turn !== 'player') return;

            // 1. 摸牌
            const drawn = Game.drawCards(1)[0];
            Game.handPlayer.push(drawn);
            showBubble('user', `摸到了 ${drawn.color} ${drawn.value}`);
            
            // 2. 判断能否打出
            if (Game.isValidMove(drawn, Game.topCard)) {
                // 如果能出，给个机会出牌（UI会刷新，那张牌会亮起）
                renderUI();
                if(window.toastr) toastr.info("摸到的牌可以出！");
            } else {
                // 不能出，强制结束回合
                renderUI();
                if(window.toastr) toastr.warning("摸到的牌不能出，回合结束");
                await new Promise(r => setTimeout(r, 1000)); // 稍微停顿
                Game.turn = 'ai';
                renderUI();
                await aiMove();
            }
        });

        // AI 回合
        async function aiMove() {
            setThinking(true); // 开启遮罩，玩家无法操作

            const validMoves = Game.handAI.filter(c => Game.isValidMove(c, Game.topCard));
            
            // --- 发送给 LLM ---
            let decision = await LLMBridge.askAIDecision({
                handAI: Game.handAI, topCard: Game.topCard
            }, validMoves);
            
            setThinking(false); // 关闭遮罩

            let cardToPlay = null;
            let speech = "";

            // 解析决策
            if (decision && decision.action === 'play' && decision.index !== undefined) {
                const c = Game.handAI[decision.index];
                if (c && Game.isValidMove(c, Game.topCard)) {
                    cardToPlay = c;
                    speech = decision.speech;
                }
            }

            // 兜底 AI (如果 LLM 没给有效回复)
            if (!cardToPlay && validMoves.length > 0) {
                cardToPlay = validMoves[Math.floor(Math.random() * validMoves.length)];
                speech = decision ? decision.speech : "我的回合！";
            }

            // 执行 AI 动作
            if (cardToPlay) {
                showBubble('ai', speech || "出牌");
                const idx = Game.handAI.indexOf(cardToPlay);
                if (idx > -1) Game.handAI.splice(idx, 1);
                Game.topCard = cardToPlay;

                if(cardToPlay.type === 'draw2') Game.handPlayer.push(...Game.drawCards(2));
                if(cardToPlay.type === 'skip' || cardToPlay.type === 'reverse') {
                    renderUI();
                    await aiMove(); // 连动
                    return;
                }
            } else {
                // AI 摸牌
                Game.handAI.push(...Game.drawCards(1));
                showBubble('ai', decision?.speech || "没牌了，摸一张");
            }

            Game.turn = 'player';
            renderUI();
        }

        // --- 8. 启动 ---
        const launchBtn = document.getElementById('uno-launch-btn');
        launchBtn.onclick = () => {
            const ctx = window.SillyTavern.getContext();
            if(ctx.characterId) {
                const char = ctx.characters[ctx.characterId];
                $('#ai-avatar').attr('src', `/characters/${char.avatar}`);
                $('#uno-char-name').text(char.name);
            }
            $('#user-avatar').attr('src', ctx.userAvatar || 'img/user-default.png');
            
            Game.startNewGame();
            renderUI();
            $('#uno-main-view').fadeIn();
        };

        $('.uno-close').on('click', () => $('#uno-main-view').fadeOut());

        // 拖拽
        const h = document.getElementById('uno-drag-handle');
        const v = document.getElementById('uno-main-view');
        let d=false,x,y,ix,iy;
        h.addEventListener('touchstart',e=>{d=true;x=e.touches[0].clientX;y=e.touches[0].clientY;ix=v.offsetLeft;iy=v.offsetTop});
        h.addEventListener('touchmove',e=>{if(d){e.preventDefault();v.style.left=(ix+e.touches[0].clientX-x)+'px';v.style.top=(iy+e.touches[0].clientY-y)+'px';v.style.margin=0}},{passive:false});
        h.addEventListener('touchend',()=>d=false);

        console.log("✅ [UNO] v9.0 修复版就绪");

    } catch (err) {
        console.error(err);
        alert("UNO 加载错误: " + err.message);
    }
})();
