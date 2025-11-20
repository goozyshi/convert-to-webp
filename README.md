# Convert to WebP

一个功能强大的 VSCode 扩展，用于将图片（JPG/PNG）快速转换为 WebP 格式，支持批量处理和多种输出模式。

## ✨ 功能特性

- 🎨 **多格式支持**：支持 JPG、JPEG、PNG 格式转换为 WebP
- 📁 **批量处理**：递归处理文件夹中的所有图片，支持多选
- ⚡ **并发转换**：可配置并发数量，充分利用多核性能，转换速度提升 3-4 倍
- 🎯 **灵活输出**：三种输出模式任选
  - `webp` - 创建 webp 子目录（默认）
  - `same` - 原地替换原文件
  - `custom` - 自定义输出路径
- 📊 **详细统计**：实时显示文件大小对比、压缩率和节省空间
- 📝 **完整日志**：Output Channel 中记录每个文件的转换详情
- 🛡️ **安全确认**：原地替换模式会弹窗确认，防止误操作
- 🎛️ **可配置性**：转换质量、删除原文件等多项可调参数
- 🚀 **右键菜单**：快速访问转换功能

## 📖 使用方法

### 基础使用

1. 在文件资源管理器中右键点击：

   - 单个图片文件
   - 包含图片的文件夹
   - 多选的文件/文件夹

2. 选择 **"Convert to WebP"** 命令

3. 查看转换进度和详细统计信息

### 输出模式说明

#### 模式 1：webp 子目录（默认）

```
原文件：/project/images/photo.jpg
输出：  /project/images/webp/photo.webp
```

#### 模式 2：原地替换

```
原文件：/project/images/photo.jpg
输出：  /project/images/photo.webp  (覆盖原文件)
```

⚠️ **首次使用会弹出安全确认对话框**

#### 模式 3：自定义目录

```
原文件：/project/images/photo.jpg
配置：  convert-to-webp.customOutputPath = "../converted"
输出：  /project/converted/photo.webp
```

### 查看详细日志

转换完成后，点击通知中的 **"查看详细日志"** 按钮，或：

- 菜单栏 → **View** → **Output**
- 选择下拉菜单中的 **"Convert to WebP"**

日志示例：

```
========== 开始转换 ==========
转换文件数: 15
并发限制: 5
输出模式: webp
转换质量: 80%
==============================

✓ [1/15] photo1.jpg - 1.2 MB → 543 KB (压缩 54.8%)
✓ [2/15] photo2.png - 856 KB → 312 KB (压缩 63.6%)
...

========== 转换完成 ==========
成功: 15/15
已删除原文件: 15
==============================
```

## ⚙️ 配置选项

打开 VSCode 设置（`Cmd/Ctrl + ,`），搜索 `convert-to-webp`：

| 配置项             | 类型    | 默认值   | 说明                                     |
| ------------------ | ------- | -------- | ---------------------------------------- |
| `quality`          | number  | `0.8`    | WebP 转换质量 (0.1-1.0)                  |
| `deleteOriginal`   | boolean | `true`   | 转换后是否删除原文件                     |
| `outputDirectory`  | string  | `"webp"` | 输出目录模式：`webp` / `same` / `custom` |
| `customOutputPath` | string  | `""`     | 自定义输出路径（相对于原文件目录）       |
| `concurrentLimit`  | number  | `5`      | 并发转换的最大任务数 (1-20)              |

### 配置示例

**settings.json** 配置：

```json
{
  "convert-to-webp.quality": 0.85,
  "convert-to-webp.deleteOriginal": false,
  "convert-to-webp.outputDirectory": "custom",
  "convert-to-webp.customOutputPath": "../optimized",
  "convert-to-webp.concurrentLimit": 10
}
```

### 性能调优建议

**并发数量设置**：

- 💻 普通笔记本：`3-5`
- 🖥️ 高性能台式机：`8-12`
- 🚀 工作站/SSD：`15-20`

**质量设置**：

- 🎨 要求高画质：`0.85-0.95`
- ⚖️ 平衡模式：`0.75-0.85`（推荐）
- 📦 追求体积小：`0.60-0.75`

## 📊 性能对比

| 场景       | 顺序转换 | 并发转换 (limit=5) | 性能提升    |
| ---------- | -------- | ------------------ | ----------- |
| 10 张图片  | ~25 秒   | ~8 秒              | **3.1x** ⚡ |
| 50 张图片  | ~2 分钟  | ~35 秒             | **3.4x** ⚡ |
| 100 张图片 | ~4 分钟  | ~1 分 10 秒        | **3.4x** ⚡ |

## 💬 通知信息示例

转换完成后会显示详细统计：

```
✅ 转换完成: 23 张图片
📊 大小对比: 5.2 MB → 2.1 MB
📉 压缩率: 59.6%
💾 节省空间: 3.1 MB
🗑️ 已删除原文件: 23 个

[查看详细日志] [关闭]
```

## 🔧 系统要求

- **VSCode**: 1.60.0 或更高版本
- **Node.js**: 推荐 16.x 或更高版本
- **操作系统**: macOS / Windows / Linux

## 📦 安装方法

### 从 VS Marketplace 安装（推荐）

1. 打开 VSCode
2. 按 `Cmd/Ctrl + Shift + X` 打开扩展面板
3. 搜索 "Convert to WebP"
4. 点击安装

### 从 VSIX 文件安装

```bash
code --install-extension convert-to-webp-1.0.0.vsix
```

## 🐛 常见问题

**Q: 转换后文件更大了？**  
A: 某些已优化的 PNG 可能比 WebP 更小，建议调整质量参数或检查原图格式。

**Q: 原地替换是否安全？**  
A: 首次使用会强制弹窗确认，建议先备份重要文件。

**Q: 支持 GIF 动图吗？**  
A: 当前版本仅支持静态 JPG/PNG，动图支持计划中。

**Q: 转换失败如何排查？**  
A: 查看 Output Channel 中的详细错误日志，通常是文件权限或格式问题。

## 🗺️ 发布历史

### 1.1.0 (Latest)

- ⚡ **新增**：并发转换支持，性能提升 3-4 倍
- 🎯 **新增**：三种输出模式（webp 子目录 / 原地替换 / 自定义路径）
- 📊 **增强**：详细的转换统计和通知信息
- 📝 **新增**：Output Channel 完整日志记录
- 🛡️ **改进**：原地替换安全确认机制
- 💾 **优化**：显示节省空间大小

### 1.0.0

- 🎉 初始版本发布
- ✅ 支持 JPG/PNG 转 WebP 转换
- 🖱️ 右键菜单集成
- 📏 文件大小对比显示

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

Repository: [https://github.com/goozyshi/convert-to-webp](https://github.com/goozyshi/convert-to-webp)
