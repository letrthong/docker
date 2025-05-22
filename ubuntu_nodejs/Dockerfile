
# Use the official Node.js image from Docker Hub
FROM node:20


# Set the working directory inside the container
WORKDIR /usr/src/app

RUN apt-get update 

# To update all packages to their latest compatible versions:
RUN npm update

RUN npm init -y
RUN  npm install --save-dev qunit

# Install dependencies
RUN  npm install qunit-reporter-junit


# Copy the rest of your application code
COPY ./my-node-qunit-app  ./


# Make sure the shell script is executable
RUN chmod +x start.sh

# Install dependencies
RUN npm install
 
# Run the shell script
CMD ["/usr/src/app/start.sh"]
