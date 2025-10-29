'''
Business: Group management - get participants, leave group, manage settings
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with group data
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
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            # Get group participants
            chat_id = event.get('queryStringParameters', {}).get('chat_id')
            
            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id required'})
                }
            
            cur.execute("""
                SELECT u.id, u.username, u.nickname, u.avatar, 
                       cp.joined_at, c.creator_id
                FROM users u
                JOIN chat_participants cp ON u.id = cp.user_id
                JOIN chats c ON c.id = cp.chat_id
                WHERE cp.chat_id = %s AND cp.left_at IS NULL
                ORDER BY cp.joined_at ASC
            """, (chat_id,))
            
            participants = []
            creator_id = None
            for row in cur.fetchall():
                creator_id = row[5]
                participants.append({
                    'id': row[0],
                    'username': row[1],
                    'nickname': row[2],
                    'avatar': row[3],
                    'joined_at': row[4].isoformat() if row[4] else None,
                    'is_creator': row[0] == creator_id
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'participants': participants,
                    'creator_id': creator_id
                })
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'leave':
                chat_id = body_data.get('chat_id')
                user_id = body_data.get('user_id')
                
                # Get user nickname for system message
                cur.execute("SELECT nickname FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                # Mark as left
                cur.execute(
                    "UPDATE chat_participants SET left_at = CURRENT_TIMESTAMP WHERE chat_id = %s AND user_id = %s",
                    (chat_id, user_id)
                )
                
                # Add system message
                cur.execute(
                    "INSERT INTO messages (chat_id, content, is_system) VALUES (%s, %s, TRUE)",
                    (chat_id, f"{user[0]} покинул(а) группу")
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            chat_id = body_data.get('chat_id')
            user_id = body_data.get('user_id')
            
            # Verify user is creator
            cur.execute("SELECT creator_id FROM chats WHERE id = %s", (chat_id,))
            chat = cur.fetchone()
            
            if not chat or chat[0] != user_id:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Not authorized'})
                }
            
            if action == 'update_info':
                name = body_data.get('name')
                avatar = body_data.get('avatar')
                
                cur.execute(
                    "UPDATE chats SET name = %s, avatar = %s WHERE id = %s",
                    (name, avatar, chat_id)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'remove_member':
                member_id = body_data.get('member_id')
                
                # Get member nickname for system message
                cur.execute("SELECT nickname FROM users WHERE id = %s", (member_id,))
                member = cur.fetchone()
                
                if member:
                    # Mark as left
                    cur.execute(
                        "UPDATE chat_participants SET left_at = CURRENT_TIMESTAMP WHERE chat_id = %s AND user_id = %s",
                        (chat_id, member_id)
                    )
                    
                    # Add system message
                    cur.execute(
                        "INSERT INTO messages (chat_id, content, is_system) VALUES (%s, %s, TRUE)",
                        (chat_id, f"{member[0]} был(а) удален(а) из группы")
                    )
                    
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
