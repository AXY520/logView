// 全局变量
let currentLogId = null;
let currentFilePath = null;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化组件
    initializeComponents();
    
    // 绑定事件
    bindEvents();
    
    // 加载日志列表
    loadLogList();
});

// 初始化组件
function initializeComponents() {
    // 初始化已完成，无特殊设置
}

// 绑定事件
function bindEvents() {
    // 下载按钮
    document.getElementById('downloadBtn').addEventListener('click', showDownloadModal);
    
    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', refreshAll);
    
    // 模态框关闭
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // 下载表单提交
    document.getElementById('downloadForm').addEventListener('submit', downloadLog);
}

// 显示下载模态框
function showDownloadModal() {
    document.getElementById('modal').style.display = 'block';
    document.getElementById('logIdInput').focus();
}

// 关闭模态框
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('downloadForm').reset();
}

// 下载日志
function downloadLog(event) {
    event.preventDefault();
    
    const logId = document.getElementById('logIdInput').value.trim();
    if (!logId) {
        alert('请输入日志ID');
        return;
    }
    
    // 发送下载请求
    fetch('/api/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ log_id: logId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('下载失败: ' + data.error);
        } else {
            alert('日志下载成功');
            closeModal();
            loadLogList();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('下载过程中发生错误');
    });
}

// 刷新所有数据
function refreshAll() {
    loadLogList();
    if (currentLogId) {
        loadFileTree(currentLogId);
    }
    if (currentFilePath) {
        loadFileContent(currentLogId, currentFilePath);
    }
}

// 加载日志列表
function loadLogList() {
    const loadingEl = document.getElementById('logListLoading');
    const emptyEl = document.getElementById('logListEmpty');
    const itemsEl = document.getElementById('logItems');
    
    // 显示加载状态
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    itemsEl.innerHTML = '';
    
    fetch('/api/logs')
        .then(response => response.json())
        .then(data => {
            loadingEl.style.display = 'none';
            
            if (data.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }
            
            // 渲染日志列表
            data.forEach(log => {
                const li = document.createElement('li');
                li.className = 'log-item';
                li.innerHTML = `
                    <div>
                        <div class="log-id">${log.log_id}</div>
                        <div class="log-time">${log.download_time}</div>
                    </div>
                    <div class="log-actions">
                        <button class="btn btn-danger btn-sm delete-btn" data-log-id="${log.log_id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                // 添加点击事件
                li.addEventListener('click', function(e) {
                    if (!e.target.closest('.delete-btn')) {
                        selectLog(log.log_id);
                    }
                });
                
                // 添加删除按钮事件
                const deleteBtn = li.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteLog(log.log_id);
                });
                
                itemsEl.appendChild(li);
            });
        })
        .catch(error => {
            loadingEl.style.display = 'none';
            console.error('Error loading logs:', error);
        });
}

// 选择日志
function selectLog(logId) {
    currentLogId = logId;
    
    // 更新UI选中状态
    document.querySelectorAll('.log-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // 加载文件树
    loadFileTree(logId);
    
    // 清空文件内容
    clearFileContent();
}

// 删除日志
function deleteLog(logId) {
    if (!confirm(`确定要删除日志 ${logId} 吗？此操作不可恢复。`)) {
        return;
    }
    
    fetch(`/api/logs/${logId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('删除失败: ' + data.error);
        } else {
            alert('日志删除成功');
            // 如果删除的是当前选中的日志，清空相关显示
            if (currentLogId === logId) {
                currentLogId = null;
                clearFileTree();
                clearFileContent();
            }
            loadLogList();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('删除过程中发生错误');
    });
}

// 加载文件树
function loadFileTree(logId) {
    const loadingEl = document.getElementById('fileTreeLoading');
    const emptyEl = document.getElementById('fileTreeEmpty');
    const containerEl = document.getElementById('treeContainer');
    
    // 显示加载状态
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    containerEl.innerHTML = '';
    
    fetch(`/api/logs/${logId}/files`)
        .then(response => response.json())
        .then(data => {
            loadingEl.style.display = 'none';
            
            if (data.error) {
                emptyEl.style.display = 'block';
                return;
            }
            
            // 渲染文件树
            const treeHtml = renderFileTree(data, logId);
            containerEl.innerHTML = treeHtml;
            
            // 绑定文件树事件
            bindTreeEvents();
            
            // 绑定搜索功能
            bindSearchEvents();
            
            // 保存初始文件夹状态
            saveInitialFolderStates();
            
            // 默认打开nettype.json文件
            setTimeout(() => {
                openDefaultFile(logId);
            }, 100);
        })
        .catch(error => {
            loadingEl.style.display = 'none';
            console.error('Error loading file tree:', error);
        });
}

// 渲染文件树
function renderFileTree(nodes, logId, depth = 0) {
    if (!nodes || nodes.length === 0) {
        return '<div class="empty-state"><i class="fas fa-folder-open"></i><p>该日志没有文件</p></div>';
    }
    
    let html = '<ul class="tree-children expanded">';
    
    nodes.forEach(node => {
        const nodeId = `node-${logId}-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const iconClass = node.type === 'directory' ? 'fas fa-folder' : 'fas fa-file';
        
        html += `
            <li class="tree-node ${node.type} ${node.type === 'directory' ? 'collapsed' : ''}" data-path="${node.path}" data-type="${node.type}" id="${nodeId}" data-name="${node.name.toLowerCase()}">
                ${node.type === 'directory' ? '<span class="toggle"></span>' : '<span class="toggle" style="visibility: hidden;"></span>'}
                <span class="icon"><i class="${iconClass}"></i></span>
                <span class="node-name">${node.name}</span>
                ${node.size !== undefined ? `<span class="node-size">(${formatFileSize(node.size)})</span>` : ''}
            </li>
        `;
        
        // 如果是目录且有子节点，递归渲染
        if (node.type === 'directory' && node.children && node.children.length > 0) {
            // 默认折叠子目录
            html += `<ul class="tree-children collapsed" data-parent="${nodeId}">`;
            html += renderFileTree(node.children, logId, depth + 1);
            html += '</ul>';
        }
    });
    
    html += '</ul>';
    return html;
}

// 绑定文件树事件
function bindTreeEvents() {
    // 绑定文件节点点击事件
    document.querySelectorAll('.tree-node').forEach(node => {
        node.addEventListener('click', function(e) {
            const path = this.getAttribute('data-path');
            const type = this.getAttribute('data-type');
            
            e.stopPropagation();
            
            if (type === 'directory') {
                // 切换文件夹展开/折叠状态
                toggleFolder(this);
            } else {
                // 选择文件
                selectFile(this);
            }
        });
    });
}

// 保存初始文件夹状态
function saveInitialFolderStates() {
    window.initialFolderStates = {};
    document.querySelectorAll('.tree-node.directory').forEach(folder => {
        const nodeId = folder.getAttribute('id');
        const isExpanded = folder.classList.contains('expanded');
        window.initialFolderStates[nodeId] = isExpanded;
    });
}

// 恢复初始文件夹状态
function restoreInitialFolderStates() {
    if (!window.initialFolderStates) return;
    
    Object.keys(window.initialFolderStates).forEach(nodeId => {
        const folder = document.getElementById(nodeId);
        const childrenContainer = document.querySelector(`[data-parent="${nodeId}"]`);
        
        if (folder && childrenContainer) {
            const wasExpanded = window.initialFolderStates[nodeId];
            if (wasExpanded) {
                folder.classList.remove('collapsed');
                folder.classList.add('expanded');
                childrenContainer.classList.remove('collapsed');
                childrenContainer.classList.add('expanded');
                childrenContainer.style.display = '';
            } else {
                folder.classList.remove('expanded');
                folder.classList.add('collapsed');
                childrenContainer.classList.remove('expanded');
                childrenContainer.classList.add('collapsed');
                childrenContainer.style.display = 'none';
            }
        }
    });
}

// 绑定搜索事件
function bindSearchEvents() {
    const searchInput = document.getElementById('fileSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterFiles(this.value);
        });
    }
}

// 过滤文件
function filterFiles(searchTerm) {
    const nodes = document.querySelectorAll('.tree-node');
    const term = searchTerm.toLowerCase().trim();
    
    if (term === '') {
        // 清空搜索，恢复所有节点和初始状态
        nodes.forEach(node => {
            node.style.display = '';
            node.classList.remove('highlighted');
        });
        
        // 恢复所有容器的显示
        document.querySelectorAll('.tree-children').forEach(container => {
            container.style.display = '';
        });
        
        // 恢复初始文件夹状态
        restoreInitialFolderStates();
    } else {
        // 有搜索词时的过滤逻辑
        nodes.forEach(node => {
            const fileName = node.getAttribute('data-name');
            
            if (fileName.includes(term)) {
                // 匹配的文件
                node.style.display = '';
                node.classList.add('highlighted');
                
                // 展开并显示所有父级目录
                let parent = node.closest('.tree-children');
                while (parent) {
                    parent.style.display = '';
                    const parentFolder = document.querySelector(`[data-parent="${parent.getAttribute('data-parent')}"]`);
                    if (parentFolder) {
                        parentFolder.classList.remove('collapsed');
                        parentFolder.classList.add('expanded');
                        parentFolder.style.display = '';
                    }
                    parent = parent.parentElement.closest('.tree-children');
                }
            } else {
                // 不匹配的文件
                node.style.display = 'none';
                node.classList.remove('highlighted');
            }
        });
        
        // 隐藏空的容器
        document.querySelectorAll('.tree-children').forEach(container => {
            const visibleChildren = container.querySelectorAll('.tree-node[style=""]');
            if (visibleChildren.length === 0) {
                container.style.display = 'none';
            }
        });
    }
}

// 切换文件夹展开/折叠状态
function toggleFolder(folderNode) {
    const nodeId = folderNode.getAttribute('id');
    const childrenContainer = document.querySelector(`[data-parent="${nodeId}"]`);
    
    if (!childrenContainer) return;
    
    if (folderNode.classList.contains('collapsed')) {
        // 展开
        folderNode.classList.remove('collapsed');
        folderNode.classList.add('expanded');
        childrenContainer.classList.remove('collapsed');
        childrenContainer.classList.add('expanded');
        childrenContainer.style.display = '';
    } else {
        // 折叠
        folderNode.classList.remove('expanded');
        folderNode.classList.add('collapsed');
        childrenContainer.classList.remove('expanded');
        childrenContainer.classList.add('collapsed');
        childrenContainer.style.display = 'none';
    }
}

// 选择文件
function selectFile(fileNode) {
    // 更新选中状态
    document.querySelectorAll('.tree-node').forEach(n => {
        n.classList.remove('active');
    });
    fileNode.classList.add('active');
    
    // 加载文件内容
    const path = fileNode.getAttribute('data-path');
    if (currentLogId) {
        currentFilePath = path;
        loadFileContent(currentLogId, path);
    }
}

// 打开默认文件
function openDefaultFile(logId) {
    // 查找nettype.json文件
    const nettypeNode = document.querySelector('.tree-node[data-path="nettype.json"]');
    if (nettypeNode) {
        // 模拟点击事件
        selectFile(nettypeNode);
    }
}

// 清空文件树
function clearFileTree() {
    const emptyEl = document.getElementById('fileTreeEmpty');
    const containerEl = document.getElementById('treeContainer');
    
    emptyEl.style.display = 'block';
    containerEl.innerHTML = '';
}

// 加载文件内容
function loadFileContent(logId, filePath) {
    const loadingEl = document.getElementById('fileContentLoading');
    const emptyEl = document.getElementById('fileContentEmpty');
    const contentContainerEl = document.getElementById('contentContainer');
    const textContentEl = document.getElementById('textContent');
    const errorEl = document.getElementById('errorMessage');
    const errorTextEl = document.getElementById('errorText');
    const fileInfoEl = document.getElementById('fileInfo');
    
    // 显示加载状态
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    contentContainerEl.style.display = 'none';
    errorEl.style.display = 'none';
    
    // 更新文件信息
    fileInfoEl.textContent = filePath;
    
    fetch(`/api/logs/${logId}/file?path=${encodeURIComponent(filePath)}`)
        .then(response => response.json())
        .then(data => {
            loadingEl.style.display = 'none';
            
            if (data.error) {
                errorEl.style.display = 'block';
                errorTextEl.textContent = data.error;
                return;
            }
            
            // 显示文件内容
            contentContainerEl.style.display = 'block';
            textContentEl.textContent = data.content;
            
            // 根据文件类型应用语法高亮
            applySyntaxHighlighting(data.type, textContentEl);
        })
        .catch(error => {
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
            errorTextEl.textContent = '加载文件内容时发生错误';
            console.error('Error loading file content:', error);
        });
}

// 应用语法高亮
function applySyntaxHighlighting(fileType, element) {
    // 清除之前的类
    element.className = 'content-text';
    
    switch (fileType) {
        case 'json':
            element.classList.add('json-content');
            // 尝试格式化JSON
            try {
                const parsed = JSON.parse(element.textContent);
                element.textContent = JSON.stringify(parsed, null, 2);
            } catch (e) {
                // 如果解析失败，保持原样
                console.log('JSON解析失败:', e);
            }
            break;
        case 'xml':
            element.classList.add('xml-content');
            break;
        case 'html':
            element.classList.add('html-content');
            break;
        default:
            element.classList.add('text-content');
    }
}

// 清空文件内容
function clearFileContent() {
    const emptyEl = document.getElementById('fileContentEmpty');
    const contentContainerEl = document.getElementById('contentContainer');
    const textContentEl = document.getElementById('textContent');
    const fileInfoEl = document.getElementById('fileInfo');
    
    emptyEl.style.display = 'block';
    contentContainerEl.style.display = 'none';
    textContentEl.textContent = '';
    fileInfoEl.textContent = '';
    currentFilePath = null;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}