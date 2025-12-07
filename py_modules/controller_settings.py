import os
import subprocess
from settings import SettingsManager

settings_directory = os.environ["DECKY_PLUGIN_SETTINGS_DIR"]
settings_path = os.path.join(settings_directory, 'settings.json')
setting_file = SettingsManager(name="settings", settings_directory=settings_directory)
setting_file.read()

def deep_merge(origin, destination):
    for k, v in origin.items():
        if isinstance(v, dict):
            n = destination.setdefault(k, {})
            deep_merge(v, n)
        else:
            destination[k] = v

    return destination

def get_settings():
    setting_file.read()
    return setting_file.settings

def set_setting(name: str, value):
    return setting_file.setSetting(name, value)

def set_all_controller_profiles(controller_profiles):
    settings = get_settings()

    if not settings.get('controller'):
        settings['controller'] = {}
    profiles = settings['controller']
    deep_merge(controller_profiles, profiles)

    setting_file.settings['controller'] = profiles
    setting_file.commit()

def merge_settings(new_settings):
    settings = get_settings()

    deep_merge(new_settings, settings)

    setting_file.settings = settings
    setting_file.commit()

def modprobe_acpi_call():
    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = ""
    os.system("modprobe acpi_call")
    result = subprocess.run(["modprobe", "acpi_call"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)

    if result.stderr:
        return False
    return True


