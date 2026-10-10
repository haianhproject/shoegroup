// Mục đích: Xác định API công khai, API của khách hàng và API chỉ dành cho quản trị viên.
package vn.shoegroup.security;

import java.util.List;
import java.util.regex.Pattern;

public final class ApiPolicy {
    public enum Level { PUBLIC, CUSTOMER, STAFF, ADMIN }
    private record Rule(String method, Pattern path, Level level) {
        Rule(String method, String path, Level level) { this(method, Pattern.compile(path), level); }
    }
    private static final List<Rule> RULES = List.of(
        new Rule("*", "^/api/pos(/|$)", Level.STAFF),
        new Rule("GET", "^/api/(orders|customers|inventory|variantDiscounts|admin/events)$", Level.STAFF),
        new Rule("POST", "^/api/(login|register|auth/forgot-password|auth/reset-password|log-error)$", Level.PUBLIC),
        new Rule("GET", "^/api/health$", Level.PUBLIC),
        new Rule("GET", "^/api/v2/products(/|$)", Level.PUBLIC),
        new Rule("GET", "^/api/v2/orders(/|$)", Level.CUSTOMER),
        new Rule("GET", "^/api/v2/dashboard/summary$", Level.ADMIN),
        new Rule("GET", "^/api/products(/|$|\\?)", Level.PUBLIC),
        new Rule("GET", "^/api/(categories|brands|colors|sizes|materials|soles|cushionings|discounts|shippingmethods)(/|$)", Level.PUBLIC),
        new Rule("POST", "^/api/shipping/quote$", Level.PUBLIC),
        new Rule("PUT", "^/api/orders/\\d+/(status|payment|address|receive)$", Level.CUSTOMER),
        new Rule("POST", "^/api/orders$", Level.CUSTOMER),
        new Rule("*", "^/api/cart(/|$)", Level.CUSTOMER),
        new Rule("GET", "^/api/addresses$", Level.CUSTOMER),
        new Rule("POST", "^/api/addresses$", Level.CUSTOMER),
        new Rule("PUT", "^/api/addresses/\\d+$", Level.CUSTOMER),
        new Rule("DELETE", "^/api/addresses/\\d+$", Level.CUSTOMER),
        new Rule("GET", "^/api/customers/\\d+/(orders|notifications)$", Level.CUSTOMER),
        new Rule("PUT", "^/api/accounts/\\d+$", Level.CUSTOMER)
    );
    private ApiPolicy() {}
    public static Level resolve(String method, String path) {
        for (Rule rule : RULES)
            if ((rule.method.equals("*") || rule.method.equals(method)) && rule.path.matcher(path).find()) return rule.level;
        return Level.ADMIN;
    }
    public static boolean owns(String path, long userId, boolean admin) {
        if (admin) return true;
        var match = Pattern.compile("^/api/(customers|accounts)/(\\d+)").matcher(path);
        if (!match.find()) return true;
        try { return Long.parseLong(match.group(2)) == userId; }
        catch (NumberFormatException ex) { return false; }
    }
}
