package vn.shoegroup.api;

import java.util.Locale;
import java.util.Map;

public final class Values {
    private Values() {}
    public static String string(Object value) { return value instanceof String s ? s : ""; }
    public static Object first(Map<String, Object> body, Object fallback, String... keys) {
        for (String key : keys) if (body.get(key) != null) return body.get(key);
        return fallback;
    }
    public static String text(Object value, int max) {
        String s = value == null ? "" : value.toString().trim();
        return s.substring(0, Math.min(s.length(), max));
    }
    public static String email(Object value) {
        String s = string(value).trim().toLowerCase(Locale.ROOT);
        if (s.length() > 100 || !s.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}") || s.contains("..")) return null;
        String[] parts = s.split("@", -1);
        if (parts[0].length() > 64 || parts[0].startsWith(".") || parts[0].endsWith(".") ||
            !parts[0].matches("[a-z0-9.!#$%&'*+/=?^_`{|}~-]+")) return null;
        for (String label : parts[1].split("\\."))
            if (!label.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) return null;
        return s;
    }
    public static int integer(Object value, int min, int max, Integer fallback) {
        if (value == null || value.toString().trim().isEmpty()) {
            if (fallback != null) return fallback;
            throw new ApiException(400, "So nguyen khong hop le.");
        }
        try {
            String s = value.toString().trim();
            if (!s.matches("\\d+")) throw new NumberFormatException();
            long n = Long.parseLong(s);
            if (n < min || n > max) throw new NumberFormatException();
            return (int)n;
        } catch (NumberFormatException ex) { throw new ApiException(400, "So nguyen khong hop le."); }
    }
    public static boolean bool(Object value, boolean fallback) {
        if (value == null || value.equals("")) return fallback;
        if (value.equals(true) || value.equals(1) || value.toString().equalsIgnoreCase("true") || value.equals("1")) return true;
        if (value.equals(false) || value.equals(0) || value.toString().equalsIgnoreCase("false") || value.equals("0")) return false;
        throw new ApiException(400, "Trang thai hoat dong khong hop le.");
    }
    public static void password(String password) {
        if (password.length() < 6 || password.length() > 128) throw new ApiException(400, "Mat khau phai co 6-128 ky tu.");
    }
    public static Map<String, Object> success() { return Map.of("success", true); }
}
