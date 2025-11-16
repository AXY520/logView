import sqlite3
import os
from datetime import datetime

class LogDatabase:
    def __init__(self, db_path='logs.db'):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_id TEXT UNIQUE NOT NULL,
                file_path TEXT NOT NULL,
                extract_path TEXT NOT NULL,
                download_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()

    def add_log(self, log_id, file_path, extract_path):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO logs (log_id, file_path, extract_path)
            VALUES (?, ?, ?)
        ''', (log_id, file_path, extract_path))
        conn.commit()
        conn.close()

    def get_all_logs(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('''
            SELECT log_id, file_path, extract_path, 
                   datetime(download_time, 'localtime') as download_time
            FROM logs ORDER BY download_time DESC
        ''')
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return logs

    def delete_log(self, log_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM logs WHERE log_id = ?', (log_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

    def get_log(self, log_id):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM logs WHERE log_id = ?', (log_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
