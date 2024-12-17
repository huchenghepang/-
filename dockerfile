# 使用官方 Nginx 镜像
FROM nginx:alpine

# 复制本地的 nginx 配置文件到容器中
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# 复制 dist 文件夹到容器中
COPY dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80
