package tr.edu.iyte.gradplatform.api.system;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SystemStatusControllerTest {

    @Test
    void reportsTheWalkingSkeletonStatus() {
        var response = new SystemStatusController().status();

        assertEquals("iyte-grad-platform", response.service());
        assertEquals("UP", response.status());
        assertEquals("M0_WALKING_SKELETON", response.phase());
    }
}

