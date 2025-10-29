'''
Business: Message management - send, get, edit, delete messages
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with message data
'''

import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            # Get messages for a chat
            chat_id = event.get('queryStringParameters', {}).get('chat_id')
            
            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id required'})
                }
            
            cur.execute("""
                SELECT m.id, m.sender_id, u.nickname, u.username, m.content, 
                       m.photo_url, m.photo_caption, m.is_edited, m.is_read,
                       m.created_at, m.updated_at
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
            """, (chat_id,))
            
            messages = []
            for row in cur.fetchall():
                messages.append({
                    'id': row[0],
                    'sender_id': row[1],
                    'sender_nickname': row[2],
                    'sender_username': row[3],
                    'content': row[4],
                    'photo_url': row[5],
                    'photo_caption': row[6],
                    'is_edited': row[7],
                    'is_read': row[8],
                    'created_at': row[9].isoformat() if row[9] else None,
                    'updated_at': row[10].isoformat() if row[10] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages})
            }
        
        elif method == 'POST':
            # Send new message
            body_data = json.loads(event.get('body', '{}'))
            chat_id = body_data.get('chat_id')
            sender_id = body_data.get('sender_id')
            content = body_data.get('content', '')
            photo_url = body_data.get('photo_url')
            photo_caption = body_data.get('photo_caption')
            
            if not chat_id or not sender_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id and sender_id required'})
                }
            
            cur.execute("""
                INSERT INTO messages (chat_id, sender_id, content, photo_url, photo_caption)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (chat_id, sender_id, content, photo_url, photo_caption))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'id': result[0],
                    'created_at': result[1].isoformat() if result[1] else None
                })
            }
        
        elif method == 'PUT':
            # Edit or mark as read
            body_data = json.loads(event.get('body', '{}'))
            message_id = body_data.get('message_id')
            action = body_data.get('action')
            
            if action == 'edit':
                new_content = body_data.get('content')
                cur.execute(
                    "UPDATE messages SET content = %s, is_edited = TRUE, updated_at = %s WHERE id = %s",
                    (new_content, datetime.now(), message_id)
                )
            elif action == 'mark_read':
                cur.execute("UPDATE messages SET is_read = TRUE WHERE id = %s", (message_id,))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif method == 'DELETE':
            # Delete message
            body_data = json.loads(event.get('body', '{}'))
            message_id = body_data.get('message_id')
            
            cur.execute("UPDATE messages SET content = '[Удалено]', photo_url = NULL, photo_caption = NULL WHERE id = %s", (message_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'})
        }
    
    finally:
        cur.close()
        conn.close()
