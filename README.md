# Video Deck

基于 Electron 的电影管理应用，提供图形界面 (GUI) 和命令行界面 (CLI) 两种使用方式。电影按分类组织，以 NFO 文件格式存储并配有封面图片。

## 特性清单

### 核心功能

- **电影管理**：添加、编辑、删除电影，支持评分、标签、演员、导演等元数据
- **分类管理**：自定义电影分类（电影、电视剧、纪录片、动漫等）
- **标签系统**：灵活的标签管理，支持多标签筛选
- **演员管理**：维护演员信息及照片，支持分页浏览
- **电影收藏夹**：创建自定义电影合集/播放列表，支持观看状态和评分管理
- **搜索功能**：按名称、标签、分类、演员等条件搜索电影
- **统计信息**：查看影库统计数据（总数、评分分布、播放时长等）
- **TMDB集成**：支持从TMDB API搜索电影信息、下载海报、获取演员详情
- **R18数据库集成**：支持从PostgreSQL数据库查询电影和演员信息
- **视频解析**：集成ffmpeg/ffprobe进行视频元数据解析
- **批量导入**：支持从JSON文件或目录批量导入电影

### GUI 特性

- 现代化深色/浅色主题切换
- 海报墙视图（网格/列表模式）
- 电影详情窗口，支持编辑和文件管理
- 自动扫描和刷新影库
- 内置视频播放器，支持播放列表和进度记忆
- 批量操作支持（批量添加、批量删除）
- 响应式布局和自定义列数

### CLI 特性

- 完整的电影管理命令
- 分类、标签、收藏夹管理
- 多种输出格式（表格、JSON、简单文本）
- 支持全局选项配置路径
- 导入导出功能

## 配置说明

配置文件位于 `config/settings.json`：

```json
{
  "version": "1.0.0",                     // 配置文件版本
  "lastUpdate": "2026-01-01T00:00:00.000Z",  // 最后更新时间
  "appearance": {
    "theme": "dark",              // 主题: dark | light
    "language": "zh-CN",          // 语言: zh-CN | en-US
    "showCategoryIcons": true,    // 显示分类图标
    "showDescriptions": true,     // 显示描述
    "enableAnimations": true      // 启用动画
  },
  "layout": {
    "sidebarWidth": 200,           // 侧边栏宽度
    "posterSize": "large",         // 海报尺寸: small | medium | large
    "posterStyle": "cover",        // 海报样式: cover | contain
    "columns": 6,                  // 网格列数
    "viewMode": "grid",            // 视图模式: grid | list
    "sortBy": "name-asc",          // 排序字段: name-asc | name-desc | year-asc | year-desc | rating-asc | rating-desc | dateAdded-asc | dateAdded-desc
    "sortOrder": "asc"             // 排序方向: asc | desc
  },
  "library": {
    "moviesDir": "movies",         // 电影库目录
    "actorPhotoDir": "actor",      // 演员照片目录
    "newMovieHours": 168,          // 新电影判定时间（小时），默认168小时（7天）
    "scanOnStartup": true,         // 启动时扫描
    "autoRefresh": false,          // 自动刷新
    "showHiddenFiles": false,      // 显示隐藏文件
    "includeSubfolders": true      // 包含子文件夹
  },
  "moviebox": {
    "movieboxDir": "boxes"         // 电影收藏夹目录
  },
  "tmdb": {
    "url": "https://api.themoviedb.org",  // TMDB API地址
    "language": "zh-CN",                  // TMDB返回语言
    "token": ""                           // TMDB API Token（必需）
  },
  "r18": {
    "dbUrl": "",                          // PostgreSQL数据库连接字符串
    "dbUsername": "",                     // 数据库用户名
    "dbPassword": ""                      // 数据库密码
  },
  "videoParsing": {
    "ffmpegPath": "ffmpeg",               // ffmpeg可执行文件路径
    "ffprobePath": "ffprobe"              // ffprobe可执行文件路径
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
  "network": {
    "proxy": ""                    // 网络代理设置（HTTP/HTTPS代理）
  }
}
```

首次使用需要在"设置"中配置以下必填项：
- **moviesDir**: 电影库目录（存放按分类组织的电影文件夹）
- **movieboxDir**: 电影收藏夹目录（存放收藏夹定义文件）
- **actorPhotoDir**: 演员照片目录（存放演员头像图片）
- **tmdb.token**: TMDB API Token（如需使用TMDB搜索功能）
- **r18.dbUrl**: R18数据库连接（如需使用R18数据源）

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

#### 电影收藏夹命令

```bash
# 列出所有收藏夹
movie-mgt box list

# 查看收藏夹详情
movie-mgt box show <收藏夹名称>

# 创建收藏夹
movie-mgt box create <收藏夹名称> --description <描述>

# 编辑收藏夹
movie-mgt box edit <收藏夹名称> --name <新名称>

# 删除收藏夹
movie-mgt box delete <收藏夹名称>

# 添加电影到收藏夹
movie-mgt box add <收藏夹名称> <电影ID>

# 从收藏夹移除电影
movie-mgt box remove <收藏夹名称> <电影ID>
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
movie-mgt stats --category

# 显示播放时长统计
movie-mgt stats --playtime
```

#### 导入命令

```bash
# 从JSON文件导入电影
movie-mgt import file <JSON文件路径>

# 生成导入模板
movie-mgt import template
```

### CLI 全局选项

```bash
movie-mgt [选项] <命令>

选项:
  -V, --version              显示版本号
  -c, --config <path>        指定配置文件路径
  -m, --movies-dir <dir>     指定电影目录
  -b, --box-dir <dir>        指定收藏夹目录
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
│   └── <收藏夹名称>.json    # 电影收藏夹定义
└── actor/
    └── <演员>/            # 演员照片目录
```

## 许可证

Apache 2.0