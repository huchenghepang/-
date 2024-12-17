function parseLrc(lrc) {
    console.log(lrc);
    // 将歌词文本按行分割
    const lines = lrc.split('\n');
    // 初始化存储歌词的数组
    const result = [];

    // 正则表达式，匹配 [mm:ss.SSS] 形式的时间戳
    const timeExp = /\[(\d{2}):(\d{2})\.(\d{3})\]/;

    // 遍历每一行歌词
    lines.forEach(line => {
        const match = timeExp.exec(line); // 匹配时间戳
        if (match) {
            // 获取时间的分钟、秒、毫秒
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);

            // 计算总时间（以毫秒为单位）
            const timeInMs = minutes * 60 * 1000 + seconds * 1000 + milliseconds;

            // 获取歌词部分（去除时间戳）
            const lyric = line.replace(timeExp, '').trim();

            // 如果歌词不为空，保存到数组中
            if (lyric) {
                result.push({ time: timeInMs, lyric,seconds: timeInMs/1000,minutesSeconds:`${minutes}:${seconds}`});
            }
        }
    });

    return result;
}

function parseLrcPro(lrc) {
    // 将歌词文本按行分割
    const lines = lrc.split('\n');
    // 初始化存储歌词的数组
    const result = [];

    // 正则表达式，匹配不同时间戳格式，如 [mm:ss.SS], [mm:ss.SSS], [mm:ss]
    const timeExp = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/;

    // 遍历每一行歌词
    lines.forEach(line => {
        const match = timeExp.exec(line); // 匹配时间戳
        if (match) {
            // 获取时间的分钟、秒
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            // 获取可选的毫秒部分，如果不存在则为0
            const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;

            // 计算总时间（以毫秒为单位）
            const timeInMs = minutes * 60 * 1000 + seconds * 1000 + milliseconds;

            // 获取歌词部分（去除时间戳）
            const lyric = line.replace(timeExp, '').trim();

            // 如果歌词不为空，保存到数组中
            if (lyric) {
                result.push({ time: timeInMs, lyric, seconds: timeInMs / 1000, minutesSeconds: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}` });
            }
        }
    });

    return result;
}
