from ultralytics import YOLO
import cv2

# Đường dẫn tới mô hình YOLOv8 đã huấn luyện
model_path = "best.pt"

# Đường dẫn RTSP từ camera
rtsp_url = "rtsp://username:password@ip_address:port/stream"

# Tải mô hình
model = YOLO(model_path)

# Mở luồng RTSP
cap = cv2.VideoCapture(rtsp_url)

if not cap.isOpened():
    print("Không thể kết nối tới camera.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("Không đọc được khung hình.")
        break

    # Dự đoán bằng YOLOv8
    results = model.predict(source=frame, conf=0.4, imgsz=640, verbose=False)

    # Vẽ kết quả lên khung hình
    annotated_frame = results[0].plot()

    # Hiển thị
    cv2.imshow("RAS Camera - YOLOv8 Detection", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
