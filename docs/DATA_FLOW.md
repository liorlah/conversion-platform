# Data Flow & Pipeline Diagrams

## End-to-End Conversion Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      CONVERSION PLATFORM PIPELINE                                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐
│      SOURCE DB         │
│                        │
│  • Customers           │
│  • Orders              │  Extract
│  • Products            │─────────────────────────┐
│                        │                         │
└────────────────────────┘                         │
                                                    ▼
                                        ┌────────────────────────────────────┐
                                        │  STAGING DB (RAW TABLES)          │
                                        │                                    │
                                        │  • staging_raw_customers          │
                                        │  • staging_raw_orders             │  Transform
                                        │  • staging_raw_products           │──────────────┐
                                        │                                    │              │
                                        └────────────────────────────────────┘              │
                                                                                            ▼
┌────────────────────────┐                                               ┌───────────────────────────────────────────┐
│ TRANSLATION TABLES     │                                               │ STAGING DB (TRANSFORMED TABLES)          │
│                        │────────────────────────────────────────────→  │                                           │
│ • status_codes         │                                               │ • staging_customers                      │
│ • category_map         │                                               │ • staging_orders                         │
│ • country_codes        │                                               │ • staging_products                       │  Validate
│                        │                                               │                                           │──────────┐
└────────────────────────┘                                               └───────────────────────────────────────────┘          │
                                                                                                                                 │
                                                                                 ┌──────────────────────────────┐                │
                                                                                 │ VALIDATION ENGINE            │                │
                                                                    ┌────────→  │ • Schema checks             │                │
                                                                    │           │ • Business rules           │                │
                                                                    │           │ • Referential integrity    │                │
                                                                    │           │ • Duplicate detection      │                │
                                                                    │           └──────────────────────────────┘                │
                                                                    │                      │                                   │
                                                                    │                      ▼                                   │
                                                                    │          ┌────────────────────┐                          │
                                                                    │   PASS  │  LOAD TO TARGET    │  FAIL                    ▼
                                                                    └─────────│ • Insert/Upsert   │─────────→ ┌──────────────────────┐
                                                                              │ • Transactions    │           │ ERROR TRACKING       │
                                                                              │ • Rollback        │           │                      │
                                                                              └────────────────────┘           │ • Flagged records    │
                                                                                      │                      │ • Error logs         │
                                                                                      ▼                      │ • Retry queue        │
                                                                              ┌────────────────────┐           └──────────────────────┘
                                                                              │   TARGET DB        │
                                                                              │                    │
                                                                              │ • Customers        │
                                                                              │ • Orders           │
                                                                              │ • Products         │
                                                                              └────────────────────┘
                                                                                      │
                                                                                      ▼
                                                                              ┌────────────────────┐
                                                                              │   AUDIT LOG        │
                                                                              │                    │
                                                                              │ • Data lineage     │
                                                                              │ • Transformations  │
                                                                              │ • Compliance       │
                                                                              │ • Metrics          │
                                                                              └────────────────────┘
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
├── Staging validation
├── Target validation
├── Route failures
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
│   └── Commit batch
├── Rollback on error (if transaction enabled)
└── Track loaded records

Output: Migrated data in target database
```
