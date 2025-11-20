import * as vscode from "vscode";
import {
  processConversion,
  formatFileSize,
  calculateCompressionRatio,
} from "./converter";

export function activate(context: vscode.ExtensionContext) {
  console.log("Convert to WebP extension is now active!");

  // 创建输出通道
  const outputChannel = vscode.window.createOutputChannel("Convert to WebP");
  context.subscriptions.push(outputChannel);

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

        // 显示输出通道
        outputChannel.show(true);

        // 显示进度并执行转换
        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Converting to WebP",
            cancellable: false,
          },
          async (progress) => {
            return await processConversion(selectedPaths, progress, outputChannel);
          }
        );

        // 显示转换结果
        if (result.convertedCount > 0) {
          const totalCompressionRatio = calculateCompressionRatio(
            result.totalOriginalSize,
            result.totalCompressedSize
          );
          
          // 构建详细的通知消息
          const messages: string[] = [];
          messages.push(`✅ 转换完成: ${result.convertedCount} 张图片`);
          
          if (result.totalOriginalSize > 0) {
            messages.push(
              `📊 大小对比: ${formatFileSize(result.totalOriginalSize)} → ` +
              `${formatFileSize(result.totalCompressedSize)}`
            );
            messages.push(`📉 压缩率: ${totalCompressionRatio}%`);
            messages.push(
              `💾 节省空间: ${formatFileSize(
                result.totalOriginalSize - result.totalCompressedSize
              )}`
            );
          }
          
          if (result.deletedCount > 0) {
            messages.push(`🗑️ 已删除原文件: ${result.deletedCount} 个`);
          }

          // 显示带按钮的通知
          const action = await vscode.window.showInformationMessage(
            messages.join("\n"),
            "查看详细日志",
            "关闭"
          );

          if (action === "查看详细日志") {
            outputChannel.show();
          }
        } else {
          vscode.window.showWarningMessage("没有找到可转换的图片文件");
        }
      } catch (error: any) {
        outputChannel.appendLine(`\n❌ 错误: ${error.message}`);
        outputChannel.appendLine(`堆栈: ${error.stack || "无"}`);
        vscode.window.showErrorMessage(`转换失败: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log("Convert to WebP extension is now deactivated");
}
