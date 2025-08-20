import json
import os
import paho.mqtt.client as mqtt


from datetime import datetime


from mqtt_config import load_config
config = load_config()

# Define topic and message
topic = "test/topic"
message = "Hello, MQTT"
 
current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")


message_with_time = f"{message} - {current_time}"


# Create MQTT client and connect
client = mqtt.Client()
try:
    client.connect(config["broker"], config["port"], config["keepalive"])
    client.publish(topic, message_with_time)
    client.disconnect()
    print(f"✅ Message '{message_with_time}' published to topic '{topic}'")
except Exception as e:
    print(f"❌ Failed to publish message: {e}")
