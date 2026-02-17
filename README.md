# Multilingual Reader Assistant

轻量级多语阅读辅助工具，支持英文 / 中文 / 日文文本；英文内置词典释义 + 有道翻译，中文/日文可标记并导出生词本。

## 功能特性
- 顶部语言切换（英语 / 中文 / 日语），英语开启词典释义 + 有道翻译，中文和日文保持标记与导出。
- 上传 `.txt` 等纯文本文件或直接粘贴内容，支持 PDF 自动抽取文字。
- 点击词语自动显示释义（英文词典+有道翻译），自动标注对应的 “的 / 地 / 得”。
- 已点击单词自动加下划线，并在同一浏览器中持久化保存（`localStorage`）。
- 侧边栏展示所有点击过的词语，附带发音、释义、派生词（英文）与点击时间。
- 一键导出 CSV 或 Excel (`.xlsx`) 生词本，新增“语言”列，表头包含原词、基础词形、词性、中文释义、派生词等字段。
- 新增：AI 读书助手（DeepSeek），以费曼式提问引导复述。

## 使用方式
1. 直接用浏览器打开根目录的 `index.html`。
2. 选择阅读语言（英语 / 中文 / 日语），粘贴文本或上传纯文本 / PDF 文件开始阅读。
3. 点击任意词语即可打开浮窗；英文词语会显示词典释义及派生词，同时在文章和侧边栏中留下标记。
4. 使用右侧导出按钮选择 CSV 或 Excel 下载整理好的生词表。
5. 上传 PDF 后系统会逐页提取文字并填充文本框（较大的 PDF 建议耐心等待进度提示）。
6. AI 读书助手（DeepSeek）：前端已隐藏 API 配置，默认使用本地后端代理；请先运行后端并在 `.env` 配置 API Key。助手自动读取当前文章片段，点击右下角“AI 阅读助手”悬浮按钮呼出对话框，Ctrl/Cmd+Enter 发送。

## 本地后端代理（DeepSeek）
1. 复制 `.env.example` 为 `.env`，填入 `DEEPSEEK_API_KEY`（可选自定义 `DEEPSEEK_BASE_URL`、`PORT`）。  
2. 运行 `npm run dev:server`，默认在 `http://localhost:4173` 提供静态页面与 `/api/assistant` 代理。  
3. 浏览器访问 `http://localhost:4173`，点击右下角“AI 阅读助手”呼出聊天，助手自动基于当前文章对话，无需前端填写 Key。  
4. 若请求失败，请检查终端日志确认 `.env` 已生效、网络可访问 DeepSeek。

## AI 助手提示词与行为
- 内置提示词（费曼式辅导）：`You are a Feynman-style reading tutor...`，流程为“让用户复述 → 要求举例/类比 → 指出遗漏与误解 → 给 1-2 个自测问题”。可在 `src/app.js` 的 `ASSISTANT_SYSTEM_PROMPT` 中调整。  
- 对话入口：右侧 AI 面板，填充上下文（手动或“使用当前文章”），在输入框中复述/提问后 Ctrl/Cmd+Enter 发送。  
- 请求路径：前端固定调用后端 `/api/assistant`，由后端转发到 DeepSeek（Key 仅在 `.env`）。

## 词典数据
- 应用优先加载 `data/ecdict-dictionary.json`，若不存在则回退到 `data/sample-dictionary.json` 的演示词条。
- 使用开源 [ECDICT](https://github.com/skywind3000/ECDICT) 构建词典：
  1. 下载仓库中的 `ecdict.csv`，置于项目根目录。
  2. 安装依赖并运行转换脚本（首次需要执行 `npm install`）：
     ```bash
     npm install
     npm run build:dictionary
     # 自定义源文件或输出路径
     # npm run build:dictionary -- ecdict.csv data/my-dictionary.json
     ```
  3. 命令会生成 `data/ecdict-dictionary.json`，包含字段 `word`、`phonetics`、`meanings`、`derivatives`、`variants`，并自动解析 ECDICT 的词形变换填充派生词。
  4. 重新启动本地服务器（或刷新页面），点击“清除标记”按钮以清空旧缓存后即可使用新版词典。
- 若希望扩充派生词或引入其他数据，可在 `scripts/build-dictionary.js` 中按需调整逻辑，例如新增自定义词形映射或合并其他词库。***

## 扩展建议
- 接入更全面的词典或翻译 API（需注意授权与配额）。
- 新增段落导航、重点标注、复习模式等学习功能。
- 优化移动端交互体验，支持触控长按查词。
- 引入 IndexedDB 或简易后端服务，支持多篇文章及多用户场景。

## 开发说明
- 项目为纯前端实现，无需构建工具；核心逻辑位于 `src/app.js`。
- 使用 [SheetJS](https://sheetjs.com/) 处理 CSV / Excel 导出，通过 CDN 引入。
- 使用浏览器 `localStorage` 存储当前文章的点击词汇记录，以文章内容 hash 为键。

欢迎在此基础上继续扩展，实现更丰富的多语阅读与学习体验。***
