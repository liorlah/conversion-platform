# Best Practices & Guidelines

## Conversion Configuration

### Mapping Configuration File

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Customer Migration v1",
    "description": "Migrate customers from legacy CRM to new platform",
    "createdBy": "data-team",
    "lastModified": "2024-01-15T10:00:00Z",
    "owner": "data-engineering",
    "priority": "high"
  },
  "transformations": [
    {
      "id": "customers",
      "sourceTable": "src_customers",
      "targetTable": "customers",
      "primaryKey": "customer_id",
      "incremental": false,
      "fieldMappings": [
        {
          "sourceField": "cust_id",
          "targetField": "customer_id",
          "transform": "toNumber",
          "required": true,
          "description": "Customer unique identifier"
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
          "lookupTargetColumn": "target_code",
          "defaultValue": "INACTIVE"
        }
      ],
      "validationRules": [
        {
          "name": "required_email",
          "field": "email",
          "rule": "required"
        },
        {
          "name": "valid_phone",
          "field": "phone",
          "rule": "pattern",
          "pattern": "^\\+?1?\\d{10}$"
        }
      ]
    }
  ]
}
```

## Performance Optimization Tips

### 1. Batch Size Tuning

```typescript
// Too small batches = more network round-trips
const config = { batchSize: 100 };  // ❌ Slow

// Optimal batch size depends on record size and memory
const config = { batchSize: 5000 };  // ✅ Good for most cases

// Very large batches = memory pressure
const config = { batchSize: 100000 };  // ❌ May cause OOM
```

### 2. Connection Pooling

```typescript
// Set appropriate pool size
const config: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'source_db',
  user: 'postgres',
  password: 'postgres',
  poolSize: 20  // ✅ Reasonable for most workloads
};
```

### 3. Index Strategy

```sql
-- Create indexes on frequently filtered columns
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Create index on unique key columns for upsert
CREATE UNIQUE INDEX idx_customers_customer_id ON customers(customer_id);
```

### 4. Query Optimization

```typescript
// ❌ Avoid SELECT * on large tables
const query = `SELECT * FROM source_customers`;

// ✅ Select only needed columns
const query = `
  SELECT id, name, email, status, created_date
  FROM source_customers
  WHERE active = true
`;

// ✅ Use WHERE clause to filter early
const whereClause = `created_date > '2024-01-01'`;
```

## Error Handling Best Practices

### 1. Graceful Degradation

```typescript
const result = await orchestrator.executeConversion(
  sourceTable,
  targetTable,
  mapping,
  config
);

// Handle partial success
if (result.status === 'partial_success') {
  logger.warn(`${result.recordsFailed} records failed`);
  // Continue processing or trigger manual review
}

if (result.status === 'failed') {
  logger.error('Conversion failed completely');
  // Rollback or notify operators
}
```

### 2. Retry Logic

```typescript
const config = {
  maxRetries: 3,
  retryDelay: 1000,  // Start with 1 second
  // Exponential backoff will increase delay: 1s, 2s, 4s
};
```

### 3. Checkpoint Strategy

```typescript
// Set checkpoint interval based on data volume
const config = {
  batchSize: 1000,
  checkpointInterval: 5000,  // Checkpoint every 5000 records
};

// Allows resuming from last checkpoint on failure
const state = await stateManager.getState(jobId);
if (state && state.lastCheckpoint) {
  // Resume from checkpoint
}
```

## Data Quality & Validation

### 1. Pre-Transformation Validation

```typescript
const validationRules = [
  {
    name: 'source_data_completeness',
    level: 'source',
    table: 'src_customers',
    condition: (record) => record.id != null && record.name != null,
    errorMessage: (record) => `Missing required fields in record ${record.id}`,
    severity: 'error'
  }
];
```

### 2. Post-Transformation Validation

```typescript
const validationRules = [
  {
    name: 'target_format_validation',
    level: 'target',
    table: 'customers',
    condition: (record) => /^[A-Z0-9]{5,}$/.test(record.customer_id),
    errorMessage: (record) => `Invalid customer ID format: ${record.customer_id}`,
    severity: 'error'
  }
];
```

### 3. Business Rule Validation

```typescript
const validationRules = [
  {
    name: 'customer_age_validation',
    level: 'target',
    table: 'customers',
    condition: (record) => {
      const age = new Date().getFullYear() - new Date(record.birth_date).getFullYear();
      return age >= 18 && age <= 120;
    },
    errorMessage: (record) => `Invalid age for customer ${record.id}`,
    severity: 'warning'
  }
];
```

## Logging & Monitoring

### 1. Structured Logging

```typescript
logger.info('Conversion started', {
  jobId: 'uuid-xxx',
  sourceTable: 'src_customers',
  targetTable: 'customers',
  recordCount: 50000
});
```

### 2. Metrics Collection

```typescript
// Track key metrics for monitoring
const metrics = {
  recordsPerSecond: 400,
  averageRecordTime: 2.5,  // milliseconds
  errorRate: 0.001,  // 0.1%
  dataQualityScore: 99.9
};
```

### 3. Health Checks

```typescript
// Implement regular health checks
setInterval(async () => {
  const sourceHealth = await sourceDb.health();
  const stagingHealth = await stagingDb.health();
  const targetHealth = await targetDb.health();
  
  if (!sourceHealth || !stagingHealth || !targetHealth) {
    logger.error('Database connection unhealthy');
    // Alert on-call team
  }
}, 30000);  // Every 30 seconds
```

## Security Considerations

### 1. Connection Credentials

```typescript
// ❌ Never hardcode credentials
const config = {
  password: 'postgres123'  // ❌ Exposed
};

// ✅ Use environment variables
const config = {
  password: process.env.SOURCE_DB_PASSWORD
};

// ✅ Or use secrets management
const config = {
  password: await secretsManager.getSecret('source-db-password')
};
```

### 2. Query Injection Prevention

```typescript
// ❌ String concatenation (vulnerable)
const query = `SELECT * FROM customers WHERE id = ${customerId}`;

// ✅ Parameterized queries
const query = `SELECT * FROM customers WHERE id = $1`;
await sourceDb.query(query, [customerId]);
```

### 3. Audit Trail

```typescript
// Log all data modifications
await auditLogger.logConversion(jobId, {
  sourceTable,
  targetTable,
  recordsProcessed,
  changedBy: process.env.USER,
  timestamp: new Date(),
  durationMs
});
```

## Deployment Best Practices

### 1. Environment Configuration

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_DEBUG=false
BATCH_SIZE=5000
MAX_RETRIES=5
```

### 2. Gradual Rollout

```typescript
// Start with small data volumes
const config = {
  incremental: true,  // Process only new/changed records
  whereClause: "created_date > '2024-01-01'"  // Limit scope
};
```

### 3. Rollback Strategy

```typescript
// Keep track of before/after state
const beforeCount = await targetDb.count('customers');
const result = await orchestrator.executeConversion(...);
const afterCount = await targetDb.count('customers');

if (afterCount < beforeCount * 0.9) {
  // Too many records lost, trigger rollback
  logger.error('Data loss detected, initiating rollback');
}
```

---

For troubleshooting, see `TROUBLESHOOTING.md`.
