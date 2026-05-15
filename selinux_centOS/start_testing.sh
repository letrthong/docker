#!/bin/bash

python3 my_app.py
echo "Container will keep running so you can exec into it. Press Ctrl+C to exit if running directly."
tail -f /dev/null