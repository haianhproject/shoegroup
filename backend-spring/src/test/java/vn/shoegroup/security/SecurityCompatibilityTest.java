package vn.shoegroup.security;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSObject;
import com.nimbusds.jose.crypto.MACVerifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SecurityCompatibilityTest {
    private final PasswordService passwords = new PasswordService();
    private final String password = "ShoeGroup-test-2026";
    @Test void verifiesActualNodeScryptAndBcryptFixtures() {
        String hash = "scrypt$16384$8$1$00112233445566778899aabbccddeeff$c75510bba970b1be036551fdefee5044911127ba8de324d78446bf7555e1931fec1abe594df6b666b6d31241ca81ac2dd9f3cd172d103f4201110eed2e8bd445";
        assertThat(passwords.verify(password, hash)).isEqualTo(new PasswordService.Check(true, false));
        assertThat(passwords.verify("wrong", hash).ok()).isFalse();
        assertThat(passwords.verify(password, "$2a$04$S9C4XWpOu9ex2YAstMHSGuiy0TXSbBbYRyMp/y3skRi93h.RKwucW").ok()).isTrue();
        assertThat(passwords.verify(password, password)).isEqualTo(new PasswordService.Check(true, true));
        assertThat(passwords.verify("wrong", password).ok()).isFalse();
        assertThat(passwords.verify(password, "scrypt$2147483647$8$1$bad$bad").ok()).isFalse();
    }
    @Test void newHashesKeepNodeStorageFormatAndUtf8() {
        String p = "Mat khau \u0111\u1eb7c bi\u1ec7t 2026";
        String hash = passwords.hash(p);
        assertThat(hash).matches("scrypt\\$16384\\$8\\$1\\$[a-f0-9]{32}\\$[a-f0-9]{128}");
        assertThat(passwords.verify(p, hash).ok()).isTrue();
    }
    @Test void readsActualJsonwebtokenNumericSubjectAndSignsCompatibleHmac() throws Exception {
        var mapper = new ObjectMapper();
        var service = new TokenService(mapper, "migration-test-secret", "7d", Clock.fixed(Instant.ofEpochSecond(1800000000), ZoneOffset.UTC));
        String nodeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjE3LCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiQ3VzdG9tZXIiLCJyb2xlSWQiOjIsIm5hbWUiOiJUZXN0IiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQ4NTM2MDAwMDB9.WF0ULVL75e-emab9yi6cXcP50jR9uz4I7eL9ZkRfoEw";
        assertThat(service.verify(nodeToken)).isEqualTo(17);
        assertThat(service.verify(nodeToken + "x")).isNull();
        String token = service.issue(Map.of("id_user", 17, "email", "test@example.com", "role", "Customer", "role_id", 2, "full_name", "Test"));
        var parsed = JWSObject.parse(token);
        assertThat(parsed.verify(new MACVerifier(java.util.Arrays.copyOf("migration-test-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8), 32)))).isTrue();
        assertThat(mapper.readTree(parsed.getPayload().toString()).get("sub").isNumber()).isTrue();
        var expired = new TokenService(mapper, "migration-test-secret", "7d", Clock.fixed(Instant.ofEpochSecond(1800000000 + 604800), ZoneOffset.UTC));
        assertThat(expired.verify(token)).isNull();
    }
    @Test void policiesKeepFailClosedAndOwnershipRules() {
        assertThat(ApiPolicy.resolve("GET", "/api/products")).isEqualTo(ApiPolicy.Level.PUBLIC);
        assertThat(ApiPolicy.resolve("POST", "/api/products")).isEqualTo(ApiPolicy.Level.ADMIN);
        assertThat(ApiPolicy.resolve("GET", "/api/variantDiscounts")).isEqualTo(ApiPolicy.Level.ADMIN);
        assertThat(ApiPolicy.resolve("POST", "/api/orders")).isEqualTo(ApiPolicy.Level.CUSTOMER);
        assertThat(ApiPolicy.resolve("PUT", "/api/orders/12/status")).isEqualTo(ApiPolicy.Level.CUSTOMER);
        assertThat(ApiPolicy.resolve("GET", "/api/unknown")).isEqualTo(ApiPolicy.Level.ADMIN);
        assertThat(ApiPolicy.owns("/api/accounts/18", 17, false)).isFalse();
        assertThat(ApiPolicy.owns("/api/customers/17/orders", 17, false)).isTrue();
        assertThat(ApiPolicy.owns("/api/accounts/18", 17, true)).isTrue();
    }
    @Test void successfulLoginsDoNotConsumeFailureQuota() {
        var limits = new RateLimits(Clock.systemUTC(), 60000, 10, 1);
        assertThat(limits.acquire("ip", true)).isZero();
        limits.loginSucceeded("ip");
        assertThat(limits.acquire("ip", true)).isZero();
        assertThat(limits.acquire("ip", true)).isPositive();
    }
}
