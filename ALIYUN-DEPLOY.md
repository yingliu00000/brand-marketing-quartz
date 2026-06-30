# 阿里云部署说明

这个仓库构建后会生成静态目录 `public/`，阿里云部署推荐两种方式：

## 方案 A：OSS 静态网站托管

适合只要一个公开链接、低维护、成本低的知识库。

1. 在阿里云 OSS 创建 Bucket。
2. 开启“静态网站托管”。
3. 默认首页设置为 `index.html`。
4. 错误页面建议也设置为 `index.html`，以兼容 Quartz SPA 路由。
5. 本地构建：

```powershell
npm run build
```

6. 上传 `public/` 目录到 OSS Bucket 根目录。

## 方案 B：ECS + Nginx

适合你已经有服务器，或者后续要绑定域名、加访问控制。

服务器目录建议：

```bash
/var/www/brand-marketing-quartz
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.example.com;
    root /var/www/brand-marketing-quartz;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

从 Windows 上传：

```powershell
scp -r public/* root@YOUR_SERVER_IP:/var/www/brand-marketing-quartz/
```

如果使用非 root 用户，先上传到用户目录，再在服务器上 `sudo rsync` 到 `/var/www/brand-marketing-quartz/`。
