import os
import zipfile
import json
import subprocess
import requests
from requests.auth import HTTPBasicAuth
from pathlib import Path

class LogProcessor:
    def __init__(self):
        # 使用绝对路径
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.zip_dir = os.path.join(self.base_dir, "storage/zips")
        self.extract_dir = os.path.join(self.base_dir, "storage/extracted")
        self.script_path = os.path.join(self.base_dir, ".hlogs.sh")
        
        print(f"基础目录: {self.base_dir}")
        print(f"脚本路径: {self.script_path}")
        print(f"脚本是否存在: {os.path.exists(self.script_path)}")
        
        os.makedirs(self.zip_dir, exist_ok=True)
        os.makedirs(self.extract_dir, exist_ok=True)
        
        # 详细检查脚本
        if not os.path.exists(self.script_path):
            print(f"错误: 脚本不存在于: {self.script_path}")
            # 列出当前目录文件
            print("当前目录文件:")
            for f in os.listdir(self.base_dir):
                print(f"  {f}")
            # 不抛出异常，因为我们将使用直接下载方式

    def download_log(self, log_id):
        """下载日志 - 使用直接下载方式"""
        return self.download_log_direct(log_id)

    def download_log_direct(self, log_id):
        """直接在Python中下载，不依赖外部脚本"""
        try:
            # 确保log_id是字符串类型
            log_id = str(log_id)
            print(f"=== 开始直接下载日志 {log_id} ===")
            
            url = f"https://hlogs.lazycat.cloud/api/v1/download-log/{log_id}"
            zip_path = os.path.join(self.base_dir, f"{log_id}.zip")
            
            print(f"下载URL: {url}")
            print(f"保存到: {zip_path}")
            
            # 使用requests下载，允许重定向
            response = requests.get(
                url,
                auth=HTTPBasicAuth('lnks', 'N5JKpyiw97zhrY0U'),
                stream=True,
                timeout=300,
                allow_redirects=True
            )
            
            # 检查响应状态
            if response.status_code == 404:
                return {'success': False, 'error': f'日志 {log_id} 不存在或已过期'}
            
            response.raise_for_status()
            
            # 保存文件
            total_size = 0
            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
            
            print(f"下载完成，文件大小: {total_size} 字节")
            
            # 检查文件是否有效
            if total_size == 0:
                return {'success': False, 'error': '下载的文件为空'}
            
            # 验证zip文件
            if not self._is_valid_zip(zip_path):
                return {'success': False, 'error': '下载的文件不是有效的ZIP文件'}
            
            extract_path = os.path.join(self.extract_dir, log_id)
            print(f"解压文件到: {extract_path}")
            self._extract_zip(zip_path, extract_path)
            
            # 移动zip文件到存储目录
            target_zip_path = os.path.join(self.zip_dir, f"{log_id}.zip")
            print(f"移动文件到: {target_zip_path}")
            os.rename(zip_path, target_zip_path)
            
            print(f"=== 下载完成 ===")
            return {
                'success': True,
                'file_path': target_zip_path,
                'extract_path': extract_path
            }
            
        except requests.exceptions.RequestException as e:
            error_msg = f'网络请求失败: {str(e)}'
            print(error_msg)
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f'下载异常: {str(e)}'
            print(error_msg)
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': error_msg}

    def _is_valid_zip(self, zip_path):
        """检查文件是否为有效的ZIP文件"""
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # 尝试读取文件列表，如果不报错则是有效的ZIP
                file_list = zip_ref.namelist()
                print(f"ZIP文件包含 {len(file_list)} 个文件")
                return len(file_list) > 0
        except zipfile.BadZipFile:
            print(f"文件不是有效的ZIP: {zip_path}")
            return False
        except Exception as e:
            print(f"检查ZIP文件时出错: {e}")
            return False

    def _extract_zip(self, zip_path, extract_to):
        """解压zip文件"""
        os.makedirs(extract_to, exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)

    def get_file_structure(self, log_id):
        """获取文件树状结构"""
        log_id = str(log_id)
        extract_path = os.path.join(self.extract_dir, log_id)
        if not os.path.exists(extract_path):
            raise FileNotFoundError(f"日志 {log_id} 不存在")
        
        def build_tree(path):
            tree = []
            for item in sorted(os.listdir(path)):
                item_path = os.path.join(path, item)
                relative_path = os.path.relpath(item_path, extract_path)
                
                node = {
                    'name': item,
                    'path': relative_path,
                    'type': 'directory' if os.path.isdir(item_path) else 'file'
                }
                
                if os.path.isdir(item_path):
                    node['children'] = build_tree(item_path)
                else:
                    node['size'] = os.path.getsize(item_path)
                    
                tree.append(node)
            return tree
        
        return build_tree(extract_path)

    def get_file_content(self, log_id, file_path):
        """获取文件内容"""
        log_id = str(log_id)
        extract_path = os.path.join(self.extract_dir, log_id)
        full_path = os.path.join(extract_path, file_path)
        
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        try:
            # 尝试多种编码
            encodings = ['utf-8', 'gbk', 'latin-1']
            content = None
            
            for encoding in encodings:
                try:
                    with open(full_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                # 所有编码都失败，可能是二进制文件
                return {
                    'content': '二进制文件，无法显示',
                    'type': 'binary',
                    'size': os.path.getsize(full_path)
                }
            
            # 检测文件类型
            file_type = self._detect_file_type(file_path, content)
            formatted_content = self._format_content(content, file_type)
            
            return {
                'content': formatted_content,
                'type': file_type,
                'size': len(content)
            }
        except Exception as e:
            return {
                'content': f'读取文件时出错: {str(e)}',
                'type': 'error',
                'size': os.path.getsize(full_path) if os.path.exists(full_path) else 0
            }

    def _detect_file_type(self, filename, content):
        """检测文件类型"""
        ext = Path(filename).suffix.lower()
        if ext in ['.json']:
            return 'json'
        elif ext in ['.log', '.txt']:
            return 'text'
        elif ext in ['.xml']:
            return 'xml'
        elif ext in ['.yaml', '.yml']:
            return 'yaml'
        elif ext in ['.html', '.htm']:
            return 'html'
        else:
            # 尝试解析为JSON
            try:
                json.loads(content)
                return 'json'
            except:
                return 'text'

    def _format_content(self, content, file_type):
        """格式化内容"""
        if file_type == 'json':
            try:
                parsed = json.loads(content)
                return json.dumps(parsed, indent=2, ensure_ascii=False)
            except:
                return content
        return content

    def delete_log_files(self, log_id):
        """删除日志文件"""
        log_id = str(log_id)
        zip_path = os.path.join(self.zip_dir, f"{log_id}.zip")
        extract_path = os.path.join(self.extract_dir, log_id)
        
        if os.path.exists(zip_path):
            try:
                os.remove(zip_path)
                print(f"已删除ZIP文件: {zip_path}")
            except Exception as e:
                print(f"删除ZIP文件失败: {e}")
        
        if os.path.exists(extract_path):
            try:
                import shutil
                shutil.rmtree(extract_path)
                print(f"已删除解压目录: {extract_path}")
            except Exception as e:
                print(f"删除解压目录失败: {e}")
