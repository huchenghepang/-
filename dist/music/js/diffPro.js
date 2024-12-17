function diff(oldVNode, newVNode) {

    // 如果新旧都是空节点
    if (isEmptyVnode(oldVNode) && isEmptyVnode(newVNode)) {
        newVNode.el = oldVNode.el;
        return;
    }

    // 如果老节点是template
    if (oldVNode.tag === "template") {
        // oldVNode.el = (newVNode.render().el);
        // return;
        /* console.log($1) */;
    }

    // 如果新旧节点都有子节点


    // 如果新节点是空节点则移除旧节点
    if (isEmptyVnode(newVNode)) {
        const textNode = document.createComment(newVNode.comment);
        newVNode.el = textNode;
        // 将老的节点替换掉
        oldVNode.el.replaceWith(textNode);
        return
    }

    // 如果旧节点是空节点 但是新节点不是空节点则 创建插入新节点
    if (isEmptyVnode(oldVNode)) {
        const newElement = createRealDom(newVNode);
        newVNode.el = newElement;
        // parentEl.appendChild(newElement); // 需要根据上下文调整
        // 将老的节点替换掉
        oldVNode.el.replaceWith(newElement);
        return;
    }

    // 如果两个节点相同，则直接返回
    if (oldVNode === newVNode) return;
    // 如果新旧节点都是空节点则直接返回



    // 如果新节点是文本节点
    if (typeof newVNode.text === "string" && newVNode.tag === "#text") {
        if (oldVNode.text !== newVNode.text) {
            oldVNode.el.textContent = newVNode.text;
        }
        newVNode.el = oldVNode.el;
        return;
    }

    // 如果节点类型不同，或者 uniqueId 不同，替换节点
    if (oldVNode.tag !== newVNode.tag || oldVNode.uniqueId !== newVNode.uniqueId) {
        /* console.log($1) */;
        // 创建新的真实元素节点
        const newElement = createRealDom(newVNode);
        newVNode.el = newElement;
        // 将老的节点替换掉
        oldVNode.el.replaceWith(newElement);
        // /* console.log($1) */;
        // /* console.log($1) */;
        return;
    }

    // 节点标签相同，更新差异
    const oldProps = oldVNode.props || {};
    const newProps = newVNode.props || {};
    updateProps(oldVNode.el, oldProps, newProps);
    newVNode.el = oldVNode.el;

    // 处理子节点
    updateChildren(oldVNode.el, oldVNode.children, newVNode.children);
}

function updateChildren(el, oldChildren, newChildren) {
    let oldStartIdx = 0;
    let oldEndIdx = oldChildren.length - 1;
    let newStartIdx = 0;
    let newEndIdx = newChildren.length - 1;

    let oldStartVNode = oldChildren[oldStartIdx];
    let oldEndVNode = oldChildren[oldEndIdx];
    let newStartVNode = newChildren[newStartIdx];
    let newEndVNode = newChildren[newEndIdx];

    // 生成旧节点的 key 或 uniqueId 映射
    const oldKeyMap = new Map();
    oldChildren.forEach((child, index) => {
        if (child.key || child.uniqueId) {
            oldKeyMap.set(child.key || child.uniqueId, { node: child, index });
        }
    });

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (!oldStartVNode) {
            oldStartVNode = oldChildren[++oldStartIdx];
        } else if (!oldEndVNode) {
            oldEndVNode = oldChildren[--oldEndIdx];
        } else if (oldStartVNode.key === newStartVNode.key || oldStartVNode.uniqueId === newStartVNode.uniqueId) {
            diff(oldStartVNode, newStartVNode);
            oldStartVNode = oldChildren[++oldStartIdx];
            newStartVNode = newChildren[++newStartIdx];
        } else if (oldEndVNode.key === newEndVNode.key || oldEndVNode.uniqueId === newEndVNode.uniqueId) {
            diff(oldEndVNode, newEndVNode);
            oldEndVNode = oldChildren[--oldEndIdx];
            newEndVNode = newChildren[--newEndIdx];
        } else if (oldStartVNode.key === newEndVNode.key || oldStartVNode.uniqueId === newEndVNode.uniqueId) {
            // 移动旧头节点到旧尾节点位置
            diff(oldStartVNode, newEndVNode);
            el.insertBefore(oldStartVNode.el, oldEndVNode.el.nextSibling);
            oldStartVNode = oldChildren[++oldStartIdx];
            newEndVNode = newChildren[--newEndIdx];
        } else if (oldEndVNode.key === newStartVNode.key || oldEndVNode.uniqueId === newStartVNode.uniqueId) {
            // 移动旧尾节点到旧头节点位置
            diff(oldEndVNode, newStartVNode);
            el.insertBefore(oldEndVNode.el, oldStartVNode.el);
            oldEndVNode = oldChildren[--oldEndIdx];
            newStartVNode = newChildren[++newStartIdx];
        } else {
            const oldChildEntry = oldKeyMap.get(newStartVNode.key || newStartVNode.uniqueId);
            if (oldChildEntry) {
                const oldChildToMove = oldChildEntry.node;
                diff(oldChildToMove, newStartVNode);
                el.insertBefore(oldChildToMove.el, oldStartVNode.el);
                oldChildren[oldChildEntry.index] = null; // 标记为已处理
            } else {
                // 创建新节点并插入
                const newElement = createRealDom(newStartVNode);
                newStartVNode.el = newElement;
                el.insertBefore(newElement, oldStartVNode.el);
            }
            newStartVNode = newChildren[++newStartIdx];
        }
    }

    // 处理剩余的新节点
    if (newStartIdx <= newEndIdx) {
        const referenceNode = newChildren[newEndIdx + 1] ? newChildren[newEndIdx + 1].el : null;
        while (newStartIdx <= newEndIdx) {
            const newChild = newChildren[newStartIdx];
            const newElement = createRealDom(newChild);
            newChild.el = newElement;
            el.insertBefore(newElement, referenceNode);
            newStartIdx++;
        }
    }

    // 处理剩余的旧节点
    if (oldStartIdx <= oldEndIdx) {
        while (oldStartIdx <= oldEndIdx) {
            const oldChild = oldChildren[oldStartIdx];
            if (oldChild) {
                el.removeChild(oldChild.el);
            }
            oldStartIdx++;
        }
    }
}
for (let i = 0; i < 5; i++) {
    /* console.log($1) */;
}
for (let i = 0; i < 5; i++) {
    /* console.log($1) */;
}

function updateProps(el, oldProps, newProps) {

    // 移除在老节点中存在但在新节点中不存在的属性
    for (const key in oldProps) {
        if (!(key in newProps)) {
            el.removeAttribute(key);
        }
    }

    // 添加或更新新属性
    for (const key in newProps) {
        // 新虚拟节点中的属性在老虚拟节点中不存在 或者两者不相同了 处理
        if (!(key in oldProps) || newProps[key] !== oldProps[key]) {
            if (key.startsWith('@') && typeof newProps[key] === 'function') {
                // 处理事件
                const eventType = key.slice(1).toLowerCase();
                if (oldProps[key]) {
                    el.removeEventListener(eventType, oldProps[key]);
                }
                el.addEventListener(eventType, newProps[key]);

            } else if (key === 'style' && typeof newProps[key] === 'object') {
                for (const styleName in newProps[key]) {
                    el.style[styleName] = newProps[key][styleName];
                }
            } else {
                if (key === "value" && typeof newProps[key] === 'string') {
                    el.value = newProps[key];
                    // 
                    // 
                    // debugger;
                } else if (key === "checked" && typeof newProps[key] === 'boolean') {

                    el.checked = newProps[key];
                } else if (key === "v-show" && typeof newProps[key] === "boolean") {
                    /* console.log($1) */;
                    // 处理v-show
                    el.style.display = newProps[key] ? "" : "none";
                }
                el.setAttribute(key, newProps[key]);
            }
        }
    }
}
