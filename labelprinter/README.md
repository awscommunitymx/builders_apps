# Label Printer

A Go application for managing and printing labels to Zebra printers using ZPL commands.

## Features

- Support for multiple printers with tags
- Concurrent label printing using channels
- Automatic reconnection handling
- Accent normalization for ZPL compatibility
- QR code generation
- Text wrapping and formatting

## Project Structure

```
labelprinter/
├── cmd/
│   └── labelprinter/
│       └── main.go         # Main application entry point
├── internal/
│   └── printer/
│       └── printer.go      # Core printer functionality
├── go.mod                  # Go module file
└── README.md              # This file
```

## Usage

1. Initialize the printer manager:

```go
printerManager := printer.NewPrinterManager()
defer printerManager.Close()
```

2. Add printers with tags:

```go
err := printerManager.AddPrinter("P1", "10.20.25.10")
if err != nil {
    // Handle error
}
```

3. Create a label:

```go
label := printer.LabelData{
    Name:       "John Doe",
    Company:    "Example Corp",
    Role:       "Software Engineer",
    EmployeeID: "JD123",
}
```

4. Print the label:

```go
generator := printer.NewZPLLabelGenerator()
zplCode := generator.GenerateZPL(label)
err := printerManager.PrintLabel("P1", zplCode)
```

## Building

```bash
go build -o labelprinter ./cmd/labelprinter
```

## Running

```bash
./labelprinter
```

## Future Improvements

- Add support for different label sizes
- Implement printer status monitoring
- Add support for different ZPL commands
- Add configuration file support
- Add queue integration
- Add printer discovery
- Add printer status monitoring
- Add support for different label formats
