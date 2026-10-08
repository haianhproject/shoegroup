// Mục đích: Tạo và xác minh JWT tương thích token đã dùng với frontend hiện có.
package vn.shoegroup.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSObject;
import com.nimbusds.jose.Payload;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
    private final ObjectMapper mapper;
    private final byte[] secret;
    private final long ttl;
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Autowired
    public TokenService(ObjectMapper mapper, Environment env) {
        this(mapper, env.getProperty("JWT_SECRET", "shoegroup-dev-secret-doi-ngay-khi-len-production"),
            env.getProperty("JWT_EXPIRES_IN", "7d"), Clock.systemUTC());
        if ("production".equals(env.getProperty("NODE_ENV")) &&
            (env.getProperty("JWT_SECRET") == null || !"enforce".equals(env.getProperty("AUTH_MODE", "enforce"))))
            throw new IllegalStateException("Production requires JWT_SECRET and AUTH_MODE=enforce.");
    }
    TokenService(ObjectMapper mapper, String secret, String ttl, Clock clock) {
        this.mapper = mapper; this.clock = clock;
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        // HMAC pads short keys with zeros; this also satisfies Nimbus' minimum key size.
        this.secret = bytes.length < 32 ? Arrays.copyOf(bytes, 32) : bytes;
        var match = java.util.regex.Pattern.compile("^(\\d+)([smhd])?$").matcher(ttl);
        this.ttl = match.matches() ? Math.multiplyExact(Long.parseLong(match.group(1)),
            switch (match.group(2) == null ? "s" : match.group(2)) {
                case "m" -> 60; case "h" -> 3600; case "d" -> 86400; default -> 1;
            }) : 604800;
    }
    public String issue(Map<String, Object> user) {
        try {
            long now = clock.instant().getEpochSecond();
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("sub", user.get("id_user")); claims.put("email", user.get("email"));
            claims.put("role", user.get("role")); claims.put("roleId", user.get("role_id"));
            claims.put("name", user.get("full_name")); claims.put("iat", now); claims.put("exp", now + ttl);
            var jwt = new JWSObject(new JWSHeader.Builder(JWSAlgorithm.HS256).type(com.nimbusds.jose.JOSEObjectType.JWT).build(),
                new Payload(mapper.writeValueAsString(claims)));
            jwt.sign(new MACSigner(secret)); return jwt.serialize();
        } catch (Exception ex) { throw new IllegalStateException("Cannot issue token.", ex); }
    }
    public Long verify(String token) {
        if (token == null || token.length() > 8192) return null;
        try {
            JWSObject jwt = JWSObject.parse(token);
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm()) || !jwt.verify(new MACVerifier(secret))) return null;
            Map<String, Object> claims = mapper.readValue(jwt.getPayload().toString(), new TypeReference<>() {});
            if (!(claims.get("exp") instanceof Number exp) || clock.instant().getEpochSecond() >= exp.longValue()) return null;
            if (claims.get("nbf") instanceof Number nbf && clock.instant().getEpochSecond() < nbf.longValue()) return null;
            Object sub = claims.get("sub");
            long id = Long.parseLong(String.valueOf(sub));
            return id > 0 && id <= Integer.MAX_VALUE ? id : null;
        } catch (Exception ex) { return null; }
    }
}
