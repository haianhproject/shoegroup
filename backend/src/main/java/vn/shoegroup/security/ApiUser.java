// Mục đích: Chứa thông tin người dùng đã xác thực để các API kiểm tra vai trò và quyền sở hữu.
package vn.shoegroup.security;

public record ApiUser(long id, boolean admin, boolean employee) {
    public ApiUser(long id, boolean admin) { this(id, admin, false); }
    public boolean staff() { return admin || employee; }
}
