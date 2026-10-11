// Mục đích: Cấu hình bộ lọc bảo mật Spring, CORS và chế độ xác thực không dùng session.
package vn.shoegroup.security;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
    @Bean SecurityFilterChain security(HttpSecurity http, ApiSecurityFilter filter, CorsConfigurationSource cors) throws Exception {
        return http.csrf(csrf -> csrf.disable()).cors(c -> c.configurationSource(cors))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(h -> h.frameOptions(f -> f.deny()).referrerPolicy(r -> r.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
            .authorizeHttpRequests(a -> a.anyRequest().permitAll())
            .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
    }
    @Bean FilterRegistrationBean<ApiSecurityFilter> filterRegistration(ApiSecurityFilter filter) {
        var bean = new FilterRegistrationBean<>(filter); bean.setEnabled(false); return bean;
    }
    @Bean CorsConfigurationSource cors(Environment env) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(env.getProperty("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173").split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "x-access-token", "Idempotency-Key"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", config); return source;
    }
}
