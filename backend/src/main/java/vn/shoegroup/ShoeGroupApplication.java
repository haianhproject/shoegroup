// Mục đích: Điểm khởi động backend Spring Boot và bật các tác vụ chạy theo lịch.
package vn.shoegroup;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class ShoeGroupApplication {
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Bangkok"));
        SpringApplication.run(ShoeGroupApplication.class, args);
    }
}
