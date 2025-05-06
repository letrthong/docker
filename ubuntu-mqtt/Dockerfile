# Use the official Eclipse Mosquitto image as the base
FROM eclipse-mosquitto:latest

# Copy your custom configuration file into the container
COPY mosquitto.conf /mosquitto/config/mosquitto.conf

# Expose the default MQTT port and WebSocket port
EXPOSE 1883
EXPOSE 9001

# Start the Mosquitto broker
CMD ["mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
