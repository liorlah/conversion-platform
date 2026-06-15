# API Specifications

## Orchestrator API

### Execute Conversion Pipeline

```typescript
const result = await orchestrator.executeConversion(
  'source_customers',
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

## Database Interfaces

### Source Database

```typescript
// Query with pagination
const result = await sourceDb.queryWithPagination(
  'SELECT * FROM customers',
  [],
  0,
  1000
);

// Stream large datasets
for await (const record of sourceDb.streamQuery(
  'SELECT * FROM orders',
  5000
)) {
  console.log(record);
}
```

### Target Database

```typescript
// Upsert records
const result = await targetDb.upsert(
  'customers',
  records,
  ['id']
);
```
