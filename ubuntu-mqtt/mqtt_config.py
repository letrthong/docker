
# mqtt_config.py


import json
import os

def load_config(config_file="mqtt_config.json"):
    default_config = {
        "broker": "localhost",
        "port": 1883,
        "keepalive": 60
    }

    if os.path.exists(config_file):
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
            return {
                "broker": config.get("broker", default_config["broker"]),
                "port": config.get("port", default_config["port"]),
                "keepalive": config.get("keepalive", default_config["keepalive"])
            }
        except json.JSONDecodeError:
            print(f"⚠️ Lỗi định dạng JSON trong '{config_file}'. Sử dụng giá trị mặc định.")
    else:
        print(f"⚠️ Không tìm thấy file '{config_file}'. Sử dụng giá trị mặc định.")

    return default_config
