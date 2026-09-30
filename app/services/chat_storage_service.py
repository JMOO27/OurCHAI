import sqlite3
from config import get_settings

from contextlib import contextmanager

settings = get_settings()

def create_db() -> None:
    with sqlite3.connect(settings.DATABASE_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversation (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE
            );
  
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat (
            conv_id INTEGER NOT NULL,
            chat_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
            CONSTRAINT conversation_id
                FOREIGN KEY (conv_id)
                REFERENCES conversation(id)
            );
        """)

        
def open_db():
    conn = sqlite3.connect(
        settings.DATABASE_PATH,
        timeout=10)

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    conn.execute("PRAGMA journal_mode = WAL")

    return conn

@contextmanager
def transaction():
    conn = open_db()
    try:
        with conn:
            yield conn
    finally:
        conn.close()




