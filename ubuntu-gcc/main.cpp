
/*
 FileName: main.cpp
 Docker https://hub.docker.com/_/gcc/
*/


//#include <iostream> // Include the input-output stream library

//int main() {
   
   // std::cout << "Hello, World! on docker with gcc:4.9" << std::endl; 
   // return 1; // Indicate that the program ended successfully
//}

#include <bits/stdc++.h>
#include <memory>

using namespace std;

string ltrim(const string &);
string rtrim(const string &);

#include <iostream>
using namespace std;

/*
 * Complete the 'getMinProcessingTime' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts following parameters:
 *  1. INTEGER_ARRAY data
 *  2. INTEGER processTimeA
 *  3. INTEGER processTimeB
 */

int getMinProcessingTime(vector<int> data, int processTimeA, int processTimeB) {
    
    int processA_processingTime = 0;
    int procesB_processingTime = 0;
    int size_of_list = data.size();
    
    cout<<"size_of_list="<<size_of_list <<endl;
    for(int i = 0; i < size_of_list; i++){
        processA_processingTime = processA_processingTime + (data[i]*processTimeA);
        procesB_processingTime = procesB_processingTime + (data[data.size()- (i+1)]*processTimeB);
        cout<<"data[i]="<<data[i] <<endl;
        if( ( size_of_list%2 == 0 ) && (i +1) ==  size_of_list/2 ){
            if(processA_processingTime > procesB_processingTime){
                return processA_processingTime;
            }
            else {
                return procesB_processingTime;
            }
        }else{
            if( ( size_of_list%2 == 1 ) && (i +1) ==  size_of_list/2 ){
                int tempA = processA_processingTime + data[i+1]*processTimeA;
                int tempB = procesB_processingTime + data[i+1]*processTimeB;
                if(tempA > tempB){
                    return tempA;
                }
                else{
                    return tempB;
                }
            }
        }
    }
    
   return 0;
}

int main()
{
    ofstream fout(getenv("OUTPUT_PATH"));

    string data_count_temp;
    getline(cin, data_count_temp);

    int data_count = stoi(ltrim(rtrim(data_count_temp)));

    vector<int> data(data_count);

    for (int i = 0; i < data_count; i++) {
        string data_item_temp;
        getline(cin, data_item_temp);

        int data_item = stoi(ltrim(rtrim(data_item_temp)));

        data[i] = data_item;
    }

    string processTimeA_temp;
    getline(cin, processTimeA_temp);

    int processTimeA = stoi(ltrim(rtrim(processTimeA_temp)));

    string processTimeB_temp;
    getline(cin, processTimeB_temp);

    int processTimeB = stoi(ltrim(rtrim(processTimeB_temp)));

    int result = getMinProcessingTime(data, processTimeA, processTimeB);

    fout << result << "\n";

    fout.close();

    return 0;
}

string ltrim(const string &str) {
    string s(str);

    s.erase(
        s.begin(),
        find_if(s.begin(), s.end(), not1(ptr_fun<int, int>(isspace)))
    );

    return s;
}

string rtrim(const string &str) {
    string s(str);

    s.erase(
        find_if(s.rbegin(), s.rend(), not1(ptr_fun<int, int>(isspace))).base(),
        s.end()
    );

    return s;
}

