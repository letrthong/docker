import unittest

class FailingTestCase(unittest.TestCase):
    def test_4_failing_test(self):
        self.assertEqual(1 + 1, 2, "Test case cố ý tạo lỗi: 1 + 1 không thể bằng 3")