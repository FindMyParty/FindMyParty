// Boot sequence follows CLAUDE.md order:
// 1. Initialize OpenTelemetry SDK (must be first)
// 2. Validate env vars
// 3. Connect database
// 4. Connect RabbitMQ
// 5. Register queue subscribers
// 6. Start HTTP server
// 7. Handle SIGTERM and SIGINT — graceful shutdown
