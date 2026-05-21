FROM grafana/loki:3.0.0

USER root
RUN apk update && apk add --no-cache bash curl

# Copy file cấu hình từ máy thật vào đúng thư mục bên trong container
COPY local-config.yaml /etc/loki/local-config.yaml

USER loki

EXPOSE 3100