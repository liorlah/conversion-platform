# Troubleshooting Guide

## Common Issues

### Connection Issues

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Verify database is running and credentials are correct.

### Memory Issues

```
FATAL ERROR: Allocation failed - JavaScript heap out of memory
```

**Solution:** Reduce batch size or increase Node.js heap size.

### Data Quality Issues

**Solution:** Review mapping configuration and validation rules.
