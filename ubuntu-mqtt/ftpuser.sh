useradd -m ftpuser
passwd ftpuser

# Set Up a Non-Writable Root Directory
mkdir -p /home/ftpuser/ftp/upload
chown -R ftpuser:ftpuser /home/ftpuser/ftp
chmod -R 755 /home/ftpuser/ftp

chmod 755 /home/ftpuser
chmod 777 /home/ftpuser/ftp/upload


usermod -d /home/ftpuser/ftp ftpuser


ls /home
