package vn.shoegroup.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {
    private final SecureRandom random = new SecureRandom();
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
    public record Check(boolean ok, boolean needsUpgrade) {}
    public String hash(String password) {
        byte[] salt = new byte[16]; random.nextBytes(salt);
        byte[] key = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8), salt, 16384, 8, 1, 64);
        return "scrypt$16384$8$1$" + HexFormat.of().formatHex(salt) + "$" + HexFormat.of().formatHex(key);
    }
    public Check verify(String password, String stored) {
        if (stored == null || stored.isEmpty()) return new Check(false, false);
        if (stored.startsWith("scrypt$")) {
            try {
                String[] parts = stored.split("\\$", -1);
                if (parts.length != 6) return new Check(false, false);
                int n = Integer.parseInt(parts[1]), r = Integer.parseInt(parts[2]), p = Integer.parseInt(parts[3]);
                // Bound persisted parameters before allocating scrypt memory.
                if (n < 2 || n > 65536 || (n & (n - 1)) != 0 || r < 1 || r > 8 || p < 1 || p > 4)
                    return new Check(false, false);
                byte[] salt = HexFormat.of().parseHex(parts[4]);
                byte[] expected = HexFormat.of().parseHex(parts[5]);
                if (salt.length != 16 || expected.length != 64) return new Check(false, false);
                byte[] actual = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8), salt, n, r, p, 64);
                return new Check(MessageDigest.isEqual(expected, actual), false);
            } catch (RuntimeException ex) { return new Check(false, false); }
        }
        if (stored.matches("^\\$2[aby]\\$.*")) {
            try { return new Check(bcrypt.matches(password, stored), false); }
            catch (RuntimeException ex) { return new Check(false, false); }
        }
        boolean ok = MessageDigest.isEqual(password.getBytes(StandardCharsets.UTF_8), stored.getBytes(StandardCharsets.UTF_8));
        return new Check(ok, ok);
    }
}
