# 日志查看器 (Log Viewer)

一个基于Flask的Web应用程序，用于查看和管理日志文件。

## 功能特性

- 从远程服务器下载日志文件
- 浏览日志文件结构
- 查看日志文件内容
- 支持多种文件格式（JSON, XML, HTML, TXT等）
- 语法高亮显示
- 深色/浅色主题切换
- 响应式设计，支持移动设备

## 技术栈

- 后端: Flask (Python)
- 前端: HTML, CSS, JavaScript
- 数据库: SQLite
- 样式库: Font Awesome

## 安装和运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd logView
```

### 2. 创建虚拟环境（推荐）

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或者
venv\Scripts\activate  # Windows
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 运行应用

```bash
python app.py
```

应用将在 `http://localhost:5000` 上运行。

## 使用说明

1. 打开浏览器访问 `http://localhost:5000`
2. 点击"下载日志"按钮
3. 输入日志ID并提交
4. 在日志列表中选择一个日志
5. 浏览文件结构并点击文件查看内容

## API接口

### 获取日志列表
```
GET /api/logs
```

### 下载日志
```
POST /api/download
Body: { "log_id": "日志ID" }
```

### 获取日志文件结构
```
GET /api/logs/<log_id>/files
```

### 获取文件内容
```
GET /api/logs/<log_id>/file?path=文件路径
```

### 删除日志
```
DELETE /api/logs/<log_id>
```

## 目录结构

```
logView/
├── app.py              # Flask应用主文件
├── database.py         # 数据库操作类
├── log_processor.py    # 日志处理类
├── requirements.txt    # 项目依赖
├── README.md           # 说明文档
├── templates/          # HTML模板
│   ├── index.html      # 主页面
│   └── components/     # 组件模板
├── static/             # 静态资源
│   ├── css/           # 样式文件
│   └── js/            # JavaScript文件
└── storage/           # 存储目录
    ├── zips/          # ZIP文件存储
    └── extracted/     # 解压文件存储
```

## 主题切换

应用支持深色和浅色主题：
- 在页面右上角的主题选择器中切换
- 选择会保存在浏览器本地存储中

## 开发

### 代码结构

- `app.py`: Flask应用入口，定义路由和API
- `database.py`: SQLite数据库操作类
- `log_processor.py`: 日志下载、解压和文件处理类
- `templates/`: HTML模板文件
- `static/`: 静态资源文件

### 扩展功能

1. 添加新的文件类型支持：在 `log_processor.py` 的 `_detect_file_type` 方法中添加新的文件类型检测
2. 添加语法高亮：在 `static/js/script.js` 的 `applySyntaxHighlighting` 函数中添加新的语法高亮规则
3. 添加搜索功能：在前端JavaScript中实现搜索逻辑

## 许可证

MIT License