import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import * as sharp from "sharp";
import { ConvertResult, ConvertSettings, ConvertStats } from "./types";

// 格式化文件大小显示
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// 计算压缩比率
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): string {
  if (originalSize === 0) return "0.0";
  return ((1 - compressedSize / originalSize) * 100).toFixed(1);
}

// 获取VSCode设置
export function getSettings(): ConvertSettings {
  const config = vscode.workspace.getConfiguration("convert-to-webp");
  return {
    quality: config.get<number>("quality", 0.8),
    deleteOriginal: config.get<boolean>("deleteOriginal", true),
  };
}

// 确保目录存在，不存在则创建
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// 递归获取所有支持格式的图片文件路径
export async function getAllImageFiles(
  inputDir: string,
  supportedFormats: string[]
): Promise<string[]> {
  const imageFiles: string[] = [];

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedFormats.includes(ext)) {
            imageFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`扫描目录失败 ${dir}:`, error);
    }
  }

  await scanDirectory(inputDir);
  return imageFiles;
}

// 计算输出文件的相对路径
export function getRelativeOutputPath(
  inputPath: string,
  inputDir: string,
  outputDir: string
): string {
  const relativePath = path.relative(inputDir, inputPath);
  const parsedPath = path.parse(relativePath);
  const outputFileName = parsedPath.name + ".webp";
  return path.join(outputDir, parsedPath.dir, outputFileName);
}

// 使用sharp转换单个图片
export async function convertImage(
  inputPath: string,
  outputPath: string,
  quality: number
): Promise<ConvertResult> {
  try {
    // 获取原始文件大小
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    await ensureDirectoryExists(path.dirname(outputPath));
    await sharp(inputPath)
      .webp({ quality: Math.round(quality * 100) })
      .toFile(outputPath);

    // 获取压缩后文件大小
    const compressedStats = await fs.stat(outputPath);
    const compressedSize = compressedStats.size;

    return {
      success: true,
      originalSize,
      compressedSize,
    };
  } catch (error: any) {
    return {
      success: false,
      originalSize: 0,
      compressedSize: 0,
      error: error.message,
    };
  }
}

// 删除原始文件
export async function deleteOriginalFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`删除失败 ${filePath}:`, error);
    return false;
  }
}

// 获取文件路径对应的输出目录
export function getOutputDirectory(inputPath: string): string {
  const dir = path.dirname(inputPath);
  return path.join(dir, "webp");
}

// 检查路径是否为图片文件
export function isImageFile(filePath: string): boolean {
  const supportedFormats = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(filePath).toLowerCase();
  return supportedFormats.includes(ext);
}

// 主转换处理函数
export async function processConversion(
  inputPaths: string[],
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<ConvertStats> {
  const settings = getSettings();
  const supportedFormats = [".jpg", ".jpeg", ".png"];

  let allImageFiles: string[] = [];

  // 收集所有需要转换的图片文件
  for (const inputPath of inputPaths) {
    const stat = await fs.stat(inputPath);

    if (stat.isFile() && isImageFile(inputPath)) {
      allImageFiles.push(inputPath);
    } else if (stat.isDirectory()) {
      const dirImageFiles = await getAllImageFiles(inputPath, supportedFormats);
      allImageFiles.push(...dirImageFiles);
    }
  }

  if (allImageFiles.length === 0) {
    vscode.window.showWarningMessage("未找到支持的图片文件");
    return {
      convertedCount: 0,
      deletedCount: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
    };
  }

  let convertedCount = 0;
  let deletedCount = 0;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  for (let i = 0; i < allImageFiles.length; i++) {
    const inputPath = allImageFiles[i];
    const outputDir = getOutputDirectory(inputPath);
    const outputPath = path.join(
      outputDir,
      path.basename(inputPath, path.extname(inputPath)) + ".webp"
    );

    // 更新进度
    const fileName = path.basename(inputPath);
    progress.report({
      message: `正在转换: [${i + 1}/${allImageFiles.length}] ${fileName}`,
      increment: 100 / allImageFiles.length,
    });

    // 转换图片
    const result = await convertImage(inputPath, outputPath, settings.quality);

    if (result.success) {
      convertedCount++;
      totalOriginalSize += result.originalSize;
      totalCompressedSize += result.compressedSize;

      // 删除原始文件
      if (settings.deleteOriginal) {
        const deleteSuccess = await deleteOriginalFile(inputPath);
        if (deleteSuccess) {
          deletedCount++;
        }
      }
    }
  }

  return {
    convertedCount,
    deletedCount,
    totalOriginalSize,
    totalCompressedSize,
  };
}
