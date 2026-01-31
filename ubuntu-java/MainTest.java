import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class MainTest {

    @Test
    public void testGetGreetingFromCpp() {
        Main mainApp = new Main();
        String result = mainApp.getGreetingFromCpp();
        
        assertNotNull(result, "Result from C++ should not be null");
        assertTrue(result.contains("Hello from C++ Class"), "Result should contain the expected message");
    }
}