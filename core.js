(function() {
    console.log("💥 UNO v19.0 (事件隔离版) 注入中...");

    const TRIGGER = "【yellows game】";
    const SAVE_KEY = "st_uno_v19";
    
    // 挂载到全局，方便调试
    window.UnoEngine = {
        state: { deck:[], pHand:[], aHand:[], top:null, turn:'player' },
        
        // 初始化
        init() {
            const colors = ['red','blue','green','yellow'];
            const types = ['0','1','2','3','4','5','6','7','8','9','skip','draw2'];
            let deck = [];
            colors.forEach(c => types.forEach(t => {
                let n = (t==='0')?1:2;
                for(let i=0;i<n;i++) deck.push({col:c, val:t, type:(isNaN(t)?t:'num')});
            }));
            this.state.deck = deck.sort(()=>Math.random()-0.5);
            this.state.pHand = this.draw(7);
            this.state.aHand = this.draw(7);
            this.state.top = this.draw(1)[0];
            while(this.state.top.type !== 'num') {
                this.state.deck.push(this.state.top);
                this.state.top = this.draw(1)[0];
            }
            this.state.turn = 'player';
            this.save();
            console.log("UNO: 新游戏已初始化");
        },

        draw(n) {
            let d = [];
            for(let i=0;i<n;i++) {
                if(this.state.deck.length===0) this.init(); 
                d.push(this.state.deck.pop());
            }
            return d;
        },

        canPlay(c) { 
            if(!this.state.top) return false;
            return c.col === this.state.top.col || c.val === this.state.top.val; 
        },

        save() { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); },
        
        load() {
            try {
                const d = JSON.parse(localStorage.getItem(SAVE_KEY));
                if(d && d.deck) { this.state = d; return true; }
            } catch(e){}
            return false;
        },

        // 获取头像 (带重试和默认值)
        getAvatar(type) {
            try {
                // 尝试从 window.SillyTavern 获取
                const ST = window.SillyTavern;
                if (ST && ST.getContext) {
                    const ctx = ST.getContext();
                    if (type === 'user') {
                        let av = ctx.userAvatar;
                        return av ? (av.includes('/') ? av : `/User Avatars/${av}`) : 'img/user-default.png';
                    } else {
                        if (ctx.characterId && ctx.characters) {
                            let av = ctx.characters[ctx.characterId].avatar;
                            return av ? (av.includes('/') ? av : `/characters/${av}`) : '';
                        }
                    }
                }
            } catch(e) { console.error(e); }
            // 实在找不到就返回空，CSS 会处理默认图
            return "";
        }
    };

    // 生成 HTML
    function getHTML() {
        const s = window.UnoEngine.state;
        
        let handHTML = '';
        s.pHand.forEach((c, i) => {
            let val = c.val;
            if(val==='skip') val='🚫'; if(val==='draw2') val='+2';
            
            // 样式逻辑
            const playable = s.turn==='player' && window.UnoEngine.canPlay(c);
            const cls = `uno-card c-${c.col} ${playable?'playable':'disabled'}`;
            
            // 注意：这里用 onclick="window.UnoGameClick..." 是最稳的，因为 jQuery 的 on() 可能会被酒馆刷新冲掉
            handHTML += `<div class="${cls}" onclick="window.UnoPlay(${i})">${val}</div>`;
        });

        let topVal = s.top ? s.top.val : '?';
        if(topVal==='skip') topVal='🚫'; if(topVal==='draw2') topVal='+2';
        const topCol = s.top ? s.top.col : 'red';

        return `
        <div class="uno-board" onclick="event.stopPropagation()"> <!-- 关键：阻止点击冒泡 -->
            <div class="uno-top-bar">
                <span>UNO</span>
                <button onclick="window.UnoReset()" style="background:#e74c3c;border:none;color:white;border-radius:4px;">重开</button>
            </div>
            
            <div class="uno-field">
                <div class="uno-row ai-row">
                    <img src="${window.UnoEngine.getAvatar('char')}" class="uno-avatar" onerror="this.style.display='none'">
                    <div class="uno-bubble ai-bubble">${s.aiMsg || "..."}</div>
                    <span style="color:#fff; font-size:10px; margin-left:auto">AI: ${s.aHand.length}</span>
                </div>

                <div class="uno-center">
                    <div class="uno-card c-${topCol}" style="transform:scale(1.2)">${topVal}</div>
                    <div class="uno-card c-back" onclick="window.UnoDraw()">UNO</div>
                </div>

                <div class="uno-row player-row">
                    <div class="uno-bubble user-bubble">${s.userMsg || "..."}</div>
                    <img src="${window.UnoEngine.getAvatar('user')}" class="uno-avatar" onerror="this.style.display='none'">
                </div>
                
                <div class="uno-hand">
                    ${handHTML}
                </div>
            </div>
        </div>
        `;
    }

    // --- 全局暴露的点击函数 (绕过 jQuery 绑定失效问题) ---
    window.UnoPlay = async function(idx) {
        const G = window.UnoEngine;
        const s = G.state;
        if(s.turn !== 'player') return;
        
        const c = s.pHand[idx];
        s.pHand.splice(idx, 1);
        s.top = c;
        s.userMsg = `出 ${c.val}`;
        
        if(c.type==='draw2') { s.aHand.push(...G.draw(2)); s.aiMsg="(+2!)"; }
        if(c.type==='skip') { s.aiMsg="(跳过)"; refreshAll(); G.save(); return; }

        s.turn = 'ai';
        refreshAll();
        G.save();
        await aiTurn();
    };

    window.UnoDraw = async function() {
        const G = window.UnoEngine;
        if(G.state.turn !== 'player') return;
        
        const c = G.draw(1)[0];
        G.state.pHand.push(c);
        G.state.userMsg = "摸牌";
        
        if(G.canPlay(c)) {
            if(window.toastr) toastr.info("能出！");
        } else {
            G.state.turn = 'ai';
            refreshAll();
            G.save();
            await new Promise(r=>setTimeout(r,800));
            await aiTurn();
        }
        refreshAll();
        G.save();
    };

    window.UnoReset = function() {
        if(confirm('重开？')) {
            window.UnoEngine.init();
            refreshAll();
        }
    };

    async function aiTurn() {
        const G = window.UnoEngine;
        await new Promise(r=>setTimeout(r, 1000));
        
        const valid = G.state.aHand.filter(c => G.canPlay(c));
        if(valid.length > 0) {
            const c = valid[Math.floor(Math.random()*valid.length)];
            const idx = G.state.aHand.indexOf(c);
            G.state.aHand.splice(idx, 1);
            G.state.top = c;
            G.state.aiMsg = `出 ${c.val}`;
            if(c.type==='draw2') G.state.pHand.push(...G.draw(2));
            if(c.type==='skip') { refreshAll(); G.save(); await aiTurn(); return; }
        } else {
            G.state.aHand.push(...G.draw(1));
            G.state.aiMsg = "摸牌";
        }
        
        G.state.turn = 'player';
        refreshAll();
        G.save();
    }

    // --- 核心：注入器 ---
    function refreshAll() {
        // 找到所有包含关键词的元素，强制更新 HTML
        // 使用 jQuery 的 each 遍历
        $('.mes_text').each(function() {
            // 只要包含关键词，或者包含我们的游戏盘 class
            if ($(this).text().includes(TRIGGER) || $(this).find('.uno-board').length > 0) {
                // 重新生成 HTML
                $(this).html(getHTML());
            }
        });
    }

    // --- 启动逻辑 ---
    // 1. 尝试读档
    if(!window.UnoEngine.load()) window.UnoEngine.init();

    // 2. 启动监听 (每 500ms 扫一次，确保不掉线)
    setInterval(refreshAll, 500);
    
    console.log("✅ UNO 注入器已运行。请发送:", TRIGGER);

})();
