# Best Practices & Guidelines

## Performance Optimization

### Batch Size Tuning

```typescript
// Optimal batch size for most cases
const config = { batchSize: 5000 };
```

### Index Strategy

```sql
CREATE INDEX idx_customers_status ON customers(status);
CREATE UNIQUE INDEX idx_customers_id ON customers(customer_id);
```

## Error Handling

```typescript
if (result.status === 'partial_success') {
  logger.warn(`${result.recordsFailed} records failed`);
}
```

## Data Validation

```typescript
const validationRules = [
  {
    name: 'required_email',
    level: 'target',
    condition: (record) => record.email != null
  }
];
```
