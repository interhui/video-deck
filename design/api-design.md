# Movie-Mgt REST API 设计文档

> 适用范围：移动端 App / Web 端 / 第三方客户端
>
> 设计目标：在保持与 `src/main/services/` 服务层数据契约一致的前提下，提供一组符合 REST 风格的 HTTP 接口，覆盖电影、分类、标签、演员、收藏夹、播放历史等核心查询/管理需求，并支持统一的分页、排序与条件过滤。

---

## 目录

- [1. 通用约定](#1-通用约定)
  - [1.1 基础信息](#11-基础信息)
  - [1.2 统一响应结构](#12-统一响应结构)
  - [1.3 错误码](#13-错误码)
  - [1.4 分页参数](#14-分页参数)
  - [1.5 排序参数](#15-排序参数)
  - [1.6 过滤参数](#16-过滤参数)
- [2. 电影 Movies](#2-电影-movies)
- [3. 分类 Categories](#3-分类-categories)
- [4. 标签 Tags](#4-标签-tags)
- [5. 演员 Actors](#5-演员-actors)
- [6. 收藏夹 Boxes](#6-收藏夹-boxes)
- [7. 播放历史 History](#7-播放历史-history)
- [8. 库统计 Stats](#8-库统计-stats)
- [9. 静态资源 Resources](#9-静态资源-resources)
- [10. 系统/设置 System](#10-系统设置-system)
- [附录 A：数据模型](#附录-a数据模型)

---

## 1. 通用约定

### 1.1 基础信息

| 项 | 值 |
| --- | --- |
| Base URL | `https://{host}/api/v1` |
| 协议 | HTTPS |
| 数据格式 | `application/json; charset=utf-8` |
| 编码 | UTF-8 |
| 鉴权 | `Authorization: Bearer <token>`（可选；移动端建议启用） |
| 缓存 | 列表接口支持 `ETag` / `If-None-Match`，命中返回 `304` |
| 跨域 | 默认开启 CORS，允许 GET/POST/PUT/DELETE 与 `Authorization` 头 |

### 1.2 统一响应结构

成功响应：

```json
{
  "code": 0,
  "message": "OK",
  "data": { /* 业务数据 */ },
  "timestamp": 1717891200000
}
```

分页响应：

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "list": [ /* item[] */ ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 386,
      "totalPages": 20
    }
  },
  "timestamp": 1717891200000
}
```

错误响应：

```json
{
  "code": 40401,
  "message": "Movie not found",
  "data": null,
  "timestamp": 1717891200000
}
```

### 1.3 错误码

| HTTP | code | 说明 |
| --- | --- | --- |
| 200 | 0 | 成功 |
| 400 | 40001 | 参数缺失或非法 |
| 401 | 40101 | 未鉴权 |
| 403 | 40301 | 无权限 |
| 404 | 40401 | 资源不存在 |
| 409 | 40901 | 资源冲突（重名等） |
| 422 | 42201 | 业务校验失败 |
| 500 | 50000 | 服务器内部错误 |
| 503 | 50301 | 缓存未初始化 / 库未就绪 |

### 1.4 分页参数

所有支持分页的列表接口都接受以下 Query 参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `page` | int | `1` | 页码，从 1 开始 |
| `pageSize` | int | `20` | 每页条数；移动端建议 `20`，Web 端可至 `100`，最大 `200` |

### 1.5 排序参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `sortBy` | string | `name` | 排序字段，见下表 |
| `sortOrder` | string | `asc` | 排序方向，`asc` 或 `desc` |

**电影排序字段**（与 `MovieUtils.sortMovies` 保持一致）：

| 值 | 含义 |
| --- | --- |
| `name` | 电影名称（默认） |
| `rating` | 用户评分 |
| `year` | 发行年份 |
| `releasedate` | 发行日期（语义同 `year`） |
| `actor` | 首位演员名 |
| `addtime` | 入库时间（基于 NFO 修改时间） |

### 1.6 过滤参数

电影列表通用过滤项：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `category` | string | 分类 ID，如 `movie`、`tv`、`documentary`、`anime` |
| `tagId` | string | 标签 ID，仅返回包含该标签的电影 |
| `rating` | int | 用户评分（精确匹配，0-5） |
| `actors` | string | 演员名列表，逗号分隔；多值 OR 关系 |
| `keyword` | string | 关键词，匹配 `title`/`description`/`director`/`actors`/`tags` |
| `year` | int | 发行年份过滤 |
| `yearFrom` | int | 起始年份（区间） |
| `yearTo` | int | 结束年份（区间） |
| `hasPoster` | bool | 仅返回有海报的条目 |

---

## 2. 电影 Movies

### 2.1 获取电影列表（分页 + 排序 + 过滤）

```
GET /api/v1/movies
```

**Query 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` | int | 见 [1.4](#14-分页参数) |
| `pageSize` | int | 见 [1.4](#14-分页参数) |
| `sortBy` | string | 见 [1.5](#15-排序参数) |
| `sortOrder` | string | `asc` / `desc` |
| `category` | string | 分类 ID（可选） |
| `tagId` | string | 标签 ID（可选） |
| `rating` | int | 评分过滤（可选） |
| `actors` | string | 演员名，逗号分隔（可选） |
| `keyword` | string | 关键词搜索（可选） |
| `yearFrom` | int | 起始年份（可选） |
| `yearTo` | int | 结束年份（可选） |
| `source` | string | 数据源：`cache`（默认，全字段）/ `index`（轻量，仅卡片字段） |

**示例**：

```
GET /api/v1/movies?page=1&pageSize=20&category=movie&sortBy=addtime&sortOrder=desc
```

**响应**：

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "list": [
      {
        "id": "movie-the-matrix",
        "movieId": "movie-the-matrix",
        "title": "The Matrix",
        "name": "The Matrix",
        "year": "1999",
        "category": "movie",
        "director": "Lana Wachowski",
        "actors": ["Keanu Reeves", "Carrie-Anne Moss"],
        "studio": "Warner Bros.",
        "tags": ["sci-fi", "action"],
        "userRating": 5,
        "fileCount": 1,
        "poster": "/api/v1/movies/movie-the-matrix/poster",
        "update_time": 1717891200000
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 386, "totalPages": 20 }
  }
}
```

### 2.2 获取电影详情

```
GET /api/v1/movies/{id}
```

**Path 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 电影 ID（形如 `movie-the-matrix`） |

**响应**：

```json
{
  "code": 0,
  "data": {
    "id": "movie-the-matrix",
    "movieId": "movie-the-matrix",
    "title": "The Matrix",
    "name": "The Matrix",
    "year": "1999",
    "publishDate": "1999-03-31",
    "sorttitle": "Matrix, The",
    "runtime": "136",
    "studio": "Warner Bros.",
    "director": "Lana Wachowski",
    "actors": ["Keanu Reeves", "Carrie-Anne Moss"],
    "outline": "...",
    "description": "...",
    "category": "movie",
    "userRating": 5,
    "userComment": "经典",
    "tags": ["sci-fi", "action"],
    "customTags": [],
    "notes": "",
    "fileCount": 1,
    "fileset": [
      { "type": "video", "path": "...", "size": 4294967296 }
    ],
    "original_filename": "the-matrix-1999.mkv",
    "videoCodec": "h264",
    "videoWidth": "1920",
    "videoHeight": "1080",
    "videoDuration": "8160",
    "poster": "/api/v1/movies/movie-the-matrix/poster",
    "update_time": 1717891200000
  }
}
```

### 2.3 搜索电影（与 2.1 等价，独立路径便于客户端区分）

```
GET /api/v1/movies/search
```

**Query 参数**：除 [1.4](#14-分页参数)/[1.5](#15-排序参数)/[1.6](#16-过滤参数) 之外，要求至少传入 `keyword`。

```
GET /api/v1/movies/search?keyword=matrix&page=1&pageSize=20
```

### 2.4 获取电影海报（图片资源）

```
GET /api/v1/movies/{id}/poster
```

返回 `image/jpeg` | `image/png` | `image/webp`，支持 `If-Modified-Since`。

**Query 参数（可选）**：

| 参数 | 说明 |
| --- | --- |
| `size` | `thumb`（200x300）/ `medium`（400x600）/ `original` |

### 2.5 获取电影截图列表

```
GET /api/v1/movies/{id}/screenshots
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      { "number": 1, "url": "/api/v1/movies/{id}/screenshots/1", "currentTime": 320 }
    ]
  }
}
```

### 2.6 获取单张截图

```
GET /api/v1/movies/{id}/screenshots/{number}
```

返回图片二进制。

### 2.7 视频流（可选，按需启用）

```
GET /api/v1/movies/{id}/stream
```

支持 `Range` 头分片，返回 `video/*`。

### 2.8 提交/更新评分与评论

```
PUT /api/v1/movies/{id}/rating
Content-Type: application/json

{
  "rating": 5,
  "comment": "强烈推荐"
}
```

**响应**：

```json
{ "code": 0, "data": { "id": "movie-the-matrix", "userRating": 5 } }
```

### 2.9 批量获取电影（按 ID 列表）

```
POST /api/v1/movies/batch-get
Content-Type: application/json

{ "ids": ["movie-the-matrix", "movie-inception"] }
```

用于收藏夹列表反查详情，避免 N+1 请求。

### 2.10 获取"最近入库"列表

```
GET /api/v1/movies/recent?hours=72&limit=20
```

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `hours` | int | `72` | 入库后多少小时内算"新"（对应 `settings.library.newMovieHours`） |
| `limit` | int | `20` | 返回数量 |

---

## 3. 分类 Categories

### 3.1 获取所有分类

```
GET /api/v1/categories
```

**Query 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `withStats` | bool | 是否同时返回每个分类的电影数量，默认 `false` |

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "movie",
        "name": "电影",
        "shortName": "电影",
        "icon": "/api/v1/resources/category-icons/movie.png",
        "color": "#003791",
        "order": 1,
        "movieCount": 256
      }
    ]
  }
}
```

### 3.2 获取分类详情

```
GET /api/v1/categories/{id}
```

### 3.3 获取分类下的电影列表（分页 + 过滤 + 排序）

```
GET /api/v1/categories/{id}/movies?page=1&pageSize=20&sortBy=addtime&sortOrder=desc
```

支持 [1.4](#14-分页参数)/[1.5](#15-排序参数)/[1.6](#16-过滤参数) 全部参数（`category` 由 path 决定，请求中传入会被忽略）。

---

## 4. 标签 Tags

### 4.1 获取所有标签

```
GET /api/v1/tags
```

**Query 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | string | 标签关键词搜索 |
| `withCounts` | bool | 是否返回每个标签的关联电影数量，默认 `false` |
| `sortBy` | string | `name` / `movieCount`，默认 `name` |
| `sortOrder` | string | `asc` / `desc` |

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      { "id": "sci-fi", "name": "科幻", "movieCount": 42 },
      { "id": "action", "name": "动作", "movieCount": 87 }
    ]
  }
}
```

### 4.2 获取标签详情

```
GET /api/v1/tags/{id}
```

### 4.3 获取标签关联的电影列表（分页 + 排序）

```
GET /api/v1/tags/{id}/movies?page=1&pageSize=20
```

支持 [1.4](#14-分页参数)/[1.5](#15-排序参数)，同时可叠加 `category`、`actors`、`rating` 等过滤。

---

## 5. 演员 Actors

> 演员主键：演员名 `name`（项目当前以 name 唯一）。URL 中应进行 URL 编码，例如 `涼森玲夢` → `%E6%B6%BC%E6%A3%AE%E7%8E%B2%E5%A4%A2`。

### 5.1 获取演员列表（分页 + 排序 + 过滤）

```
GET /api/v1/actors
```

**Query 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` | int | 分页 |
| `pageSize` | int | 分页 |
| `keyword` | string | 名称/昵称模糊匹配 |
| `favorites` | bool | 仅返回收藏的演员 |
| `withCounts` | bool | 是否返回 `movieCount`，默认 `true` |
| `sortBy` | string | `name`（默认）/ `movieCount` / `rating` |
| `sortOrder` | string | `asc` / `desc` |

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "涼森玲夢",
        "name": "涼森玲夢",
        "nickname": "",
        "birthday": "1995-08-20",
        "memo": "",
        "rating": 5,
        "favorites": true,
        "photo": "/api/v1/actors/%E6%B6%BC%E6%A3%AE%E7%8E%B2%E5%A4%A2/photo",
        "movieCount": 23
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 1024, "totalPages": 52 }
  }
}
```

### 5.2 获取演员详情

```
GET /api/v1/actors/{id}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "id": "涼森玲夢",
    "name": "涼森玲夢",
    "nickname": "",
    "birthday": "1995-08-20",
    "memo": "",
    "rating": 5,
    "favorites": true,
    "photo": "/api/v1/actors/%E6%B6%BC%E6%A3%AE%E7%8E%B2%E5%A4%A2/photo",
    "movieCount": 23
  }
}
```

### 5.3 获取演员关联的电影列表（分页 + 排序）

```
GET /api/v1/actors/{id}/movies?page=1&pageSize=20&sortBy=year&sortOrder=desc
```

### 5.4 获取演员照片

```
GET /api/v1/actors/{id}/photo
```

返回图片二进制；支持 `size` 查询参数（`thumb`/`original`）。

### 5.5 设置演员收藏状态 / 评分（可选）

```
PUT /api/v1/actors/{id}
Content-Type: application/json

{ "favorites": true, "rating": 4 }
```

---

## 6. 收藏夹 Boxes

> 收藏夹主键：`name`（文件名，需 URL 编码）。

### 6.1 获取所有收藏夹

```
GET /api/v1/boxes
```

**Query 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | string | 名称模糊匹配 |
| `sortBy` | string | `name`（默认）/ `movieCount` |
| `sortOrder` | string | `asc` / `desc` |

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      { "name": "GoodBox", "originalName": "GoodBox", "description": "", "movieCount": 12 },
      { "name": "ChuzhangBox", "originalName": "ChuzhangBox", "description": "", "movieCount": 5 }
    ]
  }
}
```

### 6.2 获取收藏夹详情（含原始结构）

```
GET /api/v1/boxes/{name}
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "name": "GoodBox",
    "originalName": "GoodBox",
    "description": "",
    "movieCount": 12,
    "movies": [
      { "id": "movie-the-matrix", "status": "watched", "rating": 5, "comment": "经典" }
    ]
  }
}
```

### 6.3 获取收藏夹中的电影列表（含分页 / 排序 / 详情合并）

```
GET /api/v1/boxes/{name}/movies?page=1&pageSize=20&sortBy=addtime&sortOrder=desc
```

**Query 参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page`/`pageSize`/`sortBy`/`sortOrder` | - | 见通用约定 |
| `status` | string | 过滤观看状态：`watched` / `unwatched` |
| `rating` | int | 过滤收藏夹内自定义评分 |
| `expand` | string | `detail`：合并电影详情字段 |

**响应**（`expand=detail`）：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "movie-the-matrix",
        "status": "watched",
        "rating": 5,
        "comment": "经典",
        "movie": { "id": "movie-the-matrix", "title": "The Matrix", "year": "1999", "poster": "..." }
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 12, "totalPages": 1 }
  }
}
```

### 6.4 创建收藏夹

```
POST /api/v1/boxes
Content-Type: application/json

{ "name": "FavoritesBox", "description": "我的最爱" }
```

### 6.5 更新收藏夹（重命名 / 改描述）

```
PUT /api/v1/boxes/{name}
Content-Type: application/json

{ "newName": "FavoritesBox", "description": "我的最爱 2026" }
```

### 6.6 删除收藏夹

```
DELETE /api/v1/boxes/{name}
```

### 6.7 添加电影到收藏夹（单条 / 批量）

```
POST /api/v1/boxes/{name}/movies
Content-Type: application/json

{
  "movies": [
    { "id": "movie-the-matrix", "status": "unwatched", "rating": 0, "comment": "" }
  ]
}
```

### 6.8 更新收藏夹内电影（评分/状态/备注）

```
PUT /api/v1/boxes/{name}/movies/{movieId}
Content-Type: application/json

{ "status": "watched", "rating": 5, "comment": "好看" }
```

### 6.9 从收藏夹移除电影

```
DELETE /api/v1/boxes/{name}/movies/{movieId}
```

### 6.10 清理收藏夹中已失效的电影

```
POST /api/v1/boxes/{name}/clean
```

服务端用当前电影库 ID 集合去过滤掉收藏夹中已不存在的电影。

---

## 7. 播放历史 History

### 7.1 获取播放历史（分页）

```
GET /api/v1/history?page=1&pageSize=20&date=2026-06-08&keyword=matrix
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page`/`pageSize` | int | 见通用约定 |
| `date` | string | `YYYY-MM-DD`，按日期过滤 |
| `keyword` | string | 电影名关键词 |
| `sortBy` | string | `time`（默认） |
| `sortOrder` | string | 默认 `desc` |

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      { "date": "2026-06-08", "time": "21:35:10", "movieName": "The Matrix", "movieId": "movie-the-matrix" }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }
  }
}
```

### 7.2 获取有记录的日期列表

```
GET /api/v1/history/dates
```

```json
{ "code": 0, "data": { "list": ["2026-06-08", "2026-06-07"] } }
```

### 7.3 添加播放记录

```
POST /api/v1/history
Content-Type: application/json

{ "movieId": "movie-the-matrix", "movieName": "The Matrix" }
```

### 7.4 删除指定播放记录

```
DELETE /api/v1/history?date=2026-06-08&time=21:35:10
```

### 7.5 清空播放历史

```
DELETE /api/v1/history/all
```

---

## 8. 库统计 Stats

### 8.1 总览统计

```
GET /api/v1/stats
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "totalMovies": 1024,
    "totalActors": 256,
    "totalTags": 187,
    "totalBoxes": 8,
    "totalCategories": 4,
    "cache": {
      "initialized": true,
      "lastUpdated": 1717891200000
    }
  }
}
```

### 8.2 按分类统计

```
GET /api/v1/stats/categories
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "list": [
      { "id": "movie", "name": "电影", "shortName": "电影", "movieCount": 612 },
      { "id": "tv", "name": "电视剧", "shortName": "剧集", "movieCount": 184 }
    ]
  }
}
```

### 8.3 按标签 / 按演员 Top N（用于首页推荐）

```
GET /api/v1/stats/top-tags?limit=20
GET /api/v1/stats/top-actors?limit=20
```

---

## 9. 静态资源 Resources

> 海报、截图、演员照片均提供独立 URL，便于客户端缓存 / CDN 加速。

| 路径 | 说明 |
| --- | --- |
| `GET /api/v1/movies/{id}/poster` | 电影海报 |
| `GET /api/v1/movies/{id}/screenshots` | 截图列表（JSON） |
| `GET /api/v1/movies/{id}/screenshots/{number}` | 单张截图 |
| `GET /api/v1/movies/{id}/stream` | 视频流（支持 Range） |
| `GET /api/v1/movies/{id}/subtitles` | 字幕列表 |
| `GET /api/v1/movies/{id}/subtitles/{lang}` | 单条字幕（vtt/srt） |
| `GET /api/v1/actors/{id}/photo` | 演员照片 |
| `GET /api/v1/resources/category-icons/{file}` | 分类图标 |

所有图片接口统一支持 `size=thumb|medium|original`。

---

## 10. 系统/设置 System

> 移动端通常只需要"读"配置；管理类接口建议加权限控制。

### 10.1 获取应用基础信息

```
GET /api/v1/system/info
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "version": "1.1.0",
    "apiVersion": "v1",
    "buildTime": 1717891200000,
    "serverTime": 1717891200000,
    "features": ["tmdb", "r18", "boxes", "tags", "history"]
  }
}
```

### 10.2 刷新电影库缓存（管理员）

```
POST /api/v1/system/refresh-cache
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "totalMovies": 1024,
    "categoryCount": 4,
    "lastUpdated": 1717891200000
  }
}
```

### 10.3 获取缓存状态

```
GET /api/v1/system/cache-status
```

### 10.4 获取/更新展示偏好（可按用户区分）

```
GET  /api/v1/system/settings/appearance
PUT  /api/v1/system/settings/appearance
```

字段对应 `config/settings.json` 的 `appearance` / `layout` 节，例如 `theme`、`viewMode`、`sortBy` 等。

---

## 附录 A：数据模型

### A.1 Movie

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 主键，如 `movie-the-matrix` |
| `movieId` | string | 业务 ID（与 `id` 通常一致） |
| `title` / `name` | string | 标题 |
| `year` / `publishDate` | string | 发行年份 / 日期 |
| `sorttitle` | string | 排序用标题 |
| `runtime` | string | 时长（分钟） |
| `studio` | string | 制片厂 |
| `director` | string | 导演 |
| `actors` | string[] | 演员名数组 |
| `outline` / `description` | string | 简介 |
| `category` | string | 分类 ID |
| `userRating` | int | 用户评分（0-5） |
| `userComment` | string | 用户评论 |
| `tags` | string[] | 标签 ID 数组 |
| `customTags` | string[] | 自定义标签 |
| `fileCount` | int | 关联文件数量 |
| `fileset` | object[] | 关联文件列表 |
| `original_filename` | string | 原始视频文件路径 |
| `videoCodec` / `videoWidth` / `videoHeight` / `videoDuration` | string | 视频技术信息 |
| `poster` | string | 海报访问 URL |
| `update_time` | long | NFO 文件最后修改时间（毫秒） |

> 列表接口（`source=index`）通常只返回轻量字段：`id`、`title`、`year`、`category`、`director`、`actors`、`studio`、`tags`、`fileCount`、`poster`、`update_time`。

### A.2 Actor

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 演员名（同 `name`） |
| `name` | string | 姓名 |
| `nickname` | string | 昵称 |
| `birthday` | string | 生日 |
| `memo` | string | 备注 |
| `rating` | int | 评分（0-5） |
| `favorites` | bool | 是否收藏 |
| `photo` | string | 照片 URL |
| `movieCount` | int | 关联电影数量（仅在列表/详情场景返回） |

### A.3 Tag

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 标签 ID |
| `name` | string | 标签名 |
| `movieCount` | int | 关联电影数量（可选） |

### A.4 Category

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 分类 ID，如 `movie` |
| `name` | string | 显示名 |
| `shortName` | string | 短名 |
| `icon` | string | 图标 URL |
| `color` | string | 主题色 |
| `order` | int | 排序权重 |
| `movieCount` | int | 关联电影数量（可选） |

### A.5 Box

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 显示名（metadata.name） |
| `originalName` | string | 文件名 |
| `description` | string | 描述 |
| `movieCount` | int | 收藏电影数量 |
| `movies` | object[] | 内部条目（`{id, status, rating, comment}`） |

### A.6 BoxMovie

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 电影 ID |
| `status` | string | `watched` / `unwatched` |
| `rating` | int | 收藏夹内自定义评分（0-5） |
| `comment` | string | 收藏夹内评论 |
| `movie` | Movie | 仅在 `expand=detail` 时返回 |

### A.7 HistoryRecord

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | string | `YYYY-MM-DD` |
| `time` | string | `HH:mm:ss` |
| `movieName` | string | 电影名 |
| `movieId` | string | 电影 ID |

---

## 附录 B：与现有服务的映射关系

| API 端点 | 主要后端服务方法 |
| --- | --- |
| `GET /movies` | `MovieService.getMoviesPaginated` / `getMoviesPaginatedFromIndex` |
| `GET /movies/{id}` | `MovieService.getMovieDetail` |
| `GET /movies/search` | `MovieService.searchMovies` |
| `GET /movies/recent` | `MovieService.getAllMovies` + `settings.library.newMovieHours` |
| `PUT /movies/{id}/rating` | `MovieService.saveRating` |
| `POST /movies/batch-get` | `MovieCacheService.getMovieById`（循环） |
| `GET /categories` | `CategoryService.loadCategories` (+ `MovieService.getCategoryStats`) |
| `GET /categories/{id}/movies` | `MovieService.getMoviesByCategory` |
| `GET /tags` | `TagService.loadTags` (+ `getTagMovieCountMap`) |
| `GET /tags/{id}/movies` | `TagService.getMoviesByTagId` |
| `GET /actors` | `ActorService.loadActors` (+ `MovieService.getActorMovieCountMap`) |
| `GET /actors/{id}/movies` | `MovieService.getActorMovieList` |
| `GET /boxes` | `BoxService.getAllBoxes` |
| `GET /boxes/{name}` | `BoxService.getBoxDetail` |
| `POST /boxes` | `BoxService.createBox` |
| `PUT /boxes/{name}` | `BoxService.updateBox` |
| `DELETE /boxes/{name}` | `BoxService.deleteBox` |
| `POST /boxes/{name}/movies` | `BoxService.addMoviesToBox` |
| `PUT /boxes/{name}/movies/{id}` | `BoxService.updateMovieInBox` |
| `DELETE /boxes/{name}/movies/{id}` | `BoxService.removeMovieFromBox` |
| `POST /boxes/{name}/clean` | `BoxService.cleanBox` |
| `GET /history` | `MovieHistoryService.filterHistory` |
| `GET /history/dates` | `MovieHistoryService.getHistoryDates` |
| `POST /history` | `MovieHistoryService.addRecord` |
| `DELETE /history` | `MovieHistoryService.deleteRecord` |
| `DELETE /history/all` | `MovieHistoryService.clearHistory` |
| `GET /stats` | `MovieService.getStats` + 各服务汇总 |
| `GET /stats/categories` | `MovieService.getCategoryStats` |
| `POST /system/refresh-cache` | `MovieService.refreshCache` |
| `GET /system/cache-status` | `MovieCacheService.getCacheInfo` |
| `GET /system/settings/appearance` | `SettingsService.getSettings` |

---

## 附录 C：客户端调用示例

### C.1 移动端首页（瀑布流）

```http
GET /api/v1/movies?source=index&page=1&pageSize=20&sortBy=addtime&sortOrder=desc
```

只取轻量字段，节省流量；后续滚动加载传入 `page=2、3…`。

### C.2 分类页

```http
GET /api/v1/categories?withStats=true
GET /api/v1/categories/movie/movies?page=1&pageSize=20&sortBy=year&sortOrder=desc
```

### C.3 演员页

```http
GET /api/v1/actors?favorites=true&sortBy=movieCount&sortOrder=desc&page=1&pageSize=30
GET /api/v1/actors/%E6%B6%BC%E6%A3%AE%E7%8E%B2%E5%A4%A2/movies?page=1&pageSize=20
```

### C.4 标签页

```http
GET /api/v1/tags?withCounts=true&sortBy=movieCount&sortOrder=desc
GET /api/v1/tags/Big%20Tits/movies?page=1&pageSize=20
```

### C.5 收藏夹页

```http
GET /api/v1/boxes
GET /api/v1/boxes/GoodBox/movies?expand=detail&page=1&pageSize=20&sortBy=addtime&sortOrder=desc
```

### C.6 详情页

```http
GET /api/v1/movies/movie-the-matrix
GET /api/v1/movies/movie-the-matrix/screenshots
PUT /api/v1/movies/movie-the-matrix/rating
```
