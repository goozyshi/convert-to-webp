import * as vscode from "vscode";
import {
  processConversion,
  formatFileSize,
  calculateCompressionRatio,
} from "./converter";

export function activate(context: vscode.ExtensionContext) {
  console.log("Convert to WebP extension is now active!");

  const disposable = vscode.commands.registerCommand(
    "convert-to-webp.convertFiles",
    async (uri: vscode.Uri, uris: vscode.Uri[]) => {
      try {
        // 获取选中的文件路径
        const selectedPaths: string[] = [];

        if (uris && uris.length > 0) {
          // 多选情况
          selectedPaths.push(...uris.map((u) => u.fsPath));
        } else if (uri) {
          // 单选情况
          selectedPaths.push(uri.fsPath);
        } else {
          vscode.window.showErrorMessage("未找到选中的文件或文件夹");
          return;
        }

        // 显示进度并执行转换
        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Converting to WebP",
            cancellable: false,
          },
          async (progress) => {
            return await processConversion(selectedPaths, progress);
          }
        );

        // 显示转换结果
        if (result.convertedCount > 0) {
          const totalCompressionRatio = calculateCompressionRatio(
            result.totalOriginalSize,
            result.totalCompressedSize
          );
          const totalSizeInfo =
            result.totalOriginalSize > 0
              ? `\n总大小对比: ${formatFileSize(
                  result.totalOriginalSize
                )} -> ${formatFileSize(
                  result.totalCompressedSize
                )} (${totalCompressionRatio}% 压缩)`
              : "";

          let message = `转换完成: ${result.convertedCount} 张图片已转换为 WebP 格式`;
          if (result.deletedCount > 0) {
            message += `\n已删除: ${result.deletedCount} 个原始文件`;
          }
          message += totalSizeInfo;

          vscode.window.showInformationMessage(message);
        } else {
          vscode.window.showWarningMessage("没有找到可转换的图片文件");
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`转换失败: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log("Convert to WebP extension is now deactivated");
}
