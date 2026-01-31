/*
 FileName: Main.java
*/

public class Main {
    // Load native library (libhello.so)
    static {
        System.loadLibrary("hello");
    }

    // Declare native method implemented in C++
    public native String getGreetingFromCpp();

    public static void main(String[] args) {
        // Call native method and print result
        System.out.println(new Main().getGreetingFromCpp());
    }
}
