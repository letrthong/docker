# Kiểm tra và xử lý dlt-daemon
if [ ! -d "dlt-daemon" ]; then
	echo "[INFO] dlt-daemon chưa tồn tại, tiến hành clone mới."
	git clone https://github.com/COVESA/dlt-daemon.git
else
    echo "[INFO] dlt-daemon đã tồn tại "
fi

# remove the rest containers if have
docker compose down

# build images
docker compose build --no-cache

# start up containers from all images
docker compose up  -d

#docker compose up -d  ( -d Detached)
