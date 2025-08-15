import paho.mqtt.client as mqtt

# Define the callback functions
def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))
    client.subscribe("test/topic")

def on_message(client, userdata, msg):
    print(msg.topic + " " + str(msg.payload))

# Create an MQTT client instance
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

keepalive=60
# Connect to the broker
client.connect(broker, port, keepalive)

# Start the loop to process network traffic and dispatch callbacks
client.loop_forever()
