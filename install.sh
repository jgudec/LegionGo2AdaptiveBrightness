#!/usr/bin/bash

echo "removing previous install if it exists"

cd $HOME

sudo rm -rf $HOME/homebrew/plugins/LegionGoRemapper

echo "installing LegionGo2AdaptiveBrightness plugin "
# download + install Legion go remapper
curl -L $(curl -s https://api.github.com/repos/jgudec/LegionGo2AdaptiveBrightness/releases/latest | grep "browser_download_url" | cut -d '"' -f 4) -o $HOME/LegionGo2AdaptiveBrightness.tar.gz
sudo tar -xzf LegionGo2AdaptiveBrightness.tar.gz -C $HOME/homebrew/plugins

# install complete, remove build dir
rm  $HOME/LegionGo2AdaptiveBrightness.tar.gz
sudo systemctl restart plugin_loader.service
echo "Installation complete"