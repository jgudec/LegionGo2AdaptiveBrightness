#!/usr/bin/bash
# does the following:
# - RGB control via LegionGo2AdaptiveBrightness Decky Plugin
if [ "$EUID" -eq 0 ]
  then echo "Please do not run as root"
  exit
fi

echo "removing previous install if it exists"

cd $HOME

sudo rm -rf $HOME/homebrew/plugins/LegionGo2AdaptiveBrightness

if [ ! -f "/etc/udev/rules.d/90-legion-go-remapper.rules" ]; then

cat << EOF | sudo tee -a "/etc/udev/rules.d/90-legion-go-remapper.rules"
# allow r/w access by all local/physical sessions (seats)
# https://github.com/systemd/systemd/issues/4288
SUBSYSTEMS=="usb", ATTRS{idVendor}=="17ef", TAG+="uaccess"

# allow r/w access by users of the plugdev group
# SUBSYSTEMS=="usb", ATTRS{idVendor}=="17ef", GROUP="plugdev", MODE="0660"

# allow r/w access by all users
SUBSYSTEMS=="usb", ATTRS{idVendor}=="17ef", MODE="0666"
EOF

fi

echo "installing LegionGo2AdaptiveBrightness plugin for RGB control"
# download + install Legion go remapper
curl -L $(curl -s https://api.github.com/repos/aarron-lee/LegionGo2AdaptiveBrightness/releases/latest | grep "browser_download_url" | cut -d '"' -f 4) -o $HOME/LegionGo2AdaptiveBrightness.tar.gz
sudo tar -xzf LegionGo2AdaptiveBrightness.tar.gz -C $HOME/homebrew/plugins

# install complete, remove build dir
rm  $HOME/LegionGo2AdaptiveBrightness.tar.gz
sudo systemctl restart plugin_loader.service
echo "Installation complete"
