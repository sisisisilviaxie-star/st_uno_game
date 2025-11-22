// 插件配置
const EXTENSION_NAME = "st_uno_game";

(async function() {
    // 🛡️ 全局错误捕捉：防止脚本暴毙
    try {
        console.log("🚀 [UNO] 正在尝试启动 v5.1...");

        // --- 1. 清理旧环境 (热重载) ---
        // 先移除旧的，防止重复
        const oldBtn = document.getElementById('uno-launch-btn');
        if (oldBtn) oldBtn.remove();
        
        const oldView = document.getElementById('uno-main-view');
        if (oldView) oldView.remove();
        
        const oldStyle = document.getElementById('uno-css');
        if (oldStyle) oldStyle.remove();

        // --- 2. 等待环境就绪 (更稳健的写法) ---
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        let attempts = 0;
        
        // 循环检查 jQuery, 最多等待 10 秒
        while (typeof jQuery === 'undefined' && attempts < 20) {
            await delay(500);
            attempts++;
            console.log("...等待 jQuery", attempts);
        }

        if (typeof jQuery === 'undefined') {
            console.error("❌ [UNO] 严重错误：找不到 jQuery，无法渲染界面。");
            return;
        }
        const $ = jQuery;

        // --- 3. 游戏逻辑核心 (Model) ---
        class UnoEngine {
            constructor() {
                this.deck = []; this.handPlayer = []; this.handAI = [];
                this.topCard = null; this.turn = 'player';
                this.colors = ['red', 'yellow', 'blue', 'green'];
            }
            startNewGame() {
                this.deck = this.createDeck();
                this.handPlayer = this.drawCards(7);
                this.handAI = this.drawCards(7);
                this.topCard = this.drawCards(1)[0];
                this.turn = 'player';
            }
            createDeck() {
                let deck = [];
                this.colors.forEach(color => {
                    for (let i = 0; i <= 9; i++) {
                        deck.push({ color: color, value: i, type: 'number' });
                    }
                });
                return deck.sort(() => Math.random() - 0.5);
            }
            drawCards(count) {
                let drawn = [];
                for(let i=0; i<count; i++) {
                    if(this.deck.length > 0) drawn.push(this.deck.pop());
                }
                return drawn;
            }
            aiThink() {
                const matchIndex = this.handAI.findIndex(card => 
                    card.color === this.topCard.color || card.value === this.topCard.value
                );
                if (matchIndex !== -1) {
                    const card = this.handAI.splice(matchIndex, 1)[0];
                    this.topCard = card; this.turn = 'player';
                    return { action: 'play', card: card };
                } else {
                    const drawn = this.drawCards(1);
                    if(drawn.length > 0) this.handAI.push(drawn[0]);
                    this.turn = 'player';
                    return { action: 'draw', card: null };
                }
            }
        }
        const Game = new UnoEngine();

        // --- 4. 注入 CSS ---
        const cssStyles = `
            #uno-launch-btn {
                position: fixed; top: 80px; right: 20px; z-index: 2147483647; /* 顶级层级 */
                width: 50px; height: 50px; background: rgba(0,0,0,0.8); color: gold;
                border: 2px solid gold; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; font-size: 28px; backdrop-filter: blur(2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            }
            #uno-main-view {
                position: fixed; top: 150px; left: 20px; right: 20px;
                max-width: 400px; margin: 0 auto;
                background: #222; border: 2px solid #444; border-radius: 16px;
                z-index: 2147483647; display: none; flex-direction: column;
                box-shadow: 0 10px 100px black; overflow: hidden;
            }
            .uno-header { padding: 12px; background: #333; display: flex; justify-content: space-between; align-items: center; }
            .uno-table { 
                padding: 20px; min-height: 200px; 
                background: radial-gradient(circle, #3a5a40, #1a2a1e); 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                position: relative;
            }
            .uno-card {
                width: 50px; height: 75px; background: white; 
                border-radius: 4px; display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 20px; border: 2px solid white;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.5); cursor: pointer;
            }
            .card-red { background: #ff5555; color: white; }
            .card-blue { background: #5555ff; color: white; }
            .card-green { background: #55aa55; color: white; }
            .card-yellow { background: #ffaa00; color: black; }
            
            .ai-area { position: absolute; top: 10px; display: flex; gap: 3px; }
            .ai-card-back { width: 35px; height: 50px; background: #444; border: 1px solid #888; border-radius: 3px; }
            .player-area { position: absolute; bottom: 10px; display: flex; gap: 3px; overflow-x: auto; max-width: 100%; padding: 5px; }
            .uno-btn { padding: 12px; margin: 10px; width: 90%; background: #4CAF50; border:none; color:white; font-weight:bold; border-radius:8px; font-size: 16px;}
        `;
        $('head').append(`<style id="uno-css">${cssStyles}</style>`);

        // --- 5. 注入 HTML ---
        // 使用原生 DOM 操作，防止 jQuery 解析错误
        const btnDiv = document.createElement('div');
        btnDiv.id = 'uno-launch-btn';
        btnDiv.innerText = '🎲';
        document.body.appendChild(btnDiv);

        const mainDiv = document.createElement('div');
        mainDiv.id = 'uno-main-view';
        mainDiv.innerHTML = `
            <div class="uno-header" id="uno-drag-handle">
                <span style="color:gold; font-weight:bold;">UNO 桌游</span>
                <div class="uno-close" style="cursor:pointer; padding:5px;">✕</div>
            </div>
            <div class="uno-table">
                <div class="ai-area" id="ai-hand-view"></div>
                <div class="center-pile">
                    <div class="uno-card card-red" id="top-card-view">?</div>
                </div>
                <div class="player-area" id="player-hand-view"></div>
            </div>
            <div id="game-log" style="padding:8px; text-align:center; color:#aaa; font-size:12px;">等待发牌...</div>
            <button class="uno-btn" id="btn-start">发牌开局</button>
        `;
        document.body.appendChild(mainDiv);

        console.log("✅ [UNO] DOM 元素已注入");

        // --- 6. 渲染与逻辑 ---
        function renderUI() {
            $('#ai-hand-view').empty();
            Game.handAI.forEach(() => $('#ai-hand-view').append(`<div class="ai-card-back"></div>`));
            
            const top = Game.topCard;
            $('#top-card-view').text(top.value).removeClass().addClass(`uno-card card-${top.color}`);
            
            $('#player-hand-view').empty();
            Game.handPlayer.forEach((card, index) => {
                const el = $(`<div class="uno-card card-${card.color}">${card.value}</div>`);
                el.on('click', () => handlePlayerMove(index));
                $('#player-hand-view').append(el);
            });
        }

        async function handlePlayerMove(index) {
            if (Game.turn !== 'player') return;
            const card = Game.handPlayer[index];
            if (card.color !== Game.topCard.color && card.value !== Game.topCard.value) {
                if(window.toastr) toastr.warning("出牌不符合规则");
                return;
            }
            Game.handPlayer.splice(index, 1);
            Game.topCard = card;
            Game.turn = 'ai';
            renderUI();
            $('#game-log').text(`你出牌: ${card.color} ${card.value}`);
            await triggerAITurn();
        }

        async function triggerAITurn() {
            $('#game-log').text("AI 思考中...");
            await delay(1000);
            const move = Game.aiThink();
            renderUI();
            
            let msg = "";
            if (move.action === 'play') {
                msg = `AI 出牌: ${move.card.color} ${move.card.value}`;
                if(window.toastr) toastr.info(`AI: 哈哈，吃我一张 ${move.card.value}!`);
            } else {
                msg = `AI 摸牌`;
                if(window.toastr) toastr.info(`AI: 可恶，没牌了...`);
            }
            $('#game-log').text(msg);
        }

        // --- 7. 绑定事件 ---
        $('#uno-launch-btn').on('click', () => $('#uno-main-view').fadeIn());
        $('.uno-close').on('click', () => $('#uno-main-view').fadeOut());
        $('#btn-start').on('click', () => {
            Game.startNewGame();
            renderUI();
            $('#btn-start').hide();
            if(window.toastr) toastr.success("游戏开始");
        });

        // 简单的拖拽
        const handle = document.getElementById('uno-drag-handle');
        const el = document.getElementById('uno-main-view');
        if(handle && el) {
            let isD = false, sx, sy, ix, iy;
            handle.addEventListener('touchstart', e => { isD=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; ix=el.offsetLeft; iy=el.offsetTop; });
            handle.addEventListener('touchmove', e => { if(isD) { e.preventDefault(); el.style.left=(ix+e.touches[0].clientX-sx)+'px'; el.style.top=(iy+e.touches[0].clientY-sy)+'px'; } }, {passive:false});
            handle.addEventListener('touchend', () => isD=false);
        }

        console.log("✅ [UNO] v5.1 启动成功！");

    } catch (err) {
        console.error("❌ [UNO] 启动崩溃:", err);
        alert("UNO 插件启动出错，请截图控制台发给开发者: " + err.message);
    }
})();
