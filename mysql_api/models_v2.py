"""
models_v2.py - Data models for Concierge V2 API

Purpose: Simple model for restaurants_v2 table storing pure V2 JSON format
Dependencies: mysql.connector for database, json for data handling, datetime for timestamps
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any, List


class RestaurantV2:
    """
    Model for restaurants_v2 table.
    Stores complete Concierge V2 JSON format in v2_data column.
    """
    
    def __init__(self, id: Optional[int] = None, name: str = "", 
                 entity_type: str = "restaurant", v2_data: Dict[str, Any] = None,
                 server_id: Optional[int] = None, sync_status: str = "pending",
                 last_synced_at: Optional[datetime] = None,
                 created_at: Optional[datetime] = None,
                 updated_at: Optional[datetime] = None,
                 deleted_at: Optional[datetime] = None):
        self.id = id
        self.name = name
        self.entity_type = entity_type
        self.v2_data = v2_data or {}
        self.server_id = server_id
        self.sync_status = sync_status
        self.last_synced_at = last_synced_at
        self.created_at = created_at
        self.updated_at = updated_at
        self.deleted_at = deleted_at
    
    @classmethod
    def from_db_row(cls, row: tuple) -> 'RestaurantV2':
        """Create instance from database row."""
        return cls(
            id=row[0],
            name=row[1],
            entity_type=row[2],
            v2_data=json.loads(row[3]) if isinstance(row[3], str) else row[3],
            server_id=row[4],
            sync_status=row[5],
            last_synced_at=row[6],
            created_at=row[7],
            updated_at=row[8],
            deleted_at=row[9]
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            'id': self.id,
            'name': self.name,
            'entity_type': self.entity_type,
            'v2_data': self.v2_data,
            'server_id': self.server_id,
            'sync_status': self.sync_status,
            'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None
        }
    
    def to_v2_format(self) -> Dict[str, Any]:
        """
        Return pure V2 format (just the v2_data content).
        This is what client expects for export.
        """
        return self.v2_data
    
    @classmethod
    def from_v2_format(cls, v2_json: Dict[str, Any]) -> 'RestaurantV2':
        """
        Create instance from pure V2 JSON (for import).
        Extracts name from V2 data.
        """
        name = v2_json.get('Name', v2_json.get('name', 'Unnamed'))
        entity_type = v2_json.get('Type', 'restaurant').lower()
        
        return cls(
            name=name,
            entity_type=entity_type,
            v2_data=v2_json,
            sync_status='pending'
        )
    
    def save(self, connection) -> int:
        """
        Save to database (INSERT or UPDATE).
        Returns the restaurant ID.
        """
        cursor = connection.cursor()
        
        try:
            v2_data_json = json.dumps(self.v2_data, ensure_ascii=False)
            
            if self.id:
                # UPDATE existing
                query = """
                    UPDATE restaurants_v2 
                    SET name = %s, entity_type = %s, v2_data = %s, 
                        server_id = %s, sync_status = %s, last_synced_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """
                cursor.execute(query, (
                    self.name, self.entity_type, v2_data_json,
                    self.server_id, self.sync_status, self.last_synced_at,
                    self.id
                ))
                connection.commit()
                return self.id
            else:
                # INSERT new
                query = """
                    INSERT INTO restaurants_v2 
                    (name, entity_type, v2_data, server_id, sync_status, last_synced_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
                cursor.execute(query, (
                    self.name, self.entity_type, v2_data_json,
                    self.server_id, self.sync_status, self.last_synced_at
                ))
                connection.commit()
                self.id = cursor.lastrowid
                return self.id
        finally:
            cursor.close()
    
    @classmethod
    def get_by_id(cls, connection, restaurant_id: int) -> Optional['RestaurantV2']:
        """Get restaurant by ID."""
        cursor = connection.cursor()
        try:
            query = """
                SELECT id, name, entity_type, v2_data, server_id, sync_status,
                       last_synced_at, created_at, updated_at, deleted_at
                FROM restaurants_v2
                WHERE id = %s AND deleted_at IS NULL
            """
            cursor.execute(query, (restaurant_id,))
            row = cursor.fetchone()
            return cls.from_db_row(row) if row else None
        finally:
            cursor.close()
    
    @classmethod
    def get_all(cls, connection, entity_type: Optional[str] = None, 
                limit: int = 100, offset: int = 0) -> List['RestaurantV2']:
        """Get all restaurants with optional filtering."""
        cursor = connection.cursor()
        try:
            if entity_type:
                query = """
                    SELECT id, name, entity_type, v2_data, server_id, sync_status,
                           last_synced_at, created_at, updated_at, deleted_at
                    FROM restaurants_v2
                    WHERE entity_type = %s AND deleted_at IS NULL
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s
                """
                cursor.execute(query, (entity_type, limit, offset))
            else:
                query = """
                    SELECT id, name, entity_type, v2_data, server_id, sync_status,
                           last_synced_at, created_at, updated_at, deleted_at
                    FROM restaurants_v2
                    WHERE deleted_at IS NULL
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s
                """
                cursor.execute(query, (limit, offset))
            
            rows = cursor.fetchall()
            return [cls.from_db_row(row) for row in rows]
        finally:
            cursor.close()
    
    def soft_delete(self, connection):
        """Soft delete (set deleted_at timestamp)."""
        cursor = connection.cursor()
        try:
            query = "UPDATE restaurants_v2 SET deleted_at = CURRENT_TIMESTAMP WHERE id = %s"
            cursor.execute(query, (self.id,))
            connection.commit()
        finally:
            cursor.close()
    
    @classmethod
    def search_by_name(cls, connection, search_term: str, limit: int = 20) -> List['RestaurantV2']:
        """Search restaurants by name."""
        cursor = connection.cursor()
        try:
            query = """
                SELECT id, name, entity_type, v2_data, server_id, sync_status,
                       last_synced_at, created_at, updated_at, deleted_at
                FROM restaurants_v2
                WHERE name LIKE %s AND deleted_at IS NULL
                ORDER BY name
                LIMIT %s
            """
            cursor.execute(query, (f'%{search_term}%', limit))
            rows = cursor.fetchall()
            return [cls.from_db_row(row) for row in rows]
        finally:
            cursor.close()
