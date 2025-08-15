import json
import os
import paho.mqtt.client as mqtt


from mqtt_config import load_config
config = load_config()

 

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
client.connect(config["broker"], config["port"], config["keepalive"])

# Start the loop to process network traffic and dispatch callbacks
client.loop_forever()
