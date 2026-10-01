import sqlite3
import json

from schemas.responses import ChatCompletedReponse
from pydantic import ValidationError
from config import get_settings
from typing import Any

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
            CREATE TABLE IF NOT EXISTS chats (
            conv_id INTEGER NOT NULL,
            chat_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
            content TEXT,
            CONSTRAINT conversation_id
                FOREIGN KEY (conv_id)
                REFERENCES conversation(id)
            );
        """)

def create_conv(conv_id : int) -> None:
    with sqlite3.connect(settings.DATABASE_PATH) as conn:
        conn.execute("""
        INSERT INTO conversation (id) VALUES (?)
        """,(conv_id,))

def create_chat(conv_id : int, input : str) -> None:
    with sqlite3.connect(settings.DATABASE_PATH) as conn:
        conn.execute("""
            INSERT INTO chats (conv_id, content) VALUES (?, ?)
            """, (conv_id, input)
            )

# TODO proper annotations
def get_conv(conv_id : int) -> list[ChatCompletedReponse]:
    with sqlite3.connect(settings.DATABASE_PATH) as conn:
        cursor = conn.execute("""
        SELECT content
        FROM chats
        WHERE conv_id = (?)
        
        """,(conv_id,))

    data = cursor.fetchall()
    out : list[ChatCompletedReponse] = []
    for jsn in data:
        try:
            json_data = ChatCompletedReponse.model_validate(json.loads(jsn[0]))
            out.append(json_data)
        except ValidationError as e:
            print(f"Following JSON is not correct! {e}")

    return out
        
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




