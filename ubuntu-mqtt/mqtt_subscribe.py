# 
#  
# sudo apt install mosquitto mosquitto-clients

# pip install paho-mqtt
# 
# mosquitto_pub -h localhost -t test/topic -m "Hello, MQTT"
#
# /etc/mosquitto/mosquitto.conf 
# listener 1883
# allow_anonymous true
# 
# 
# sudo systemctl start mosquitto


import paho.mqtt.client as mqtt

# Define the MQTT broker details
broker = "localhost"
port = 2883
topic = "test/topic"
message = "Hello, MQTT"

# Create an MQTT client instance
client = mqtt.Client()

keepalive=60
# Connect to the broker
client.connect(broker, port, keepalive)

# Publish a message
client.publish(topic, message)

# Disconnect from the broker
client.disconnect()

print(f"Message '{message}' published to topic '{topic}'")
