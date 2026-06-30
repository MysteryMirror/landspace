# mystery-land-page — AGENTS.md

> **fcsoft.cc / www.fcsoft.cc 落地页项目。**
> 访问入口独立于 `fanovi-dev-tool`（后者绑定 `fanovi.fcsoft.cc:8000`），
> 两者部署完全解耦、互不影响。

---

## 0. Skill 需求

本项目 AI 辅助开发必须遵循以下 skill 约定。**设计相关产出必须先走 frontend-design 的两遍式流程（brainstorm token → 自我 critique → 通过后才写码），design tokens 从 awesome-design-md 库中挑选并改写、不得照抄品牌。**

| Skill | 用途 | 是否使用 |
|---|---|---|
| **frontend-design** | 设计方法论：避免 AI 默认审美（暖奶油+衬线 / 近黑+酸绿 / 报纸版心三套）、token 规划、自我 critique、写作即设计 | ✅ **使用** |
| **awesome-design-md** | 真实网站 design tokens 库（73+ 品牌 `DESIGN.md`），提供颜色/字体/间距/动效的权威参考 | ✅ **使用** |
| **GSAP** | 动效引擎：scroll reveal、hero signature moment、orchestrated animation（仅作为依赖库，非 skill） | ✅ **使用** |
| ~~bfm-ui-skill~~ | BFM 工业风组件库（黄色 `#FFD702` 体系） | ❌ **不使用** |

### 0.1 使用约束
- **frontend-design 与 awesome-design-md 是互补关系**：前者是"怎么做"的方法论，后者是"参考什么"的素材库。两者结合使用。
- **落地页不允许复用 BFM 黄黑工业风**（那是 fanovi-dev-tool 的内部工具风格）。门面需要独立的设计语言。
- **GSAP 动效遵循 frontend-design 的"orchestrate one moment"原则**：集中做一个 signature moment，其余保持克制；必须响应 `prefers-reduced-motion`。
- 设计方向、配色、字体、页面 sections **由用户后续指定**，本文件不预设。

---

## 1. 部署方式（local-commit → server-deploy）

**完全参考 `fanovi-dev-tool` 的部署模式**：本地开发机写代码 → `git commit` → `git push`；服务器 `git pull` → 本地 `docker build`（不依赖 registry）→ 停旧容器 → 起新容器 → 健康检查。

### 1.1 与 fanovi-dev-tool 的部署差异

| 维度 | fanovi-dev-tool | **mystery-land-page** |
|---|---|---|
| 性质 | Flask API + Vue SPA（Python 运行时） | **纯静态站**（HTML/CSS/JS） |
| Secrets | `backend/.env` + `config/secret_key.txt`（运行时注入） | **无**（纯静态，无密钥） |
| Docker 镜像 | `python:3.11-slim` 跑 Flask | **多阶段：node build → nginx serve** |
| 容器内端口 | 8000 | **80（nginx）** |
| Volume 挂载 | config / client / data | **无**（产物打进镜像） |
| 容器名 | `fanovi-app` | **`fcsoft-landing`** |
| 镜像名 | `fanovi-dev-tool` | **`fcsoft-landing`** |
| 网络 | `app-net` | **`app-net`（共享，已存在）** |

### 1.2 本地开发流程

```bash
cd D:/PythonProjects/mystery-land-page
# 1. 开发（Vite dev server，端口待定）
npm install
npm run dev

# 2. 构建产物验证
npm run build

# 3. 提交
git add -A
git commit -m "feat: 简短描述"
git push origin main
```

### 1.3 服务器部署流程（43.131.227.116）
服务器用户名：ubuntu 
服务器认证：使用 SSH key 或服务器侧安全凭据，不在仓库中保存密码。
服务器操作：如需自动化，使用 paramiko 读取本地安全配置或环境变量。
```bash
# SSH 到服务器后，在项目目录执行
cd /opt/docker/mystery-land-page
git pull --ff-only
./redeploy.sh          # 内部：docker build → stop/rm 旧容器 → run 新容器 → health check
```

`redeploy.sh` 行为（参考 fanovi，适配纯静态站）：
1. `git pull`（同步源码；本地有改动自动 stash）
2. `docker build` 本地构建镜像 `fcsoft-landing:latest`（多阶段：node 阶段 `npm run build`，nginx 阶段 COPY 产物）——**不 push 到任何 registry**
3. `docker stop` + `docker rm` 旧的 `fcsoft-landing` 容器
4. `docker run -d --name fcsoft-landing --network app-net --restart unless-stopped fcsoft-landing:latest`
   - **无 `--env-file`、无 `-v` 挂载**（纯静态，无密钥无配置）
5. 健康检查：`docker exec fcsoft-landing wget -qO- http://127.0.0.1/`（nginx 返回 index.html 即 OK）

### 1.4 域名路由（主机 nginx 单独配置， redeploy.sh 不触碰）

主机上已有一个 `nginx` 容器负责 TLS 终结。新增一个 `server` 块，把 `fcsoft.cc` / `www.fcsoft.cc` 反代到 `fcsoft-landing:80`：

```nginx
server {
    listen 443 ssl;
    server_name fcsoft.cc www.fcsoft.cc;

    location / {
        proxy_pass http://fcsoft-landing:80;
        proxy_set_header Host $host;
    }
}
```

> ⚠️ 这一步**不在 `redeploy.sh` 范围内**——主机 nginx 是独立容器，改动需单独操作。落地页容器只要进了 `app-net`，主机 nginx 就能通过容器名 `fcsoft-landing` 解析到它。

---

## 2. 服务器与基础设施（复用 fanovi 既有环境）

- **服务器**：`43.131.227.116`，路径 `/opt/docker/mystery-land-page`
- **Docker 网络**：`app-net`（已存在，与 `fanovi-app` / `nginx` / `frps` 同网络）
- **TLS**：由主机 `nginx` 容器统一终结（`fcsoft.cc` 证书需提前签发/配置）
- **镜像存储**：本地 daemon，无 registry

---

## 3. 规划目录结构（待建，仅作占位）

```
mystery-land-page/
├── AGENTS.md                ← 本文件
├── Dockerfile               # 多阶段：node build → nginx（待建）
├── nginx/site.conf          # 容器内 nginx 站点配置（待建）
├── build.sh                 # 本地构建镜像（待建，参考 fanovi/build.sh）
├── redeploy.sh              # 服务器一键部署（待建，参考 fanovi/redeploy.sh）
├── .dockerignore / .gitignore
├── package.json             # Vite + GSAP（待建）
├── index.html               # 落地页入口（待建）
└── src/                     # 源码（待建）
```

---

## 4. 待定事项（由用户后续指定）

> 以下是框架预留的占位，等用户确认后填充。**AI 不得擅自决定。**

- [ ] **技术栈最终选型**：前端框架（原生 TS / Vue / 其他）——当前仅确定 Vite + GSAP
- [ ] **设计方向**：参考 awesome-design-md 中哪些品牌、整体视觉语言
- [ ] **页面内容**：sections、文案、CTA
- [ ] **Vite dev server 端口**、仓库默认分支名（main / master）
- [ ] `fcsoft.cc` TLS 证书是否已就绪

---

## 5. 迭代约束（AI 协作规则）

1. **设计相关任务**：必须先调用 `frontend-design` skill 走两遍式流程，再用 `awesome-design-md` 挑 tokens，**禁止**使用 `bfm-ui-skill`。
2. **动效**：用 GSAP，集中做一个 signature moment，必须响应 `prefers-reduced-motion`。
3. **部署**：严格遵循 §1 的 local-commit → server-deploy 流程，不引入 registry，不改动主机 nginx（除 §1.4 明确的新增 server 块）。
4. **§4 待定事项未确认前**，不擅自实现具体设计/内容。
