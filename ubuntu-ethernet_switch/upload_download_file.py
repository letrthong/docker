# pip install paramiko scp

import paramiko
from scp import SCPClient

def create_ssh_client(server, port, user, password):
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(server, port, user, password)
    if client == None:
        print("Can not access to server: %s")
    return client

def transfer_file(ssh_client, local_file, remote_path):
    with SCPClient(ssh_client.get_transport()) as scp:
        scp.put(local_file, remote_path)


def download_file(ssh_client, remote_file, local_path):
    with SCPClient(ssh_client.get_transport()) as scp:
        scp.get(remote_file, local_path)


# Example usage
server = 'localhost'
#server = '10.0.2.15'
port = 2222
user = 'root'
password = 'telua'
local_file = 'upload_download_file.py'
remote_path = '/home'

ssh_client = create_ssh_client(server, port, user, password)
transfer_file(ssh_client, local_file, remote_path)

remote_file = remote_path + "/" + local_file
local_path = 'download.py'
download_file(ssh_client, remote_file, local_path)
