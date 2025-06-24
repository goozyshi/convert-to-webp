# Convert to WebP

一个用于将图片（JPG/PNG）转换为 WebP 格式的 VSCode 扩展。

## 功能特性

- 支持 JPG、JPEG、PNG 格式转换为 WebP
- 递归处理文件夹中的所有图片
- 显示文件大小对比和压缩比率
- 可配置的转换质量设置
- 可选择是否删除原始文件
- 右键菜单快速转换

## 使用方法

1. 在文件浏览器中右键点击：

   - 单个图片文件
   - 包含图片的文件夹
   - 多选的文件/文件夹

2. 选择 "Convert to WebP" 命令

3. 转换后的 WebP 文件将保存在对应的 `webp/` 目录中

## 设置选项

- `convert-to-webp.quality`: WebP 转换质量 (0.1-1.0，默认 0.8)
- `convert-to-webp.deleteOriginal`: 转换后是否删除原文件 (默认 true)

## 要求

- Node.js
- VSCode 1.60.0+

## 发布历史

### 1.0.0

- 初始版本
- 支持 JPG/PNG 转 WebP 转换
- 右键菜单集成
- 文件大小对比显示
