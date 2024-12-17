// 浏览器是否支持新特性API

if (!('IntersectionObserver' in self)) {
  alert('您的浏览器不支持 Intersection Observer API，请使用现代浏览器');
}
if(!("showOpenFilePicker" in self)){
    alert('您的浏览器不支持 File Open Picker API，请使用现代浏览器');
}