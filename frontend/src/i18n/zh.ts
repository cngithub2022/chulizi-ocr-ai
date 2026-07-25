const zh = {
  app: {
    title: "OCR Desktop",
    close: "关闭",
  },
  header: {
    history: "历史记录",
    lightMode: "浅色模式",
    darkMode: "深色模式",
    chinese: "中文",
    english: "English",
  },
  dropzone: {
    processing: "OCR 识别中 ...",
    dropHere: "放开以识别",
    prompt: "拖拽图片到此处，或点击选择文件",
    formats: "PNG、JPG、BMP、TIFF、WebP",
  },
  canvas: {
    original: "原图",
    detections: "检测框",
    text: "文字",
    heatmap: "热力图",
    view: "视图",
    close: "关闭",
    confidence: "置信度",
  },
  result: {
    textView: "纯文本",
    jsonView: "JSON",
    lines: "行",
    avgConfidence: "平均置信度",
    copy: "复制",
    copied: "已复制！",
    export: "导出",
  },
  batch: {
    title: "批量队列",
    done: "完成",
    addFiles: "添加文件",
    process: "开始处理",
    clear: "清空",
    dropToAdd: "拖拽图片添加至批量队列",
    dropHere: "放开以添加图片",
  },
  setup: {
    title: "首次启动设置",
    downloading: "正在下载 OCR 模型 ...",
    ready: "模型已就绪！",
    modelCache: "模型已缓存到",
    start: "开始使用",
  },
  error: {
    ocrFailed: "OCR 识别失败",
    networkError: "网络连接失败，请检查后端是否启动",
  },
};

export default zh;
export type Translations = typeof zh;
