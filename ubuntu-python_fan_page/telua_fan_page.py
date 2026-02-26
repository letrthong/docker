import facebook
import os

token = os.environ.get('FACEBOOK_ACCESS_TOKEN', '2122353218519689|s3tdzFTP20NHc-7biJHjQ42RqwQ')
page_id = '2062127911303488'

graph = facebook.GraphAPI(access_token=token)

# Thử lấy tên trang để kiểm tra kết nối
page_info = graph.get_object(id=page_id, fields='name')
print(f"Kết nối thành công với trang: {page_info['name']}")