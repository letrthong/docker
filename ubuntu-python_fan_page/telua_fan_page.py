import facebook

# Thay bằng Token bạn lấy từ Graph API Explorer
PAGE_ACCESS_TOKEN = 'YOUR_PAGE_ACCESS_TOKEN'

def post_to_fanpage(message):
    try:
        # Khởi tạo graph API với token của Page
        graph = facebook.GraphAPI(access_token=PAGE_ACCESS_TOKEN)
        
        # Thực hiện đăng bài
        attachment = {
            'link': 'https://www.google.com', # Tùy chọn chèn link
        }
        graph.put_object(
            parent_object='me', 
            connection_name='feed', 
            message=message,
            **attachment
        )
        print("Đăng bài thành công!")
    except facebook.GraphAPIError as e:
        print(f"Lỗi: {e.message}")

if __name__ == "__main__":
    msg = "Chào buổi sáng từ Python script của tôi! 🐍🚀"
    post_to_fanpage(msg)