# Create a udev rule for your Epson printer (vendor 04b8, product 0202)

sudo nano /etc/udev/rules.d/99-webusb-printer.rules

SUBSYSTEM=="usb", ATTRS{idVendor}=="04b8", ATTRS{idProduct}=="0202", MODE="0666"

sudo udevadm control --reload-rules && sudo udevadm trigger
