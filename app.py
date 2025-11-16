from flask import Flask, render_template, jsonify, request
import os
import requests
from requests.auth import HTTPBasicAuth
from database import LogDatabase
from log_processor import LogProcessor

app = Flask(__name__, static_folder='static', template_folder='templates')

# 初始化数据库和日志处理器
db = LogDatabase()
processor = LogProcessor()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """获取所有日志列表"""
    try:
        logs = db.get_all_logs()
        return jsonify(logs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/remote-logs', methods=['GET'])
def get_remote_logs():
    """获取远程日志列表"""
    try:
        url = 'https://hlogs.lazycat.cloud/api/v1/search?queryType=1&keyword='
        response = requests.get(
            url,
            auth=HTTPBasicAuth('lnks', 'N5JKpyiw97zhrY0U'),
            timeout=10
        )
        response.raise_for_status()
        remote_logs = response.json()
        
        # 格式化数据
        formatted_logs = []
        for log in remote_logs:
            formatted_logs.append({
                'id': log['id'],
                'boxname': log.get('x-boxname', ''),
                'createat': log['createat'],
                'description': log.get('description', '')
            })
        
        return jsonify(formatted_logs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<log_id>', methods=['GET'])
def get_log(log_id):
    """获取特定日志信息"""
    try:
        log = db.get_log(log_id)
        if not log:
            return jsonify({'error': 'Log not found'}), 404
        return jsonify(log)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download_log():
    """下载日志"""
    try:
        data = request.get_json()
        log_id = data.get('log_id')
        if not log_id:
            return jsonify({'error': 'Log ID is required'}), 400
            
        # 下载日志
        result = processor.download_log(log_id)
        if not result['success']:
            return jsonify({'error': result['error']}), 500
            
        # 保存到数据库
        db.add_log(log_id, result['file_path'], result['extract_path'])
        
        return jsonify({'status': 'success', 'log_id': log_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<log_id>/files', methods=['GET'])
def get_log_files(log_id):
    """获取日志的文件结构"""
    try:
        # 检查日志是否存在
        log = db.get_log(log_id)
        if not log:
            return jsonify({'error': 'Log not found'}), 404
            
        # 获取文件结构
        file_structure = processor.get_file_structure(log_id)
        return jsonify(file_structure)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<log_id>/file', methods=['GET'])
def get_log_file(log_id):
    """获取日志文件内容"""
    try:
        file_path = request.args.get('path')
        if not file_path:
            return jsonify({'error': 'File path is required'}), 400
            
        # 检查日志是否存在
        log = db.get_log(log_id)
        if not log:
            return jsonify({'error': 'Log not found'}), 404
            
        # 获取文件内容
        content = processor.get_file_content(log_id, file_path)
        return jsonify(content)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<log_id>', methods=['DELETE'])
def delete_log(log_id):
    """删除日志"""
    try:
        # 从数据库删除
        success = db.delete_log(log_id)
        if not success:
            return jsonify({'error': 'Log not found'}), 404
            
        # 删除文件
        processor.delete_log_files(log_id)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
