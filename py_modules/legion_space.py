# import subprocess
import decky_plugin
from time import sleep
from typing import NamedTuple, Sequence

# source: hhd-adjustor
# https://github.com/hhd-dev/adjustor/blob/072411bff14bb5996b0fe00da06f36d17f31a389/src/adjustor/core/lenovo.py#L13

def set_tdp_mode(mode):
    decky_plugin.logger.info(f"Setting tdp mode to '{mode}'.")
    match mode:
        case "quiet":
            b = 0x01
        case "balanced":
            b = 0x02
        case "performance":
            b = 0x03
        case "custom":
            b = 0xFF
        case _:
            decky_plugin.logger.error(f"TDP mode '{mode}' is unknown. Not setting.")
            return False

    return call(r"\_SB.GZFD.WMAA", [0, 0x2C, b])

def get_tdp_mode():
    if not call(r"\_SB.GZFD.WMAA", [0, 0x2D, 0], risky=False):
        decky_plugin.logger.error(f"Failed retrieving TDP Mode.")
        return None

    match read():
        case 0x01:
            return "quiet"
        case 0x02:
            return "balanced"
        case 0x03:
            return "performance"
        case 0xFF:
            return "custom"
        case v:
            decky_plugin.logger.error(f"TDP mode '{v}' is unknown")
            return None


def get_charge_limit():
    decky_plugin.logger.info(f"Retrieving charge limit.")
    return get_feature(0x03010001)

# on
# echo '\_SB.GZFD.WMAE 0 0x12 {0x01, 0x00, 0x01, 0x03, 0x01, 0x00, 0x00, 0x00}' | sudo tee /proc/acpi/call; sudo cat /proc/acpi/call   
# off        
# echo '\_SB.GZFD.WMAE 0 0x12 {0x01, 0x00, 0x01, 0x03, 0x00, 0x00, 0x00, 0x00}' | sudo tee /proc/acpi/call
# 80% charge limit
def set_charge_limit(enabled: bool):

    current_charge_limit = get_charge_limit()

    # decky_plugin.logger.info(f'charge limit {current_charge_limit} {current_charge_limit == 0}')

    if enabled and current_charge_limit == 0:
        return call(
            r"\_SB.GZFD.WMAE",
            [
                0,
                0x12,
                bytes(
                    [
                        0x01,
                        0x00,
                        0x01,
                        0x03,
                        0x01,
                        0x00,
                        0x00,
                        0x00
                    ]
                ),
            ],
        )
    elif not enabled and current_charge_limit == 1:
        return call(
            r"\_SB.GZFD.WMAE",
            [
                0,
                0x12,
                bytes(
                    [
                        0x01,
                        0x00,
                        0x01,
                        0x03,
                        0x00,
                        0x00,
                        0x00,
                        0x00
                    ]
                ),
            ],
        )
    # no changes required
    return True

def call(method: str, args: Sequence[bytes | int], risky: bool = True):
    cmd = method
    for arg in args:
        if isinstance(arg, int):
            cmd += f" 0x{arg:02x}"
        else:
            cmd += f" b{arg.hex()}"

    log = decky_plugin.logger.info
    log(f"Executing ACPI call:\n'{cmd}'")

    try:
        with open("/proc/acpi/call", "wb") as f:
            f.write(cmd.encode())
        return True
    except Exception as e:
        decky_plugin.logger.error(f"ACPI Call failed with error:\n{e}")
        return False

def read():
    with open("/proc/acpi/call", "rb") as f:
        d = f.read().decode().strip()

    if d == "not called\0":
        return None
    if d.startswith("0x") and d.endswith("\0"):
        return int(d[:-1], 16)
    if d.startswith("{") and d.endswith("}\0"):
        bs = d[1:-2].split(", ")
        return bytes(int(b, 16) for b in bs)
    assert False, f"Return value '{d}' supported yet or was truncated."    

def set_feature(id: int, value: int):
    return call(
        r"\_SB.GZFD.WMAE",
        [
            0,
            0x12,
            int.to_bytes(id, length=4, byteorder="little", signed=False)
            + int.to_bytes(value, length=4, byteorder="little", signed=False),
        ],
    )

def set_power_light(enabled: bool):
    if get_power_light() == enabled:
        return

    decky_plugin.logger.info(f"Setting power light status.")
    return call(r"\_SB.GZFD.WMAF", [0, 0x02, bytes([0x03, int(enabled), 0x00])])


def get_power_light():
    decky_plugin.logger.info(f"Getting power light status.")
    if not call(r"\_SB.GZFD.WMAF", [0, 0x01, 0x03], risky=False):
        return None
    o = read()
    if isinstance(o, bytes) and len(o) == 2:
        return bool(o[0])
    return None

def get_feature(id: int):
    if not call(
        r"\_SB.GZFD.WMAE",
        [0, 0x11, int.to_bytes(id, length=4, byteorder="little", signed=False)],
        risky=False,
    ):
        return None

    return read()