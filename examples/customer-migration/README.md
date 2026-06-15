# Example: Customer Migration

This example demonstrates a complete end-to-end customer migration.

## Setup

### Source Database Schema

```sql
CREATE TABLE src_customers (
  cust_id VARCHAR(50) PRIMARY KEY,
  cust_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status_code CHAR(1),
  created_date TIMESTAMP
);
```

### Target Database Schema

```sql
CREATE TABLE customers (
  customer_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP
);
```

## Mapping Configuration

```json
{
  "version": "1.0",
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
          "sourceField": "status_code",
          "targetField": "status",
          "lookupTable": "status_translations",
          "lookupSourceColumn": "source_code",
          "lookupTargetColumn": "target_code"
        }
      ]
    }
  ]
}
```

## Usage

```typescript
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
```
