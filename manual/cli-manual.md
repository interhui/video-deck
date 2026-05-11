# CLI 命令行工具使用手册

本文档详细说明电影管理程序（Movie Management）的所有CLI命令的使用方法、参数、输出和示例。

## 目录

- [全局选项](#全局选项)
- [电影命令 (movie)](#电影命令-movie)
- [盒子命令 (box)](#盒子命令-box)
- [分类命令 (category)](#分类命令-category)
- [标签命令 (tag)](#标签命令-tag)
- [配置命令 (config)](#配置命令-config)
- [统计命令 (stats)](#统计命令-stats)

---

## 全局选项

以下选项适用于所有CLI命令：

| 选项 | 说明 | 示例 |
|------|------|------|
| `-V, --version` | 显示版本号 | `movie-mgt -V` |
| `-c, --config <path>` | 指定配置文件路径 | `movie-mgt -c /path/to/settings.json` |
| `-m, --movies-dir <dir>` | 指定电影目录 | `movie-mgt -m /path/to/movies` |
| `-b, --box-dir <dir>` | 指定盒子目录 | `movie-mgt -b /path/to/boxes` |
| `-o, --output <format>` | 输出格式：table/json/simple | `movie-mgt -o json` |
| `--no-color` | 禁用彩色输出 | `movie-mgt --no-color` |
| `-v, --verbose` | 详细输出模式 | `movie-mgt -v` |

### 使用示例

```bash
# 显示版本号
movie-mgt -V
# 输出: 1.0.0

# 使用自定义配置路径
movie-mgt -c /etc/movie-mgt/settings.json movie ls

# 指定电影和盒子目录
movie-mgt -m /data/movies -b /data/boxes movie ls

# 以JSON格式输出
movie-mgt -o json movie ls

# 详细模式
movie-mgt -v movie search -k "变形金刚"
```

---

## 电影命令 (movie)

### movie list (别名: movie ls, m ls)

**功能**：列出所有电影

**参数**：
- `-c, --category <category>`：按分类筛选
- `-t, --tag <tag>`：按标签筛选
- `--status <status>`：按状态筛选（unwatched/watching/watched）
- `--limit <number>`：限制返回数量
- `--offset <number>`：偏移量（用于分页）

**输出**：表格格式显示电影ID、名称、分类、年份、评分、标签

**示例**：

```bash
# 列出所有电影
movie-mgt movie list
# 输出:
# ID            名称              分类    年份    评分    标签
# movie-001     变形金刚4         movie   2014    7.5     动作,科幻
# movie-002     八佰              movie   2020    8.0     战争,历史
# movie-003     流浪地球          movie   2019    7.8     科幻,冒险

# 按分类筛选
movie-mgt movie list -c movie

# 按标签筛选
movie-mgt movie list -t action

# 按状态筛选
movie-mgt movie list --status watched

# 限制返回数量
movie-mgt movie list --limit 10

# 分页查询（跳过前20条，返回10条）
movie-mgt movie list --limit 10 --offset 20

# JSON格式输出
movie-mgt movie ls -o json
# 输出:
# [
#   {
#     "id": "movie-001",
#     "name": "变形金刚4",
#     "category": "movie",
#     "year": 2014,
#     "rating": 7.5,
#     "tags": ["动作", "科幻"]
#   },
#   ...
# ]
```

### movie search

**功能**：搜索电影

**参数**：
- `-k, --keyword <keyword>`：搜索关键词（必需）
- `-c, --category <category>`：限定分类
- `-t, --tag <tag>`：限定标签

**输出**：匹配的电影列表

**示例**：

```bash
# 搜索包含"变形"的电影
movie-mgt movie search -k "变形"
# 输出:
# ID            名称              分类    年份    评分
# movie-001     变形金刚4         movie   2014    7.5
# movie-008     变形金刚          movie   2007    7.0

# 在movie分类中搜索"流浪"
movie-mgt movie search -k "流浪" -c movie

# 搜索带"科幻"标签且包含"地球"的电影
movie-mgt movie search -k "地球" -t sci-fi

# JSON格式
movie-mgt movie search -k "八佰" -o json
```

### movie show (别名: movie info)

**功能**：查看电影详情

**参数**：
- `<movieId>`：电影ID（必需）

**输出**：电影详细信息（名称、分类、年份、导演、演员、标签、评分、简介等）

**示例**：

```bash
# 查看电影详情
movie-mgt movie show movie-001
# 输出:
# 
# 电影详情:
#   ID: movie-001
#   名称: 变形金刚4
#   分类: movie
#   年份: 2014
#   导演: 迈克尔·贝
#   演员: 马克·沃尔伯格, 妮可拉·佩尔茨, 杰克·莱诺
#   标签: 动作, 科幻, 冒险
#   评分: 7.5
#   时长: 165分钟
#   简介: 故事发生在前作芝加哥决战四年后...

# JSON格式
movie-mgt movie show movie-001 -o json
```

### movie add

**功能**：添加新电影

**参数**：
- `<name>`：电影名称（必需）
- `<category>`：分类ID（必需）
- `-y, --year <year>`：年份
- `-d, --director <director>`：导演
- `-a, --actors <actors>`：演员（逗号分隔）
- `-t, --tags <tags>`：标签（逗号分隔）
- `-r, --rating <rating>`：评分（0-10）
- `--overview <overview>`：简介
- `--runtime <runtime>`：时长（分钟）

**输出**：成功添加的电影信息

**示例**：

```bash
# 添加简单电影
movie-mgt movie add "复仇者联盟" movie -y 2012
# 输出:
# ✓ 电影添加成功
#   ID: movie-010
#   名称: 复仇者联盟
#   分类: movie
#   年份: 2012

# 添加完整信息
movie-mgt movie add "流浪地球" movie -y 2019 -d "郭帆" -a "吴京,屈楚萧,李光洁" -t "科幻,冒险,灾难" -r 7.8 --overview "太阳即将毁灭..." --runtime 125
# 输出:
# ✓ 电影添加成功
#   ID: movie-011
#   名称: 流浪地球
#   分类: movie
#   年份: 2019
#   导演: 郭帆
#   演员: 吴京, 屈楚萧, 李光洁
#   标签: 科幻, 冒险, 灾难
#   评分: 7.8
#   时长: 125分钟

# JSON格式
movie-mgt movie add "泰坦尼克号" movie -y 1997 -o json
```

### movie edit

**功能**：编辑电影信息

**参数**：
- `<movieId>`：电影ID（必需）
- `-n, --name <name>`：新名称
- `-y, --year <year>`：新年份
- `-d, --director <director>`：新导演
- `-a, --actors <actors>`：新演员（逗号分隔）
- `-t, --tags <tags>`：新标签（逗号分隔）
- `-r, --rating <rating>`：新评分（0-10）
- `--overview <overview>`：新简介
- `--runtime <runtime>`：新时长

**输出**：更新后的电影信息

**示例**：

```bash
# 修改电影名称
movie-mgt movie edit movie-001 -n "变形金刚4：绝迹重生"
# 输出:
# ✓ 电影已更新
#   ID: movie-001
#   名称: 变形金刚4：绝迹重生

# 修改多个字段
movie-mgt movie edit movie-001 -r 8.0 -t "动作,科幻,冒险,机械"
# 输出:
# ✓ 电影已更新
#   ID: movie-001
#   名称: 变形金刚4：绝迹重生
#   评分: 8.0
#   标签: 动作, 科幻, 冒险, 机械

# JSON格式
movie-mgt movie edit movie-001 -r 8.5 -o json
```

### movie delete (别名: movie rm)

**功能**：删除电影

**参数**：
- `<movieId>`：电影ID（必需）
- `-f, --force`：强制删除（跳过确认）

**输出**：删除成功确认

**示例**：

```bash
# 删除电影
movie-mgt movie delete movie-001
# 输出:
# ? 确认删除电影 "变形金刚4"？ (y/N)
# ✓ 电影已删除

# 强制删除（不提示确认）
movie-mgt movie rm movie-002 -f
# 输出:
# ✓ 电影已删除

# JSON格式
movie-mgt movie delete movie-003 -o json
```

### movie status

**功能**：更新/查看电影观看状态

**参数**：
- `<movieId>`：电影ID（必需）
- `<status>`：状态（unwatched/watching/watched）
- `--rating <rating>`：同时更新评分

**输出**：状态更新确认

**示例**：

```bash
# 更新状态为已观看
movie-mgt movie status movie-001 watched
# 输出:
# ✓ 状态已更新
#   电影: 变形金刚4
#   状态: watched

# 更新状态并评分
movie-mgt movie status movie-002 watched --rating 8.5
# 输出:
# ✓ 状态已更新
#   电影: 八佰
#   状态: watched
#   评分: 8.5

# 查看当前状态（不传status参数）
movie-mgt movie status movie-001
# 输出:
#   电影: 变形金刚4
#   状态: watched
#   评分: 7.5
```

---

## 盒子命令 (box)

### box list (别名: box ls)

**功能**：列出所有电影盒子

**参数**：无

**输出**：盒子列表（名称、描述、电影数、分类）

**示例**：

```bash
# 列出所有盒子
movie-mgt box list
# 输出:
# 名称              描述              电影数    分类
# 科幻经典          经典科幻电影合集    15      科幻
# 我的待看          计划观看的电影      23      全部
# 2024最爱          2024年最喜欢的电影   8      全部

# JSON格式
movie-mgt box ls -o json
# 输出:
# [
#   {
#     "name": "科幻经典",
#     "description": "经典科幻电影合集",
#     "movieCount": 15,
#     "categories": ["科幻"]
#   },
#   ...
# ]
```

### box show (别名: box info)

**功能**：查看盒子详情

**参数**：
- `<boxName>`：盒子名称（必需）

**输出**：盒子详细信息及包含的电影列表

**示例**：

```bash
# 查看盒子详情
movie-mgt box show "科幻经典"
# 输出:
# 
# 盒子详情:
#   名称: 科幻经典
#   描述: 经典科幻电影合集
#   电影数: 15
#   分类: 科幻
#
# 盒内电影:
#   ID            名称              年份    评分    状态
#   movie-001     变形金刚4         2014    7.5     unwatched
#   movie-011     流浪地球          2019    7.8     watched
#   ...

# JSON格式
movie-mgt box show "科幻经典" -o json
```

### box create

**功能**：创建新盒子

**参数**：
- `<boxName>`：盒子名称（必需）
- `-d, --description <desc>`：盒子描述

**输出**：创建成功确认

**示例**：

```bash
# 创建简单盒子
movie-mgt box create "我的待看"
# 输出:
# ✓ 盒子创建成功
#   名称: 我的待看
#   描述: -

# 创建带描述的盒子
movie-mgt box create "2024最爱" -d "2024年观看的最喜欢的电影"
# 输出:
# ✓ 盒子创建成功
#   名称: 2024最爱
#   描述: 2024年观看的最喜欢的电影
```

### box edit

**功能**：编辑盒子信息

**参数**：
- `<boxName>`：原盒子名称（必需）
- `-n, --name <newName>`：新名称
- `-d, --description <desc>`：新描述

**输出**：更新成功确认

**示例**：

```bash
# 修改盒子名称
movie-mgt box edit "我的待看" -n "计划观看"
# 输出:
# ✓ 盒子已更新
#   原名称: 我的待看
#   新名称: 计划观看
#   描述: -

# 修改描述
movie-mgt box edit "科幻经典" -d "精选经典科幻电影"
# 输出:
# ✓ 盒子已更新
#   原名称: 科幻经典
#   新名称: 科幻经典
#   描述: 精选经典科幻电影
```

### box delete (别名: box rm)

**功能**：删除盒子

**参数**：
- `<boxName>`：盒子名称（必需）
- `-f, --force`：强制删除

**输出**：删除成功确认

**示例**：

```bash
# 删除盒子
movie-mgt box delete "临时盒子"
# 输出:
# ✓ 盒子已删除
#   名称: 临时盒子

# 强制删除
movie-mgt box rm "测试盒子" -f
```

### box add

**功能**：添加电影到盒子

**参数**：
- `<boxName>`：盒子名称（必需）
- `<movieId>`：电影ID（必需）

**输出**：添加成功确认

**示例**：

```bash
# 添加电影到盒子
movie-mgt box add "科幻经典" movie-001
# 输出:
# ✓ 电影已添加到盒子
#   盒子: 科幻经典
#   电影: 变形金刚4
```

### box remove

**功能**：从盒子移除电影

**参数**：
- `<boxName>`：盒子名称（必需）
- `<movieId>`：电影ID（必需）

**输出**：移除成功确认

**示例**：

```bash
# 从盒子移除电影
movie-mgt box remove "科幻经典" movie-001
# 输出:
# ✓ 电影已从盒子移除
#   盒子: 科幻经典
#   电影: movie-001
```

---

## 分类命令 (category)

### category list (别名: category ls)

**功能**：列出所有分类

**参数**：无

**输出**：分类列表（ID、名称、缩写、电影数、图标、颜色）

**示例**：

```bash
# 列出所有分类
movie-mgt category list
# 输出:
# ID            名称      缩写    电影数    图标    颜色
# movie         电影      M       125      🎬      #003791
# tv            电视剧    TV      48       📺      #107C10
# documentary   纪录片    DOC     23       🎥      #E60012
# anime         动漫      ANI     67       🎌      #888888

# JSON格式
movie-mgt category ls -o json
# 输出:
# [
#   {
#     "id": "movie",
#     "name": "电影",
#     "shortName": "M",
#     "movieCount": 125,
#     "icon": "🎬",
#     "color": "#003791"
#   },
#   ...
# ]
```

### category show (别名: category info)

**功能**：查看分类详情

**参数**：
- `<categoryId>`：分类ID（必需）

**输出**：分类详细信息

**示例**：

```bash
# 查看分类详情
movie-mgt category show movie
# 输出:
# 
# 分类详情:
#   ID: movie
#   名称: 电影
#   缩写: M
#   图标: 🎬
#   颜色: #003791

# JSON格式
movie-mgt category show movie -o json
```

---

## 标签命令 (tag)

### tag list (别名: tag ls)

**功能**：列出所有标签

**参数**：无

**输出**：标签列表（ID、名称、电影数）

**示例**：

```bash
# 列出所有标签
movie-mgt tag list
# 输出:
# ID            名称      电影数
# action        动作      45
# adventure     冒险      23
# sci-fi        科幻      67
# horror        恐怖      12

# JSON格式
movie-mgt tag ls -o json
# 输出:
# [
#   {
#     "id": "action",
#     "name": "动作",
#     "movieCount": 45
#   },
#   ...
# ]
```

### tag create

**功能**：创建新标签

**参数**：
- `<tagId>`：标签ID（必需）
- `<tagName>`：标签名称（必需）

**输出**：创建成功确认

**示例**：

```bash
# 创建标签
movie-mgt tag create comedy "喜剧"
# 输出:
# ✓ 标签创建成功
#   ID: comedy
#   名称: 喜剧
```

### tag delete

**功能**：删除标签

**参数**：
- `<tagId>`：标签ID（必需）

**输出**：删除成功确认

**示例**：

```bash
# 删除标签
movie-mgt tag delete comedy
# 输出:
# ✓ 标签已删除
#   ID: comedy
```

---

## 配置命令 (config)

### config show (别名: config list)

**功能**：显示当前配置

**参数**：无

**输出**：当前配置信息

**示例**：

```bash
# 显示配置
movie-mgt config show
# 输出:
# 
# 当前配置:
#   电影目录: /data/movies
#   电影盒子目录: /data/boxes
#   主题: dark
#   语言: zh-CN

# JSON格式（显示完整配置）
movie-mgt config show -o json
# 输出:
# {
#   "version": "1.0.0",
#   "appearance": {
#     "theme": "dark",
#     "language": "zh-CN"
#   },
#   "library": {
#     "moviesDir": "/data/movies"
#   },
#   ...
# }
```

### config get

**功能**：获取配置项值

**参数**：
- `<key>`：配置键名（必需）

**支持的键名**：
- `moviesDir`：电影目录
- `movieboxDir`：电影盒子目录
- `theme`：主题
- `language`：语言

**输出**：配置值

**示例**：

```bash
# 获取电影目录
movie-mgt config get moviesDir
# 输出:
# /data/movies

# 获取主题
movie-mgt config get theme
# 输出:
# dark
```

### config set

**功能**：设置配置项值

**参数**：
- `<key>`：配置键名（必需）
- `<value>`：配置值（必需）

**支持的键名**：
- `moviesDir`：电影目录
- `movieboxDir`：电影盒子目录
- `theme`：主题
- `language`：语言

**输出**：设置成功确认

**示例**：

```bash
# 设置电影目录
movie-mgt config set moviesDir /new/path/to/movies
# 输出:
# ✓ 配置已更新
#   键: moviesDir
#   值: /new/path/to/movies

# 设置主题
movie-mgt config set theme light
# 输出:
# ✓ 配置已更新
#   键: theme
#   值: light
```

### config reset

**功能**：重置配置为默认值

**参数**：无

**输出**：重置成功确认

**示例**：

```bash
# 重置配置
movie-mgt config reset
# 输出:
# ✓ 配置已重置为默认值
```

---

## 统计命令 (stats)

### stats

**功能**：显示影库统计信息

**参数**：无

**输出**：基本统计信息（电影总数、平均评分等）

**示例**：

```bash
# 显示总体统计
movie-mgt stats
# 输出:
# 
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#   电影库统计
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#   电影总数:     263
#   平均评分:     7.4
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# JSON格式
movie-mgt stats -o json
# 输出:
# {
#   "totalMovies": 263,
#   "avgRating": 7.4
# }
```

---

## 附录：错误代码

| 错误信息 | 说明 | 解决方法 |
|---------|------|---------|
| 电影不存在 | 指定的电影ID不存在 | 检查电影ID是否正确 |
| 盒子已存在 | 尝试创建已存在的盒子 | 使用不同的名称或编辑现有盒子 |
| 盒子不存在 | 指定的盒子名称不存在 | 检查盒子名称是否正确 |
| 标签已存在 | 尝试创建已存在的标签ID | 使用不同的ID或编辑现有标签 |
| 标签不存在 | 指定的标签ID不存在 | 检查标签ID是否正确 |
| 分类不存在 | 指定的分类ID不存在 | 检查分类ID是否正确 |
| 无效的分类ID | 分类ID不在有效列表中 | 使用`category list`查看有效分类 |
| JSON解析失败 | JSON文件格式错误 | 检查JSON格式是否正确 |
| 文件不存在 | 导入的JSON文件不存在 | 检查文件路径是否正确 |
