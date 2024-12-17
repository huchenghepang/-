function throttle(func, ms) {
    let isThrottle = false, savedThis, savedArgs;
    function wrapper() {
        if (isThrottle) {
            savedArgs = arguments;
            savedThis = this;
            return ;
        }
        isThrottle = true;
        func.apply(this, arguments);
        setTimeout(()=> {
            isThrottle =false
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs)
            }
            savedArgs = savedThis = null;
        }, ms);
    }
    return wrapper
}