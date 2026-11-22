/*

 @name    : 锅巴汉化 - Web汉化插件
 @author  : 麦子、JAR、小蓝、好阳光的小锅巴
 @version : V0.6.1 - 2019-07-09
 @website : http://www.g8hh.com
 @idle games : http://www.gityx.com
 @QQ Group : 627141737

*/

var CNITEM_DEBUG = 0;
//翻译结果缓存（仅缓存与节点无关的确定性结果）
function cnItemCache(text, out) {
    let cache = cnItem._CACHE;
    if (cache.size > 8000) cache.clear();
    cache.set(text, out);
    return out;
}
function cnItemByTag(text, itemgroup, node, textori){
	for (let i in itemgroup){
		if (i[0] == '.') { //匹配节点及其父节点的class
			let current_node = node;
			while (current_node){
				if ( current_node.classList && current_node.classList.contains(i.substr(1)) ){
					return itemgroup[i];
				}
				else if( current_node.parentElement && current_node.parentElement != document.documentElement ) {
					current_node = current_node.parentElement;
				}
				else {
					break;
				}
			}
		}
		else if (i[0] == '#'){ //匹配节点及其父节点的id
			let current_node = node;
			while (current_node){
				if ( current_node.id == i.substr(1) ){
					return itemgroup[i];
				}
				else if( current_node.parentElement && current_node.parentElement != document.documentElement ) {
					current_node = current_node.parentElement;
				}
				else {
					break;
				}
			}
		}
		else if (i[0] == '$'){	//执行document.querySelector
			if (document.querySelector(i.substr(1)) != null){
				return itemgroup[i];
			}
		}
		else if (i[0] == '*'){	//搜索原始文本
			if ( textori.includes(i.substr(1)) ){
				return itemgroup[i];
			}
		}
		// and more ...
		else{
			CNITEM_DEBUG && console.log({text, itemgroup, dsc:"不识别的标签" + i})
		}
	}
	return null;
}

//2.采集新词
//20190320@JAR  rewrite by 麦子
var cnItem = function (text, node) {

    if (typeof (text) != "string")
        return text;
    let textori = text;
    //命中缓存则直接返回
    if (!cnItem._CACHE) cnItem._CACHE = new Map();
    let cached = cnItem._CACHE.get(textori);
    if (cached !== undefined) return cached;
    //整句优先匹配：完整句子（含动态变量）在处理前后缀之前整句替换
    if (typeof cnFullReplace != "undefined" && cnFullReplace.length > 0) {
        for (let i = 0; i < cnFullReplace.length; i++) {
            let m = text.match(cnFullReplace[i][0]);
            if (m) {
                let v = cnFullReplace[i][1];
                return typeof v == "function" ? v(text, m) : text.replace(cnFullReplace[i][0], v);
            }
        }
    }
    //处理前缀
    let text_prefix = "";
    for (let prefix in cnPrefix) {
        if (text.substr(0, prefix.length) === prefix) {
            text_prefix += cnPrefix[prefix];
            text = text.substr(prefix.length);
        }
    }
    //处理后缀
    let text_postfix = "";
    for (let postfix in cnPostfix) {
        if (text.substr(-postfix.length) === postfix) {
            text_postfix = cnPostfix[postfix] + text_postfix;
            text = text.substr(0, text.length - postfix.length);
        }
    }
    //处理正则后缀
    let text_reg_exclude_postfix = "";
    for (let reg of cnExcludePostfix) {
        let result = text.match(reg);
        if (result) {
            text_reg_exclude_postfix = result[0] + text_reg_exclude_postfix;
            text = text.substr(0, text.length - result[0].length);
        }
    }

    //检验字典是否可存
    if (!cnItems._OTHER_) cnItems._OTHER_ = [];

    //构建 O(1) 索引（仅首次）
    if (!cnItems._IDX_) {
        cnItems._IDX_ = new Map();
        cnItems._TAGGED_ = [];
        for (let k in cnItems) {
            if (k === "_OTHER_") continue;
            let v = cnItems[k];
            if (typeof v == "string") cnItems._IDX_.set(k, v);
            else if (typeof v == "object") cnItems._TAGGED_.push([k, v]);
        }
    }

    //检查是否排除
    for (let reg of cnExcludeWhole) {
        if (reg.test(text)) {
            return cnItemCache(textori, text_prefix + text + text_reg_exclude_postfix + text_postfix);;
        }
    }

    //尝试正则替换
    for (let [key, value] of cnRegReplace.entries()) {
        if (key.test(text)) {
            return cnItemCache(textori, text_prefix + text.replace(key, value) + text_reg_exclude_postfix + text_postfix);
        }
    }

    //O(1) 精确匹配（原文与去空白形式）
    let hit = cnItems._IDX_.get(text);
    if (hit === undefined) {
        let t_trim = text.replace(/^\s+|\s+$/g, "");
        if (t_trim !== text) hit = cnItems._IDX_.get(t_trim);
    }
    if (hit !== undefined) return cnItemCache(textori, text_prefix + hit + text_reg_exclude_postfix + text_postfix);

    //带标签词条（数量少，线性遍历）
    for (let pair of cnItems._TAGGED_) {
        if (text == pair[0]) {
            let result = cnItemByTag(pair[0], pair[1], node, textori);
            if (result != null) return text_prefix + result + text_reg_exclude_postfix + text_postfix;
        }
    }

    //调整收录的词条，0=收录原文，1=收录去除前后缀的文本
    let save_cfg = 1;
    let save_text = save_cfg ? text : textori;
    //生词表用 Set 判重
    if (!cnItems._OTHER_SET_) cnItems._OTHER_SET_ = new Set(cnItems._OTHER_);
    if (cnItems._OTHER_SET_.has(save_text))
        return cnItemCache(textori, text_prefix + text + text_reg_exclude_postfix + text_postfix);

    if (cnItems._OTHER_.length < 1000) {
        //未收录则保存（不再反复排序，仅保持收录功能）
        cnItems._OTHER_SET_.add(save_text);
        cnItems._OTHER_.push(save_text);
    }

    //开启生词打印
        CNITEM_DEBUG && console.log(
            '有需要汉化的英文：', text
        );

    //返回生词字串
    return cnItemCache(textori, text_prefix + text + text_reg_exclude_postfix + text_postfix);
};

transTaskMgr = {
    tasks: [],
    addTask: function (node, attr, text) {
        this.tasks.push({
            node,
            attr,
            text
        })
    },
    doTask: function () {
        let task = null;
        while (task = this.tasks.pop())
            task.node[task.attr] = task.text;
    },
}

function TransSubTextNode(node) {
    if (node.childNodes.length > 0) {
        for (let subnode of node.childNodes) {
            if (subnode.nodeName === "#text") {
                let text = subnode.textContent;
                let cnText = cnItem(text, subnode);
                cnText !== text && transTaskMgr.addTask(subnode, 'textContent', cnText);
                //console.log(subnode);
            } else if (subnode.nodeName !== "SCRIPT" && subnode.nodeName !== "STYLE" && subnode.nodeName !== "TEXTAREA") {
                if (!subnode.childNodes || subnode.childNodes.length == 0) {
                    let text = subnode.innerText;
                    let cnText = cnItem(text, subnode);
                    cnText !== text && transTaskMgr.addTask(subnode, 'innerText', cnText);
                    //console.log(subnode);
                } else {
                    TransSubTextNode(subnode);
                }
            } else {
                // do nothing;
            }
        }
    }
}

! function () {
    console.log("加载汉化模块");

    let observer_config = {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true
    };
    let targetNode = document.body;
    //汉化静态页面内容
    TransSubTextNode(targetNode);
    transTaskMgr.doTask();
    //监听页面变化并汉化动态内容
    let observer = new MutationObserver(function (e) {
        //window.beforeTransTime = performance.now();
        observer.disconnect();
        for (let mutation of e) {
            if (mutation.target.nodeName === "SCRIPT"|| mutation.target.nodeName === "STYLE" || mutation.target.nodeName === "TEXTAREA") continue;
			if (mutation.target.nodeName === "#text") {
                mutation.target.textContent = cnItem(mutation.target.textContent, mutation.target);
            } else if (!mutation.target.childNodes || mutation.target.childNodes.length == 0) {
                mutation.target.innerText = cnItem(mutation.target.innerText, mutation.target);
            } else if (mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeName === "#text") {
                        node.textContent = cnItem(node.textContent, node);
                        //console.log(node);
                    } else if (node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE" && node.nodeName !== "TEXTAREA") {
                        if (!node.childNodes || node.childNodes.length == 0) {
							if (node.innerText)
								node.innerText = cnItem(node.innerText, node);
                        } else {
                            TransSubTextNode(node);
                            transTaskMgr.doTask();
                        }
                    }
                }
            }
        }
        observer.observe(targetNode, observer_config);
        //window.afterTransTime = performance.now();
        //console.log("捕获到页面变化并执行汉化，耗时" + (afterTransTime - beforeTransTime) + "毫秒");
    });
    observer.observe(targetNode, observer_config);
}();

// ============ CN3-ENCOUNTER 奇遇系统 ============
// 随机出现可点击的"奇点宝珠"，点击获得资源奖励。
// 依赖主程序暴露的 window.__cv3（由 qv/AI 引擎构造函数注入）。
! function () {
    if (!document.head || typeof document.createElement !== "function" || typeof setInterval !== "function") return;
    var style = document.createElement("style");
    style.textContent =
        ".cn3-orb{position:fixed;width:64px;height:64px;border-radius:50%;z-index:99999;cursor:pointer;" +
        "background:radial-gradient(circle at 35% 35%,#fff,#7ef 20%,#48f 55%,#123 100%);" +
        "box-shadow:0 0 24px #4af,0 0 60px rgba(68,136,255,.5);display:flex;align-items:center;justify-content:center;" +
        "color:#fff;font:700 26px/1 sans-serif;text-shadow:0 0 8px #fff;animation:cn3pulse 1.6s ease-in-out infinite;" +
        "user-select:none;transition:transform .15s}" +
        ".cn3-orb:hover{transform:scale(1.12)}" +
        "@keyframes cn3pulse{0%,100%{box-shadow:0 0 18px #4af,0 0 40px rgba(68,136,255,.4)}" +
        "50%{box-shadow:0 0 30px #6cf,0 0 80px rgba(68,136,255,.7)}}" +
        ".cn3-toast{position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:100000;" +
        "background:rgba(10,25,60,.92);color:#cfe8ff;border:1px solid #4af;border-radius:8px;" +
        "padding:10px 18px;font:14px/1.5 sans-serif;box-shadow:0 0 18px rgba(68,136,255,.4);" +
        "pointer-events:none;opacity:0;transition:opacity .3s,top .3s}" +
        ".cn3-toast.show{opacity:1;top:14%}";
    document.head.appendChild(style);

    var orb = null;
    var timer = null;

    function gameReady() {
        var g = window.__cv3;
        return !!(g && g.ds && g.data && g.data.tuto_done && !g.data.pause &&
            document.visibilityState !== "hidden" && /\/game/.test(location.hash));
    }

    function fmt(n) {
        n = Math.floor(n);
        if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
        if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
        if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
        return "" + n;
    }

    function toast(msg) {
        var el = document.createElement("div");
        el.className = "cn3-toast";
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function () { el.classList.add("show"); }, 30);
        setTimeout(function () {
            el.classList.remove("show");
            setTimeout(function () { el.remove(); }, 400);
        }, 3600);
    }

    function pickReward() {
        var g = window.__cv3, ds = g.ds;
        var p = ds.player(0);
        var rank = 0;
        try { rank = ds.currentScienceRank(0) || 0; } catch (e) { rank = 0; }
        var roll = Math.random();
        try {
            if (roll < 0.35) {
                var cap = ds.capital(0);
                if (!cap) return "奇遇消散了……";
                var max = ds.maxGold(cap);
                var amt = Math.max(120, Math.floor(max * 0.04));
                cap.gold = Math.min((cap.gold || 0) + amt, max);
                return "奇遇！" + cap.name + " 获得 " + fmt(amt) + " 金币";
            } else if (roll < 0.55) {
                var f = 15 + rank * 8;
                p.faith = (p.faith || 0) + f;
                return "奇遇！获得 " + fmt(f) + " 信仰";
            } else if (roll < 0.75) {
                var c = 15 + rank * 8;
                p.culture = (p.culture || 0) + c;
                return "奇遇！获得 " + fmt(c) + " 文化";
            } else if (roll < 0.94 && p.science_queue && p.science_queue.length) {
                var sid = p.science_queue[0];
                var def = ds.conf.sciences[sid];
                var cost = ds.scienceCost(def, 0);
                var amt2 = Math.floor(cost * 0.05);
                if (!p.sciences[sid]) p.sciences[sid] = { progress: 0, done: false };
                p.sciences[sid].progress += amt2;
                return "奇遇！当前科技 +" + fmt(amt2) + " 进度";
            } else {
                p.progress = (p.progress || 0) + 1;
                return "奇遇！获得 1 进度";
            }
        } catch (e) {
            return "奇遇消散了……";
        }
    }

    function collect() {
        var msg = pickReward();
        toast(msg);
        if (orb) { orb.remove(); orb = null; }
        schedule();
    }

    function spawn(force) {
        if (orb) return;
        if (!force && !gameReady()) { schedule(); return; }
        var size = 64;
        var w = window.innerWidth || 1024, h = window.innerHeight || 768;
        var x = 20 + Math.random() * Math.max(40, w - size - 40);
        var y = 80 + Math.random() * Math.max(40, h - size - 160);
        orb = document.createElement("div");
        orb.className = "cn3-orb";
        orb.title = "奇点宝珠：点击领取奖励";
        orb.textContent = "奇";
        orb.style.left = x + "px";
        orb.style.top = y + "px";
        orb.addEventListener("click", collect);
        document.body.appendChild(orb);
        setTimeout(function () {
            if (orb) { orb.remove(); orb = null; schedule(); }
        }, 20000);
    }

    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            if (gameReady()) spawn(); else schedule();
        }, 90000 + Math.random() * 150000);
    }

    window.__cn3_spawn = function () { spawn(true); };

    var wait = setInterval(function () {
        if (window.__cv3) {
            clearInterval(wait);
            setTimeout(function () {
                if (gameReady()) spawn(); else schedule();
            }, 45000 + Math.random() * 45000);
        }
    }, 3000);
}();
