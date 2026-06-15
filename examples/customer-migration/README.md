# Example: Customer Migration

This example demonstrates a complete end-to-end customer migration from a legacy CRM to a modern platform.

## Setup

### Source Database Schema

```sql
CREATE TABLE src_customers (
  cust_id VARCHAR(50) PRIMARY KEY,
  cust_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  status_code CHAR(1),
  category_id INTEGER,
  created_date TIMESTAMP,
  updated_date TIMESTAMP
);
```

### Target Database Schema

```sql
CREATE TABLE customers (
  customer_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  status VARCHAR(50),
  business_category VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  migrated_at TIMESTAMP DEFAULT NOW()
);
```

### Translation Tables

```sql
CREATE TABLE status_translations (
  source_system VARCHAR(50),
  source_code CHAR(1),
  target_code VARCHAR(50),
  PRIMARY KEY (source_system, source_code)
);

INSERT INTO status_translations VALUES
  ('legacy_crm', 'A', 'ACTIVE'),
  ('legacy_crm', 'I', 'INACTIVE'),
  ('legacy_crm', 'S', 'SUSPENDED');

CREATE TABLE category_translations (
  category_id INTEGER PRIMARY KEY,
  category_name VARCHAR(100)
);

INSERT INTO category_translations VALUES
  (1, 'ENTERPRISE'),
  (2, 'PREMIUM'),
  (3, 'STANDARD'),
  (4, 'BASIC');
```

## Mapping Configuration

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Customer Migration v1.0",
    "description": "Migrate customers from legacy CRM to new platform",
    "createdBy": "data-engineering-team",
    "lastModified": "2024-01-15T10:00:00Z"
  },
  "transformations": [
    {
      "id": "customer-migration",
      "sourceTable": "src_customers",
      "targetTable": "customers",
      "primaryKey": "customer_id",
      "fieldMappings": [
        {
          "sourceField": "cust_id",
          "targetField": "customer_id",
          "required": true
        },
        {
          "sourceField": "cust_name",
          "targetField": "name",
          "required": true
        },
        {
          "sourceField": "email",
          "targetField": "email",
          "required": false
        },
        {
          "sourceField": "phone",
          "targetField": "phone",
          "transform": "trim"
        },
        {
          "sourceField": "status_code",
          "targetField": "status",
          "lookupTable": "status_translations",
          "lookupSourceColumn": "source_code",
          "lookupTargetColumn": "target_code",
          "defaultValue": "INACTIVE"
        },
        {
          "sourceField": "category_id",
          "targetField": "business_category",
          "lookupTable": "category_translations",
          "lookupSourceColumn": "category_id",
          "lookupTargetColumn": "category_name"
        },
        {
          "sourceField": "created_date",
          "targetField": "created_at",
          "transform": "toISOString"
        },
        {
          "sourceField": "updated_date",
          "targetField": "updated_at",
          "transform": "toISOString"
        }
      ],
      "validationRules": [
        {
          "name": "required_customer_id",
          "level": "target",
          "table": "customers",
          "field": "customer_id",
          "rule": "required",
          "severity": "error"
        },
        {
          "name": "required_name",
          "level": "target",
          "table": "customers",
          "field": "name",
          "rule": "required",
          "severity": "error"
        },
        {
          "name": "unique_email",
          "level": "target",
          "table": "customers",
          "field": "email",
          "rule": "unique",
          "severity": "error"
        }
      ]
    }
  ]
}
```

## Sample Data

### Source System

```json
[
  {
    "cust_id": "CUST-001",
    "cust_name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "  555-0100  ",
    "status_code": "A",
    "category_id": 1,
    "created_date": "2023-01-15",
    "updated_date": "2024-01-10"
  },
  {
    "cust_id": "CUST-002",
    "cust_name": "TechStart Inc",
    "email": "info@techstart.com",
    "phone": null,
    "status_code": "A",
    "category_id": 2,
    "created_date": "2023-06-20",
    "updated_date": "2024-01-05"
  },
  {
    "cust_id": "CUST-003",
    "cust_name": "Global Solutions",
    "email": null,
    "phone": "555-0102",
    "status_code": "S",
    "category_id": 3,
    "created_date": "2023-03-01",
    "updated_date": "2024-01-08"
  }
]
```

### Target System (After Transformation)

```json
[
  {
    "customer_id": "CUST-001",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "555-0100",
    "status": "ACTIVE",
    "business_category": "ENTERPRISE",
    "created_at": "2023-01-15T00:00:00.000Z",
    "updated_at": "2024-01-10T00:00:00.000Z",
    "migrated_at": "2024-01-15T14:23:45.123Z"
  },
  {
    "customer_id": "CUST-002",
    "name": "TechStart Inc",
    "email": "info@techstart.com",
    "phone": null,
    "status": "ACTIVE",
    "business_category": "PREMIUM",
    "created_at": "2023-06-20T00:00:00.000Z",
    "updated_at": "2024-01-05T00:00:00.000Z",
    "migrated_at": "2024-01-15T14:23:45.123Z"
  },
  {
    "customer_id": "CUST-003",
    "name": "Global Solutions",
    "email": null,
    "phone": "555-0102",
    "status": "SUSPENDED",
    "business_category": "STANDARD",
    "created_at": "2023-03-01T00:00:00.000Z",
    "updated_at": "2024-01-08T00:00:00.000Z",
    "migrated_at": "2024-01-15T14:23:45.123Z"
  }
]
```

## Usage

```typescript
import { ConversionOrchestrator } from '@engines/orchestrator';
import { PostgresSourceDatabase } from '@interfaces/source-database';
import { PostgresStagingDatabase } from '@interfaces/staging-database';
import { PostgresTargetDatabase } from '@interfaces/target-database';
import { StateManager } from '@state/state-manager';
import { AuditLogger } from '@audit/audit-logger';
import { Logger } from '@utils/logger';

const logger = new Logger('CustomerMigration');

// Initialize databases
const sourceDb = new PostgresSourceDatabase(sourceConfig, logger);
const stagingDb = new PostgresStagingDatabase(stagingConfig, logger);
const targetDb = new PostgresTargetDatabase(targetConfig, logger);

// Initialize supporting services
const stateManager = new StateManager();
const auditLogger = new AuditLogger();

// Create orchestrator
const orchestrator = new ConversionOrchestrator(
  sourceDb,
  stagingDb,
  targetDb,
  stateManager,
  auditLogger,
  logger
);

// Load mapping configuration
const mappingConfig = require('./mapping-config.json');
const customerMapping = mappingConfig.transformations[0];

// Execute conversion
const result = await orchestrator.executeConversion(
  'src_customers',
  'customers',
  customerMapping,
  {
    batchSize: 1000,
    checkpointInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    enableTransactions: true,
    timeoutMs: 60000
  }
);

console.log('Migration Result:', result);
// {
//   jobId: 'uuid-xxx',
//   status: 'success',
//   recordsExtracted: 50000,
//   recordsTransformed: 50000,
//   recordsLoaded: 49950,
//   recordsFailed: 50,
//   duration: 125000,
//   successRate: 0.999
// }
```

---

For more examples, see other files in the `examples/` directory.
