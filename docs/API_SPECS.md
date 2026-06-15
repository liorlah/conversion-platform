# API Specifications

## Orchestrator API

### Execute Conversion Pipeline

```typescript
const orchestrator = new ConversionOrchestrator(
  sourceDb,
  stagingDb,
  targetDb,
  stateManager,
  auditLogger,
  logger
);

// Execute conversion
const result = await orchestrator.executeConversion(
  'source_customers',           // Source table
  'customers',                  // Target table
  customerMapping,              // Schema mapping
  {
    batchSize: 1000,
    checkpointInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    enableTransactions: true,
    timeoutMs: 60000,
    incremental: false
  }
);

console.log(result);
// {
//   jobId: 'uuid-xxx',
//   status: 'success',
//   recordsExtracted: 50000,
//   recordsTransformed: 50000,
//   recordsLoaded: 49950,
//   recordsFailed: 50,
//   duration: 125000,
//   successRate: 0.999,
//   errors: [...],
//   metrics: {...}
// }
```

### Get Conversion Status

```typescript
const status = await orchestrator.getStatus(jobId);
console.log(status);
// {
//   jobId: 'uuid-xxx',
//   status: 'running',
//   stage: 'transformation',
//   progress: {
//     totalRecords: 50000,
//     processedRecords: 25000,
//     successfulRecords: 24950,
//     failedRecords: 50
//   },
//   startedAt: Date,
//   updatedAt: Date
// }
```

### Resume Conversion

```typescript
const result = await orchestrator.resumeConversion(jobId);
```

## Database Interfaces

### Source Database

```typescript
// Connect
await sourceDb.connect();

// Query with pagination
const result = await sourceDb.queryWithPagination(
  'SELECT * FROM customers',
  [],
  0,      // offset
  1000    // limit
);

// Stream large datasets
for await (const record of sourceDb.streamQuery(
  'SELECT * FROM orders',
  5000    // batchSize
)) {
  console.log(record);
}

// Get table schema
const schema = await sourceDb.getTableSchema('customers');
console.log(schema);
// [
//   { name: 'id', type: 'integer', nullable: false, primaryKey: true },
//   { name: 'name', type: 'text', nullable: false, primaryKey: false },
//   ...
// ]

// Count records
const count = await sourceDb.count('customers');
```

### Staging Database

```typescript
// Insert records
const inserted = await stagingDb.insert('staging_customers', [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
]);

// Update records
const updated = await stagingDb.update(
  'staging_customers',
  [{ id: 1, name: 'John Updated' }],
  'id'  // primary key column
);

// Delete records
const deleted = await stagingDb.delete(
  'staging_customers',
  'email IS NULL'
);

// Truncate table
await stagingDb.truncate('staging_customers');

// Create table
await stagingDb.createTable('staging_customers', [
  { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
  { name: 'name', type: 'TEXT', nullable: false },
  { name: 'email', type: 'TEXT', nullable: true }
]);

// Drop table
await stagingDb.dropTable('staging_customers');
```

### Target Database

```typescript
// Upsert records (insert or update based on unique key)
const result = await targetDb.upsert(
  'customers',
  [
    { id: 1, name: 'John', email: 'john@example.com', status: 'active' }
  ],
  ['id']  // unique key columns
);
// { inserted: 0, updated: 1 }

// Insert with explicit transaction
const transaction = await targetDb.beginTransaction();
try {
  await transaction.query('INSERT INTO customers VALUES ...');
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

## Field Mapper API

```typescript
const mapper = new FieldMapper();

const mappings = [
  {
    sourceField: 'cust_id',
    targetField: 'customer_id',
    transform: 'toNumber',
    required: true
  },
  {
    sourceField: 'cust_name',
    targetField: 'name',
    required: true
  },
  {
    sourceField: 'created',
    targetField: 'createdAt',
    transform: 'toISOString'
  },
  {
    sourceField: 'status_code',
    targetField: 'status',
    defaultValue: 'INACTIVE'
  }
];

const sourceRecord = {
  cust_id: '123',
  cust_name: 'John Doe',
  created: '2024-01-15',
  status_code: 'A'
};

const mapped = await mapper.map(sourceRecord, mappings);
console.log(mapped);
// {
//   customer_id: 123,
//   name: 'John Doe',
//   createdAt: '2024-01-15T00:00:00.000Z',
//   status: 'A'
// }
```

## Translation Mapper API

```typescript
const translator = new TranslationMapper();

// Load translation tables into cache
await translator.loadTranslationTable(
  'status_codes',
  'source_code',
  'target_code',
  [
    { source_code: 'A', target_code: 'ACTIVE' },
    { source_code: 'I', target_code: 'INACTIVE' },
    { source_code: 'S', target_code: 'SUSPENDED' }
  ]
);

// Translate a single value
const targetValue = await translator.translateValue(
  'status_codes',
  'source_code',
  'target_code',
  'A'
);
console.log(targetValue); // 'ACTIVE'

// Apply translations to record
const record = { status: 'A', country: 'US' };
const mapped = await translator.map(record, [
  {
    sourceField: 'status',
    targetField: 'status',
    lookupTable: 'status_codes',
    lookupSourceColumn: 'source_code',
    lookupTargetColumn: 'target_code'
  }
]);
```

## State Manager API

```typescript
const stateManager = new StateManager();

// Save state
await stateManager.saveState(jobId, {
  jobId,
  status: 'running',
  stage: 'transformation',
  progress: {
    totalRecords: 50000,
    processedRecords: 25000,
    successfulRecords: 24950,
    failedRecords: 50
  },
  startedAt: new Date(),
  updatedAt: new Date()
});

// Get state
const state = await stateManager.getState(jobId);

// List all states
const allStates = await stateManager.listStates();

// Delete state
await stateManager.deleteState(jobId);
```

## Audit Logger API

```typescript
const auditLogger = new AuditLogger();

// Log conversion event
await auditLogger.logConversion(jobId, {
  sourceTable: 'src_customers',
  targetTable: 'customers',
  recordsProcessed: 50000,
  status: 'success',
  duration: 125000
});

// Get audit log for job
const logs = await auditLogger.getJobAuditLog(jobId);

// Get all audit logs
const allLogs = await auditLogger.getAllAuditLogs();
```

---

For full examples, see `/examples` directory.
