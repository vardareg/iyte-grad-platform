package tr.edu.iyte.gradplatform.api.system;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemStatusController {

    @GetMapping("/status")
    public SystemStatusResponse status() {
        return new SystemStatusResponse(
                "iyte-grad-platform",
                "UP",
                "M0_WALKING_SKELETON"
        );
    }

    public record SystemStatusResponse(String service, String status, String phase) {
    }
}

