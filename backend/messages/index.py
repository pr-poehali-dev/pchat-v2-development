'''
Business: Message management - send, get, edit, delete messages
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with message data
'''

import json
import os
import base64
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
                       m.photo_url, m.photo_caption, m.voice_url, m.voice_duration,
                       m.is_edited, m.is_read, m.created_at, m.updated_at
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
                    'voice_url': row[7],
                    'voice_duration': row[8],
                    'is_edited': row[9],
                    'is_read': row[10],
                    'created_at': row[11].isoformat() if row[11] else None,
                    'updated_at': row[12].isoformat() if row[12] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages})
            }
        
        elif method == 'POST':
            content_type = event.get('headers', {}).get('content-type', '')
            
            if 'multipart/form-data' in content_type:
                body = event.get('body', '')
                is_base64 = event.get('isBase64Encoded', False)
                
                if is_base64:
                    body = base64.b64decode(body).decode('utf-8')
                
                boundary = content_type.split('boundary=')[1] if 'boundary=' in content_type else None
                if not boundary:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid multipart request'})
                    }
                
                parts = body.split(f'--{boundary}')
                
                chat_id = None
                sender_id = None
                duration = None
                caption = None
                audio_data = None
                
                for part in parts:
                    if 'name="chat_id"' in part:
                        chat_id = part.split('\r\n\r\n')[1].split('\r\n')[0].strip()
                    elif 'name="sender_id"' in part:
                        sender_id = part.split('\r\n\r\n')[1].split('\r\n')[0].strip()
                    elif 'name="duration"' in part:
                        duration = part.split('\r\n\r\n')[1].split('\r\n')[0].strip()
                    elif 'name="caption"' in part:
                        caption = part.split('\r\n\r\n')[1].split('\r\n')[0].strip()
                    elif 'name="audio"' in part and 'filename=' in part:
                        audio_content = part.split('\r\n\r\n', 1)[1]
                        if audio_content.endswith('\r\n'):
                            audio_content = audio_content[:-2]
                        audio_data = base64.b64encode(audio_content.encode('latin-1')).decode('utf-8')
                
                if not all([chat_id, sender_id, duration, audio_data]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing required fields'})
                    }
                
                voice_url = f'data:audio/webm;base64,{audio_data}'
                
                cur.execute("""
                    INSERT INTO messages (chat_id, sender_id, content, voice_url, voice_duration)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (int(chat_id), int(sender_id), caption or '', voice_url, float(duration)))
            else:
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
            
            cur.execute("UPDATE messages SET content = '[Удалено]', photo_url = NULL, photo_caption = NULL, voice_url = NULL, voice_duration = NULL WHERE id = %s", (message_id,))
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