#!/bin/bash
# Script tạo VM CentOS trên Google Cloud Platform (GCP)
# Yêu cầu: Đã cài đặt và cấu hình gcloud SDK, đã đăng nhập tài khoản

# Thông số VM
VM_NAME="centos-selinux-demo"
ZONE="asia-southeast1-b"           # Thay đổi theo khu vực bạn muốn
MACHINE_TYPE="e2-medium"           # Loại máy ảo
IMAGE_FAMILY="centos-7"            # CentOS 7
IMAGE_PROJECT="centos-cloud"
BOOT_DISK_SIZE="20GB"

# Tạo VM CentOS

gcloud compute instances create "$VM_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family="$IMAGE_FAMILY" \
  --image-project="$IMAGE_PROJECT" \
  --boot-disk-size="$BOOT_DISK_SIZE" \
  --tags=selinux-demo

echo "\nVM CentOS đã được tạo. Để SSH vào VM, chạy:"
echo "gcloud compute ssh $VM_NAME --zone=$ZONE"
