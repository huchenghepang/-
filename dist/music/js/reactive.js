const targetMap = new WeakMap();
let activeEffect = null;
const effectStack = [];


function track(target, key) {
    if (activeEffect) {
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            // 如果不存在当前对象的依赖地图
            depsMap = new Map();
            targetMap.set(target, depsMap);
        }
        // 如果存在
        let dep = depsMap.get(key);
        if (!dep) {
            // 如果不存在该属性的依赖
            dep = new Set();
            depsMap.set(key, dep);
        }
        // 如果存在则添加 因为set结构是唯一的所以 相同的就不会添加跟踪
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect)
            activeEffect.deps.push(dep);//这里将 dep 添加到 effect 的 deps 数组中
        }
    }
}

// 处理批量更新
let jobQueue = new Set();
let isFlushing = false; // 是否更新

// 根据依赖派发更新
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (depsMap) {
        // 是否存在属性对应的依赖 
        const dep = depsMap.get(key);
        if (dep) {
            // 触发属性所有的副作用函数
            dep.forEach(effect => {
                // 添加到微任务队列 等待宏任务完成后执行
                jobQueue.add(effect)
            });
        };
        // 如果当前没有在批量执行更新 则执行批量更新的微任务
        if (!isFlushing) {
            isFlushing = true;
            Promise.resolve().then(flushQueue) // 这里调用flushQueue
        }
    }
}


// 批量执行更新队列
function flushQueue() {
    // 批量执行副作用函数
    jobQueue.forEach(effect => effect());
    jobQueue.clear() // 执行完成清空副作用函数
    isFlushing = false; // 没有正在批量执行更新
}
function shallowReactive(obj) {
    if (typeof obj !== "object") {
        new Error("obj of type must be Object ")
    }
    return new Proxy(obj, {
        get(target, prop) {
            // 记录操作 记录依赖

            track(target, prop);
            // 
            return Reflect.get(target, prop);
        },
        set(target, prop, value) {

            // 如果value是DOM元素节点则不要代理直接返回
            


            const result = Reflect.set(target, prop, value);
            trigger(target, prop)
            return result;
        }
    });
}

// 实现深层的响应式

// 响应式缓存 避免重复的代理

const reactiveMap = new WeakMap()
function reactive(target) {
    // 只代理对象类型
    if (typeof target !== "object" || target === null) {
        console.error("Reactive must be an object")
        return target
    }

    // 检查是否已经实现了代理 如果实现了则使用缓存
    const existingProxy = reactiveMap.get(target)
    if (existingProxy) {
        // console.error("Please do not proxy an object more than once")
        return existingProxy
    }
    // 实现代理 深层 递归迭代
    const proxy = new Proxy(target, {
        get(target, prop, receiver) {
            /*      // receiver 保持了对this的正确引用 方便对嵌套对象进行代理
                 // 如果结果是对象则递归进行代理
             */
            const result = Reflect.get(target, prop, receiver);
            track(target, prop); // 跟踪依赖

            // 如果结果是对象则递归进行代理
            if (typeof result === "object" && result !== null) {
                return reactive(result);
            }

            // 拦截数组的变异方法
            if (Array.isArray(target) && ['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
                return function (...args) {
                    const oldLength = target.length;
                    const methodResult = Array.prototype[prop].apply(target, args); // 执行原生方法
                    const newLength = target.length;

                    // 如果数组长度发生了变化，手动触发副作用
                    if (newLength !== oldLength) {
                        trigger(target, 'length');
                    }
                    return methodResult;
                };
            }

            return result;
        },
        set(target, prop, value, receiver) {
            const oldValue = target[prop];
            const result = Reflect.set(target, prop, value, receiver);
            if (oldValue !== value) {
                // 如果新值不等于旧值 则派发更新
                trigger(target, prop);
            }
            return result
        },
        deleteProperty(target, prop) {
            const existingKey = prop in target;
            // 删除属性
            const result = Reflect.deleteProperty(target, prop);
            if (existingKey) {
                trigger(target, prop);
            }
            return result
        }
    })

    // 将代理存入缓存中
    reactiveMap.set(target, proxy)
    return proxy
}



function effect(effectCallback) {

    // 定义包装的副作用函数
    const wrappedEffectCallback = () => {
        cleanupEffect(effectCallback);
        activeEffect = wrappedEffectCallback;
        // 处理嵌套的副作用函数调用
        effectStack.push(wrappedEffectCallback); // 入栈
        effectCallback();
        effectStack.pop() // 出栈
        activeEffect = effectStack[effectStack.length - 1]
    };
    // 定义副作用函数
    wrappedEffectCallback.deps = [];
    // 调用封装的副作用函数
    wrappedEffectCallback()
}

// 清除副作用函数依赖的数据 避免重复依赖
function cleanupEffect(effectCallback) {
    if (!effectCallback.deps) return
    for (let dep of effectCallback.deps) {
        // 清空副作用函数依赖的数据上关联的当前的依赖
        dep.delete(effectCallback);
    }
    effectCallback.deps.length = 0;

}