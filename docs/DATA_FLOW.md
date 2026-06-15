# Data Flow & Pipeline Diagrams

## End-to-End Conversion Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONVERSION PLATFORM PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────┐
│  SOURCE DB     │
│                │
│  Customers     │  Extract
│  Orders        │────────────┐
│  Products      │            │
└────────────────┘            │
                              ▼
                    ┌──────────────────┐
                    │  STAGING DB      │
                    │  (RAW TABLES)    │
                    │                  │
                    │ staging_raw_     │
                    │  customers       │  Transform
                    │ staging_raw_     │────────────┐
                    │  orders          │            │
                    └──────────────────┘            │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  STAGING DB              │
                                    │  (TRANSFORMED TABLES)    │
                                    │                          │
                                    │ staging_customers        │
                    ┌──────────────→│ staging_orders           │
                    │               │ staging_products         │
         ┌─────────────────┐        └──────────────────────────┘
         │ TRANSLATION     │                    │
         │ TABLES          │                    │ Validate
         │                 │                    │
         │ status_codes    │                    │
         │ category_map    │────────────────────┤
         │ country_codes   │                    │
         └─────────────────┘                    │
                                                ▼
                                    ┌──────────────────────────┐
                                    │  VALIDATION ENGINE       │
                                    │                          │
                                    │ • Schema checks          │
                                    │ • Business rules         │
                                    │ • Referential integrity  │
                                    │ • Duplicate detection    │
                                    └──────────────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                              PASS  │                       │  FAIL
                                    ▼                       ▼
                          ┌──────────────────┐  ┌──────────────────┐
                          │  LOAD TO TARGET  │  │  ERROR TRACKING  │
                          │                  │  │                  │
                          │ • Insert         │  │ • Flagged records│
                          │ • Upsert         │  │ • Error logs     │
                          │ • Transactions   │  │ • Retry queue    │
                          └──────────────────┘  └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  TARGET DB       │
                          │                  │
                          │ Customers        │
                          │ Orders           │
                          │ Products         │
                          └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  AUDIT LOG       │
                          │                  │
                          │ • Data lineage   │
                          │ • Transformations│
                          │ • Compliance     │
                          │ • Metrics        │
                          └──────────────────┘
```

## Detailed Stage Flow

### Stage 1: Extraction

```
Extraction Phase
├── Connect to Source DB
├── Query raw data
├── Batch processing (1000 records/batch)
├── Stream results
├── Stage to Raw Staging Tables
├── Track lineage
└── Save checkpoint

Output: Raw staged data ready for transformation
```

### Stage 2: Transformation

```
Transformation Phase
├── Read raw staged data
├── Apply field mappings
│   ├── Column name mapping
│   ├── Data type conversion
│   └── Value transformations
├── Apply translation mappings
│   ├── Enum value lookup
│   ├── Reference data joins
│   └── Hierarchical translations
├── Apply business logic
│   ├── Calculations
│   ├── Enrichment
│   └── Aggregations
├── Stage transformed data
└── Save checkpoint

Output: Transformed, normalized data
```

### Stage 3: Validation

```
Validation Phase
├── Source validation
│   ├── Check required fields
│   ├── Validate data types
│   └── Check business rules
├── Staging validation
│   ├── Verify transformations
│   ├── Check completeness
│   └── Validate formats
├── Target validation
│   ├── Enforce constraints
│   ├── Check referential integrity
│   ├── Detect duplicates
│   └── Cross-table consistency
├── Route failures
│   ├── Error queue
│   ├── Retry mechanism
│   └── Dead letter queue
└── Generate quality report

Output: Validated records ready for loading
```

### Stage 4: Loading

```
Loading Phase
├── Begin transaction (if enabled)
├── For each batch of records:
│   ├── Check if record exists (upsert logic)
│   ├── Insert new records
│   ├── Update existing records
│   ├── Handle conflicts
│   └── Commit batch
├── Rollback on error (if transaction enabled)
├── Track loaded records
└── Save checkpoint

Output: Migrated data in target database
```

## Mapping Flow

```
Source Record
↓
Field Mapper
├── source_field → target_field
├── Apply transforms (toNumber, toDate, etc)
├── Handle nulls and defaults
└── Create intermediate record
↓
Translation Mapper
├── Lookup translation table
├── Map source value → target value
├── Resolve references
└── Create translated record
↓
Business Logic Engine
├── Apply custom rules
├── Enrich data
├── Calculate derived fields
└── Create final record
↓
Transformed Record
```

## Error Handling Flow

```
Error Occurs
↓
Error Classifier
├── Extraction Error → Retry source query
├── Transformation Error → Log and skip record
├── Validation Error → Move to error queue
├── Loading Error → Retry with backoff
└── Unknown Error → Dead letter queue
↓
Recovery Strategy
├── Retry logic (exponential backoff)
├── Manual review queue
├── Compensation logic
└── Failure notification
↓
Audit Log
```

## State Management & Checkpointing

```
Job Start
↓
Create Initial State
├── Job ID
├── Status: RUNNING
├── Stage: extraction
└── Progress: 0%
↓
Extraction Checkpoint
├── Records extracted: 5000
├── Last record ID: xyz
├── Timestamp
└── Staging cursor
↓
Transformation Checkpoint
├── Records transformed: 5000
├── Transformations applied
├── Translation tables loaded
└── Timestamp
↓
Loading Checkpoint
├── Records loaded: 4950
├── Records failed: 50
├── Transaction state
└── Timestamp
↓
Job Complete
├── Status: COMPLETED
├── Final metrics
├── Audit trail
└── Report generation
```

## Monitoring & Metrics Collection

```
Real-time Metrics
├── Throughput (records/second)
├── Processing time per stage
├── Error rate
├── Queue depths
└── Resource utilization
↓
Aggregated Metrics
├── Total records processed
├── Success rate
├── Data quality score
├── Performance baseline
└── Trend analysis
↓
Alerts & Reports
├── Performance degradation
├── High error rates
├── SLA violations
└── Compliance reports
```

---

For implementation details, see `ARCHITECTURE.md`.
For API examples, see `API_SPECS.md`.
