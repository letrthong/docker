FROM python:3.9-slim

WORKDIR /app
RUN apt update
RUN apt install python3-pip -y
RUN pip3 install facebook-sdk

COPY telua_fan_page.py .

CMD ["python", "telua_fan_page.py"]
