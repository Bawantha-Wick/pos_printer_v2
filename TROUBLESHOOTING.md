# LED Display Troubleshooting Guide

## Quick Steps to Fix Connection Issues

### 1. Check Browser and Protocol

- **Use Chrome 89+ or Edge 89+** (Firefox and Safari don't support Web Serial API)
- **Use HTTPS or localhost** - The Web Serial API requires a secure context
- Open browser console (F12) to see detailed error messages

### 2. Verify Hardware Connection

```bash
# Check if device is detected
lsusb | grep -i ch340
# Should show: Bus 001 Device 013: ID 1a86:7523 QinHeng Electronics CH340 serial converter

# Check if device file exists
ls /dev/ttyUSB* /dev/ttyACM*
# Should show device files like /dev/ttyUSB0 or /dev/ttyACM0
```

### 3. Linux Permissions (if needed)

```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
sudo usermod -a -G tty $USER

# Create udev rule for CH340 (optional)
echo 'SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666"' | sudo tee /etc/udev/rules.d/99-ch340.rules

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Log out and log back in for group changes to take effect
```

### 4. Test Connection Step by Step

1. **Open `led_diagnostic.html`** - This provides step-by-step testing
2. **Check browser support** first
3. **Try to connect** without any filters to see all available devices
4. **Select your CH340 device** from the list
5. **Try different baud rates** (9600, 115200, 57600, etc.)
6. **Send test messages** with different formats

### 5. Common Issues and Solutions

#### Issue: "No compatible devices found"

**Solution:**

- Remove the vendor/product ID filters from the code
- In `led_display.js`, comment out the filters in the `requestPort()` call
- Let the browser show all available serial devices

#### Issue: "Permission denied" or "Access denied"

**Solutions:**

- Ensure you're running on HTTPS or localhost
- Check Linux permissions (see step 3 above)
- Close any other applications that might be using the serial port
- Try disconnecting and reconnecting the USB device

#### Issue: "Port opens but no response from display"

**Solutions:**

- Try different baud rates (common ones: 9600, 115200, 57600, 38400, 19200)
- Try different command formats (use the diagnostic tool)
- Check your LED display manual for the correct protocol
- Verify the LED display is powered on and working

#### Issue: "Web Serial API not supported"

**Solutions:**

- Use Chrome 89+ or Edge 89+
- Ensure you're on HTTPS or localhost
- Check if Web Serial API is enabled in browser flags

### 6. Manual Testing Commands

If the web interface doesn't work, try manual testing:

```bash
# Install screen or minicom for manual testing
sudo apt install screen

# Connect to device (replace /dev/ttyUSB0 with your device)
screen /dev/ttyUSB0 9600

# Try typing these commands manually:
HELLO WORLD
<ID01><A>TEST<E>
# Press Ctrl+A then K to exit screen
```

### 7. LED Display Protocol Examples

Most LED displays use one of these formats:

```
# Format 1: Simple text
HELLO WORLD\r\n

# Format 2: ID-based
<ID01><A>HELLO WORLD<E>\r\n

# Format 3: Control characters
\x01 01 A 2 L HELLO WORLD \x04 \r\n

# Format 4: STX/ETX
\x02 01 A1 HELLO WORLD \x03 \r\n
```

### 8. Debug Your Specific Display

1. **Check the display manual** for the exact protocol
2. **Use the diagnostic tool** to try all formats automatically
3. **Monitor the browser console** for detailed error messages
4. **Try different baud rates** systematically

### 9. Code Modifications for Your Display

If none of the built-in formats work, modify the `buildCommand()` function in `led_display.js`:

```javascript
// Example for a custom protocol
buildCommand(message, settings) {
    // Replace this with your display's specific format
    return `YOUR_START_CODE${message}YOUR_END_CODE\r\n`;
}
```

### 10. Still Not Working?

1. **Capture USB traffic** using tools like Wireshark to see what other software sends
2. **Check if the display works with manufacturer software**
3. **Verify the display is actually a text display** (not just LED lights)
4. **Try a different USB port or cable**
5. **Test with a different computer** to isolate hardware issues

## Files to Use for Testing

1. **`led_diagnostic.html`** - Step-by-step connection testing
2. **`led_test.html`** - Simple LED display interface
3. **`index.html`** - Full POS system with LED controls

Start with the diagnostic tool first to establish basic communication, then move to the full interface once you confirm the display is responding.
