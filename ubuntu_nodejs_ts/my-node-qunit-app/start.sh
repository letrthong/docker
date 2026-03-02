#!/bin/bash

# Navigate to the application directory
cd /usr/src/app 

# Install npm packages
npm install
npm install ts-node typescript --save-dev

# Print message indicating the start of test cases
echo "---------run testcases---------"

# Run npm test
npm test