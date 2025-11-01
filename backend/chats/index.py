'''
Business: Chat management - create chats, get chat list, manage group members
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with chat data
'''

import json
import os
import psycopg2
from typing import Dict, Any

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
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            # Get user's chats
            user_id = event.get('queryStringParameters', {}).get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(f"""
                SELECT DISTINCT c.id, c.name, c.avatar, c.is_group, c.creator_id,
                       (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
                FROM chats c
                JOIN chat_participants cp ON c.id = cp.chat_id
                WHERE cp.user_id = {user_id} AND cp.left_at IS NULL
                ORDER BY last_message_time DESC NULLS LAST
            """)
            
            chats = []
            for row in cur.fetchall():
                chat_data = {
                    'id': row[0],
                    'name': row[1],
                    'avatar': row[2],
                    'is_group': row[3],
                    'creator_id': row[4],
                    'last_message': row[5],
                    'last_message_time': row[6].isoformat() if row[6] else None
                }
                
                # Get other participant for personal chats
                if not row[3]:
                    cur.execute(f"""
                        SELECT u.username, u.nickname, u.avatar
                        FROM users u
                        JOIN chat_participants cp ON u.id = cp.user_id
                        WHERE cp.chat_id = {row[0]} AND cp.user_id != {user_id}
                    """)
                    other_user = cur.fetchone()
                    if other_user:
                        chat_data['name'] = other_user[1]
                        chat_data['avatar'] = other_user[2]
                        chat_data['other_username'] = other_user[0]
                
                chats.append(chat_data)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chats': chats}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            user_id = body_data.get('user_id')
            
            if action == 'create_personal':
                other_username = body_data.get('other_username', '').replace("'", "''")
                
                # Find other user
                cur.execute(f"SELECT id FROM users WHERE username = '{other_username}'")
                other_user = cur.fetchone()
                
                if not other_user:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'}),
                        'isBase64Encoded': False
                    }
                
                other_user_id = other_user[0]
                
                # Check if chat already exists
                cur.execute(f"""
                    SELECT c.id FROM chats c
                    JOIN chat_participants cp1 ON c.id = cp1.chat_id
                    JOIN chat_participants cp2 ON c.id = cp2.chat_id
                    WHERE c.is_group = FALSE
                      AND cp1.user_id = {user_id}
                      AND cp2.user_id = {other_user_id}
                """)
                
                existing_chat = cur.fetchone()
                if existing_chat:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'chat_id': existing_chat[0], 'existing': True}),
                        'isBase64Encoded': False
                    }
                
                # Create new chat
                cur.execute("INSERT INTO chats (is_group) VALUES (FALSE) RETURNING id")
                chat_id = cur.fetchone()[0]
                
                # Add participants
                cur.execute(f"INSERT INTO chat_participants (chat_id, user_id) VALUES ({chat_id}, {user_id})")
                cur.execute(f"INSERT INTO chat_participants (chat_id, user_id) VALUES ({chat_id}, {other_user_id})")
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id, 'existing': False}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_group':
                name = body_data.get('name', '').replace("'", "''")
                avatar = body_data.get('avatar', '').replace("'", "''") if body_data.get('avatar') else 'NULL'
                member_ids = body_data.get('member_ids', [])
                
                # Create group
                avatar_value = f"'{avatar}'" if avatar != 'NULL' else 'NULL'
                cur.execute(
                    f"INSERT INTO chats (name, avatar, is_group, creator_id) VALUES ('{name}', {avatar_value}, TRUE, {user_id}) RETURNING id"
                )
                chat_id = cur.fetchone()[0]
                
                # Add creator
                cur.execute(f"INSERT INTO chat_participants (chat_id, user_id) VALUES ({chat_id}, {user_id})")
                
                # Add members
                for member_id in member_ids:
                    cur.execute(f"INSERT INTO chat_participants (chat_id, user_id) VALUES ({chat_id}, {member_id})")
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
