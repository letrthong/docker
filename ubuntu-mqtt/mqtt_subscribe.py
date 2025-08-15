import json
import os
import paho.mqtt.client as mqtt

from mqtt_config import load_config
config = load_config()

# Define topic and message
topic = "test/topic"
message = "Hello, MQTT"

# Create MQTT client and connect
client = mqtt.Client()
try:
    client.connect(config["broker"], config["port"], config["keepalive"])
    client.publish(topic, message)
    client.disconnect()
    print(f"✅ Message '{message}' published to topic '{topic}'")
except Exception as e:
    print(f"❌ Failed to publish message: {e}")
