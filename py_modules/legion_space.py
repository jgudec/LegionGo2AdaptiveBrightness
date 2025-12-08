# import subprocess
import decky_plugin
from time import sleep
from typing import NamedTuple, Sequence

# source: hhd-adjustor
# https://github.com/hhd-dev/adjustor/blob/072411bff14bb5996b0fe00da06f36d17f31a389/src/adjustor/core/lenovo.py#L13


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

def get_feature(id: int):
    if not call(
        r"\_SB.GZFD.WMAE",
        [0, 0x11, int.to_bytes(id, length=4, byteorder="little", signed=False)],
        risky=False,
    ):
        return None

    return read()