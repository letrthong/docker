/*
 FileName: Main.java
*/

public class Main {
    // Load thư viện native (libhello.so)
    static {
        System.loadLibrary("hello");
    }

    // Khai báo phương thức native được cài đặt trong C++
    public native String getGreetingFromCpp();

    public static void main(String[] args) {
        // Gọi hàm native và in kết quả
        System.out.println(new Main().getGreetingFromCpp());
    }
}
