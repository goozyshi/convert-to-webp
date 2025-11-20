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
    outputDirectory: config.get<"webp" | "same" | "custom">("outputDirectory", "webp"),
    customOutputPath: config.get<string>("customOutputPath", ""),
    concurrentLimit: config.get<number>("concurrentLimit", 5),
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

// 获取文件路径对应的输出目录和文件名
export function getOutputPath(
  inputPath: string,
  settings: ConvertSettings
): string {
  const dir = path.dirname(inputPath);
  const fileName = path.basename(inputPath, path.extname(inputPath)) + ".webp";

  switch (settings.outputDirectory) {
    case "same":
      // 原地替换
      return path.join(dir, fileName);
    case "custom":
      // 自定义目录
      if (settings.customOutputPath) {
        const customDir = path.isAbsolute(settings.customOutputPath)
          ? settings.customOutputPath
          : path.join(dir, settings.customOutputPath);
        return path.join(customDir, fileName);
      }
      // 如果自定义路径为空，回退到 webp 子目录
      return path.join(dir, "webp", fileName);
    case "webp":
    default:
      // webp 子目录
      return path.join(dir, "webp", fileName);
  }
}

// 获取文件路径对应的输出目录（兼容旧函数）
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

// 并发控制：限制同时运行的Promise数量
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onProgress?: (completed: number, total: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let completed = 0;
  const total = tasks.length;
  
  // 创建任务队列
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const promise = task().then((result) => {
      results[i] = result;
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    });
    
    executing.push(promise);
    
    // 当达到并发限制时，等待一个任务完成
    if (executing.length >= limit) {
      await Promise.race(executing);
      // 移除已完成的promise
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }
  
  // 等待所有剩余任务完成
  await Promise.all(executing);
  
  return results;
}

// 主转换处理函数
export async function processConversion(
  inputPaths: string[],
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  outputChannel?: vscode.OutputChannel
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

  // 原地替换警告确认
  if (settings.outputDirectory === "same") {
    const answer = await vscode.window.showWarningMessage(
      `⚠️ 原地替换模式将直接覆盖原文件！\n共 ${allImageFiles.length} 个文件将被替换，此操作不可恢复。`,
      { modal: true },
      "确认替换",
      "取消"
    );
    
    if (answer !== "确认替换") {
      outputChannel?.appendLine("用户取消了原地替换操作");
      return {
        convertedCount: 0,
        deletedCount: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
      };
    }
  }

  let convertedCount = 0;
  let deletedCount = 0;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  outputChannel?.appendLine(`\n========== 开始转换 ==========`);
  outputChannel?.appendLine(`转换文件数: ${allImageFiles.length}`);
  outputChannel?.appendLine(`并发限制: ${settings.concurrentLimit}`);
  outputChannel?.appendLine(`输出模式: ${settings.outputDirectory}`);
  outputChannel?.appendLine(`转换质量: ${settings.quality * 100}%`);
  outputChannel?.appendLine(`==============================\n`);

  // 创建转换任务
  const tasks = allImageFiles.map((inputPath, index) => async () => {
    const outputPath = getOutputPath(inputPath, settings);
    const fileName = path.basename(inputPath);

    // 转换图片
    const result = await convertImage(inputPath, outputPath, settings.quality);

    if (result.success) {
      const compressionRatio = calculateCompressionRatio(
        result.originalSize,
        result.compressedSize
      );
      
      outputChannel?.appendLine(
        `✓ [${index + 1}/${allImageFiles.length}] ${fileName} - ` +
        `${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} ` +
        `(压缩 ${compressionRatio}%)`
      );

      // 删除原始文件（仅在非原地替换模式下）
      if (settings.deleteOriginal && settings.outputDirectory !== "same") {
        await deleteOriginalFile(inputPath);
      }
    } else {
      outputChannel?.appendLine(
        `✗ [${index + 1}/${allImageFiles.length}] ${fileName} - 失败: ${result.error}`
      );
    }

    return result;
  });

  // 并发执行转换任务
  const results = await runWithConcurrencyLimit(
    tasks,
    settings.concurrentLimit,
    (completed, total) => {
      progress.report({
        message: `正在转换: ${completed}/${total}`,
        increment: 100 / total,
      });
    }
  );

  // 统计结果
  for (const result of results) {
    if (result.success) {
      convertedCount++;
      totalOriginalSize += result.originalSize;
      totalCompressedSize += result.compressedSize;
      
      // 统计删除数量
      if (settings.deleteOriginal && settings.outputDirectory !== "same") {
        deletedCount++;
      }
    }
  }

  outputChannel?.appendLine(`\n========== 转换完成 ==========`);
  outputChannel?.appendLine(`成功: ${convertedCount}/${allImageFiles.length}`);
  outputChannel?.appendLine(`失败: ${allImageFiles.length - convertedCount}`);
  if (deletedCount > 0) {
    outputChannel?.appendLine(`已删除原文件: ${deletedCount}`);
  }
  outputChannel?.appendLine(`==============================\n`);

  return {
    convertedCount,
    deletedCount,
    totalOriginalSize,
    totalCompressedSize,
  };
}
