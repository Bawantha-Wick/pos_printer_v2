# Create a udev rule for your Epson printer (vendor 04b8, product 0202)

sudo nano /etc/udev/rules.d/99-webusb-printer.rules
<!-- sudo nano /etc/udev/rules.d/99-thermalprinter.rules -->

SUBSYSTEM=="usb", ATTRS{idVendor}=="04b8", ATTRS{idProduct}=="0202", MODE="0666"
<!-- SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", ATTR{idProduct}=="0202", MODE="0666", GROUP="plugdev" -->


sudo udevadm control --reload-rules && sudo udevadm trigger
