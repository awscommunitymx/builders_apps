package printer

import (
	"fmt"
	"net"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// LabelData represents the data for a single label
type LabelData struct {
	Name       string `json:"name"`
	Company    string `json:"company"`
	Role       string `json:"role"`
	EmployeeID string `json:"employee_id"`
}

// ZPLLabelGenerator handles label generation and printing
type ZPLLabelGenerator struct {
	labelWidth  int
	labelHeight int
	baseURL     string
}

// NewZPLLabelGenerator creates a new label generator
func NewZPLLabelGenerator(baseURL string) *ZPLLabelGenerator {
	return &ZPLLabelGenerator{
		labelWidth:  609, // 3 inches * 203 DPI
		labelHeight: 406, // 2 inches * 203 DPI
		baseURL:     baseURL,
	}
}

// normalizeText removes accents and normalizes text for ZPL compatibility
func (g *ZPLLabelGenerator) normalizeText(text string) string {
	// First decompose the text into base characters and accents
	normalized := strings.Map(func(r rune) rune {
		switch r {
		case 'á', 'à', 'ã', 'â', 'ä', 'Á', 'À', 'Ã', 'Â', 'Ä':
			return 'a'
		case 'é', 'è', 'ê', 'ë', 'É', 'È', 'Ê', 'Ë':
			return 'e'
		case 'í', 'ì', 'î', 'ï', 'Í', 'Ì', 'Î', 'Ï':
			return 'i'
		case 'ó', 'ò', 'õ', 'ô', 'ö', 'Ó', 'Ò', 'Õ', 'Ô', 'Ö':
			return 'o'
		case 'ú', 'ù', 'û', 'ü', 'Ú', 'Ù', 'Û', 'Ü':
			return 'u'
		case 'ý', 'ÿ', 'Ý', 'Ÿ':
			return 'y'
		case 'ñ', 'Ñ':
			return 'n'
		case 'ç', 'Ç':
			return 'c'
		default:
			// For any other characters, remove the accent but keep the base character
			if unicode.Is(unicode.Mn, r) {
				return -1 // Remove the accent
			}
			return r
		}
	}, text)

	return normalized
}

// wrapText wraps text to fit within specified width
func (g *ZPLLabelGenerator) wrapText(text string, maxWidth, fontHeight, fontWidth int) []string {
	charsPerLine := maxWidth / (fontWidth / 2) // Conservative estimate

	if utf8.RuneCountInString(text) <= charsPerLine {
		return []string{text}
	}

	words := strings.Fields(text)
	lines := make([]string, 0, 2)
	currentLine := ""

	for _, word := range words {
		testLine := currentLine
		if testLine != "" {
			testLine += " "
		}
		testLine += word

		if utf8.RuneCountInString(testLine) <= charsPerLine {
			currentLine = testLine
		} else {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = word
			} else {
				// Single word is too long, truncate it
				currentLine = word[:charsPerLine-3] + "..."
			}

			// Limit to 2 lines maximum
			if len(lines) >= 1 {
				if currentLine != "" {
					lines = append(lines, currentLine)
				}
				break
			}
		}
	}

	if currentLine != "" && len(lines) < 2 {
		lines = append(lines, currentLine)
	}

	return lines[:min(len(lines), 2)]
}

// GenerateZPL generates ZPL code for a label
func (g *ZPLLabelGenerator) GenerateZPL(data LabelData) string {
	// Normalize text
	name := g.normalizeText(data.Name)
	company := g.normalizeText(data.Company)
	role := g.normalizeText(data.Role)

	// Calculate positions
	qrSize := 120
	qrX := g.labelWidth - qrSize - 100
	qrY := 60

	// ID text position - centered under QR code with more vertical space
	idX := qrX + (qrSize / 2)  // Adjusted from -35 to -40 for perfect centering
	idY := qrY + qrSize + 70  // Increased from 35 to 40 for optimal spacing

	// Text positions
	textX := 12
	maxTextWidth := qrX - textX - 15

	// Calculate positions
	nameStartY := 25
	nameLines := g.wrapText(name, maxTextWidth, 60, 45)
	companyLines := g.wrapText(company, maxTextWidth, 45, 35)
	roleLines := g.wrapText(role, maxTextWidth, 40, 30)

	companyStartY := nameStartY + (len(nameLines) * 65) + 15
	roleStartY := companyStartY + (len(companyLines) * 50) + 15

	// Build ZPL code
	var zpl strings.Builder
	zpl.WriteString(fmt.Sprintf("^XA\n^MMT\n^PW%d\n^LL%d\n^LS0\n\n", g.labelWidth, g.labelHeight))

	// Add name lines
	currentY := nameStartY
	for i, line := range nameLines {
		zpl.WriteString(fmt.Sprintf("REM *** Name Line %d ***\n", i+1))
		zpl.WriteString(fmt.Sprintf("^FO%d,%d^A0N,60,45^FD%s^FS\n\n", textX, currentY, line))
		currentY += 65
	}

	// Add company lines
	currentY = companyStartY
	for i, line := range companyLines {
		zpl.WriteString(fmt.Sprintf("REM *** Company Line %d ***\n", i+1))
		zpl.WriteString(fmt.Sprintf("^FO%d,%d^A0N,45,35^FD%s^FS\n\n", textX, currentY, line))
		currentY += 50
	}

	// Add role lines
	currentY = roleStartY
	for i, line := range roleLines {
		zpl.WriteString(fmt.Sprintf("REM *** Role Line %d ***\n", i+1))
		zpl.WriteString(fmt.Sprintf("^FO%d,%d^A0N,40,30^FD%s^FS\n\n", textX, currentY, line))
		currentY += 45
	}

	// Create the full URL for the QR code
	fullURL := fmt.Sprintf("%s%s", g.baseURL, data.EmployeeID)

	// Add QR code and ID with reduced error correction level (L instead of M)
	zpl.WriteString(fmt.Sprintf("REM *** QR Code ***\n^FO%d,%d^BQN,2,5^FDQA,%s^FS\n\n", qrX, qrY, fullURL))
	zpl.WriteString(fmt.Sprintf("REM *** Employee ID ***\n^FO%d,%d^A0N,28,22^FD%s^FS\n\n^XZ", idX, idY, data.EmployeeID))

	return zpl.String()
}

// PrinterConnection manages a single TCP connection to the printer
type PrinterConnection struct {
	conn      net.Conn
	printerIP string
}

// NewPrinterConnection creates a new printer connection
func NewPrinterConnection(printerIP string) (*PrinterConnection, error) {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:9100", printerIP), 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to printer: %v", err)
	}
	return &PrinterConnection{
		conn:      conn,
		printerIP: printerIP,
	}, nil
}

// Close closes the printer connection
func (p *PrinterConnection) Close() error {
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}

// PrintLabel sends a ZPL command to the printer using the existing connection
func (p *PrinterConnection) PrintLabel(zplCommand string) error {
	if p.conn == nil {
		return fmt.Errorf("printer connection is not established")
	}

	_, err := p.conn.Write([]byte(zplCommand))
	if err != nil {
		// If there's an error, try to reconnect once
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:9100", p.printerIP), 10*time.Second)
		if err != nil {
			return fmt.Errorf("failed to reconnect to printer: %v", err)
		}
		p.conn.Close()
		p.conn = conn

		// Try writing again with the new connection
		_, err = p.conn.Write([]byte(zplCommand))
		if err != nil {
			return fmt.Errorf("failed to send data to printer after reconnection: %v", err)
		}
	}

	return nil
}

// PrinterManager manages multiple printer connections
type PrinterManager struct {
	printers map[string]*PrinterConnection
}

// NewPrinterManager creates a new printer manager
func NewPrinterManager() *PrinterManager {
	return &PrinterManager{
		printers: make(map[string]*PrinterConnection),
	}
}

// AddPrinter adds a new printer with a specific tag
func (pm *PrinterManager) AddPrinter(tag, ip string) error {
	if _, exists := pm.printers[tag]; exists {
		return fmt.Errorf("printer with tag %s already exists", tag)
	}

	conn, err := NewPrinterConnection(ip)
	if err != nil {
		return fmt.Errorf("failed to add printer %s: %v", tag, err)
	}

	pm.printers[tag] = conn
	fmt.Printf("Added printer %s (%s)\n", tag, ip)
	return nil
}

// RemovePrinter removes a printer by its tag
func (pm *PrinterManager) RemovePrinter(tag string) error {
	if printer, exists := pm.printers[tag]; exists {
		printer.Close()
		delete(pm.printers, tag)
		fmt.Printf("Removed printer %s\n", tag)
		return nil
	}
	return fmt.Errorf("printer with tag %s not found", tag)
}

// PrintLabel sends a ZPL command to a specific printer
func (pm *PrinterManager) PrintLabel(tag, zplCommand string) error {
	printer, exists := pm.printers[tag]
	if !exists {
		return fmt.Errorf("printer with tag %s not found", tag)
	}
	return printer.PrintLabel(zplCommand)
}

// Close closes all printer connections
func (pm *PrinterManager) Close() {
	for tag, printer := range pm.printers {
		printer.Close()
		delete(pm.printers, tag)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
} 