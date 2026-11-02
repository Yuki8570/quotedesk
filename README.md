# QuoteDesk 报价单系统（纯前端演示版）

## 直接使用
- `报价单系统.html` 是一个完整的单文件应用，**双击用 Chrome / Edge 打开即可**，不需要联网，也不需要服务器。
- 数据保存在当前浏览器（IndexedDB）里。换电脑或清理浏览器前，请到「数据备份」导出备份。

## 部署到局域网服务器
把 `报价单系统.html` 改名为 `index.html`，放到任意静态网站目录即可，例如：
- **Nginx**：放到 `/usr/share/nginx/html/quote/`，访问 `http://服务器IP/quote/`
- **IIS**：新建网站，物理路径指向该文件所在目录
- **临时测试**：`npx serve .` 或 `python -m http.server 8080`

> 注意：纯前端版本中，每个人的数据只保存在自己的浏览器里。产品库、抬头和模板可以用「数据备份 → 导出 / 合并导入」在同事之间共享。

## 源码结构
```
src/
  layout.js     模板版式常量（列宽、行高、表头、默认条款）
  excel.js      Excel 导出：直接改写原始模板 XML，样式与原模板完全一致
  render.js     Canvas 按模板版式绘制，用于实时预览和 PDF 导出（A4、60% 缩放、与 Excel 分页一致）
  assets.js     内嵌的原始模板（已去除图片）和示例图片
  db.js         IndexedDB 存储（二期接入后端时替换此文件为 API 调用）
  store.jsx     全局数据状态
  pages/        报价单 / 编辑器 / 产品库 / 品牌抬头 / 常用模板 / 数据备份
build.mjs       esbuild 打包为单个 HTML
```
构建：`npm i react react-dom react-icons jszip pdf-lib esbuild` 后运行 `node build.mjs`，输出 `dist/index.html`。

## 二期（多人共享）建议
- 后端：Node.js（NestJS）或 Python（FastAPI）+ PostgreSQL/MySQL，图片存本地磁盘或 MinIO
- 只需把 `db.js` 改为调用接口，`excel.js` 可原样移到服务端运行
- 增加登录、权限（销售只能看自己的报价单、管理员维护产品库和抬头）、操作日志
