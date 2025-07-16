// Global variable to store the connected printer device
let printerDevice = null;

// Add this function after the global variables

async function checkPrinterAccess() {
  try {
    const devices = await navigator.usb.getDevices();
    console.log("Devices:", devices);
    // If we can access any previously authorized devices, permissions are working
    if (devices.length > 0) {
      return { hasPermission: true };
    }
    const opSt = await devices[0].open();
    console.log("OpSt:", opSt);
    console.log("Devices2:", devices);

    return { hasPermission: false, reason: "no-devices" };
  } catch (error) {
    return {
      hasPermission: false,
      reason: "system-permission",
      error: error,
    };
  }
}

// DOM elements
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const testPrintBtn = document.getElementById("testPrintBtn");
const printCustomBtn = document.getElementById("printCustomBtn");
const customText = document.getElementById("customText");
const statusDiv = document.getElementById("status");
const openDrawerBtn = document.getElementById("openDrawerBtn");

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Check if WebUSB is available
  if (!navigator.usb) {
    statusDiv.textContent = "WebUSB not supported in this browser.";
    connectBtn.disabled = true;
  }
});

// Connect to printer button click handler
connectBtn.addEventListener("click", async () => {
  try {
    // Check permissions first
    const accessStatus = await checkPrinterAccess();

    if (
      !accessStatus.hasPermission &&
      accessStatus.reason === "system-permission"
    ) {
      const guidance = document.createElement("div");
      guidance.innerHTML = `
            <div class="permission-guide">
                <p>⚠️ USB access is restricted. Please ensure:</p>
                <ul>
                    <li>You're using a supported browser (Chrome, Edge)</li>
                    <li>The site is using HTTPS or localhost</li>
                    <li>On Linux: You have proper USB permissions</li>
                </ul>
                <button id="showPermissionHelp">Show Linux Permission Fix</button>
            </div>
        `;

      statusDiv.appendChild(guidance);
      document.getElementById("showPermissionHelp").onclick = () => {
        alert(
          "Run these commands in terminal:\n\n" +
            "sudo usermod -a -G dialout,lp $USER\n" +
            "sudo udevadm control --reload-rules\n" +
            "sudo udevadm trigger\n\n" +
            "Then log out and log back in."
        );
      };
      return;
    }

    // Existing connection code
    printerDevice = await navigator.usb.requestDevice({
      filters: [
        // 04b8:0202
        { vendorId: 0x04b8, productId: 0x0202 }, // Epson TM printer
        { vendorId: 0x0416, productId: 0x5011 }, // Bixolon
        { vendorId: 0x067b, productId: 0x2305 }, // Prolific
        { vendorId: 0x0fe6, productId: 0x811e }, // Sewoo
        { vendorId: 0x0483, productId: 0x5740 }, // STMicroelectronics
      ],
    });

    // Open the device
    await printerDevice.open();

    // Select configuration (most printers use configuration 1)
    if (printerDevice.configuration === null) {
      await printerDevice.selectConfiguration(1);
    }

    // Claim the interface (most printers use interface 0)
    await printerDevice.claimInterface(0);

    // Update UI
    statusDiv.textContent = `Printer: Connected (${
      printerDevice.productName || "Unknown"
    })`;

    statusDiv.className = "status connected";
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    testPrintBtn.disabled = false;
    printCustomBtn.disabled = false;
    if (openDrawerBtn) {
      openDrawerBtn.disabled = false;
    }
    if (document.getElementById("diagnoseBtn")) {
      document.getElementById("diagnoseBtn").disabled = false;
    }

    console.log("Printer connected:", printerDevice);
  } catch (error) {
    console.error("Error connecting to printer:", error);

    let errorMessage = "";
    let showPermissionGuide = false;

    if (error instanceof SecurityError) {
      errorMessage = "USB access denied. Please check your permissions.";
      showPermissionGuide = true;
    } else if (error instanceof NotFoundError) {
      errorMessage =
        "No compatible printer found. Please check the connection.";
    } else {
      errorMessage = error.message;
    }

    // Create error message element
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = `Error: ${errorMessage}`;

    // Clear previous status
    statusDiv.textContent = "";
    statusDiv.appendChild(errorDiv);

    if (showPermissionGuide) {
      const permissionGuide = document.createElement("div");
      permissionGuide.innerHTML = `
            <div class="permission-guide">
                <p>📋 To fix USB permissions on Linux:</p>
                <ol>
                    <li>Open terminal and run these commands:</li>
                    <pre><code>sudo gpasswd -a $USER dialout
sudo gpasswd -a $USER lp
sudo usermod -a -G plugdev $USER
sudo udevadm control --reload-rules
sudo udevadm trigger</code></pre>
                    <li>Log out and log back in</li>
                    <li>Reconnect your printer</li>
                </ol>
                <p><small>Note: These changes require a session restart to take effect.</small></p>
            </div>
        `;
      statusDiv.appendChild(permissionGuide);
    }

    statusDiv.className = "status disconnected";
  }
});

// Disconnect button click handler
disconnectBtn.addEventListener("click", async () => {
  try {
    if (printerDevice) {
      // Release the interface
      await printerDevice.releaseInterface(0);
      // Close the device
      await printerDevice.close();
      printerDevice = null;
    }

    // Update UI
    statusDiv.textContent = "Printer: Not Connected";
    statusDiv.className = "status disconnected";
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    testPrintBtn.disabled = true;
    printCustomBtn.disabled = true;
    if (openDrawerBtn) {
      openDrawerBtn.disabled = true;
    }
    if (document.getElementById("diagnoseBtn")) {
      document.getElementById("diagnoseBtn").disabled = true;
    }

    console.log("Printer disconnected");
  } catch (error) {
    console.error("Error disconnecting printer:", error);
    statusDiv.textContent = `Error: ${error.message}`;
  }
});

// Diagnose printer button click handler
document.getElementById("diagnoseBtn").addEventListener("click", async () => {
  await diagnosePrinter();
});

// Open drawer button click handler
if (openDrawerBtn) {
  openDrawerBtn.addEventListener("click", async () => {
    await forceOpenDrawer();
  });
}

async function diagnosePrinter() {
  if (!printerDevice) {
    statusDiv.textContent = "Printer not connected. Cannot run diagnostics.";
    console.error("Diagnostics failed: Printer not connected.");
    return;
  }

  console.group("Printer Diagnostics");
  statusDiv.textContent = "Running diagnostics... Check the console (F12).";

  console.log("Device Info:", {
    name: printerDevice.productName,
    manufacturer: printerDevice.manufacturerName,
    vendorId: `0x${printerDevice.vendorId.toString(16).padStart(4, "0")}`,
    productId: `0x${printerDevice.productId.toString(16).padStart(4, "0")}`,
    serialNumber: printerDevice.serialNumber,
  });

  console.log("Full Device Configuration:", printerDevice.configuration);

  if (printerDevice.configuration) {
    console.log(
      `Found ${printerDevice.configuration.interfaces.length} interfaces.`
    );
    printerDevice.configuration.interfaces.forEach((iface, i) => {
      console.group(
        `Interface ${i} (Interface Number: ${iface.interfaceNumber})`
      );
      console.log(`  - Claimed: ${iface.claimed}`);
      console.log(`  - Alternates: ${iface.alternates.length}`);
      iface.alternates.forEach((alt, j) => {
        console.group(`  Alternate ${j}`);
        console.log(`    - Alternate Setting: ${alt.alternateSetting}`);
        console.log(`    - Interface Class: ${alt.interfaceClass}`);
        console.log(`    - Interface Subclass: ${alt.interfaceSubclass}`);
        console.log(`    - Interface Protocol: ${alt.interfaceProtocol}`);
        console.log(`    - Endpoints: ${alt.endpoints.length}`);
        alt.endpoints.forEach((ep, k) => {
          console.log(`      Endpoint ${k}:`, {
            number: ep.endpointNumber,
            direction: ep.direction,
            type: ep.type,
            packetSize: ep.packetSize,
          });
        });
        console.groupEnd();
      });
      console.groupEnd();
    });
  } else {
    console.warn(
      "Device configuration is null. The device might not be properly initialized."
    );
  }

  console.groupEnd();
  statusDiv.textContent =
    "Diagnostics complete. Check the console for details.";
}

async function forceOpenDrawer() {
  if (!printerDevice) {
    statusDiv.textContent = "Printer not connected";
    console.warn("Cannot open drawer, printer not connected.");
    return;
  }

  console.group("Force Opening Cash Drawer");
  statusDiv.textContent = "Sending open commands... Check console for details.";

  try {
    // Send the specific cash drawer command directly
    const command = new Uint8Array([0x1b, 0x70, 0x30, 0x42, 0x45]); // \u001B\u0070\u0030\u0042\u0045

    // Find the bulk out endpoint for direct command
    const interface = printerDevice.configuration.interfaces[0];
    const endpoint = interface.alternate.endpoints.find(
      (e) => e.direction === "out" && e.type === "bulk"
    );

    if (!endpoint) {
      throw new Error("Could not find bulk out endpoint");
    }

    // Send the drawer command directly
    console.log(
      "Sending drawer command directly to endpoint",
      endpoint.endpointNumber
    );
    await printerDevice.transferOut(endpoint.endpointNumber, command);

    console.log("Cash drawer command sent successfully");
    statusDiv.textContent = "Cash drawer command sent. Check if drawer opened.";
    console.groupEnd();
    return;
  } catch (error) {
    console.error("Error sending drawer command:", error);
    statusDiv.textContent = `Error: ${error.message}`;

    // Fallback to the old method if direct command fails
    console.log("Trying fallback method...");
  }

  // The specific cash drawer command provided by the user.
  const drawerCommands = [
    {
      name: "Custom Drawer Command",
      cmd: new Uint8Array([0x1b, 0x70, 0x30, 0x42, 0x45]), // \u001B\u0070\u0030\u0042\u0045
    },
  ];

  const interfaces = printerDevice.configuration.interfaces;
  let commandSent = false;

  for (const iface of interfaces) {
    console.log(`Checking Interface #${iface.interfaceNumber}`);
    // Don't need to iterate alternates, claiming the interface selects the default.
    for (const endpoint of iface.alternate.endpoints) {
      if (endpoint.direction === "out") {
        console.log(
          `Found OUT endpoint #${endpoint.endpointNumber}. Trying all commands...`
        );
        try {
          // We must claim the interface to use it.
          await printerDevice.claimInterface(iface.interfaceNumber);
          console.log(
            `  Successfully claimed interface #${iface.interfaceNumber}.`
          );

          for (const drawerCmd of drawerCommands) {
            try {
              console.log(`    -> Sending command: ${drawerCmd.name}`);
              await printerDevice.transferOut(
                endpoint.endpointNumber,
                drawerCmd.cmd
              );
              commandSent = true;
            } catch (e) {
              console.warn(
                `    -> FAILED to send command ${drawerCmd.name} to endpoint ${endpoint.endpointNumber}:`,
                e.message
              );
            }
          }
          // Release the interface so other applications can use it.
          await printerDevice.releaseInterface(iface.interfaceNumber);
          console.log(`  Released interface #${iface.interfaceNumber}.`);
        } catch (e) {
          console.error(
            `Could not claim/release interface #${iface.interfaceNumber}:`,
            e.message
          );
          console.info(
            "This can happen if the OS or another program is using the device. On Linux, check udev rules. On Windows, a driver might be attached."
          );
        }
      }
    }
  }
  console.groupEnd();

  if (commandSent) {
    statusDiv.textContent =
      "All cash drawer commands sent. Check if drawer opened.";
    console.log("Finished sending all commands to all OUT endpoints.");
  } else {
    statusDiv.textContent =
      "Could not find any suitable endpoint to send commands.";
    console.error("No OUT endpoints found or interfaces could be claimed.");
  }
}

// Test print button click handler
testPrintBtn.addEventListener("click", async () => {
  if (!printerDevice) {
    statusDiv.textContent = "Printer not connected";
    return;
  }

  try {
    // ESC/POS commands for a test receipt
    const commands = new Uint8Array([
      0x1b,
      0x40, // Initialize printer
      0x1b,
      0x21,
      0x08, // Emphasized + Double height
      0x1d,
      0x21,
      0x01, // Double width
      ...textToUint8Array("TEST RECEIPT\n"),
      0x1b,
      0x21,
      0x00, // Cancel text style
      0x1d,
      0x21,
      0x00,
      ...textToUint8Array("----------------\n"),
      ...textToUint8Array("WebUSB Thermal Printer Demo\n\n"),
      ...textToUint8Array("This is a test receipt printed\n"),
      ...textToUint8Array("from a browser using WebUSB API\n\n"),
      ...textToUint8Array("Item 1       $10.00\n"),
      ...textToUint8Array("Item 2       $15.50\n"),
      ...textToUint8Array("Item 3        $5.25\n"),
      ...textToUint8Array("----------------\n"),
      ...textToUint8Array("TOTAL       $30.75\n\n"),
      0x1b,
      0x61,
      0x01, // Center align
      ...textToUint8Array("Thank you!\n"),
      0x1b,
      0x61,
      0x00, // Left align
      0x1b,
      0x69, // Full cut (may not work on all printers)
      0x1b,
      0x64,
      0x03, // Feed 3 lines
    ]);

    // Send the data
    await sendToPrinter(commands);

    statusDiv.textContent = "Test receipt printed successfully!";

    // Open drawer after printing with a small delay
    setTimeout(async () => {
      // Specific cash drawer command
      const drawerCommand = new Uint8Array([0x1b, 0x70, 0x30, 0x42, 0x45]); // \u001B\u0070\u0030\u0042\u0045
      await sendToPrinter(drawerCommand);
      console.log("Cash drawer command sent after printing");
    }, 500);
  } catch (error) {
    console.error("Error printing test receipt:", error);
    statusDiv.textContent = `Print error: ${error.message}`;
  }
});

// Print custom text button click handler
printCustomBtn.addEventListener("click", async () => {
  if (!printerDevice) {
    statusDiv.textContent = "Printer not connected";
    return;
  }

  const text = customText.value.trim();
  if (!text) {
    statusDiv.textContent = "Please enter some text to print";
    return;
  }

  try {
    // ESC/POS commands for custom text
    const commands = new Uint8Array([
      0x1b,
      0x40, // Initialize printer
      ...textToUint8Array(text + "\n\n"),
      0x1b,
      0x64,
      0x02, // Feed 2 lines
    ]);

    // Send the data
    await sendToPrinter(commands);

    statusDiv.textContent = "Custom text printed successfully!";

    // Open drawer after printing with a small delay
    setTimeout(async () => {
      // Specific cash drawer command
      const drawerCommand = new Uint8Array([0x1b, 0x70, 0x30, 0x42, 0x45]); // \u001B\u0070\u0030\u0042\u0045
      await sendToPrinter(drawerCommand);
      console.log("Cash drawer command sent after printing");
    }, 500);
  } catch (error) {
    console.error("Error printing custom text:", error);
    statusDiv.textContent = `Print error: ${error.message}`;
  }
});

// Helper function to send data to the printer
async function sendToPrinter(data) {
  // Find the bulk out endpoint (usually endpoint 1 or 2)
  const interface = printerDevice.configuration.interfaces[0];
  const endpoint = interface.alternate.endpoints.find(
    (e) => e.direction === "out" && e.type === "bulk"
  );

  if (!endpoint) {
    throw new Error("Could not find bulk out endpoint");
  }

  // Send the data in chunks to avoid USB packet size limits
  const chunkSize = endpoint.packetSize;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await printerDevice.transferOut(endpoint.endpointNumber, chunk);
  }
}

// Helper function to convert text to Uint8Array
function textToUint8Array(text) {
  const buffer = new ArrayBuffer(text.length);
  const bufferView = new Uint8Array(buffer);
  for (let i = 0; i < text.length; i++) {
    bufferView[i] = text.charCodeAt(i);
  }
  return bufferView;
}
