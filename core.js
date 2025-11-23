(function(ST, $) {
    console.log("🎮 UNO 文本触发版 v15.0 已就绪");

    const SAVE_KEY = "st_uno_save_data";
    // ✅ 触发关键词 (你可以随意修改)
    const TRIGGER_KEYWORD = "【yellows game】";

    // --- 1. 核心：扫描与注入逻辑 ---
    function scanAndInject() {
        // 找到所有包含关键词的消息内容 div
        // .mes_text 是酒馆消息正文的类名
        $('.mes_text').each(function() {
            const $el = $(this);
            const text = $el.text();

            // 如果包含关键词，且还没注入过游戏
            if (text.includes(TRIGGER_KEYWORD) && $el.find('#uno-main-view').length === 0) {
                console.log("🎲 检测到触发词，正在展开游戏桌...");
                
                // 1. 清空这段文字
                $el.empty();
                
                // 2. 插入游戏 HTML
                $el.append(gameTemplate);
                
                // 3. 初始化数据
                $('#ai-img').attr('src', getAvatar('char'));
                $('#user-img').attr('src', getAvatar('user'));
                
                // 4. 绑定事件
                bindGameEvents();
                
                // 5. 恢复进度或新开
                if (G.load()) {
                    update();
                } else {
                    G.init();
                    update();
                }
            }
        });
    }

    // --- 2. 监听器 ---
    
    // 监听A: 页面刚加载完时，扫描一次 (用于刷新后恢复)
    setTimeout(scanAndInject, 1000); // 延迟1秒确保消息加载

    // 监听B: 当有新消息渲染时，扫描一次
    // 使用酒馆的事件系统
    if (ST.eventSource) {
        ST.eventSource.on(ST.eventTypes.USER_MESSAGE_RENDERED, () => setTimeout(scanAndInject, 100));
        ST.eventSource.on(ST.eventTypes.CHARACTER_MESSAGE_RENDERED, () => setTimeout(scanAndInject, 100));
        // 监听消息编辑/删除后的重新渲染
        ST.eventSource.on(ST.eventTypes.MESSAGE_UPDATED, () => setTimeout(scanAndInject, 100));
    }

    // 备用监听: MutationObserver (防止事件漏掉)
    const observer = new MutationObserver((mutations) => {
        scanAndInject();
    });
    // 监听聊天记录容器的变化
    const chatLog = document.getElementById('chat');
    if (chatLog) {
        observer.observe(chatLog, { childList: true, subtree: true });
    }


    // --- 以下是游戏逻辑 (保持不变) ---
    
    function getAvatar(type) {
        const ctx = ST.getContext();
        if (!ctx) return "";
        if (type === 'user') {
            let av = ctx.userAvatar;
            return av ? (av.includes('/') ? av : `/User Avatars/${av}`) : 'img/user-default.png';
        } else {
            if (ctx.characterId && ctx.characters[ctx.characterId]) {
                let av = ctx.characters[ctx.characterId].avatar;
                return av ? (av.includes('/') ? av : `/characters/${av}`) : "";
            }
            return "";
        }
    }

    const gameTemplate = `
    <div id="uno-main-view">
        <div id="ai-mask"><div class="spinner"></div><div>AI 思考中...</div></div>
        <div class="uno-header">
            <span>🎲 UNO 对战</span>
            <div class="uno-close" id="uno-reset" style="cursor:pointer; font-size:12px;" title="重置游戏">↻</div>
        </div>
        <div class="uno-table">
            <div class="zone-ai">
                <div class="uno-avatar-box"><img id="ai-img" src=""></div>
                <div class="bubble bubble-ai" id="ai-msg">...</div>
            </div>
            <div class="info-ai" style="text-align:right; color:#ccc; font-size:10px;">AI: <span id="ai-count" style="color:gold">7</span></div>
            
            <div class="zone-center">
                <div class="card c-red" id="table-card">Start</div>
                <div class="card c-back" id="draw-btn">UNO</div>
            </div>

            <div class="zone-player">
                <div class="bubble bubble-user" id="user-msg">...</div>
                <div class="uno-avatar-box"><img id="user-img" src=""></div>
            </div>
            <div class="hand-area" id="my-hand"></div>
        </div>
    </div>
    `;

    class Engine {
        constructor() { this.colors = ['red','blue','green','yellow']; this.reset(); }
        reset() { this.deck = []; this.pHand = []; this.aHand = []; this.top = null; this.turn = 'player'; }
        save() {
            const data = { pHand: this.pHand, aHand: this.aHand, top: this.top, turn: this.turn, deck: this.deck };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        }
        load() {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            try {
                const d = JSON.parse(raw);
                if(!d.pHand || !d.top) return false;
                Object.assign(this, d);
                return true;
            } catch(e) { return false; }
        }
        init() {
            this.reset(); this.createDeck();
            this.pHand = this.draw(7); this.aHand = this.draw(7);
            this.top = this.draw(1)[0];
            while(isNaN(this.top.val)) { this.deck.push(this.top); this.top = this.draw(1)[0]; }
            this.save();
        }
        createDeck() {
            this.colors.forEach(c => {
                for(let i=0;i<=9;i++) this.deck.push({col:c, val:i, type:'num'});
                ['skip','draw2','reverse'].forEach(t => {
                    this.deck.push({col:c, val:t, type:t}); this.deck.push({col:c, val:t, type:t});
                });
            });
            this.deck.sort(()=>Math.random()-0.5);
        }
        draw(n) {
            let arr = [];
            for(let i=0;i<n;i++) { if(this.deck.length===0) this.createDeck(); arr.push(this.deck.pop()); }
            return arr;
        }
        canPlay(c) { return c.col === this.top.col || c.val == this.top.val; }
    }
    const G = new Engine();

    function bindEvents() {
        $('#draw-btn').off('click').click(async ()=>{
            if(G.turn !== 'player') return;
            const c = G.draw(1)[0];
            G.pHand.push(c);
            say('user', `摸到 ${c.col} ${c.val}`);
            if(G.canPlay(c)) {
                if(window.toastr) toastr.info("能出！");
                update();
            } else {
                update();
                await new Promise(r=>setTimeout(r, 800));
                G.turn = 'ai';
                update();
                await aiTurn();
            }
        });

        $('#uno-reset').off('click').click(() => {
            if(confirm("重置游戏？")) { G.init(); update(); }
        });
    }

    function update() {
        if(!G.top) return;
        let topT = G.top.val;
        if(topT=='skip') topT='🚫'; if(topT=='draw2') topT='+2'; if(topT=='reverse') topT='⇄';
        $('#table-card').removeClass().addClass(`card c-${G.top.col}`).text(topT);
        $('#ai-count').text(G.aHand.length);

        $('#my-hand').empty();
        G.pHand.forEach((c, i) => {
            let txt = c.val;
            if(txt=='skip') txt='🚫'; if(txt=='draw2') txt='+2'; if(txt=='reverse') txt='⇄';
            const el = $(`<div class="card c-${c.col}">${txt}</div>`);
            if(G.turn === 'player') {
                if(G.canPlay(c)) el.addClass('playable').click(()=>playCard(i));
                else el.addClass('disabled');
            } else el.addClass('disabled');
            $('#my-hand').append(el);
        });
        G.save();
    }

    function say(who, txt) {
        const el = $(who==='ai'?'#ai-msg':'#user-msg');
        el.text(txt).addClass('show');
        setTimeout(()=>el.removeClass('show'), 5000);
    }

    async function playCard(idx) {
        if(G.turn !== 'player') return;
        const c = G.pHand[idx];
        G.pHand.splice(idx, 1);
        G.top = c;
        update();

        if(c.type === 'draw2') { G.aHand.push(...G.draw(2)); say('ai', "(+2)"); }
        if(c.type === 'skip' || c.type === 'reverse') { say('ai', "(跳过)"); return; }

        G.turn = 'ai';
        update();
        await aiTurn();
    }

    async function aiTurn() {
        $('#ai-mask').fadeIn(200);
        const valid = G.aHand.filter(c => G.canPlay(c));
        let move = null;
        const special = valid.find(c => c.type !== 'num');
        if(special) move = special;
        else if(valid.length > 0) move = valid[Math.floor(Math.random()*valid.length)];

        const ctx = ST.getContext();
        const char = ctx.characters[ctx.characterId]?.name || "AI";
        const prompt = `[UNO] Roleplay ${char}. Move: ${move ? `${move.col} ${move.val}` : "Draw"}. Short reaction. JSON: {"speech":"..."}`;
        let speech = move ? "出牌！" : "摸牌...";
        try {
            if(ST.generateQuietPrompt) {
                const res = await ST.generateQuietPrompt(prompt, true, false);
                const json = res.match(/\{[\s\S]*\}/);
                if(json) speech = JSON.parse(json[0]).speech;
            }
        } catch(e){}

        $('#ai-mask').fadeOut(200);
        say('ai', speech);

        if(move) {
            const idx = G.aHand.indexOf(move);
            G.aHand.splice(idx, 1);
            G.top = move;
            if(move.type === 'draw2') G.pHand.push(...G.draw(2));
            if(move.type === 'skip' || move.type === 'reverse') {
                update(); await new Promise(r=>setTimeout(r, 1000)); await aiTurn(); return;
            }
        } else {
            G.aHand.push(...G.draw(1));
        }
        G.turn = 'player';
        update();
    }

})(window.SillyTavern, window.jQuery);
