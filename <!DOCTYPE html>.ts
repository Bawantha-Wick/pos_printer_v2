<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebUSB Printer</title>
  </head>
  <body>
    <h1>WebUSB Printer Test</h1>
    <button id="connect">Connect to Printer</button>
    <button id="print" disabled>Print Test Message</button>
    <p id="status"></p>

    <script>
      let device;

      document.getElementById("connect").addEventListener("click", async () => {
        try {
          // Check WebUSB support
          if (!navigator.usb) {
            document.getElementById("status").textContent =
              "WebUSB not supported by this browser.";
            return;
          }

          // Request a USB device with specific vendor and product IDs
          device = await navigator.usb.requestDevice({
            // filters: [{ vendorId: 0x04b8, productId: 0x0202 }], // Epson printer
            filters: [{ vendorId: 1208, productId: 514 }], // Epson printer
          });
          console.log("Device selected:", device);

          try {
            // Open the device
            await device.open();
            console.log("Device opened successfully");

            if (device.configuration === null) {
              await device.selectConfiguration(1);
            }

            // Log available interfaces for debugging
            console.log(
              "Available interfaces:",
              device.configuration.interfaces
            );

            // Find the first available interface
            if (device.configuration.interfaces.length === 0) {
              throw new Error("No interfaces found in device configuration");
            }

            // Try each interface until one is successfully claimed
            let interfaceClaimed = false;
            const interfaces = device.configuration.interfaces;
            console.log("interfaces: ", interfaces);
            console.log(`Device has ${interfaces.length} interfaces`);

            // Try claiming interface 0 (most common for printers)
            const interfaceNumber = 0;
            try {
              // Detach the kernel driver if necessary
              try {
                await device.detachKernelDriver(interfaceNumber);
                console.log("Kernel driver detached successfully.");
              } catch (e) {
                console.log(
                  "No kernel driver to detach or detach not supported."
                );
              }

              // Claim the interface
              await device.claimInterface(interfaceNumber);
              console.log(`Successfully claimed interface ${interfaceNumber}.`);

              // Select the alternate interface (if applicable)
              await device.selectAlternateInterface(interfaceNumber, 0);
              console.log(
                `Alternate interface 0 selected for interface ${interfaceNumber}.`
              );
            } catch (claimError) {
              console.error(
                `Failed to claim interface ${interfaceNumber}:`,
                claimError
              );

              // Provide a user-friendly error message
              document.getElementById("status").textContent =
                "Failed to claim the printer interface. Ensure no other application is using the printer.";
              throw claimError; // Re-throw the error for debugging
            }

            // If interface 0 failed, try others
            if (!interfaceClaimed) {
              for (let i = 0; i < interfaces.length; i++) {
                const interfaceNumber = interfaces[i].interfaceNumber;
                try {
                  await device.claimInterface(interfaceNumber);
                  console.log(
                    `Successfully claimed interface ${interfaceNumber}`
                  );
                  interfaceClaimed = true;
                  break;
                } catch (error) {
                  console.warn(
                    `Failed to claim interface ${interfaceNumber}:`,
                    error
                  );
                }
              }
            }

            if (!interfaceClaimed) {
              const errorMsg =
                "Failed to claim any interface. Please ensure the printer is not in use by another application.";
              console.error(errorMsg);
              document.getElementById("status").textContent = errorMsg;
              throw new Error("No interfaces could be claimed");
            }

            document.getElementById("status").textContent =
              "Printer connected successfully.";
            document.getElementById("print").disabled = false;
          } catch (error) {
            console.error("Error after device selection:", error);

            if (
              error.name === "AccessDeniedError" ||
              error.name === "SecurityError"
            ) {
              document.getElementById("status").textContent =
                "Permission denied. Please reconnect and allow access to the printer.";
            } else {
              document.getElementById(
                "status"
              ).textContent = `Connection error: ${error.message}`;
            }
          }
        } catch (error) {
          console.error("Error selecting device:", error);
          document.getElementById("status").textContent =
            error.name === "NotFoundError"
              ? "No compatible printer found."
              : `Error: ${error.message}`;
        }
      });

      document.getElementById("print").addEventListener("click", async () => {
        try {
          if (!device) {
            document.getElementById("status").textContent =
              "No printer connected.";
            return;
          }

          // ESC/POS commands for initialization and text printing
          const commands = new Uint8Array([
            0x1b,
            0x40, // Initialize printer
            ...new TextEncoder().encode("Hello, World!\n\n\n"),
            0x1d,
            0x56,
            0x41,
            0x10, // Cut paper (partial cut)
          ]);

          // Find a suitable endpoint - be more thorough in searching
          let endpoint;

          // Look through all interfaces and their endpoints
          for (const iface of device.configuration.interfaces) {
            if (!endpoint && iface.claimed) {
              endpoint = iface.alternate.endpoints.find(
                (e) => e.direction === "out" && e.type === "bulk"
              );
              if (endpoint) {
                console.log(
                  `Found suitable endpoint on interface ${iface.interfaceNumber}`
                );
                break;
              }
            }
          }

          if (!endpoint) {
            throw new Error("No suitable OUT endpoint found");
          }

          await device.transferOut(endpoint.endpointNumber, commands);
          document.getElementById("status").textContent =
            "Test print completed.";
        } catch (error) {
          console.error("Error printing:", error);
          document.getElementById(
            "status"
          ).textContent = `Print failed: ${error.message}`;
        }
      });
    </script>
  </body>
</html>
