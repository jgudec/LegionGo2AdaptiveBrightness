import os
import json
import logging

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code one directory up
# or add the `decky-loader/plugin` path to `python.analysis.extraPaths` in `.vscode/settings.json`

import decky_plugin
import ambient_light_sensor
import legion_configurator
import legion_space
import controller_enums
import rgb
import controllers
import file_timeout
import plugin_update
import controller_settings as settings
from time import sleep

try:
    LOG_LOCATION = f"/tmp/LegionGo2AdaptiveBrightness.log"
    logging.basicConfig(
        level = logging.INFO,
        filename = LOG_LOCATION,
        format="[%(asctime)s | %(filename)s:%(lineno)s:%(funcName)s] %(levelname)s: %(message)s",
        filemode = 'w',
        force = True)
except Exception as e:
    logging.error(f"exception|{e}")

PLUGIN_ROOT = os.path.dirname(__file__)
BRIGHTNESS_MAP_FILE = os.path.join(PLUGIN_ROOT, "brightness_thresholds.json")

def load_brightness_thresholds():
    try:
        with open(BRIGHTNESS_MAP_FILE, "r") as f:
            thresholds = json.load(f)
            if isinstance(thresholds, list):
                return thresholds
    except Exception as e:
        print(f"[AdaptiveBrightness] Error loading mapping: {e}")
    return [[0, 10], [1899, 100]]  # fallback

# Load once at startup
BRIGHTNESS_THRESHOLDS = load_brightness_thresholds()

class Plugin:
    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky_plugin.logger.info("Hello World!")

    async def get_settings(self):
        results = settings.get_settings()

        if results.get("chargeLimitEnabled", False):
            legion_space.set_charge_limit(True)

        try:
            results['pluginVersionNum'] = f'{decky_plugin.DECKY_PLUGIN_VERSION}'

            if settings.supports_custom_fan_curves():
                results['supportsCustomFanCurves'] = True
            else:
                results['supportsCustomFanCurves'] = False
        except Exception as e:
            decky_plugin.logger.error(e)

        return results

    async def get_brightness_map(self):
        return load_brightness_thresholds()

    async def save_brightness_map(self, new_map):
        # Validate the new_map!
        try:
            # Ensure it's a list of [int, int] pairs
            parsed = [[int(k), int(v)] for k, v in new_map]
            with open(BRIGHTNESS_MAP_FILE, "w") as f:
                json.dump(parsed, f, indent=2)
            print(f"Saved successfully!")
            return {"success": True}
        except Exception as e:
            print(f"Error saving brightness map: {e}")
            return {"success": False, "error": str(e)}

    async def find_als(self):
        return ambient_light_sensor.find_als()

    async def read_als(self):
        # decky_plugin.logger.info('read als called')
        return ambient_light_sensor.read_als()

    
    async def set_als_enabled(self, enabled):
        try:
            settings.set_setting('alsEnabled', enabled)
        except Exception as e:
            decky_plugin.logger.error(f'error while setting als {e}')

    async def save_settings(self, new_settings):
        try:
            settings.merge_settings(new_settings)
        except Exception as e:
            decky_plugin.logger.error(f'error save_settings {e}')

    async def ota_update(self):
        # trigger ota update
        try:
            with file_timeout.time_limit(15):
                plugin_update.ota_update()
        except Exception as e:
            logging.error(e)

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        decky_plugin.logger.info("Goodbye World!")
        pass

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        decky_plugin.logger.info("Migrating")
        # Here's a migration example for logs:
        # - `~/.config/decky-template/template.log` will be migrated to `decky_plugin.DECKY_PLUGIN_LOG_DIR/template.log`
        decky_plugin.migrate_logs(os.path.join(decky_plugin.DECKY_USER_HOME,
                                               ".config", "decky-template", "template.log"))
        # Here's a migration example for settings:
        # - `~/homebrew/settings/template.json` is migrated to `decky_plugin.DECKY_PLUGIN_SETTINGS_DIR/template.json`
        # - `~/.config/decky-template/` all files and directories under this root are migrated to `decky_plugin.DECKY_PLUGIN_SETTINGS_DIR/`
        decky_plugin.migrate_settings(
            os.path.join(decky_plugin.DECKY_HOME, "settings", "template.json"),
            os.path.join(decky_plugin.DECKY_USER_HOME, ".config", "decky-template"))
        # Here's a migration example for runtime data:
        # - `~/homebrew/template/` all files and directories under this root are migrated to `decky_plugin.DECKY_PLUGIN_RUNTIME_DIR/`
        # - `~/.local/share/decky-template/` all files and directories under this root are migrated to `decky_plugin.DECKY_PLUGIN_RUNTIME_DIR/`
        decky_plugin.migrate_runtime(
            os.path.join(decky_plugin.DECKY_HOME, "template"),
            os.path.join(decky_plugin.DECKY_USER_HOME, ".local", "share", "decky-template"))

    async def log_info(self, info):
        logging.info(info)
