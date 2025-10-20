# 
# Data Models for Concierge Entities API
# Handles entity data serialization/deserialization and validation
# Dependencies: pydantic for validation, typing for type hints
#

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class EntityType(Enum):
    """Supported entity types"""
    RESTAURANT = "restaurant"
    HOTEL = "hotel"
    ATTRACTION = "attraction"
    EVENT = "event"

class EntityStatus(Enum):
    """Entity status options"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"

class SyncStatus(Enum):
    """Synchronization status options"""
    SYNCED = "synced"
    PENDING = "pending"
    ERROR = "error"
    CONFLICT = "conflict"

@dataclass
class Location:
    """Location data structure"""
    latitude: float
    longitude: float
    address: Optional[str] = None
    enteredBy: Optional[str] = None

@dataclass
class Photo:
    """Photo data structure"""
    id: Optional[int] = None
    restaurantId: Optional[int] = None
    photoData: Optional[str] = None
    capturedBy: Optional[str] = None
    timestamp: Optional[str] = None

@dataclass
class Curator:
    """Curator information"""
    id: int
    name: str

@dataclass
class MetadataBase:
    """Base metadata structure"""
    type: str
    source: str

@dataclass
class CollectorMetadata(MetadataBase):
    """Collector metadata structure"""
    origin: str
    data: Dict[str, Any]

@dataclass
class RestaurantMetadata(MetadataBase):
    """Restaurant system metadata"""
    id: int
    serverId: Optional[int] = None
    created: Optional[Dict[str, Any]] = None
    modified: Optional[Dict[str, Any]] = None
    sync: Optional[Dict[str, Any]] = None
    system: Optional[Dict[str, Any]] = None

@dataclass
class ExternalMetadata(MetadataBase):
    """External API metadata (Michelin, Google Places, etc.)"""
    importedAt: str
    data: Dict[str, Any]

class EntityModel:
    """Main entity model with JSON serialization/deserialization"""
    
    def __init__(self, entity_id: Optional[int] = None, entity_type: str = "restaurant", 
                 name: str = "", external_id: Optional[str] = None, 
                 status: str = "active", entity_data: Optional[Dict[str, Any]] = None,
                 created_at: Optional[datetime] = None, updated_at: Optional[datetime] = None,
                 created_by: Optional[str] = None, updated_by: Optional[str] = None):
        
        self.id = entity_id
        self.entity_type = entity_type
        self.name = name
        self.external_id = external_id
        self.status = status
        self.entity_data = entity_data or {}
        self.created_at = created_at
        self.updated_at = updated_at
        self.created_by = created_by
        self.updated_by = updated_by
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EntityModel':
        """Create EntityModel from dictionary (database row)"""
        return cls(
            entity_id=data.get('id'),
            entity_type=data.get('entity_type', 'restaurant'),
            name=data.get('name', ''),
            external_id=data.get('external_id'),
            status=data.get('status', 'active'),
            entity_data=data.get('entity_data', {}),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            created_by=data.get('created_by'),
            updated_by=data.get('updated_by')
        )
    
    @classmethod
    def from_concierge_v2(cls, concierge_data: Dict[str, Any], 
                         entity_type: str = "restaurant") -> 'EntityModel':
        """Create EntityModel from Concierge Collector V2 format"""
        # Extract name from collector metadata
        name = ""
        for metadata in concierge_data.get('metadata', []):
            if metadata.get('type') == 'collector':
                name = metadata.get('data', {}).get('name', '')
                break
        
        if not name:
            raise ValueError("Entity name not found in collector metadata")
        
        # Store the entire Concierge data structure in entity_data
        entity_data = {
            'concierge_v2': concierge_data,
            'format_version': '2.0',
            'imported_at': datetime.now().isoformat()
        }
        
        return cls(
            entity_type=entity_type,
            name=name,
            entity_data=entity_data,
            status='active'
        )
    
    def to_dict(self, include_id: bool = True) -> Dict[str, Any]:
        """Convert EntityModel to dictionary for database storage"""
        result = {
            'entity_type': self.entity_type,
            'name': self.name,
            'external_id': self.external_id,
            'status': self.status,
            'entity_data': json.dumps(self.entity_data) if isinstance(self.entity_data, dict) else self.entity_data,
            'created_by': self.created_by,
            'updated_by': self.updated_by
        }
        
        if include_id and self.id:
            result['id'] = self.id
            
        return result
    
    def to_json_response(self) -> Dict[str, Any]:
        """Convert EntityModel to JSON API response format"""
        return {
            'id': self.id,
            'entity_type': self.entity_type,
            'name': self.name,
            'external_id': self.external_id,
            'status': self.status,
            'entity_data': self.entity_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by
        }
    
    def extract_categories(self) -> Dict[str, List[str]]:
        """Extract curator categories from entity data"""
        if 'concierge_v2' in self.entity_data:
            # V2 format has categories at root level
            concierge_data = self.entity_data['concierge_v2']
            return {
                key: value for key, value in concierge_data.items()
                if key not in ['metadata'] and isinstance(value, list)
            }
        return {}
    
    def extract_metadata(self) -> List[Dict[str, Any]]:
        """Extract metadata array from entity data"""
        if 'concierge_v2' in self.entity_data:
            return self.entity_data['concierge_v2'].get('metadata', [])
        return []
    
    def get_collector_data(self) -> Optional[Dict[str, Any]]:
        """Get collector data from metadata"""
        for metadata in self.extract_metadata():
            if metadata.get('type') == 'collector':
                return metadata.get('data', {})
        return None
    
    def get_location(self) -> Optional[Location]:
        """Extract location data from collector metadata"""
        collector_data = self.get_collector_data()
        if collector_data and 'location' in collector_data:
            loc_data = collector_data['location']
            return Location(
                latitude=loc_data.get('latitude'),
                longitude=loc_data.get('longitude'),
                address=loc_data.get('address'),
                enteredBy=loc_data.get('enteredBy')
            )
        return None
    
    def validate(self) -> tuple[bool, List[str]]:
        """Validate entity data and return (is_valid, errors)"""
        errors = []
        
        if not self.name or not self.name.strip():
            errors.append("Entity name is required")
        
        if self.entity_type not in [e.value for e in EntityType]:
            errors.append(f"Invalid entity_type: {self.entity_type}")
        
        if self.status not in [s.value for s in EntityStatus]:
            errors.append(f"Invalid status: {self.status}")
        
        # Validate entity_data is valid JSON
        if self.entity_data:
            try:
                if isinstance(self.entity_data, str):
                    json.loads(self.entity_data)
            except json.JSONDecodeError:
                errors.append("entity_data must be valid JSON")
        
        return len(errors) == 0, errors
    
    def to_concierge_v2(self) -> Dict[str, Any]:
        """Export entity in Concierge V2 format for two-way sync"""
        if 'concierge_v2' in self.entity_data:
            # Return the original V2 format stored in entity_data
            v2_data = self.entity_data['concierge_v2'].copy()
            
            # Update system metadata with current export info
            metadata_list = v2_data.get('metadata', [])
            
            # Update or add restaurant metadata with current state
            restaurant_meta = None
            for i, meta in enumerate(metadata_list):
                if meta.get('type') == 'restaurant':
                    restaurant_meta = meta
                    break
            
            if restaurant_meta:
                # Update existing metadata
                if not restaurant_meta.get('system'):
                    restaurant_meta['system'] = {}
                restaurant_meta['system']['exportedAt'] = datetime.now().isoformat()
                restaurant_meta['system']['exportFormat'] = 'concierge-v2'
                restaurant_meta['system']['schemaVersion'] = '2.0'
                
                # Update modified timestamp if entity was updated
                if self.updated_at and self.created_at and self.updated_at > self.created_at:
                    if not restaurant_meta.get('modified'):
                        restaurant_meta['modified'] = {}
                    restaurant_meta['modified']['timestamp'] = self.updated_at.isoformat()
                    if self.updated_by:
                        restaurant_meta['modified']['curator'] = {
                            'name': self.updated_by
                        }
            
            return v2_data
        else:
            # Fallback: create minimal V2 structure if not stored in V2 format
            return {
                'metadata': [{
                    'type': 'collector',
                    'source': 'local',
                    'origin': 'local',
                    'data': {
                        'name': self.name,
                        'description': self.entity_data.get('description', '') if self.entity_data else ''
                    }
                }],
                'Cuisine': [],
                'Menu': [],
                'Price Range': [],
                'Mood': [],
                'Setting': [],
                'Crowd': [],
                'Suitable For': [],
                'Food Style': [],
                'Drinks': [],
                'Special Features': []
            }

@dataclass
class CuratorModel:
    """Curator data model"""
    id: Optional[int] = None
    name: str = ""
    email: Optional[str] = None
    role: str = "curator"
    active: bool = True
    created_at: Optional[datetime] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CuratorModel':
        """Create CuratorModel from dictionary"""
        return cls(
            id=data.get('id'),
            name=data.get('name', ''),
            email=data.get('email'),
            role=data.get('role', 'curator'),
            active=data.get('active', True),
            created_at=data.get('created_at')
        )
    
    def to_dict(self, include_id: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for database storage"""
        result = {
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'active': self.active
        }
        
        if include_id and self.id:
            result['id'] = self.id
            
        return result

@dataclass 
class EntitySyncModel:
    """Entity synchronization tracking model"""
    id: Optional[int] = None
    entity_id: int = 0
    sync_source: str = ""
    external_reference: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    sync_status: str = "synced"
    sync_data: Optional[Dict[str, Any]] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EntitySyncModel':
        """Create EntitySyncModel from dictionary"""
        return cls(
            id=data.get('id'),
            entity_id=data.get('entity_id', 0),
            sync_source=data.get('sync_source', ''),
            external_reference=data.get('external_reference'),
            last_sync_at=data.get('last_sync_at'),
            sync_status=data.get('sync_status', 'synced'),
            sync_data=data.get('sync_data')
        )
    
    def to_dict(self, include_id: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for database storage"""
        result = {
            'entity_id': self.entity_id,
            'sync_source': self.sync_source,
            'external_reference': self.external_reference,
            'sync_status': self.sync_status,
            'sync_data': json.dumps(self.sync_data) if isinstance(self.sync_data, dict) else self.sync_data
        }
        
        if include_id and self.id:
            result['id'] = self.id
            
        return result