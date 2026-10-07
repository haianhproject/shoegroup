package vn.shoegroup.config;

import io.github.cdimascio.dotenv.Dotenv;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class EnvFileLoader implements EnvironmentPostProcessor, Ordered {
    @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE + 11; }
    @Override public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        Path directory = Files.isRegularFile(Path.of("backend/.env")) ? Path.of("backend") : Path.of("../backend");
        Map<String, Object> values = new LinkedHashMap<>();
        Dotenv.configure().directory(directory.toAbsolutePath().normalize().toString()).ignoreIfMissing().load()
            .entries().forEach(entry -> values.put(entry.getKey(), entry.getValue()));
        env.getPropertySources().addLast(new MapPropertySource("shoegroupEnvFile", values));
        String instance = env.getProperty("DB_INSTANCE", "").trim();
        if (!instance.isEmpty() && env.getProperty("SPRING_DB_URL", "").isBlank()) {
            if (!env.getProperty("DB_PORT", "").isBlank()) throw new IllegalStateException("Set only DB_INSTANCE or DB_PORT.");
            values.put("SPRING_DB_URL", "jdbc:sqlserver://" + env.getProperty("DB_SERVER", "localhost") + ";instanceName=" + instance +
                ";databaseName=" + env.getProperty("DB_NAME", "ShoegroupDB") + ";encrypt=" + env.getProperty("DB_ENCRYPT", "false") +
                ";trustServerCertificate=" + env.getProperty("DB_TRUST_CERT", "true"));
        }
    }
}
