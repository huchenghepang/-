

// 默认脚本
class Vnode {
    constructor(tag, props, children, text) {
        this.tag = tag;
        this.props = props || {}; // 确保 props 不为 undefined
        this.children = children || []; // 确保 children 不为 undefined
        this.key = props["v-key"]; // 从 props 中提取 key
        this.el = null; // 将在创建真实 DOM 时设置
        this.text = text || null;
    }
}

// 定义一个空的虚拟节点类
class EmptyVnode {
    constructor(comment) {
        this.tag = undefined;
        this.props = {};
        this.children = undefined;
        this.key = undefined;
        this.el = null;
        this.text = undefined;
        this.isComment = true;
        this.comment = comment || 'undefined';

    }
}

function isEmptyVnode(Vnode) {
    return Vnode instanceof EmptyVnode
}
// 储存当前的虚拟Dom节点
let currentVnode = {};

// 生成唯一ID
function generateNodeId(node) {
    // 深度遍历节点信息，包括标签名、属性和子节点，生成一个表示节点的唯一字符串
    function traverse(node) {
        let nodeString = node.tag || '';

        // 遍历节点的属性
        if (node.props) {
            const attrsString = Object.keys(node.props)
                .sort() // 对属性排序，确保顺序一致
                .map(prop => `${prop}:${node.props[prop]}`)
                .join('|');
            nodeString += `|${attrsString}`;
        }

        // 遍历子节点
        if (node.children && node.children.length > 0) {
            const childrenString = node.children.map(child => traverse(child)).join('|');
            nodeString += `|${childrenString}`;
        }

        return nodeString;
    }

    // 将节点转换为唯一的字符串表示
    const stringToHash = traverse(node);

    // 使用更健壮的哈希算法，避免简单哈希冲突
    return hashString(stringToHash);
}

// 使用一个更复杂的哈希函数（例如FNV-1a哈希）
function hashString(str) {
    let hash = 2166136261; // FNV-1a 初始哈希值
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 16777619) >>> 0; // 保持为32位无符号整数
    }
    return hash.toString(16); // 返回16进制字符串
}

// Vue用的是这种
function generateUniqueId(node, path = '0') {
    node.uniqueId = path;
    if (node.children && node.children.length > 0) {
        node.children.forEach((child, index) => {
            generateUniqueId(child, `${path}-${index}`);
        });
    }
}

// 处理v-for的文本使其形成一个可遍历的数据结构
function handleVForValue(text) {
    // "(person,index) in persons" 

    // 匹配文本的数据正则表达式
    const regex = /\(\s*(\w+)\s*,\s*(\w+)\s*\)\s+in\s+\s*(\w+)\s*|\s*(\w+)\s+in\s+(\w+)\s*/;

    const matches = text.match(regex);

    if (matches) {
        // 如果匹配到了 "(person,index) in persons" 这种格式
        if (matches[1] && matches[2] && matches[3]) {
            return {
                itemName: matches[1],
                indexName: matches[2],
                itemsName: matches[3]
            };
        }
        // 如果匹配到了 "person in persons" 这种格式
        if (matches[4] && matches[5]) {
            return {
                itemName: matches[4],
                indexName: null,  // index 不存在
                itemsName: matches[5]
            };
        }
    }

    return new Error("v-for里面的字符串有错误，无法匹配");  // 如果没有匹配成功，返回 null
}

// 创造虚拟节点
function createElement(tag, props = {}, children = []) {
    const vNode = new Vnode(tag, props, children);
    generateUniqueId(vNode)
    vModel(vNode);
    return vNode
}

// 模版解析 根据真实的DOM节点匹配需要处理的DOM节点
const interpolationRegex = /\{\{(.+?)\}\}/g; // 匹配{{}}里面的内容的正则表达式

// 处理{{}}插值语法
function parseText(text, data) {
    // 根据正则表达式获取到{{}}里面的字符串 然后根据字符串查找Data数据中做了数据响应式的值，用这个值替换掉原来的值
    return text.replace(interpolationRegex, (match, exp) => {
        // match {{exp}}代表找符合的完整字符串
        // 根据字符串获取data中特定的值
        return getValueFromData(exp.trim(), data)
    })
}

// 根据字符串获取data中特定的值
function getValueFromData(exp, data) {
    try {
        // 动态执行函数 返回data中exp的值
        const result = new Function("data", `with(data){return ${exp};}`)(data)
        return result
    } catch (error) {
        // console.error(`Error evaluating expression: ${exp}`, error);
        return exp;
    }
}

// 根据字符串创建或者修改data特定的值
function setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    // 逐层检查并创建嵌套对象
    let target = obj;
    keys.forEach(key => {
        if (!target[key]) {
            target[key] = {}; // 如果路径中间的对象不存在，创建它
        }
        target = target[key];
    });

    // 最后设置值
    target[lastKey] = value;
}

// 根据传入的真的Dom节点模板递归生成虚拟节点
function createVnodeFromDom(el, data) {
    // 检查 el 是否为 null 或者不包含子节点
    if (!el || !el.childNodes) {
        return null; // 无效节点返回 null
    }

    // 检查是否有v-if
    if (el.getAttribute("v-if")) {
        //处理节点有v-show的情况
        const frag = getValueFromData(el.getAttribute("v-if"), data); // 从data中获取布尔值
        if (!frag) return new EmptyVnode("v-if-empty"); // 为假值 生成为表示空节点的虚拟节点 这个节点后续是不会渲染的
    }

    // 获取元素的标签名
    const tag = el.tagName ? el.tagName.toLowerCase() : null;
    // 获取元素的属性值
    const props = {};
    // 如果属性值存在 则遍历添加到props中
    if (el.attributes) {
        Array.from(el.attributes).forEach(attr => {
            // 处理事件 @开头获取值
            if (attr?.name.startsWith('@')) {
                props[attr.name] = getValueFromData(attr.value, methods); // 从方法对象中获取方法函数
            } else if (attr?.name === "v-show") {
                //处理节点有v-show的情况
                props[attr.name] = getValueFromData(attr.value, data); // 从data中获取布尔值
            } else if (attr?.name === ":class") {
                props[attr.name] = attr.value;
            } else if (attr?.name.startsWith(':')) {
                // 去除掉:后的值作为属性名
                props[attr.name.substring(1)] = getValueFromData(attr.value, data);

                // 以后处理一下当为v-for元素 模版解析的时候还解析：key类似这种问题
            } else {
                props[attr.name] = attr.value;
            }
        })
    }

    let childrenHasVFor = 0;
    let VForItems = new Map();
    // /* console.log($1) */
    // 得到子节点列表
    const children = Array.from(el.childNodes).map((child, index) => {

        // 处理父节点是v-for
        if (el["vForData"]) {
            const { indexName,
                itemName,
                itemsName,
                vForIndex
            } = el["vForData"];

            const tempData = {
                [indexName]: vForIndex,
                [itemName]: getValueFromData(itemsName, data)[vForIndex],
                [itemsName]: getValueFromData(itemsName, data),
            };
            data = { ...data, ...tempData };
            // /* console.log($1) */
            // debugger;
            // debugger;
        }


        // 处理文本节点 3
        if (child.nodeType === 3) {
            // 解析文本节点
            const parsedText = parseText(child.textContent.trim(), data);
            // 
            const text = parsedText ? parsedText : "";
            // 生成文本虚拟节点
            const textVnode = text ? new Vnode(child.nodeName, {}, [], text) : null;
            return textVnode
        } else if (child.nodeType === 1) {
            // 获取子节点child节点的属性是否存在v-for属性值
            if (child.hasAttribute("v-for")) {
                childrenHasVFor++;// 加1 如果存在一个V-For
                const attrVForValue = child.getAttribute("v-for");
                const vForContainerNode = createVnodeFromDom(child, data);


                vForContainerNode.props["v-for-data"] = {
                    value: handleVForValue(attrVForValue),
                    elIndex: index,
                }
                // /* console.log($1) */
                // /* console.log($1) */
                // debugger;
                return vForContainerNode
            }
            // 处理元素节点 1 递归调用
            return createVnodeFromDom(child, data)
        }
    }).filter(child => child) // filter的作用是移除null或者为undefined的节点 确保是有效节点

    if (childrenHasVFor > 0) {
        let vForData;
        // 如果存在V-For 则需要对每一项进行操作
        children.forEach((child, index) => {
            if ("v-for-data" in child.props) {
                child.props["v-for-data"][index] = index;
                vForData = child.props["v-for-data"]
                const { indexName, itemName, itemsName } = vForData.value;
                const elIndex = child.props["v-for-data"]["elIndex"]
                const templateVnode = el.childNodes[elIndex].cloneNode(true);
                const items = getValueFromData(itemsName, data);
                child.props["childrenIndex"] = index;
                VForItems.set(child, []);

                for (let i = 0; i < items.length; i++) {

                    templateVnode["vForData"] = vForData.value;
                    templateVnode["vForData"]["vForIndex"] = i;
                    /* console.log($1) */
                    /* console.log($1) */
                    // console.dir(templateVnode["vForData"]);
                    // console.dir(templateVnode);
                    // debugger;
                    const cloneVnode = createVnodeFromDom(templateVnode, data);

                    VForItems.get(child).push(cloneVnode);
                }
                // VForItems.push({index:})

            }
            // 如果剩余为0则跳过循环

        });



        let deleteStartIndex = 0;
        let isStart = false;
        VForItems.forEach((VForItem, key) => {

            const childIndex = key["props"].childrenIndex;
            if (!isStart) {

                isStart = true;
                deleteStartIndex = childIndex;
            } else {

                deleteStartIndex = deleteStartIndex + VForItem.length + 1;
            }
            children.splice(deleteStartIndex, 1, ...VForItem)
        })

    }

    const newVnode = createElement(tag, props, children);


    if (el["vForData"]) {
        const keyIdValue = el.getAttribute("v-key");
        const { indexName,
            itemName,
            itemsName,
            vForIndex
        } = el["vForData"];
        if (keyIdValue !== indexName) {
            const keyValue = getValueFromData(keyIdValue, { [indexName]: indexName, [itemName]: data[itemsName][vForIndex] })
            newVnode.props["v-key"] = keyValue;
            newVnode.key = keyValue;

        } else {
            newVnode.props["v-key"] = vForIndex;
            newVnode.key = vForIndex;
        }
    }




    return newVnode
}

// 定义模板字符串转为节点
function templateToNode(template) {

    // 获取虚拟节点
    if (typeof template === "string") {
        template = document.getElementById('my-template').content.cloneNode(true).children[0];
        return template
    }

    if (template instanceof HTMLElement) {
        // 返回第一个子节点
        return template; // 也可以使用 container.children[0]
    } else {
        return new Error("无法解析模板元素")
    }
}

// 渲染函数
function render(template, data) {
    const templateNode = templateToNode(template)
    // const el = document.querySelector(template);// 获取真实的Dom节点
    return createVnodeFromDom(templateNode, data) // 将dom转换为虚拟Dom并插入数据
}

// 处理input元素
function vModel(VNode) {
    if (VNode.tag === 'textarea') {
        if (VNode.props["v-model"]) {
            // 设置初始值
            VNode.props.value = getValueFromData(VNode.props["v-model"], data);




            // 监听 input 事件来更新数据
            VNode.props['@input'] = (event) => {
                const newValue = event.target.value;

                setValueByPath(data, VNode.props["v-model"], newValue);
            };
        }
    } else if (VNode.tag === 'input' && VNode.props.type === "checkbox") {
        if (VNode.props["v-model"]) {
            // 复选框逻辑
            VNode.props.checked = Boolean(getValueFromData(VNode.props["v-model"], data));
            // 
            // 
            // 
            // debugger;

            VNode.props["@change"] = (event) => {
                const newValue = event.target.checked;

                setValueByPath(data, VNode.props["v-model"], newValue);
            };
        }
    } else if (VNode.tag === 'input') {
        if (VNode.props["v-model"]) {
            // 输入框逻辑
            // VNode.props.defaultValue = getValueFromData(VNode.props["v-model"], data);
            VNode.props.value = getValueFromData(VNode.props["v-model"], data);


            VNode.props['@input'] = (event) => {
                const newValue = event.target.value;

                setValueByPath(data, VNode.props["v-model"], newValue);
            };
        }
    } else if (VNode.tag === 'select') {
        if (VNode.props["v-model"]) {
            // 下拉框逻辑
            VNode.props.value = getValueFromData(VNode.props["v-model"], data);


            VNode.props["@change"] = (event) => {
                const newValue = event.target.value;

                setValueByPath(data, VNode.props["v-model"], newValue);
            };
        }
    }
}

/**
 * 解析自定义格式的对象字符串为 JavaScript 对象
 * @param {string} str - 需要解析的字符串，例如 "{active-word:2=3，hhasdf:false,fadsfew:true}"
 * @returns {Object} - 解析后的 JavaScript 对象
 */
function parseCustomObjectString(str) {
    // 1. 清理字符串：移除大括号并替换中文逗号
    str = str.trim();
    if (str.startsWith('{') && str.endsWith('}')) {
        str = str.slice(1, -1);
    }
    str = str.replace(/，/g, ','); // 替换中文逗号为英文逗号

    // 2. 拆分键值对
    const pairs = str.split(',');

    const obj = {};

    pairs.forEach(pair => {
        // 使用第一个冒号分割键和值，以支持值中可能包含冒号
        const index = pair.indexOf(':');
        if (index === -1) return; // 跳过无效的键值对

        let key = pair.slice(0, index).trim();
        let value = pair.slice(index + 1).trim();

        // 3. 解析值的类型
        if (/^true$/i.test(value)) {
            value = true;
        } else if (/^false$/i.test(value)) {
            value = false;
        } else if (!isNaN(value) && value !== '') {
            // 判断是否为有效的数字
            value = Number(value);
        } else {
            // 处理包含等号或其他符号的字符串
            value = value;
        }

        // 确保 key 是字符串（自动转换为字符串）
        obj[key] = value;
    });

    return obj;
}


// 虚拟Dom替换真实Dom的方式
function createRealDom(Vnode) {
    // 如果虚拟Dom是文本节点 
    if (typeof Vnode.text === "string") {
        const textNode = document.createTextNode(Vnode.text);
        Vnode.el = textNode
        return textNode
    }
    // 如果虚拟Dom是空节点
    if (isEmptyVnode(Vnode)) {
        const textNode = document.createComment(Vnode.comment);
        Vnode.el = textNode
        return textNode
    }

    // 如果虚拟Dom是元素节点
    // 根据虚拟Dom的tag标签创建一个真实元素
    const el = document.createElement(Vnode.tag);

    // 设置元素的属性
    if (Vnode.props) {
        // 遍历元素属性赋予真实元素
        for (let key in Vnode.props) {
            if (key.startsWith('@') && typeof Vnode.props[key] === 'function') {
                // 绑定事件处理器

                // @click.self
                // 分离出事件的类型
                const eventList = key.slice(1).split('.');

                const eventType = eventList[0];
                const options = {
                    // 开启冒泡 或者捕获
                    capture: eventList.includes('capture'),
                    passive: eventList.includes('passive'),
                }

                if (eventList.includes("self")) {
                    // 重新封装事件 只在当前元素被点击时触发
                    // 获取原始的事件回调函数
                    const originalEventHandler = Vnode.props[key];

                    // 封装事件处理函数
                    const wrappedEventHandler = function (event) {
                        // 只在点击的元素是当前绑定的元素时触发事件
                        if (event.target === event.currentTarget) {
                            // console.log("只在事件本身的时候触发")
                            // 调用原始事件处理函数
                            originalEventHandler(event);
                        }
                    };
                    // 绑定封装后的事件处理函数
                    el.addEventListener(eventType, wrappedEventHandler, options);
                } else {
                    el.addEventListener(eventType, Vnode.props[key], options);
                }



            } else {
                if (key === "checked" && typeof Vnode.props[key] === 'boolean') {
                    el.checked = Vnode.props[key];
                } else if (key === "v-show" && typeof Vnode.props[key] === 'boolean') {
                    el.style.display = Vnode.props[key] ? "" : "none";
                } else if (key === "ref") {
                    el.id = Vnode.props[key];
                } 

                /* else if (key === ":class") {
                    // 处理 class 添加一个新的类
                    // el.classList.add();
                    console.log(Vnode.props[key]);
                    const str = Vnode.props[key];
                    // 将属性名加上双引号，并将 true/false/null 改为字符串
                    const classInfo = parseCustomObjectString(str);

                    // const className = classInfo[0];
                    // const classValue = classInfo[1];
                    // 遍历对象
                    for (let className in classInfo) {
                        // 只有 true 才添加类
                        const string = classInfo[className];
                        const result = new Function(`return ${string}`)();
                        console.log(result);
                        debugger;
                        if (result) {
                            el.classList.add(className);
                        }
                        
                    }

                } */

                // setAttribute 会将所有的数值设置为字符串
                el.setAttribute(key, Vnode.props[key])
            }

        }
    }

    // 递归创建并追加子字节
    if (Vnode.children) {
        Vnode.children.forEach(child => {
            const Node = createRealDom(child);
            // 如果子节点不为空，添加到父节点中
            if (Node) {
                // 如果子节点是template节点 则将其内容添加到父节点
                if (child.tag === "template") {
                    // 确保 Node 是一个 <template> 元素
                    const templateNode = Node instanceof HTMLTemplateElement ? Node : null;

                    if (templateNode) {
                        // 克隆 template 的内容
                        // const templateContent = document.importNode(templateNode, true);
                        for (let childNode of templateNode.childNodes) {
                            // 确保父元素存在并且可以插入子节点
                            if (childNode) {
                                el.appendChild(childNode.cloneNode(true));
                            } else {
                                console.error("父元素未定义或不可用");
                            }
                        }
                    } else {
                        console.error("传入的 Node 不是一个有效的 <template> 元素");
                    }
                    // el.appendChild(Node)
                } else {
                    el.appendChild(Node);
                }

            }
        })
    }
    Vnode.el = el;

    // 如果虚拟节点存在ref属性则将其保存到data当中
    if (Vnode.props && Vnode.props.ref) {
        setValueByPath(refs, Vnode.props.ref, el);
    }
    return el
}


function mount(Vnode, container) {
    // 将虚拟Dom替换掉容器内容
    container.appendChild(createRealDom(Vnode))
    clearAndPrependNewNode(container, createRealDom(Vnode));
    initialMount = true;
}

function updateNode(oldVnode, newVnode) {
    /* console.dir($1) */
    /* console.log($1) */
    /* console.dir($1) */
    /* console.log($1) */
    const updatedNode = diff(oldVnode, newVnode);
    return updatedNode;
}

// 清空父元素节点 并添加新节点
function clearAndPrependNewNode(parentNode, newNode) {
    // 检查父节点是否有效
    if (!parentNode) {
        console.error('Parent node is not valid');
        return;
    }

    // 清空之前的子节点
    while (parentNode.firstChild) {
        parentNode.removeChild(parentNode.firstChild);
    }

    // 添加新节点
    parentNode.appendChild(newNode);
}

let initialMount = false;

// 渲染函数的入口
function readerApp(template, data, bindElem) {
    const newVnode = render(template, data); // 创建了虚拟Dom


    const container = typeof bindElem === "string" ? document.querySelector(bindElem) : bindElem;
    if (!initialMount) {
        // 初次渲染则执行
        // 将虚拟Dom替换真实Dom
        mount(newVnode, container);
    } else {
        updateNode(currentVnode, newVnode);
    }
    currentVnode = newVnode;
}
