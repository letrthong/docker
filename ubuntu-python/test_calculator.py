# test_calculator.py
import unittest
import calculator  # Import the module with the function to test

class TestCalculator(unittest.TestCase):
    """Test suite for the add function in calculator.py."""

    def test_add_positive(self):
        """Test addition of two positive numbers."""
        # Check if calculator.add(1, 2) is equal to 3
        self.assertEqual(calculator.add(1, 2), 3)

    def test_add_negative(self):
        """Test addition of two negative numbers."""
        # Check if calculator.add(-1, -1) is equal to -2
        self.assertEqual(calculator.add(-1, -1), -2)

    def test_add_mixed(self):
        """Test addition of a positive and a negative number."""
        # Check if calculator.add(-1, 1) is equal to 0
        self.assertEqual(calculator.add(-1, 1), 0)
        # Check if calculator.add(1, -1) is equal to 0
        self.assertEqual(calculator.add(1, -1), 0)

    def test_add_zero(self):
        """Test addition with zero."""
        # Check if calculator.add(0, 5) is equal to 5
        self.assertEqual(calculator.add(0, 5), 5)
        # Check if calculator.add(5, 0) is equal to 5
        self.assertEqual(calculator.add(5, 0), 1)

if __name__ == '__main__':
    # This allows you to run the tests directly from the file
    unittest.main()
