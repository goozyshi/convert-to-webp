export interface ConvertResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  error?: string;
}

export interface ConvertSettings {
  quality: number;
  deleteOriginal: boolean;
  outputDirectory: "webp" | "same" | "custom";
  customOutputPath: string;
  concurrentLimit: number;
}

export interface ConvertStats {
  convertedCount: number;
  deletedCount: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
}
