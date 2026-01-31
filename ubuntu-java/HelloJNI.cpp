#include <jni.h>
#include <string>
#include "Main.h" // Header file này sẽ được sinh ra bởi lệnh javac -h
#include "Greeting.h"

extern "C" {
    // Tên hàm phải tuân thủ quy tắc: Java_TenClass_TenPhuongThuc
    JNIEXPORT jstring JNICALL Java_Main_getGreetingFromCpp(JNIEnv *env, jobject obj) {
        Greeting greeting;
        std::string hello = greeting.getMessage();
        // Chuyển đổi std::string sang jstring (kiểu String của Java)
        return env->NewStringUTF(hello.c_str());
    }
}