package tr.edu.iyte.gradplatform;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class GradPlatformApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void applicationStartsAgainstPostgis() {
        String postgisVersion = jdbcTemplate.queryForObject(
                "SELECT PostGIS_Version()",
                String.class
        );

        assertNotNull(postgisVersion);
        assertFalse(postgisVersion.isBlank());
    }
}

