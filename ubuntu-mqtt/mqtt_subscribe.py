import json
import os
import paho.mqtt.client as mqtt

# Load config from JSON file if available
CONFIG_FILE = "mqtt_config.json"
if os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)
    broker = config.get("broker", "localhost")
    port = config.get("port", 1883)
    keepalive = config.get("keepalive", 60)
else:
    print(f"⚠️ Config file '{CONFIG_FILE}' not found. Using default values.")
    broker = "localhost"
    port = 1883
    keepalive = 60

# Define topic and message
topic = "test/topic"
message = "Hello, MQTT"

# Create MQTT client and connect
client = mqtt.Client()
try:
    client.connect(broker, port, keepalive)
    client.publish(topic, message)
    client.disconnect()
    print(f"✅ Message '{message}' published to topic '{topic}'")
except Exception as e:
    print(f"❌ Failed to publish message: {e}")
