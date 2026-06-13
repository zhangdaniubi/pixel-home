# PIXEL.HOME - 像素复古个人主页

> 8BIT 像素画风 · 纯前端 · 零后端 · Cloudflare Pages 一键部署

---

## 📦 项目结构

```
pixel-home/
├── index.html          # 主页面（含全部模块结构）
├── css/
│   └── style.css       # 像素风样式（800+行）
├── js/
│   └── app.js          # 核心逻辑（600+行）
└── README.md           # 本说明文档
```

---

## 🚀 部署到 Cloudflare Pages（零配置）

### 方法一：直接拖拽部署（最快）

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单选择 **Workers & Pages**
3. 点击 **Create** → **Pages** → **Upload assets**
4. 项目名称填 `pixel-home`（或自定义）
5. 将整个 `pixel-home` 文件夹**直接拖拽**到上传区域
6. 点击 **Deploy** → 等待 30 秒 → 完成 ✅

### 方法二：通过 Git 部署

1. 将项目上传到 GitHub 仓库
2. Cloudflare Pages → **Connect to Git**
3. 选择仓库 → 构建设置留空（无需构建命令）
4. **Deployment output directory** 填 `./` 或留空
5. 点击 **Save and Deploy**

---

## 🎨 如何修改配色

### 方式一：在网页内修改（推荐）

打开网页 → 点击导航栏 **⚙ 设置** → 在"像素主题色"中选择预设颜色或使用取色器自定义。

### 方式二：修改 CSS 默认色

编辑 `css/style.css` 第 20 行：

```css
--pixel-accent: #888888;   /* 改成你喜欢的颜色 */
```

### 方式三：修改主题预设选项

编辑 `index.html` 中设置模块的 `.theme-color` 按钮（约第 170 行）：

```html
<!-- 修改 data-theme 和 background 颜色即可 -->
<button class="theme-color" data-theme="#YOUR_COLOR" style="background:#YOUR_COLOR"></button>
```

---

## 🖼 如何替换默认头像

### 方式一：在网页内上传（推荐）

打开网页 → **⚙ 设置** → **上传头像** → 选择本地图片（自动压缩为 128×128）

### 方式二：替换代码中的默认占位符

编辑 `js/app.js` 中所有 `'像素旅人'` 和默认头像逻辑。

---

## ✏ 如何修改默认昵称

编辑 `js/app.js` 中 `LS.get('pixel_nickname', '像素旅人')` 的第二个参数，把 `'像素旅人'` 换成你的昵称。

---

## 🔧 功能说明

| 模块 | 功能 | 存储方式 |
|------|------|----------|
| **首页** | 个人信息卡片、数据统计 | localStorage |
| **相册** | 拖拽上传、预览、删除、分类管理 | IndexedDB |
| **笔记** | 新建/编辑/删除、富文本、标签搜索 | localStorage |
| **书签** | 添加/编辑/删除、分组、搜索、批量删除 | localStorage |
| **剪贴板** | 文本管理、密钥生成、历史记录 | IndexedDB + localStorage |
| **设置** | 主题色、头像、昵称、数据导出/导入/清除 | localStorage |

---

## 💾 数据说明

- 所有数据 **100% 存储在浏览器本地**
- **不上传任何服务器**，完全离线可用
- 照片存储在 IndexedDB（容量 > 50MB）
- 文本数据存储在 localStorage（~5MB）
- 支持 **JSON 导出/导入** 实现数据备份和迁移
- 刷新页面数据不丢失

---

## 📱 响应式适配

| 设备 | 宽度 | 适配特性 |
|------|------|----------|
| 电脑 | > 768px | 完整体验、多列布局 |
| 平板 | 481-768px | 汉堡菜单、单列布局 |
| 手机 | ≤ 480px | 汉堡菜单、紧凑布局、3列相册 |

---

## ⚠ 注意事项

- **剪贴板"跨设备同步"**：由于纯前端无服务器，密钥同步仅在**同一浏览器**内生效。真正的跨设备同步需要后端服务。
- 清除浏览器缓存/数据会导致所有数据丢失，建议定期使用**导出功能**备份。
- IndexedDB 在隐私模式下可能受限。

---

## 🛠 技术栈

- 纯 HTML5 + CSS3 + Vanilla JavaScript
- IndexedDB（图片存储）
- localStorage（文本数据）
- Google Fonts: Press Start 2P + VT323
- 零框架、零依赖、零构建工具

---

PIXEL.HOME © 2026 · 8BIT FOREVER
