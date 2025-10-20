# API Endpoint Decision Tree

**Purpose:** Visual guide to help client choose the right endpoint  
**Date:** October 20, 2025

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONCIERGE API ENDPOINT SELECTION               │
└─────────────────────────────────────────────────────────────────┘

START HERE: What do you need to do?
│
├─ Need to CHECK if server is healthy?
│  └─> GET /api/health ✅
│
├─ Need to GET restaurants?
│  ├─ With pagination and filters?
│  │  └─> GET /api/restaurants?page=1&limit=50&simple=true ✅
│  └─ All at once (legacy)?
│     └─> GET /api/restaurants ✅
│
└─ Need to UPLOAD/SYNC restaurants?
   │
   ├─ Do you have COMPLETE metadata? ────────────────────────┐
   │  (location, photos, notes, Michelin, Google Places)     │
   │                                                          │
   │  YES ─────────────────────────────────────────────┐     │
   │  │                                                 │     │
   │  └─> Use /api/curation/json ✅ RECOMMENDED        │     │
   │      │                                             │     │
   │      ├─ Stores complete JSON document              │     │
   │      ├─ Preserves ALL metadata                     │     │
   │      ├─ Intelligent duplicate prevention           │     │
   │      │  (name + city + curator)                    │     │
   │      ├─ Future-proof (no schema changes)           │     │
   │      └─ City extraction: Michelin → Google → Parse │     │
   │                                                     │     │
   │  NO ──────────────────────────────────────────────┐│     │
   │                                                    ││     │
   ├─ Do you need to DELETE restaurants remotely? ─────┼┼─────┘
   │                                                    ││
   │  YES ───────────────────────────────────┐         ││
   │  │                                       │         ││
   │  └─> Use /api/restaurants/sync ⚠️       │         ││
   │      │                                   │         ││
   │      ├─ Supports create/update/delete    │         ││
   │      ├─ Atomic transaction (all or none) │         ││
   │      ├─ Simple CRUD operations           │         ││
   │      └─ NO metadata storage              │         ││
   │                                           │         ││
   │  NO ──────────────────────────────────────┼─────────┘│
   │                                           │          │
   └─ Need basic sync with server ID mapping? │          │
      │                                        │          │
      └─> Use /api/restaurants/batch ⚠️ LEGACY│          │
          │                                    │          │
          ├─ Returns server IDs               │          │
          ├─ Partial success support (207)    │          │
          ├─ Batch size limit: 50             │          │
          ├─ Basic data only                  │          │
          └─ ❌ Loses location/photos/notes   │          │
                                               │          │
                                               └──────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     DATA PRESERVATION MATRIX                     │
└─────────────────────────────────────────────────────────────────┘

What gets stored?
                                      /batch    /sync   /json
┌──────────────────────────────────┬─────────┬────────┬────────┐
│ Basic Info (name, description)   │    ✅   │   ✅   │   ✅   │
│ Transcription (audio text)       │    ✅   │   ✅   │   ✅   │
│ Curator information              │    ✅   │   ✅   │   ✅   │
│ Concepts (categories)            │    ✅   │   ✅   │   ✅   │
│ Server ID mapping                │    ✅   │   ✅   │   ❌   │
├──────────────────────────────────┼─────────┼────────┼────────┤
│ Location (lat/lng/address)       │    ❌   │   ❌   │   ✅   │
│ Private notes                    │    ❌   │   ❌   │   ✅   │
│ Public notes                     │    ❌   │   ❌   │   ✅   │
│ Photos (base64)                  │    ❌   │   ❌   │   ✅   │
│ Michelin data                    │    ❌   │   ❌   │   ✅   │
│ Google Places data               │    ❌   │   ❌   │   ✅   │
└──────────────────────────────────┴─────────┴────────┴────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     DUPLICATE PREVENTION                         │
└─────────────────────────────────────────────────────────────────┘

/api/restaurants/batch & /sync:
┌──────────────────────────────────────────────────────┐
│ Composite Key: (name)                                │
│                                                      │
│ Example:                                             │
│   "Osteria Francescana" = UNIQUE                    │
│                                                      │
│ Problem: Cannot distinguish same restaurant in      │
│          different cities or by different curators  │
└──────────────────────────────────────────────────────┘

/api/curation/json:
┌──────────────────────────────────────────────────────┐
│ Composite Key: (name, city, curator_id)             │
│                                                      │
│ Examples:                                            │
│   ("Osteria Francescana", "Modena", 1) = Entry A   │
│   ("Osteria Francescana", "Modena", 1) = UPDATE A   │
│   ("Osteria Francescana", "Modena", 2) = Entry B   │
│   ("Osteria Francescana", "Rome", 1)   = Entry C   │
│                                                      │
│ Benefit: Allows same restaurant in different cities │
│          or reviewed by different curators          │
└──────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     CITY EXTRACTION LOGIC                        │
└─────────────────────────────────────────────────────────────────┘

For /api/curation/json duplicate prevention:

Priority 1: Michelin Guide City (Most Reliable)
┌──────────────────────────────────────────────┐
│ metadata[type="michelin"].data.guide.city    │
│                                              │
│ Example: "Modena"                            │
│                                              │
│ Reliability: ⭐⭐⭐⭐⭐ (Highest)              │
└──────────────────────────────────────────────┘
           │
           │ If not available...
           ▼
Priority 2: Google Places Vicinity
┌──────────────────────────────────────────────┐
│ metadata[type="google-places"]               │
│   .data.location.vicinity                    │
│                                              │
│ Example: "Via Stella, 22, Modena"           │
│ Parsed to: "Modena"                         │
│                                              │
│ Reliability: ⭐⭐⭐⭐ (High)                  │
└──────────────────────────────────────────────┘
           │
           │ If not available...
           ▼
Priority 3: Collector Address Parsing
┌──────────────────────────────────────────────┐
│ metadata[type="collector"]                   │
│   .data.location.address                     │
│                                              │
│ Example: "Via Stella, 22, Modena, Italy"    │
│ Parsed to: "Modena"                         │
│                                              │
│ Parsing Logic:                               │
│ - Skip postal codes (numbers)                │
│ - Skip country names                         │
│ - Skip street addresses (start with digit)  │
│                                              │
│ Reliability: ⭐⭐⭐ (Medium)                  │
└──────────────────────────────────────────────┘
           │
           │ If not available...
           ▼
Fallback: "Unknown"
┌──────────────────────────────────────────────┐
│ City cannot be determined                    │
│                                              │
│ Warning: May cause duplicate issues          │
└──────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     MIGRATION PATH                               │
└─────────────────────────────────────────────────────────────────┘

Current State (Using /batch):
┌─────────────────────────────────────────────────────────┐
│ ✅ Basic sync working                                   │
│ ✅ Server IDs mapped                                    │
│ ❌ Losing location data                                 │
│ ❌ Losing photos                                        │
│ ❌ Losing notes                                         │
│ ❌ Losing Michelin data                                 │
│ ❌ Losing Google Places data                            │
└─────────────────────────────────────────────────────────┘
                    │
                    │ RECOMMENDED MIGRATION
                    ▼
Future State (Using /json):
┌─────────────────────────────────────────────────────────┐
│ ✅ Complete data preservation                           │
│ ✅ Location data synced                                 │
│ ✅ Photos stored                                        │
│ ✅ Notes preserved                                      │
│ ✅ Michelin data saved                                  │
│ ✅ Google Places ratings stored                         │
│ ✅ Intelligent duplicate prevention                     │
│ ✅ Future-proof JSONB storage                           │
└─────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     RESPONSE FORMATS                             │
└─────────────────────────────────────────────────────────────────┘

/api/restaurants/batch - Full Success (200):
{
  "status": "success",
  "summary": {
    "total": 10,
    "successful": 10,
    "failed": 0
  },
  "restaurants": [
    {
      "localId": 1,
      "serverId": 456,
      "name": "Restaurant Name",
      "status": "success"
    }
  ]
}

/api/restaurants/batch - Partial Success (207):
{
  "status": "partial",
  "summary": {
    "total": 10,
    "successful": 8,
    "failed": 2
  },
  "restaurants": [
    {
      "localId": 1,
      "serverId": 456,
      "name": "Success",
      "status": "success"
    },
    {
      "localId": 2,
      "name": "Failed",
      "status": "error",
      "message": "Missing required field"
    }
  ]
}

/api/curation/json - Success (200):
{
  "status": "success",
  "processed": 10,
  "message": "Successfully processed 10 restaurants"
}

/api/restaurants/sync - Success (200):
{
  "status": "success",
  "summary": {
    "created": 3,
    "updated": 2,
    "deleted": 1,
    "errors": []
  }
}


┌─────────────────────────────────────────────────────────────────┐
│                     ERROR CODES                                  │
└─────────────────────────────────────────────────────────────────┘

200 OK              ─────> Full success, all operations completed
201 Created         ─────> Resource created (not currently used)
207 Multi-Status    ─────> Partial success (some items failed)
400 Bad Request     ─────> Invalid JSON or missing required fields
404 Not Found       ─────> Resource not found
500 Server Error    ─────> Internal server error
503 Unavailable     ─────> Database connection failed (health check)


┌─────────────────────────────────────────────────────────────────┐
│                     QUICK REFERENCE                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┬────────────────────────────────────────┐
│ Use Case             │ Recommended Endpoint                   │
├──────────────────────┼────────────────────────────────────────┤
│ New integration      │ /api/curation/json ✅                  │
│ Complete metadata    │ /api/curation/json ✅                  │
│ Location/photos      │ /api/curation/json ✅                  │
│ Michelin/Google data │ /api/curation/json ✅                  │
│ Future-proof         │ /api/curation/json ✅                  │
├──────────────────────┼────────────────────────────────────────┤
│ Legacy sync          │ /api/restaurants/batch ⚠️             │
│ Server ID mapping    │ /api/restaurants/batch ⚠️             │
│ Simple data only     │ /api/restaurants/batch ⚠️             │
├──────────────────────┼────────────────────────────────────────┤
│ Delete restaurants   │ /api/restaurants/sync ⚠️              │
│ Atomic CRUD          │ /api/restaurants/sync ⚠️              │
├──────────────────────┼────────────────────────────────────────┤
│ Health check         │ /api/health ✅                         │
│ Server version       │ /status ✅                             │
│ Query restaurants    │ /api/restaurants?page=1&limit=50 ✅    │
└──────────────────────┴────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     FINAL RECOMMENDATION                         │
└─────────────────────────────────────────────────────────────────┘

                    🎯 MIGRATE TO /api/curation/json

Why?
  ✅ Preserves ALL your data (no loss)
  ✅ Better duplicate prevention (city + curator aware)
  ✅ Future-proof (JSONB storage, no schema changes)
  ✅ Already production-ready and tested
  ✅ Sophisticated city extraction (multi-source)

When?
  🔴 IMMEDIATELY if you have location/photos/notes data
  🟡 SOON if planning Michelin/Google integration
  🟢 EVENTUALLY for future-proofing

How?
  See API_RECOMMENDATIONS.md for complete migration guide
  with code examples and testing strategy.

```

**Document Version:** 1.0  
**Visual Type:** ASCII Decision Tree  
**Status:** Ready for Distribution
