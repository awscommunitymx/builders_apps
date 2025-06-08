# Label Printer

A service that reads from an SQS FIFO queue and prints labels on Zebra printers.

## Configuration

The service can be configured using a YAML file. Here's an example configuration:

```yaml
queue_url: https://sqs.region.amazonaws.com/account-id/queue-name.fifo
printers:
  - id: printer1
    ip: 192.168.1.100
    tag: entrance
  - id: printer2
    ip: 192.168.1.101
    tag: exit
```

## Message Format

Messages in the SQS queue should be JSON objects with the following structure:

```json
{
  "name": "John Doe",
  "company": "AWS Community Builders",
  "role": "Software Engineer",
  "employee_id": "EMP123",
  "printer_id": "printer1"
}
```

### Message Fields

- `name`: The person's name to print on the label
- `company`: The company name
- `role`: The person's role or title
- `employee_id`: Unique identifier (will be encoded in QR code)
- `printer_id`: ID of the printer to use (must match an ID in the config)

### Sending Messages

Since this uses a FIFO queue, messages must be sent with a message group ID and deduplication ID:

```bash
aws sqs send-message \
  --queue-url "https://sqs.region.amazonaws.com/account-id/queue-name.fifo" \
  --message-body '{"name":"John Doe","company":"AWS Community Builders","role":"Software Engineer","employee_id":"EMP123","printer_id":"printer1"}' \
  --message-group-id "labels" \
  --message-deduplication-id "EMP123"
```

## Running the Service

```bash
# Using config file
go run cmd/main.go -config config.yaml

# Using command line flags
go run cmd/main.go -queue-url "https://sqs.region.amazonaws.com/account-id/queue-name.fifo" -printer-ips "printer1:192.168.1.100,printer2:192.168.1.101"
```

## Requirements

- Go 1.21 or later
- AWS credentials configured
- Zebra printer(s) with network connectivity
