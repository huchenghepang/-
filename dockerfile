# 使用官方 Nginx 镜像
FROM nginx:alpine

# 复制本地的 nginx 配置文件到容器中
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 复制 public 文件夹到容器中
COPY dist /usr/share/nginx/html/public

# 暴露端口
EXPOSE 80
