#include <jni.h>
#include <string>
#include "Main.h" // Header file này sẽ được sinh ra bởi lệnh javac -h

extern "C" {
    // Tên hàm phải tuân thủ quy tắc: Java_TenClass_TenPhuongThuc
    JNIEXPORT jstring JNICALL Java_Main_getGreetingFromCpp(JNIEnv *env, jobject obj) {
        std::string hello = "Hello from C++ (Native Code) called via JNI!";
        // Chuyển đổi std::string sang jstring (kiểu String của Java)
        return env->NewStringUTF(hello.c_str());
    }
}