 #!/bin/bash

pnpm run build
sudo rm -R $HOME/homebrew/plugins/LegionGo2AdaptiveBrightness/
sudo cp -R ../LegionGo2AdaptiveBrightness/ $HOME/homebrew/plugins/
sudo systemctl restart plugin_loader.service
