// Mục đích: Biểu diễn lỗi nghiệp vụ với mã HTTP và mã lỗi gửi về frontend.
package vn.shoegroup.api;

public class ApiException extends RuntimeException {
    public final int status;
    public final String code;
    public ApiException(int status, String message) { this(status, null, message); }
    public ApiException(int status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
}
