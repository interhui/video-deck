# 电影管理程序 (Movie Management)

基于 Electron 的电影管理应用，提供图形界面 (GUI) 和命令行界面 (CLI) 两种使用方式。电影按分类组织，以 NFO 文件格式存储并配有封面图片。

## 特性清单

### 核心功能

- **电影管理**：添加、编辑、删除电影，支持评分、标签、演员等元数据
- **分类管理**：自定义电影分类（电影、电视剧、纪录片、动漫等）
- **标签系统**：灵活的标签管理，支持多标签筛选
- **演员管理**：维护演员信息及照片
- **电影盒子**：创建自定义电影合集/播放列表
- **搜索功能**：按名称、标签、分类等条件搜索电影
- **统计信息**：查看影库统计数据（总数、评分分布、播放时长等）

### GUI 特性

- 现代化深色/浅色主题
- 海报墙视图（网格/列表模式）
- 电影详情窗口
- 快捷键支持
- 自动扫描和刷新影库

### CLI 特性

- 完整的电影管理命令
- 分类、标签、盒子管理
- 多种输出格式（表格、JSON、简单文本）
- 支持全局选项配置路径

## 配置说明

配置文件位于 `config/settings.json`：

```json
{
  "appearance": {
    "theme": "dark",              // 主题: dark | light
    "language": "zh-CN",          // 语言
    "showCategoryIcons": true,    // 显示分类图标
    "showDescriptions": true,     // 显示描述
    "enableAnimations": true      // 启用动画
  },
  "layout": {
    "sidebarWidth": 200,           // 侧边栏宽度
    "posterSize": "large",         // 海报尺寸: small | medium | large
    "columns": 6,                  // 网格列数
    "viewMode": "grid",            // 视图模式: grid | list
    "sortBy": "name-asc",          // 排序字段
    "sortOrder": "asc"             // 排序方向: asc | desc
  },
  "library": {
    "moviesDir": "movies",         // 电影库目录
    "actorPhotoDir": "actor",      // 演员照片目录
    "scanOnStartup": true,         // 启动时扫描
    "autoRefresh": false,          // 自动刷新
    "showHiddenFiles": false,      // 显示隐藏文件
    "includeSubfolders": true      // 包含子文件夹
  },
  "shortcuts": {
    "openSearch": "Ctrl+F",        // 打开搜索
    "movieDetails": "Ctrl+D",      // 查看详情
    "editMovie": "Ctrl+E",         // 编辑电影
    "deleteMovie": "Delete",       // 删除电影
    "refreshLibrary": "Ctrl+R",    // 刷新影库
    "openSettings": "Ctrl+S",      // 打开设置
    "toggleFavorite": "Ctrl+F"     // 切换收藏
  },
  "notifications": {
    "enableStartup": true,         // 启动通知
    "enableLibraryUpdate": true,   // 影库更新通知
    "showPlayReminders": true      // 播放提醒
  },
  "import": {
    "autoImport": false,           // 自动导入
    "importPaths": []              // 导入路径列表
  },
  "moviebox": {
    "movieboxDir": "boxes"         // 电影盒子目录
  }
}
```
首次使用需要在“电影”->“配置”中设置
- moviesDir 电影库目录
- movieboxDir 电影盒子目录
- actorPhotoDir 演员照片目录

### 分类配置

分类定义在 `config/categories.json`：

```json
{
  "categories": [
    { "id": "movie", "name": "电影", "color": "#003791", "order": 1 },
    { "id": "tv", "name": "电视剧", "color": "#107C10", "order": 2 },
    { "id": "documentary", "name": "纪录片", "color": "#E60012", "order": 3 },
    { "id": "anime", "name": "动漫", "color": "#888888", "order": 4 }
  ]
}
```

### 标签配置

标签定义在 `config/tags.json`：

```json
[
  { "id": "action", "name": "动作" },
  { "id": "adventure", "name": "冒险" },
  { "id": "horror", "name": "恐怖" }
]
```

## 启动方式

### GUI 启动

```bash
# 安装依赖
npm install

# 启动 GUI 应用
npm start

# 启动并启用日志
npm run dev
```

### CLI 基本使用

```bash
# 安装后全局使用
npm install -g .
movie-mgt --help

# 或直接运行
node src/cli/index.js --help
```

#### 电影命令

```bash
# 列出所有电影
movie-mgt movie list
movie-mgt m ls                              # 使用别名

# 按分类筛选
movie-mgt movie list -c movie               # 筛选电影分类

# 按标签筛选
movie-mgt movie list -t action              # 筛选动作标签

# 搜索电影
movie-mgt movie search <关键词>

# 查看电影详情
movie-mgt movie show <电影ID>

# 添加电影
movie-mgt movie add <名称> <分类ID> --director <导演> --actors <演员>

# 编辑电影
movie-mgt movie edit <电影ID> --name <新名称> --rating 5

# 删除电影
movie-mgt movie delete <电影ID>

# 更新电影状态
movie-mgt movie status <电影ID> <状态>
```

#### 电影盒子命令

```bash
# 列出所有盒子
movie-mgt box list

# 查看盒子详情
movie-mgt box show <盒子名称>

# 创建盒子
movie-mgt box create <盒子名称> --description <描述>

# 编辑盒子
movie-mgt box edit <盒子名称> --name <新名称>

# 删除盒子
movie-mgt box delete <盒子名称>

# 添加电影到盒子
movie-mgt box add <盒子名称> <电影ID>

# 从盒子移除电影
movie-mgt box remove <盒子名称> <电影ID>
```

#### 分类命令

```bash
# 列出所有分类
movie-mgt category list

# 查看分类详情
movie-mgt category show <分类ID>
```

#### 标签命令

```bash
# 列出所有标签
movie-mgt tag list

# 创建标签
movie-mgt tag create <标签ID> <标签名称>

# 删除标签
movie-mgt tag delete <标签ID>
```

#### 配置命令

```bash
# 显示当前配置
movie-mgt config show

# 获取配置项
movie-mgt config get <键名>

# 设置配置项
movie-mgt config set <键名> <值>

# 重置为默认配置
movie-mgt config reset
```

#### 统计命令

```bash
# 显示影库统计
movie-mgt stats

# 按分类统计
movie-mgt stats -c movie

# 显示播放时长统计
movie-mgt stats --playtime
```

### CLI 全局选项

```bash
movie-mgt [选项] <命令>

选项:
  -V, --version              显示版本号
  -c, --config <path>        指定配置文件路径
  -m, --movies-dir <dir>     指定电影目录
  -b, --box-dir <dir>        指定盒子目录
  -o, --output <format>      输出格式: table | json | simple (默认: table)
  --no-color                 禁用颜色输出
  -v, --verbose              详细输出模式
```

## 构建

```bash
# 构建 GUI 应用 (Windows)
npm run build:gui

# 构建 CLI 可执行文件 (当前平台)
npm run build:cli

# 构建 CLI 可执行文件 (所有平台)
npm run build:cli:all
```

## 测试

```bash
# 运行服务单元测试
npm test

# 运行 CLI 单元测试
npm run test:cli

# 运行 GUI 测试
npm run test:gui
```

## 数据存储结构

```
movie-mgt/
├── config/
│   ├── settings.json      # 应用设置
│   ├── categories.json    # 分类定义
│   └── tags.json          # 标签定义
├── movies/
│   └── <分类>/
│       └── <电影文件夹>/
│           ├── movie.nfo  # 电影元数据 (NFO格式)
│           └── cover.jpg  # 封面图片
├── boxes/
│   └── <盒子名称>.json    # 电影盒子定义
└── actor/
    └── <演员>/            # 演员照片目录
```

## 许可证

Apache 2.0