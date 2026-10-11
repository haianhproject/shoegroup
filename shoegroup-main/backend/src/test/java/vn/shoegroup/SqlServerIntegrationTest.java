// Mục đích: Kiểm thử nghiệp vụ Spring với SQL Server riêng, gồm mật khẩu, quyền và transaction tồn kho.
package vn.shoegroup;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import vn.shoegroup.api.ApiException;
import vn.shoegroup.auth.AuthService;
import vn.shoegroup.pos.PosCartService;
import vn.shoegroup.security.PasswordService;
import vn.shoegroup.security.TokenService;

@SpringBootTest(properties = {"logging.level.root=WARN", "spring.main.banner-mode=off", "shoegroup.schema-enabled=false", "shoegroup.jobs-enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "SHOEGROUP_SQL_TEST_URL", matches = ".+")
class SqlServerIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        String url = System.getenv("SHOEGROUP_SQL_TEST_URL");
        if (!url.matches(".*;databaseName=ShoegroupMigrationTest_\\d+_\\d+;.*")) throw new IllegalStateException("Tests require an isolated migration database.");
        registry.add("spring.datasource.url", () -> url);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired PosCartService carts;
    @Autowired PasswordService passwords;
    @Autowired AuthService auth;
    @Autowired TokenService tokens;
    @Autowired vn.shoegroup.customer.AddressService addresses;
    @Autowired vn.shoegroup.customer.CartService onlineCarts;
    @Autowired vn.shoegroup.customer.AccountService accounts;
    @Autowired vn.shoegroup.catalog.ProductWriteService products;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    int first, second, customer, variant;
    @BeforeEach void fixtures() {
        jdbc.update("DELETE FROM OrderDetails"); jdbc.update("DELETE FROM VariantDiscounts");
        jdbc.update("DELETE FROM Orders"); jdbc.update("DELETE FROM UserAddresses");
        jdbc.update("DELETE FROM CartItems"); jdbc.update("DELETE FROM Carts");
        jdbc.update("DELETE FROM PosCartItems"); jdbc.update("DELETE FROM PosCarts");
        jdbc.update("DELETE FROM ProductImages"); jdbc.update("DELETE FROM ProductVariants"); jdbc.update("DELETE FROM Products");
        jdbc.update("DELETE FROM Colors"); jdbc.update("DELETE FROM Sizes");
        jdbc.update("DELETE FROM Users"); jdbc.update("DELETE FROM Categories");
        first = user("first@example.com", 1); second = user("second@example.com", 1); customer = user("customer@example.com", 2);
        int color=jdbc.queryForObject("INSERT Colors(ColorName,ColorHex,IsActive) OUTPUT INSERTED.ColorID VALUES(N'Black','#000000',1)",Integer.class);
        int size=jdbc.queryForObject("INSERT Sizes(SizeName,SizeStandard,IsActive) OUTPUT INSERTED.SizeID VALUES(N'42','EU',1)",Integer.class);
        jdbc.update("INSERT Sizes(SizeName,SizeStandard,IsActive) VALUES(N'40','EU',1)");
        int product = jdbc.queryForObject("INSERT Products(ProductName,IsActive) OUTPUT INSERTED.ProductID VALUES(N'Test shoe',1)", Integer.class);
        variant = jdbc.queryForObject("INSERT ProductVariants(ProductID,SizeID,ColorID,StockQuantity,SalePrice,Version,IsActive) OUTPUT INSERTED.ProductVariantID VALUES(?,?,?,1,100000,0,1)", Integer.class, product,size,color);
    }
    int user(String email, int role) {
        return jdbc.queryForObject("INSERT Users(RoleID,FullName,Email,PasswordHash,IsActive) OUTPUT INSERTED.UserID VALUES(?,N'Test',?,N'legacy-password',1)", Integer.class, role, email);
    }
    String token(int id, int role) { return tokens.issue(Map.of("id_user", id, "email", "test@example.com", "full_name", "Test", "role_id", role, "role", role == 1 ? "Admin" : "Customer")); }
    int stock() { return jdbc.queryForObject("SELECT StockQuantity FROM ProductVariants WHERE ProductVariantID=?", Integer.class, variant); }
    @Test void nativeProductWritesProtectStockAndRollbackProductChanges() throws Exception {
        int product = jdbc.queryForObject("SELECT ProductID FROM ProductVariants WHERE ProductVariantID=?", Integer.class, variant);
        var body = new java.util.HashMap<String, Object>(Map.of("name", "Changed shoe", "price", 200000, "variants", List.of(Map.of("id", variant, "color", "Black", "size", "42", "stock", 3, "version", 0))));
        mvc.perform(put("/api/products/" + product).header("Authorization", "Bearer " + token(first, 1)).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
            .andExpect(status().isOk());
        assertThat(stock()).isEqualTo(3);
        body.put("name", "Stale update");
        mvc.perform(put("/api/products/" + product).header("Authorization", "Bearer " + token(first, 1)).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STOCK_VERSION_CONFLICT"));
        assertThat(jdbc.queryForObject("SELECT ProductName FROM Products WHERE ProductID=?", String.class, product)).isEqualTo("Changed shoe");
        assertThat(stock()).isEqualTo(3);
        mvc.perform(put("/api/products/" + product).header("Authorization", "Bearer " + token(customer, 2)).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
        jdbc.update("INSERT OrderDetails(ProductID) VALUES(?)", product);
        assertThatThrownBy(() -> products.delete(String.valueOf(product), true)).isInstanceOf(ApiException.class);
        assertThat(products.delete(String.valueOf(product), false).get("mode")).isEqualTo("soft");
        products.restore(String.valueOf(product));
        assertThat(jdbc.queryForObject("SELECT IsActive FROM Products WHERE ProductID=?", Boolean.class, product)).isTrue();
    }
    @Test void productCreationKeepsVariantsAndColorImagesAtomic() {
        int count = jdbc.queryForObject("SELECT COUNT(*) FROM Products", Integer.class);
        assertThatThrownBy(() -> products.save(null, Map.of("name", "Duplicate", "price", 100, "variants", List.of(Map.of("color", "Black", "size", "42"), Map.of("color", "black", "size", "42")))))
            .isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM Products", Integer.class)).isEqualTo(count);
        var result = products.save(null, Map.of("name", "New shoe", "price", 100000, "variants", List.of(Map.of("color", "Black", "size", "40", "stock", 5)), "colors", List.of(Map.of("name", "Black", "image", "https://example.test/black.png"))));
        int product = ((Number)result.get("ProductID")).intValue();
        assertThat(jdbc.queryForObject("SELECT StockQuantity FROM ProductVariants WHERE ProductID=?", Integer.class, product)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT ImageURL FROM ProductImages WHERE ProductID=?", String.class, product)).isEqualTo("https://example.test/black.png");
        products.delete(String.valueOf(product), true);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM Products WHERE ProductID=?", Integer.class, product)).isZero();
    }
    @Test void nativeLoginUpgradesLegacyPasswordAndReturnsOriginalShape() throws Exception {
        mvc.perform(post("/api/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"customer@example.com\",\"password\":\"legacy-password\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.user.id_user").value(customer))
            .andExpect(jsonPath("$.user.role").value("Customer")).andExpect(jsonPath("$.user.password_hash").doesNotExist()).andExpect(jsonPath("$.token").isString());
        String hash = jdbc.queryForObject("SELECT PasswordHash FROM Users WHERE UserID=?", String.class, customer);
        assertThat(hash).startsWith("scrypt$"); assertThat(passwords.verify("legacy-password", hash).ok()).isTrue();
        jdbc.update("UPDATE Users SET IsActive=0 WHERE UserID=?", customer);
        mvc.perform(post("/api/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"customer@example.com\",\"password\":\"legacy-password\"}"))
            .andExpect(status().isLocked()).andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }
    @Test void currentRoleAndAccountStateOverrideSignedClaims() throws Exception {
        String token = token(first, 1);
        mvc.perform(get("/api/pos/cart").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        jdbc.update("UPDATE Users SET RoleID=2 WHERE UserID=?", first);
        mvc.perform(get("/api/pos/cart").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(put("/api/accounts/" + second).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        jdbc.update("UPDATE Users SET IsActive=0 WHERE UserID=?", first);
        mvc.perform(get("/api/categories").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }
    @Test void employeeLoginAndPosAreAllowedButCatalogAndAccountWritesAreDenied() throws Exception {
        int employee=user("employee@example.com",3); String bearer="Bearer "+token(employee,3);
        mvc.perform(post("/api/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"employee@example.com\",\"password\":\"legacy-password\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("Employee"));
        mvc.perform(get("/api/pos/cart").header("Authorization",bearer)).andExpect(status().isOk());
        mvc.perform(get("/api/accounts").header("Authorization",bearer)).andExpect(status().isForbidden());
        mvc.perform(post("/api/products").header("Authorization",bearer).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(put("/api/accounts/"+employee).header("Authorization",bearer).contentType(MediaType.APPLICATION_JSON).content("{\"role_id\":1}"))
            .andExpect(status().isForbidden());
        mvc.perform(put("/api/pos/cart/items/"+variant).header("Authorization",bearer).contentType(MediaType.APPLICATION_JSON).content("{\"revision\":0,\"quantity\":1}"))
            .andExpect(status().isOk());
        assertThat(stock()).isZero();
        var created=accounts.create(Map.of("username","staff-new@example.com","name","Staff","password","staff-password","role_id",3));
        assertThat(created.get("success")).isEqualTo(true);
    }
    @Test void nullableLegacyActiveStateAndOversizedOwnerIdsRemainSafe() throws Exception {
        jdbc.update("UPDATE Users SET IsActive=NULL WHERE UserID=?", customer);
        String bearer = "Bearer " + token(customer, 2);
        mvc.perform(put("/api/accounts/" + customer).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Legacy active\"}"))
            .andExpect(status().isOk());
        mvc.perform(put("/api/accounts/9999999999999999999999999").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/categories-private")).andExpect(status().isUnauthorized());
    }
    @Test void catalogJsonAndWritesRemainCompatible() throws Exception {
        mvc.perform(post("/api/categories").header("Authorization", "Bearer " + token(first, 1)).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Running\",\"sport\":\"Run\",\"active\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mvc.perform(get("/api/categories")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Running")).andExpect(jsonPath("$[0].active").value(true));
        mvc.perform(post("/api/categories").header("Authorization", "Bearer " + token(customer, 2)).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
    }
    @Test void posReservesRestoresAndRejectsStaleRevisionWithoutStockChanges() {
        assertThat(carts.handle(first, "item", variant, Map.of("revision", 0, "quantity", 1)).get("revision")).isEqualTo(1);
        assertThat(stock()).isZero();
        assertThatThrownBy(() -> carts.handle(first, "clear", null, Map.of("revision", 0))).isInstanceOf(ApiException.class);
        assertThat(stock()).isZero();
        assertThat(carts.handle(first, "clear", null, Map.of("revision", 1)).get("revision")).isEqualTo(2);
        assertThat(stock()).isEqualTo(1);
    }
    @Test void concurrentCartsCannotReserveTheSameLastUnit() throws Exception {
        var executor = Executors.newFixedThreadPool(2); var barrier = new CyclicBarrier(2);
        try {
            List<Callable<Integer>> tasks = List.of(() -> reserve(first, barrier), () -> reserve(second, barrier));
            var results = executor.invokeAll(tasks);
            assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(200, 409);
            assertThat(stock()).isZero();
            assertThat(jdbc.queryForObject("SELECT SUM(Quantity) FROM PosCartItems", Integer.class)).isEqualTo(1);
        } finally { executor.shutdownNow(); }
    }
    private int reserve(int id, CyclicBarrier barrier) throws Exception {
        barrier.await();
        try { carts.handle(id, "item", variant, Map.of("revision", 0, "quantity", 1)); return 200; }
        catch (ApiException ex) { return ex.status; }
    }
    @Test void invalidQuantityRollsBackCartCreationAndStock() {
        assertThatThrownBy(() -> carts.handle(first, "item", variant, Map.of("revision", 0, "quantity", "1"))).isInstanceOf(ApiException.class);
        assertThat(stock()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM PosCarts WHERE UserID=?", Integer.class, first)).isZero();
    }
    @Test void pendingInvoicesAreIndependentAndExpireOnlyOnce() {
        jdbc.update("UPDATE ProductVariants SET StockQuantity=10 WHERE ProductVariantID=?",variant);
        var a=carts.handle(first,null,null,Map.of());
        var b=carts.handle(first,"create",null,Map.of());
        int ca=((Number)a.get("cart_id")).intValue(),cb=((Number)b.get("cart_id")).intValue();
        carts.handle(first,"item",variant,Map.of("cart_id",ca,"revision",0,"quantity",2));
        carts.handle(first,"item",variant,Map.of("cart_id",cb,"revision",0,"quantity",3));
        assertThat(stock()).isEqualTo(5);
        assertThatThrownBy(()->carts.handle(second,"item",variant,Map.of("cart_id",ca,"revision",1,"quantity",1))).isInstanceOf(ApiException.class);
        assertThat(stock()).isEqualTo(5);
        jdbc.update("UPDATE PosCarts SET ExpiresAt=DATEADD(day,-1,SYSDATETIME()) WHERE PosCartID=?",ca);
        carts.expireAll();carts.expireAll();
        assertThat(stock()).isEqualTo(7);
        assertThat(jdbc.queryForObject("SELECT Quantity FROM PosCartItems WHERE PosCartID=?",Integer.class,cb)).isEqualTo(3);
    }
    @Test void parentOffDisablesChildrenWithoutResettingIndividualStatusOnRestore() {
        int product=jdbc.queryForObject("SELECT ProductID FROM ProductVariants WHERE ProductVariantID=?",Integer.class,variant);
        products.delete(String.valueOf(product),false);
        assertThat(jdbc.queryForObject("SELECT IsActive FROM ProductVariants WHERE ProductVariantID=?",Boolean.class,variant)).isFalse();
        products.restore(String.valueOf(product));
        assertThat(jdbc.queryForObject("SELECT IsActive FROM ProductVariants WHERE ProductVariantID=?",Boolean.class,variant)).isFalse();
        assertThatThrownBy(()->products.variantStatus(String.valueOf(product),String.valueOf(variant),Map.of("active",true,"version",0))).isInstanceOf(ApiException.class);
        products.variantStatus(String.valueOf(product),String.valueOf(variant),Map.of("active",true,"version",1));
        assertThat(jdbc.queryForObject("SELECT IsActive FROM ProductVariants WHERE ProductVariantID=?",Boolean.class,variant)).isTrue();
    }
    @Test void resetTokensAreConsumedAtomicallyAndExpiredTokensFail() {
        String token = "a".repeat(64);
        jdbc.update("UPDATE Users SET PasswordResetToken=?,PasswordResetTokenExpiry=DATEADD(hour,1,GETDATE()) WHERE UserID=?", token, customer);
        auth.reset(Map.of("token", token, "newPassword", "changed-password"));
        assertThatThrownBy(() -> auth.reset(Map.of("token", token, "newPassword", "other-password"))).isInstanceOf(ApiException.class);
        assertThat(passwords.verify("changed-password", jdbc.queryForObject("SELECT PasswordHash FROM Users WHERE UserID=?", String.class, customer)).ok()).isTrue();
        jdbc.update("UPDATE Users SET PasswordResetToken=?,PasswordResetTokenExpiry=DATEADD(hour,-1,GETDATE()) WHERE UserID=?", token, customer);
        assertThatThrownBy(() -> auth.reset(Map.of("token", token, "newPassword", "other-password"))).isInstanceOf(ApiException.class);
    }
    @Test void onlineCartChangesNeverReserveOrRestoreInventory() {
        int product = jdbc.queryForObject("SELECT ProductID FROM ProductVariants WHERE ProductVariantID=?", Integer.class, variant);
        assertThat(onlineCarts.add(customer, Map.of("productId", product, "variantId", variant, "quantity", 1)).get("quantity")).isEqualTo(1);
        assertThat(stock()).isEqualTo(1);
        assertThatThrownBy(() -> onlineCarts.add(customer, Map.of("productId", product, "variantId", variant, "quantity", 1))).isInstanceOf(ApiException.class);
        assertThat(stock()).isEqualTo(1);
        onlineCarts.update(customer, variant, Map.of("quantity", 0)); assertThat(stock()).isEqualTo(1);
        onlineCarts.add(customer, Map.of("productId", product, "size", "42", "color", "Black", "quantity", 1));
        onlineCarts.delete(customer, null); assertThat(stock()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM CartItems", Integer.class)).isZero();
    }
    @Test void addressOwnershipDefaultsAndOrderSnapshotArePreserved() {
        Map<String, Object> body = Map.of("recipient", "Test", "phone", "0912345678", "province", "Ha Noi", "ward", "Test ward", "line", "1 Test street");
        Map<String, Object> firstAddress = addresses.save(customer, null, body);
        assertThat(firstAddress.get("isDefault")).isEqualTo(true);
        int id = ((Number)firstAddress.get("id")).intValue();
        Map<String, Object> nextBody = new java.util.HashMap<>(body); nextBody.put("isDefault", true);
        Map<String, Object> secondAddress = addresses.save(customer, null, nextBody);
        int secondId = ((Number)secondAddress.get("id")).intValue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM UserAddresses WHERE UserID=? AND IsDefault=1", Integer.class, customer)).isEqualTo(1);
        assertThatThrownBy(() -> addresses.save(first, id, Map.of("line", "Changed"))).isInstanceOf(ApiException.class);
        jdbc.update("INSERT Orders(AddressID,ShippingAddress) VALUES(?,?)", secondId, secondAddress.get("fullAddress"));
        addresses.delete(customer, secondId);
        assertThat(addresses.list(customer).get(0).get("isDefault")).isEqualTo(true);
        assertThat(jdbc.queryForMap("SELECT AddressID,ShippingAddress FROM Orders").get("AddressID")).isNull();
        assertThat(jdbc.queryForMap("SELECT AddressID,ShippingAddress FROM Orders").get("ShippingAddress")).isEqualTo(secondAddress.get("fullAddress"));
    }
    @Test void accountPatchesPreserveCredentialsAndEnforceCustomerRestrictions() throws Exception {
        String bearer = "Bearer " + token(customer, 2);
        mvc.perform(put("/api/accounts/" + customer).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Updated\",\"phone\":\"0912345678\",\"password\":\"new-password\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.full_name").value("Updated"))
            .andExpect(jsonPath("$.user.email").value("customer@example.com")).andExpect(jsonPath("$.user.password_hash").doesNotExist());
        assertThat(passwords.verify("new-password", jdbc.queryForObject("SELECT PasswordHash FROM Users WHERE UserID=?", String.class, customer)).ok()).isTrue();
        mvc.perform(put("/api/accounts/" + customer).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content("{\"role_id\":1}"))
            .andExpect(status().isForbidden());
        mvc.perform(put("/api/accounts/" + customer).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"other@example.com\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/accounts/" + customer).header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/accounts/" + customer).header("Authorization", "Bearer " + token(first, 1))).andExpect(status().isMethodNotAllowed());
    }
    @Test void concurrentDemotionsAlwaysLeaveOneActiveAdministrator() throws Exception {
        var executor = Executors.newFixedThreadPool(2); var barrier = new CyclicBarrier(2);
        try {
            List<Callable<Integer>> tasks = List.of(() -> demote(first, barrier), () -> demote(second, barrier));
            var results = executor.invokeAll(tasks);
            assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(200, 409);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM Users WHERE RoleID=1 AND IsActive=1", Integer.class)).isEqualTo(1);
        } finally { executor.shutdownNow(); }
    }
    private int demote(int id, CyclicBarrier barrier) throws Exception {
        barrier.await();
        try { accounts.update(id, new vn.shoegroup.security.ApiUser(id, true), Map.of("role_id", 2)); return 200; }
        catch (ApiException ex) { assertThat(ex.code).isEqualTo("LAST_ACTIVE_ADMIN"); return ex.status; }
    }
    @Test void accountCreationKeepsHashFormatAndSelfLockIsRejected() throws Exception {
        String bearer = "Bearer " + token(first, 1);
        mvc.perform(post("/api/accounts").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"new@example.com\",\"name\":\"New\",\"password\":\"new-password\",\"role_id\":2}"))
            .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT PasswordHash FROM Users WHERE Email='new@example.com'", String.class)).startsWith("scrypt$16384$8$1$");
        mvc.perform(put("/api/accounts/" + first).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
            .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT IsActive FROM Users WHERE UserID=?", Boolean.class, first)).isTrue();
    }
}
