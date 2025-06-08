package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/awscommunity/builders_apps/labelprinter/internal/printer"
	"gopkg.in/yaml.v3"
)

type LabelMessage struct {
	printer.LabelData
	PrinterID string `json:"printer_id"`
}

type PrinterConfig struct {
	ID  string `yaml:"id"`
	IP  string `yaml:"ip"`
	Tag string `yaml:"tag,omitempty"`
}

type Config struct {
	QueueURL  string         `yaml:"queue_url"`
	BaseURL   string         `yaml:"base_url"`
	Printers  []PrinterConfig `yaml:"printers"`
}

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

func main() {
	// Parse command line flags
	queueURL := flag.String("queue-url", "", "SQS queue URL to read from")
	printerIPs := flag.String("printer-ips", "", "Comma-separated list of printer IPs (e.g., 'printer1:192.168.1.100,printer2:192.168.1.101')")
	configPath := flag.String("config", "", "Path to printer configuration file (YAML)")
	baseURL := flag.String("base-url", "", "Base URL for QR code generation")
	flag.Parse()

	// Load config if provided
	var cfg *Config
	if *configPath != "" {
		var err error
		cfg, err = loadConfig(*configPath)
		if err != nil {
			log.Fatalf("Failed to load config file: %v", err)
		}
	}

	// Use queue URL from config if available, otherwise from command line
	queueURLToUse := *queueURL
	if queueURLToUse == "" && cfg != nil {
		queueURLToUse = cfg.QueueURL
	}
	if queueURLToUse == "" {
		log.Fatal("queue-url must be provided either via --queue-url flag or in config file")
	}

	// Use base URL from config if available, otherwise from command line
	baseURLToUse := *baseURL
	if baseURLToUse == "" && cfg != nil {
		baseURLToUse = cfg.BaseURL
	}
	if baseURLToUse == "" {
		log.Fatal("base-url must be provided either via --base-url flag or in config file")
	}

	// Create printer manager
	printerManager := printer.NewPrinterManager()

	// Load printers from config file if provided
	if cfg != nil {
		for _, printer := range cfg.Printers {
			if err := printerManager.AddPrinter(printer.ID, printer.IP); err != nil {
				log.Fatalf("Failed to add printer %s: %v", printer.ID, err)
			}
		}
	} else if *printerIPs != "" {
		// Fallback to command line printer definitions
		for _, printerDef := range strings.Split(*printerIPs, ",") {
			parts := strings.Split(printerDef, ":")
			if len(parts) != 2 {
				log.Fatalf("Invalid printer definition: %s. Expected format: 'id:ip'", printerDef)
			}
			if err := printerManager.AddPrinter(parts[0], parts[1]); err != nil {
				log.Fatalf("Failed to add printer %s: %v", parts[0], err)
			}
		}
	} else {
		log.Fatal("Either --config or --printer-ips must be provided")
	}

	defer printerManager.Close()

	// Create label generator with base URL
	labelGen := printer.NewZPLLabelGenerator(baseURLToUse)

	// Load AWS configuration
	awsCfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("Unable to load SDK config: %v", err)
	}

	// Create SQS client
	client := sqs.NewFromConfig(awsCfg)

	// Create context that can be cancelled
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("Shutting down...")
		cancel()
	}()

	log.Printf("Starting to read from queue: %s", queueURLToUse)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Receive message from SQS
			result, err := client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
				QueueUrl:            &queueURLToUse,
				MaxNumberOfMessages: 1,
				WaitTimeSeconds:     20,
			})
			if err != nil {
				log.Printf("Error receiving message: %v", err)
				continue
			}

			// Process messages
			for _, message := range result.Messages {
				// Parse label data from message body
				var labelMsg LabelMessage
				if err := json.Unmarshal([]byte(*message.Body), &labelMsg); err != nil {
					log.Printf("Error parsing message body: %v", err)
					continue
				}

				// Generate ZPL code
				zplCommand := labelGen.GenerateZPL(labelMsg.LabelData)

				// Print label to specified printer
				if err := printerManager.PrintLabel(labelMsg.PrinterID, zplCommand); err != nil {
					log.Printf("Error printing label to printer %s: %v", labelMsg.PrinterID, err)
					continue
				}

				// Delete message from queue
				_, err := client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
					QueueUrl:      &queueURLToUse,
					ReceiptHandle: message.ReceiptHandle,
				})
				if err != nil {
					log.Printf("Error deleting message: %v", err)
				}

				log.Printf("Successfully printed label for: %s on printer: %s", labelMsg.Name, labelMsg.PrinterID)
			}
		}
	}
} 