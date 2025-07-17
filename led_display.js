// LED Display Controller for CH340 Serial Converter
// Device ID: 1a86:7523 QinHeng Electronics CH340 serial converter

class LEDDisplayController {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.reader = null;
    this.writer = null;
  }

  // Check if Web Serial API is supported
  isSerialSupported() {
    return "serial" in navigator;
  }

  // Connect to the LED display
  async connect() {
    try {
      console.log("Starting LED display connection...");

      if (!this.isSerialSupported()) {
        throw new Error(
          "Web Serial API is not supported in this browser. Please use Chrome or Edge."
        );
      }

      console.log("Web Serial API is supported");

      // First try without filters (let user select any device)
      console.log("Requesting serial port...");
      this.port = await navigator.serial.requestPort({
        // Try without filters first to see all available devices
        // filters: [
        //   { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340 serial converter
        // ],
      });

      console.log("Port selected:", this.port);
      console.log("Port info:", {
        vendorId: this.port.getInfo().usbVendorId,
        productId: this.port.getInfo().usbProductId,
      });

      // Try different common baud rates for LED displays
      const baudRates = [9600, 115200, 57600, 38400, 19200, 4800, 2400, 1200];
      let connected = false;

      for (const baudRate of baudRates) {
        try {
          console.log(`Trying to open port with baud rate: ${baudRate}`);

          // Close port if it was previously opened
          if (this.port.readable || this.port.writable) {
            try {
              await this.port.close();
            } catch (e) {
              console.log("Port was not open");
            }
          }

          // Open the serial port with different settings
          await this.port.open({
            baudRate: baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            flowControl: "none",
          });

          console.log(`Successfully opened port with baud rate: ${baudRate}`);

          // Set up reader and writer
          this.reader = this.port.readable.getReader();
          this.writer = this.port.writable.getWriter();

          this.isConnected = true;
          this.currentBaudRate = baudRate;
          connected = true;
          break;
        } catch (error) {
          console.warn(`Failed to open with baud rate ${baudRate}:`, error);
          continue;
        }
      }

      if (!connected) {
        throw new Error("Failed to connect with any supported baud rate");
      }

      console.log(
        `LED Display connected successfully with baud rate: ${this.currentBaudRate}`
      );
      return true;
    } catch (error) {
      console.error("Error connecting to LED display:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Disconnect from the LED display
  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        await this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.releaseLock();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.isConnected = false;
      console.log("LED Display disconnected");
      return true;
    } catch (error) {
      console.error("Error disconnecting LED display:", error);
      throw error;
    }
  }

  // Send a message to the LED display
  async sendMessage(message, options = {}) {
    if (!this.isConnected || !this.writer) {
      throw new Error("LED display is not connected");
    }

    try {
      console.log(`Sending message: "${message}" with options:`, options);

      // Default options
      const settings = {
        speed: "normal", // slow, normal, fast
        effect: "scroll", // scroll, flash, static
        position: "left", // left, center, right
        brightness: "high", // low, medium, high
        ...options,
      };

      // Try multiple command formats
      const commandFormats = [
        () => this.buildCommand(message, settings),
        () => this.buildSimpleCommand(message, settings),
        () => this.buildAlternativeCommand(message, settings),
        () => this.buildRawCommand(message),
      ];

      let success = false;
      for (let i = 0; i < commandFormats.length; i++) {
        try {
          const command = commandFormats[i]();
          console.log(`Trying command format ${i + 1}: "${command}"`);
          console.log(
            "Command bytes:",
            Array.from(new TextEncoder().encode(command)).map(
              (b) => "0x" + b.toString(16).padStart(2, "0")
            )
          );

          // Convert string to Uint8Array
          const encoder = new TextEncoder();
          const data = encoder.encode(command);

          // Send the command
          await this.writer.write(data);
          console.log(`Command format ${i + 1} sent successfully`);
          success = true;
          break;
        } catch (error) {
          console.warn(`Command format ${i + 1} failed:`, error);
          continue;
        }
      }

      if (!success) {
        throw new Error("All command formats failed");
      }

      console.log(`Message sent to LED display: "${message}"`);
      return true;
    } catch (error) {
      console.error("Error sending message to LED display:", error);
      throw error;
    }
  }

  // Build command string for LED display (generic protocol)
  buildCommand(message, settings) {
    // This is a generic command structure - you may need to adjust based on your specific LED display model
    let command = "";

    // Start of transmission
    command += "\x01"; // SOH (Start of Header)

    // Address (usually 01 for single display)
    command += "01";

    // Effect codes (adjust based on your display's protocol)
    switch (settings.effect) {
      case "scroll":
        command += "A";
        break;
      case "flash":
        command += "B";
        break;
      case "static":
        command += "C";
        break;
      default:
        command += "A";
    }

    // Speed codes
    switch (settings.speed) {
      case "slow":
        command += "1";
        break;
      case "normal":
        command += "2";
        break;
      case "fast":
        command += "3";
        break;
      default:
        command += "2";
    }

    // Position codes
    switch (settings.position) {
      case "left":
        command += "L";
        break;
      case "center":
        command += "C";
        break;
      case "right":
        command += "R";
        break;
      default:
        command += "L";
    }

    // Message text
    command += message;

    // End of transmission
    command += "\x04"; // EOT (End of Transmission)
    command += "\r\n"; // Carriage return and line feed

    return command;
  }

  // Simple command format (just message with basic framing)
  buildSimpleCommand(message, settings) {
    return `<ID01><${settings.effect
      .toUpperCase()
      .charAt(0)}>${message}<E>\r\n`;
  }

  // Alternative command format
  buildAlternativeCommand(message, settings) {
    // Format: STX + Address + Command + Message + ETX
    let command = "\x02"; // STX (Start of Text)
    command += "01"; // Address

    // Command based on effect
    switch (settings.effect) {
      case "scroll":
        command += "A1";
        break;
      case "flash":
        command += "B1";
        break;
      case "static":
        command += "C1";
        break;
      default:
        command += "A1";
    }

    command += message;
    command += "\x03"; // ETX (End of Text)
    command += "\r\n";

    return command;
  }

  // Raw command format (just the message)
  buildRawCommand(message) {
    return message + "\r\n";
  }

  // Clear the display
  async clearDisplay() {
    return await this.sendMessage("", { effect: "static" });
  }

  // Send a simple text message with default settings
  async displayText(text) {
    return await this.sendMessage(text, {
      effect: "scroll",
      speed: "normal",
      position: "left",
    });
  }

  // Send a flashing message
  async displayFlashing(text) {
    return await this.sendMessage(text, {
      effect: "flash",
      speed: "normal",
      position: "center",
    });
  }

  // Send a static (non-moving) message
  async displayStatic(text) {
    return await this.sendMessage(text, {
      effect: "static",
      position: "center",
    });
  }

  // Alternative command format for different LED display types
  async sendAlternativeCommand(message, mode = "A") {
    if (!this.isConnected || !this.writer) {
      throw new Error("LED display is not connected");
    }

    try {
      // Alternative command format (common for some Chinese LED displays)
      let command = `<ID01><${mode}>${message}<E>`;

      const encoder = new TextEncoder();
      const data = encoder.encode(command);

      await this.writer.write(data);
      console.log(`Alternative command sent: "${command}"`);
      return true;
    } catch (error) {
      console.error("Error sending alternative command:", error);
      throw error;
    }
  }

  // Test connection by sending a test message
  async testConnection() {
    try {
      await this.sendMessage("TEST CONNECTION", {
        effect: "flash",
        speed: "fast",
        position: "center",
      });

      // Wait 3 seconds then clear
      setTimeout(async () => {
        try {
          await this.clearDisplay();
        } catch (error) {
          console.error("Error clearing test message:", error);
        }
      }, 3000);

      return true;
    } catch (error) {
      console.error("Test connection failed:", error);
      throw error;
    }
  }

  // Debug method to check connection and try various commands
  async debugConnection() {
    console.log("=== LED Display Debug Information ===");

    if (!this.isSerialSupported()) {
      console.error("Web Serial API not supported");
      return false;
    }

    if (!this.port) {
      console.error("No port selected");
      return false;
    }

    console.log("Port info:", this.port.getInfo());
    console.log("Port readable:", !!this.port.readable);
    console.log("Port writable:", !!this.port.writable);
    console.log("Is connected:", this.isConnected);
    console.log("Current baud rate:", this.currentBaudRate);

    if (!this.isConnected) {
      console.error("Not connected to display");
      return false;
    }

    // Try sending simple test commands
    const testCommands = [
      "HELLO\r\n",
      "<ID01><A>TEST<E>\r\n",
      "\x01" + "01" + "A" + "2" + "L" + "DEBUG" + "\x04" + "\r\n",
      "\x02" + "01" + "A1" + "CHECK" + "\x03" + "\r\n",
    ];

    for (let i = 0; i < testCommands.length; i++) {
      try {
        console.log(`Sending debug command ${i + 1}: "${testCommands[i]}"`);
        const encoder = new TextEncoder();
        const data = encoder.encode(testCommands[i]);
        console.log(
          "Command bytes:",
          Array.from(data).map((b) => "0x" + b.toString(16).padStart(2, "0"))
        );

        await this.writer.write(data);
        console.log(`Debug command ${i + 1} sent successfully`);

        // Wait a bit between commands
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Debug command ${i + 1} failed:`, error);
      }
    }

    return true;
  }
}

// Global LED display controller instance
const ledDisplay = new LEDDisplayController();

// Export for use in other files if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = LEDDisplayController;
}
