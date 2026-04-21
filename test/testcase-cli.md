# CLI 命令行测试用例设计

## 概述

本文档描述电影管理 CLI 工具的单元测试用例设计。测试用例覆盖 `src/cli` 目录下的所有 JavaScript 文件，包括命令模块和工具模块。

## 测试环境

- CLI 入口: `node src/cli/index.js`
- 测试目录: `test/cli/`
- 测试数据目录: `test/cli/test-data/`

## 测试用例设计

---

### 1. Movie Commands (电影管理命令)

#### 1.1 movie list - 列出电影

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-LIST-001 | 列出所有电影 | 直接调用 | 电影数据存在 | 输出电影列表表格 |
| CLI-MOVIE-LIST-002 | 按分类筛选 | 直接调用 | 指定分类有电影 | 仅显示指定分类的电影 |
| CLI-MOVIE-LIST-003 | 按标签筛选 | 直接调用 | 指定标签有电影 | 仅显示指定标签的电影 |
| CLI-MOVIE-LIST-004 | 按状态筛选 | 直接调用 | 存在对应状态电影 | 仅显示对应状态的电影 |
| CLI-MOVIE-LIST-005 | 按排序字段排序 | 直接调用 | 电影有评分 | 按指定字段排序 |
| CLI-MOVIE-LIST-006 | 降序排序 | 直接调用 | 电影有评分 | 按降序排列 |
| CLI-MOVIE-LIST-007 | JSON格式输出 | 直接调用 | 电影数据存在 | 输出JSON格式列表 |
| CLI-MOVIE-LIST-008 | 空电影列表（边界条件） | 直接调用 | 无电影数据 | 输出空列表，显示"共 0 个电影" |
| CLI-MOVIE-LIST-009 | 服务异常处理 | 直接调用 | 服务异常 | 错误提示"获取电影列表失败" |
| CLI-MOVIE-LIST-010 | 别名ls | 直接调用 | 电影数据存在 | 与list命令等效 |

#### 1.2 movie search - 搜索电影

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-SEARCH-001 | 关键字搜索 | 直接调用 | 存在匹配电影 | 显示匹配的电影 |
| CLI-MOVIE-SEARCH-002 | 空关键字搜索（边界条件） | 直接调用 | 无 | 搜索所有电影 |
| CLI-MOVIE-SEARCH-003 | 分类+标签组合筛选 | 直接调用 | 指定分类和标签有匹配 | 仅匹配的结果 |
| CLI-MOVIE-SEARCH-004 | JSON格式输出 | 直接调用 | 存在电影 | JSON格式输出 |
| CLI-MOVIE-SEARCH-005 | 搜索无结果（边界条件） | 直接调用 | 无匹配电影 | 显示"共 0 个电影" |
| CLI-MOVIE-SEARCH-006 | 搜索服务异常 | 直接调用 | 服务异常 | 错误提示"搜索电影失败" |

#### 1.3 movie show - 显示电影详情

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-SHOW-001 | 显示存在的电影 | 直接调用 | 电影存在 | 显示完整电影详情 |
| CLI-MOVIE-SHOW-002 | 显示不存在的电影 | 直接调用 | 电影不存在 | 错误提示"电影不存在" |
| CLI-MOVIE-SHOW-003 | 无效ID格式 | 直接调用 | 无 | 错误提示"无效的电影ID格式" |
| CLI-MOVIE-SHOW-004 | 电影ID含特殊字符 | 直接调用 | 电影存在 | 正确显示电影详情 |
| CLI-MOVIE-SHOW-005 | 别名info | 直接调用 | 电影存在 | 与show命令等效 |

#### 1.4 movie add - 添加电影

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-ADD-001 | 基本添加 | 直接调用 | 分类存在 | 电影创建成功，输出电影信息 |
| CLI-MOVIE-ADD-002 | 添加所有可选字段 | 直接调用 | 分类存在 | 电影创建成功，所有字段正确保存 |
| CLI-MOVIE-ADD-003 | 缺少分类参数 | 直接调用 | 无 | 错误提示缺少category |
| CLI-MOVIE-ADD-004 | 带标签参数 | 直接调用 | 分类存在 | 标签正确解析和保存 |
| CLI-MOVIE-ADD-005 | 无效分类ID | 直接调用 | 分类不存在 | 添加失败 |
| CLI-MOVIE-ADD-006 | 无效日期格式 | 直接调用 | 分类存在 | 电影创建，日期字段保存 |
| CLI-MOVIE-ADD-007 | 添加服务异常处理 | 直接调用 | 服务异常 | 错误提示"添加电影失败" |

#### 1.5 movie edit - 编辑电影

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-EDIT-001 | 修改名称 | 直接调用 | 电影存在 | 名称已更新，NFO文件已修改 |
| CLI-MOVIE-EDIT-002 | 修改description字段 | 直接调用 | 电影存在 | description已更新，NFO文件已修改 |
| CLI-MOVIE-EDIT-003 | 修改director字段 | 直接调用 | 电影存在 | director已更新，NFO文件已修改 |
| CLI-MOVIE-EDIT-004 | 修改actors字段 | 直接调用 | 电影存在 | actors已更新，NFO文件已修改 |
| CLI-MOVIE-EDIT-005 | 修改评分 | 直接调用 | 电影存在 | 评分已更新为有效值 |
| CLI-MOVIE-EDIT-006 | 修改tags（替换模式） | 直接调用 | 电影存在 | tags已替换，NFO文件已修改 |
| CLI-MOVIE-EDIT-007 | 使用--add-tags添加标签 | 直接调用 | 电影存在 | 新标签已添加，NFO文件已修改 |
| CLI-MOVIE-EDIT-008 | 使用--remove-tags移除标签 | 直接调用 | 电影存在 | 指定标签已移除，NFO文件已修改 |
| CLI-MOVIE-EDIT-009 | 无效ID格式 | 直接调用 | 无 | 错误提示"无效的电影ID格式" |
| CLI-MOVIE-EDIT-010 | 修改不存在的电影 | 直接调用 | 电影不存在 | 错误提示"电影不存在" |
| CLI-MOVIE-EDIT-011 | 无效评分值（超出0-5范围） | 直接调用 | 电影存在 | 评分无效，忽略更新 |
| CLI-MOVIE-EDIT-012 | 编辑服务异常处理 | 直接调用 | 服务异常 | 错误提示"修改电影失败" |

#### 1.6 movie delete - 删除电影

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-DELETE-001 | 删除存在的电影 | 直接调用 | 电影存在 | 电影文件夹已删除 |
| CLI-MOVIE-DELETE-002 | 删除不存在的电影 | 直接调用 | 电影不存在 | 错误提示"电影不存在" |
| CLI-MOVIE-DELETE-003 | 无效ID格式 | 直接调用 | 无 | 错误提示"无效的电影ID格式" |
| CLI-MOVIE-DELETE-004 | 使用--force强制删除 | 直接调用 | 电影存在 | 直接删除，无确认提示 |
| CLI-MOVIE-DELETE-005 | 删除服务异常处理 | 直接调用 | 服务异常 | 错误提示"删除电影失败" |
| CLI-MOVIE-DELETE-006 | 别名rm | 直接调用 | 电影存在 | 与delete命令等效 |

#### 1.7 movie status - 更新状态

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-MOVIE-STATUS-001 | 更新为unwatched | 直接调用 | 电影存在 | 状态已更新，NFO文件已修改 |
| CLI-MOVIE-STATUS-002 | 更新为watching | 直接调用 | 电影存在 | 状态已更新，NFO文件已修改 |
| CLI-MOVIE-STATUS-003 | 更新为completed | 直接调用 | 电影存在 | 状态已更新，NFO文件已修改 |
| CLI-MOVIE-STATUS-004 | 无效状态值 | 直接调用 | 无 | 错误提示有效值 |
| CLI-MOVIE-STATUS-005 | 更新不存在的电影状态 | 直接调用 | 电影不存在 | 错误提示"电影不存在" |
| CLI-MOVIE-STATUS-006 | 无效ID格式 | 直接调用 | 无 | 错误提示"无效的电影ID格式" |
| CLI-MOVIE-STATUS-007 | 状态更新服务异常处理 | 直接调用 | 服务异常 | 错误提示"更新状态失败" |

---

### 2. Box Commands (电影盒子命令)

#### 2.1 box list - 列出盒子

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-LIST-001 | 列出所有盒子 | 直接调用 | 存在盒子 | 输出盒子列表 |
| CLI-BOX-LIST-002 | JSON格式 | 直接调用 | 存在盒子 | JSON格式输出 |
| CLI-BOX-LIST-003 | 空盒子列表（边界条件） | 直接调用 | 无盒子数据 | 输出空列表，显示"共 0 个盒子" |
| CLI-BOX-LIST-004 | 列表服务异常处理 | 直接调用 | 服务异常 | 错误提示"获取盒子列表失败" |
| CLI-BOX-LIST-005 | 别名ls | 直接调用 | 存在盒子 | 与list命令等效 |

#### 2.2 box show - 显示盒子详情

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-SHOW-001 | 显示存在的盒子 | 直接调用 | 盒子存在 | 显示盒子详情和电影列表 |
| CLI-BOX-SHOW-002 | 显示不存在的盒子 | 直接调用 | 盒子不存在 | 错误提示"盒子不存在" |
| CLI-BOX-SHOW-003 | 盒子无电影时显示详情 | 直接调用 | 盒子存在但无电影 | 显示盒子详情，电影数为0 |
| CLI-BOX-SHOW-004 | 盒子详情JSON格式输出 | 直接调用 | 盒子存在 | JSON格式输出 |
| CLI-BOX-SHOW-005 | 盒子详情服务异常处理 | 直接调用 | 服务异常 | 错误提示获取详情失败 |
| CLI-BOX-SHOW-006 | 别名info | 直接调用 | 盒子存在 | 与show命令等效 |

#### 2.3 box create - 创建盒子

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-CREATE-001 | 基本创建 | 直接调用 | 无 | 盒子创建成功 |
| CLI-BOX-CREATE-002 | 带描述创建 | 直接调用 | 无 | 盒子创建成功，描述正确保存 |
| CLI-BOX-CREATE-003 | 创建已存在盒子 | 直接调用 | 盒子已存在 | 错误提示"盒子已存在" |
| CLI-BOX-CREATE-004 | 空盒子名称（边界条件） | 直接调用 | 无 | 错误提示名称不能为空 |
| CLI-BOX-CREATE-005 | 超长盒子名称 | 直接调用 | 无 | 盒子创建成功（名称截断或保存） |
| CLI-BOX-CREATE-006 | 特殊字符盒子名称 | 直接调用 | 无 | 盒子创建成功 |
| CLI-BOX-CREATE-007 | 创建服务异常处理 | 直接调用 | 服务异常 | 错误提示创建失败 |

#### 2.4 box edit - 编辑盒子

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-EDIT-001 | 修改名称 | 直接调用 | 盒子存在 | 名称已更新，JSON文件已修改 |
| CLI-BOX-EDIT-002 | 修改description字段 | 直接调用 | 盒子存在 | 描述已更新，JSON文件已修改 |
| CLI-BOX-EDIT-003 | 修改不存在的盒子 | 直接调用 | 盒子不存在 | 错误提示"盒子不存在" |
| CLI-BOX-EDIT-004 | 重命名为已存在名称 | 直接调用 | 目标名称已存在 | 错误提示"新名称已存在" |
| CLI-BOX-EDIT-005 | 编辑服务异常处理 | 直接调用 | 服务异常 | 错误提示编辑失败 |

#### 2.5 box delete - 删除盒子

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-DELETE-001 | 删除存在的盒子 | 直接调用 | 盒子存在 | 盒子已删除 |
| CLI-BOX-DELETE-002 | 删除不存在的盒子 | 直接调用 | 盒子不存在 | 错误提示"盒子不存在" |
| CLI-BOX-DELETE-003 | 使用--force强制删除 | 直接调用 | 盒子存在 | 直接删除，无确认提示 |
| CLI-BOX-DELETE-004 | 删除服务异常处理 | 直接调用 | 服务异常 | 错误提示删除失败 |
| CLI-BOX-DELETE-005 | 别名rm | 直接调用 | 盒子存在 | 与delete命令等效 |

#### 2.6 box add - 添加电影到盒子

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-ADD-001 | 添加电影到盒子 | 直接调用 | 盒子和电影存在 | 电影已添加到盒子，JSON文件已修改 |
| CLI-BOX-ADD-002 | 添加不存在的电影 | 直接调用 | 电影不存在 | 错误提示"电影不存在" |
| CLI-BOX-ADD-003 | 添加到不存在的盒子 | 直接调用 | 盒子不存在 | 错误提示"盒子不存在" |
| CLI-BOX-ADD-004 | 重复添加同一电影到盒子 | 直接调用 | 电影已在盒子中 | 错误提示"电影已在盒子中" |
| CLI-BOX-ADD-005 | 无效电影ID格式 | 直接调用 | 无 | 错误提示电影不存在 |
| CLI-BOX-ADD-006 | 添加服务异常处理 | 直接调用 | 服务异常 | 错误提示添加失败 |

#### 2.7 box remove - 从盒子移除电影

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-BOX-REMOVE-001 | 从盒子移除电影 | 直接调用 | 电影在盒子中 | 电影已从盒子移除，JSON文件已修改 |
| CLI-BOX-REMOVE-002 | 移除不在盒子中的电影 | 直接调用 | 电影不在盒子中 | 错误提示"电影不在盒子中" |
| CLI-BOX-REMOVE-003 | 从不存在的盒子移除电影 | 直接调用 | 盒子不存在 | 错误提示"盒子不存在" |
| CLI-BOX-REMOVE-004 | 无效电影ID格式 | 直接调用 | 无 | 错误提示电影不在盒子中 |
| CLI-BOX-REMOVE-005 | 移除服务异常处理 | 直接调用 | 服务异常 | 错误提示移除失败 |

---

### 3. Category Commands (分类管理命令)

#### 3.1 category list - 列出分类

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-CATEGORY-LIST-001 | 列出所有分类 | 直接调用 | 分类存在 | 输出分类列表含电影数量 |
| CLI-CATEGORY-LIST-002 | JSON格式 | 直接调用 | 分类存在 | JSON格式输出 |
| CLI-CATEGORY-LIST-003 | 空分类列表（边界条件） | 直接调用 | 无分类数据 | 输出空列表 |
| CLI-CATEGORY-LIST-004 | 分类列表服务异常处理 | 直接调用 | 服务异常 | 错误提示获取分类失败 |
| CLI-CATEGORY-LIST-005 | 别名ls | 直接调用 | 分类存在 | 与list命令等效 |

#### 3.2 category show - 显示分类详情

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-CATEGORY-SHOW-001 | 显示存在的分类 | 直接调用 | 分类存在 | 显示分类详情 |
| CLI-CATEGORY-SHOW-002 | 显示不存在的分类 | 直接调用 | 分类不存在 | 错误提示"分类不存在" |
| CLI-CATEGORY-SHOW-003 | 无效分类ID（含特殊字符） | 直接调用 | 无 | 错误提示"分类不存在" |
| CLI-CATEGORY-SHOW-004 | 分类详情服务异常处理 | 直接调用 | 服务异常 | 错误提示获取详情失败 |
| CLI-CATEGORY-SHOW-005 | 别名info | 直接调用 | 分类存在 | 与show命令等效 |

---

### 4. Tag Commands (标签管理命令)

#### 4.1 tag list - 列出标签

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-TAG-LIST-001 | 列出所有标签 | 直接调用 | 标签存在 | 输出标签列表含电影数量 |
| CLI-TAG-LIST-002 | JSON格式 | 直接调用 | 标签存在 | JSON格式输出 |
| CLI-TAG-LIST-003 | 空标签列表（边界条件） | 直接调用 | 无标签数据 | 输出空列表 |
| CLI-TAG-LIST-004 | 标签列表服务异常处理 | 直接调用 | 服务异常 | 错误提示获取标签失败 |
| CLI-TAG-LIST-005 | 别名ls | 直接调用 | 标签存在 | 与list命令等效 |

#### 4.2 tag create - 创建标签

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-TAG-CREATE-001 | 创建新标签 | 直接调用 | 标签不存在 | 标签创建成功，tags.json已修改 |
| CLI-TAG-CREATE-002 | 创建已存在的标签 | 直接调用 | 标签已存在 | 错误提示"标签已存在" |
| CLI-TAG-CREATE-003 | 空标签ID（边界条件） | 直接调用 | 无 | 标签ID为空，允许创建 |
| CLI-TAG-CREATE-004 | 空标签名称（边界条件） | 直接调用 | 无 | 标签名称为空，允许创建 |
| CLI-TAG-CREATE-005 | 标签ID含特殊字符 | 直接调用 | 无 | 标签创建成功，tags.json已修改 |
| CLI-TAG-CREATE-006 | 超长标签名称 | 直接调用 | 无 | 标签创建成功 |
| CLI-TAG-CREATE-007 | 创建服务异常处理 | 直接调用 | 服务异常 | 错误提示创建失败 |

#### 4.3 tag delete - 删除标签

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-TAG-DELETE-001 | 删除存在的标签 | 直接调用 | 标签存在 | 标签已删除，tags.json已修改 |
| CLI-TAG-DELETE-002 | 删除不存在的标签 | 直接调用 | 标签不存在 | 错误提示"标签不存在" |
| CLI-TAG-DELETE-003 | 删除服务异常处理 | 直接调用 | 服务异常 | 错误提示删除失败 |

---

### 5. Config Commands (配置管理命令)

#### 5.1 config show - 显示配置

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-CONFIG-SHOW-001 | 显示当前配置 | 直接调用 | 配置存在 | 输出当前配置 |
| CLI-CONFIG-SHOW-002 | JSON格式 | 直接调用 | 配置存在 | JSON格式输出 |
| CLI-CONFIG-SHOW-003 | 配置为空对象（边界条件） | 直接调用 | 配置为空 | 输出空配置 |
| CLI-CONFIG-SHOW-004 | 获取配置服务异常处理 | 直接调用 | 服务异常 | 错误提示获取配置失败 |
| CLI-CONFIG-SHOW-005 | 别名list | 直接调用 | 配置存在 | 与show命令等效 |

#### 5.2 config get - 获取配置项

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-CONFIG-GET-001 | 获取moviesDir | 直接调用 | 配置存在 | 输出moviesDir值 |
| CLI-CONFIG-GET-002 | 获取theme | 直接调用 | 配置存在 | 输出theme值 |
| CLI-CONFIG-GET-003 | 获取不存在的键 | 直接调用 | 无 | 输出空值 |
| CLI-CONFIG-GET-004 | 获取嵌套键值 | 直接调用 | 配置存在 | 输出嵌套键值 |
| CLI-CONFIG-GET-005 | 获取配置服务异常处理 | 直接调用 | 服务异常 | 错误提示获取配置失败 |

#### 5.3 config set - 设置配置项

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-CONFIG-SET-001 | 设置theme | 直接调用 | 配置存在 | theme已更新，settings.json已修改 |
| CLI-CONFIG-SET-002 | 设置moviesDir | 直接调用 | 配置存在 | moviesDir已更新，settings.json已修改 |
| CLI-CONFIG-SET-003 | 设置language | 直接调用 | 配置存在 | language已更新，settings.json已修改 |
| CLI-CONFIG-SET-004 | 设置无效键名 | 直接调用 | 配置存在 | 允许设置任意键 |
| CLI-CONFIG-SET-005 | 设置空值 | 直接调用 | 配置存在 | 允许设置空值 |
| CLI-CONFIG-SET-006 | 设置配置服务异常处理 | 直接调用 | 服务异常 | 错误提示设置配置失败 |

#### 5.4 config reset - 重置配置

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-CONFIG-RESET-001 | 重置配置 | 直接调用 | 配置存在 | 配置已重置为默认值，settings.json已修改 |
| CLI-CONFIG-RESET-002 | 重置配置服务异常处理 | 直接调用 | 服务异常 | 错误提示重置配置失败 |

---

### 6. Import Commands (导入命令)

#### 6.1 import json - JSON导入

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-IMPORT-JSON-001 | 导入有效JSON | 直接调用 | JSON文件有效 | 电影导入成功，输出结果统计 |
| CLI-IMPORT-JSON-002 | 导入不存在的文件 | 直接调用 | 文件不存在 | 错误提示"文件不存在" |
| CLI-IMPORT-JSON-003 | 导入无效JSON | 直接调用 | JSON格式错误 | 错误提示"JSON解析失败" |
| CLI-IMPORT-JSON-004 | 导入缺少必填字段 | 直接调用 | 缺少name字段 | 错误提示验证失败 |
| CLI-IMPORT-JSON-005 | 导入缺少分类 | 直接调用 | 缺少category字段 | 错误提示验证失败 |
| CLI-IMPORT-JSON-006 | 导入空文件 | 直接调用 | 文件为空 | 错误提示解析失败 |
| CLI-IMPORT-JSON-007 | 导入超大文件 | 直接调用 | 文件过大 | 正常导入或内存限制提示 |
| CLI-IMPORT-JSON-008 | 导入部分成功/部分失败 | 直接调用 | 部分电影数据无效 | 输出成功数和失败数 |
| CLI-IMPORT-JSON-009 | 导入无效分类ID | 直接调用 | 分类不存在 | 导入失败，输出错误信息 |

#### 6.2 import template - 生成模板

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-IMPORT-TEMPLATE-001 | 生成模板 | 直接调用 | 模板文件存在 | 输出JSON模板内容 |
| CLI-IMPORT-TEMPLATE-002 | 模板生成服务异常处理 | 直接调用 | 服务异常 | 错误提示生成模板失败 |

---

### 7. Global Commands (全局命令)

#### 7.1 stats - 统计信息

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-STATS-001 | 显示基本统计信息 | 直接调用 | 电影数据存在 | 输出统计信息（总数、平均评分、播放时长） |
| CLI-STATS-002 | 按分类过滤统计 | 直接调用 | 指定分类有电影 | 仅该分类的统计信息 |
| CLI-STATS-003 | 显示播放时间统计 | 直接调用 | 电影有播放记录 | 输出播放时间详情 |
| CLI-STATS-004 | 空数据库统计（边界条件） | 直接调用 | 无电影数据 | 输出全为0的统计信息 |
| CLI-STATS-005 | 统计服务异常处理 | 直接调用 | 服务异常 | 错误提示统计失败 |

---

### 8. Utils - Output (输出格式化工具)

#### 8.1 formatRating - 评分格式化

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-RATING-001 | 格式化0分 | 直接调用 | 无 | 返回"-" |
| CLI-OUTPUT-RATING-002 | 格式化3分 | 直接调用 | 无 | 返回"★★★☆☆" |
| CLI-OUTPUT-RATING-003 | 格式化5分 | 直接调用 | 无 | 返回"★★★★★" |
| CLI-OUTPUT-RATING-004 | 空值处理 | 直接调用 | 无 | 返回"-" |
| CLI-OUTPUT-RATING-005 | 小数评分（如3.5） | 直接调用 | 无 | 返回对应星数 |

#### 8.2 formatStatus - 状态格式化

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-STATUS-001 | unwatched | 直接调用 | 无 | 返回"未看" |
| CLI-OUTPUT-STATUS-002 | watching | 直接调用 | 无 | 返回"观看中" |
| CLI-OUTPUT-STATUS-003 | completed | 直接调用 | 无 | 返回"已完成" |
| CLI-OUTPUT-STATUS-004 | 未知状态 | 直接调用 | 无 | 返回原状态值 |

#### 8.3 formatPlayTime - 播放时间格式化

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-PLAYTIME-001 | 零值 | 直接调用 | 无 | 返回"-" |
| CLI-OUTPUT-PLAYTIME-002 | 分钟级 | 直接调用 | 无 | 返回"45分钟" |
| CLI-OUTPUT-PLAYTIME-003 | 小时级 | 直接调用 | 无 | 返回"2小时 5分钟" |
| CLI-OUTPUT-PLAYTIME-004 | 超大播放时间 | 直接调用 | 无 | 返回小时和分钟格式 |

#### 8.4 outputMovieList - 电影列表输出

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-MOVIELIST-001 | 空电影列表输出 | 直接调用 | 无电影数据 | 输出空表格，显示"共 0 个电影" |
| CLI-OUTPUT-MOVIELIST-002 | 有电影列表输出 | 直接调用 | 电影数据存在 | 输出电影表格 |

#### 8.5 outputTagList - 标签列表输出

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-TAGLIST-001 | 空标签列表输出 | 直接调用 | 无标签数据 | 输出空表格 |
| CLI-OUTPUT-TAGLIST-002 | 有标签列表输出 | 直接调用 | 标签数据存在 | 输出标签表格 |

#### 8.6 outputCategoryList - 分类列表输出

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-CATEGORYLIST-001 | 空分类列表输出 | 直接调用 | 无分类数据 | 输出空表格 |
| CLI-OUTPUT-CATEGORYLIST-002 | 有分类列表输出 | 直接调用 | 分类数据存在 | 输出分类表格 |

#### 8.7 outputBoxList - 盒子列表输出

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-OUTPUT-BOXLIST-001 | 空盒子列表输出 | 直接调用 | 无盒子数据 | 输出空表格，显示"共 0 个盒子" |
| CLI-OUTPUT-BOXLIST-002 | 有盒子列表输出 | 直接调用 | 盒子数据存在 | 输出盒子表格 |

---

### 9. Utils - Validation (验证工具函数)

#### 9.1 validateMovieId - 电影ID验证

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-MOVIEID-001 | 有效ID | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-MOVIEID-002 | 多个分隔符 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-MOVIEID-003 | 无分隔符 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-MOVIEID-004 | 空值 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-MOVIEID-005 | null值 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-MOVIEID-006 | ID含特殊字符（如中文） | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-MOVIEID-007 | 超长ID | 直接调用 | 无 | 返回true |

#### 9.2 validateCategory - 分类验证

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-CATEGORY-001 | 有效分类 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-CATEGORY-002 | 无效分类 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-CATEGORY-003 | 分类列表 | 直接调用 | 无 | 返回true（跳过验证） |

#### 9.3 validateRating - 评分验证

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-RATING-001 | 有效评分0-5 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-RATING-002 | 评分0 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-RATING-003 | 评分5 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-RATING-004 | 评分6 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-RATING-005 | 负数评分 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-RATING-006 | 字符串数字 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-RATING-007 | 小数评分（如3.5） | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-RATING-008 | 非数字评分（如"abc"） | 直接调用 | 无 | 返回false |

#### 9.4 validateStatus - 状态验证

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-STATUS-001 | unwatched | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-STATUS-002 | watching | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-STATUS-003 | completed | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-STATUS-004 | 无效状态 | 直接调用 | 无 | 返回false |

#### 9.5 validateMovieData - 电影数据验证

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-MOVIEDATA-001 | 有效数据 | 直接调用 | 无 | 返回{ valid: true } |
| CLI-VALIDATE-MOVIEDATA-002 | 缺少name | 直接调用 | 无 | 返回{ valid: false, errors: [...] } |
| CLI-VALIDATE-MOVIEDATA-003 | 缺少category | 直接调用 | 无 | 返回{ valid: false, errors: [...] } |
| CLI-VALIDATE-MOVIEDATA-004 | 无效分类 | 直接调用 | 无 | 返回{ valid: false, errors: [...] } |
| CLI-VALIDATE-MOVIEDATA-005 | 无效日期格式 | 直接调用 | 无 | 返回{ valid: false, errors: [...] } |
| CLI-VALIDATE-MOVIEDATA-006 | 无效评分 | 直接调用 | 无 | 返回{ valid: false, errors: [...] } |

#### 9.6 isValidDate - 日期验证

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-DATE-001 | 有效日期 | 直接调用 | 无 | 返回true |
| CLI-VALIDATE-DATE-002 | 无效格式 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-DATE-003 | 无效日期 | 直接调用 | 无 | 返回false |
| CLI-VALIDATE-DATE-004 | 空值 | 直接调用 | 无 | 返回false |

#### 9.7 parseTags - 标签解析

| 用例ID | 用例名称 | 测试方法 | 前置条件 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLI-VALIDATE-PARSETAGS-001 | 单个标签 | 直接调用 | 无 | 返回['action'] |
| CLI-VALIDATE-PARSETAGS-002 | 多个标签 | 直接调用 | 无 | 返回['action', 'comedy'] |
| CLI-VALIDATE-PARSETAGS-003 | 带空格 | 直接调用 | 无 | 返回['action', 'comedy', 'drama'] |
| CLI-VALIDATE-PARSETAGS-004 | 空值 | 直接调用 | 无 | 返回[] |
| CLI-VALIDATE-PARSETAGS-005 | null值 | 直接调用 | 无 | 返回[] |
| CLI-VALIDATE-PARSETAGS-006 | 标签含特殊字符 | 直接调用 | 无 | 返回带特殊字符的标签数组 |

---

## 测试数据设计

### 测试电影NFO数据结构

```xml
<!-- test/cli/test-data/movies/movie/test-movie/movie.nfo -->
<movie>
    <id>movie-test-movie</id>
    <title>Test Movie</title>
    <year>2024</year>
    <outline>Test movie description</outline>
    <director>Test Director</director>
    <actor>
        <name>Test Actor</name>
    </actor>
    <tag>action</tag>
</movie>
```

### 测试电影盒子数据结构

```json
// test/cli/test-data/boxes/test-box.json
{
    "name": "Test Box",
    "description": "Test box description",
    "created": "2024-01-01T00:00:00.000Z",
    "data": {
        "movie": [
            { "id": "movie-test-movie", "status": "unplayed" }
        ]
    }
}
```

### 测试导入JSON

```json
// test/cli/test-data/import-movies.json
[
    {
        "name": "Import Movie 1",
        "category": "movie",
        "description": "Imported movie 1",
        "director": "Test Director"
    },
    {
        "name": "Import Movie 2",
        "category": "movie",
        "description": "Imported movie 2"
    }
]
```

## 验收标准

1. 所有测试用例执行后返回码为0
2. 所有断言通过，无预期外的错误
3. 测试完成后清理所有测试生成的文件
4. 代码覆盖率报告生成成功

## 测试执行方式

```bash
# 执行所有单元测试
npm test

# 执行CLI测试
npm test -- --testPathPattern="test/cli"

# 执行特定命令测试
npm test -- --testPathPattern="movie.test.js"

# 执行特定用例
npm test -- --testNamePattern="CLI-MOVIE-LIST-001"

# 生成覆盖率报告
npm test -- --coverage

# 查看覆盖率详情
open coverage/lcov-report/index.html
```
