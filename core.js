/*

 @name    : 锅巴汉化 - Web汉化插件
 @author  : 麦子、JAR、小蓝、好阳光的小锅巴
 @version : V0.6.1 - 2019-07-09
 @website : http://www.g8hh.com
 @idle games : http://www.gityx.com
 @QQ Group : 627141737

*/

var CNITEM_DEBUG = 0;
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
            return text_prefix + text + text_reg_exclude_postfix + text_postfix;;
        }
    }

    //尝试正则替换
    for (let [key, value] of cnRegReplace.entries()) {
        if (key.test(text)) {
            return text_prefix + text.replace(key, value) + text_reg_exclude_postfix + text_postfix;
        }
    }

    //O(1) 精确匹配（原文与去空白形式）
    let hit = cnItems._IDX_.get(text);
    if (hit === undefined) {
        let t_trim = text.replace(/^\s+|\s+$/g, "");
        if (t_trim !== text) hit = cnItems._IDX_.get(t_trim);
    }
    if (hit !== undefined) return text_prefix + hit + text_reg_exclude_postfix + text_postfix;

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
        return text_prefix + text + text_reg_exclude_postfix + text_postfix;

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
    return text_prefix + text + text_reg_exclude_postfix + text_postfix;
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
