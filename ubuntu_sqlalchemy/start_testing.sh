#!/bin/bash
python3  telua_pymysql.py

echo  ""
echo "----------------------start unittest--------------------------"
echo  ""
python3 -m unittest test_calculator.py

# python3 test_pymysql.py