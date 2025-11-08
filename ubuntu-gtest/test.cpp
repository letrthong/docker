#include <gtest/gtest.h>
#include <bits/stdc++.h>
#include <memory>
#include <vector>
#include <iostream>
using namespace std;


int getMinProcessingTime(vector<int> data, int processTimeA, int processTimeB) {
    int processA_processingTime = 0;
    int processB_processingTime = 0;
    int size_of_list = data.size();

    for (int i = 0; i < size_of_list; i++) {
        processA_processingTime = processA_processingTime + (data[i]*processTimeA);
        processB_processingTime = processB_processingTime + (data[data.size()- (i+1)]*processTimeB);
        if (( size_of_list%2 == 0 ) && (i +1) ==  size_of_list/2 ) {
            if(processA_processingTime > processB_processingTime) {
                return processA_processingTime;
            } else {
                return processB_processingTime;
            }
        } else {
            if (( size_of_list%2 == 1 ) && (i +1) ==  size_of_list/2 ) {
                int tempA = processA_processingTime + data[i+1]*processTimeA;

                if (tempA < processB_processingTime){
                    return processB_processingTime;
                } else {
                    return tempA;
                }
            }
        }
    }
   return 0;
}

TEST(SampleTest, checkTime01) {
    std::vector<int> dataList ={1, 3, 4, 5, 6};
    int ret = getMinProcessingTime(list1, 1 ,2);
    EXPECT_EQ(ret, 22);
}

TEST(SampleTest, checkTime01) {
    std::vector<int> dataList ={1, 1, 1, 1, 1};
    int ret = getMinProcessingTime(list1, 2 ,2);
    EXPECT_EQ(ret, 6);
}

TEST(SampleTest, Addition) {
    EXPECT_EQ(2 + 2, 4);
}


int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);

    return RUN_ALL_TESTS();
}