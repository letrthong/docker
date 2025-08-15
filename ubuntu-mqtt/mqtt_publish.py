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

# Define the callback functions
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected successfully")
        client.subscribe("test/topic")
        client.publish("test/topic", "Hello from client!")
    else:
        print("❌ Connection failed with code", rc)

def on_message(client, userdata, msg):
    print(f"📩 Message received on topic '{msg.topic}': {msg.payload.decode()}")

# Create an MQTT client instance
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Connect to the broker using config
client.connect(broker, port, keepalive)

# Start the loop to process network traffic and dispatch callbacks
client.loop_forever()
