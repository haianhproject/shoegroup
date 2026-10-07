package vn.shoegroup.shipping;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.shoegroup.api.ApiException;

class ShippingServiceTest {
    @Test void provinceTakesPrecedenceOverStreetNamesAndUnknownProvinceRemainsEstimated() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var shipping = new ShippingService(jdbc, new ObjectMapper());
        var quote = shipping.quote(Map.of("province", "Thành phố Đà Nẵng", "district", "Vinh", "address", "Hai Bà Trưng"));
        assertThat(quote).containsEntry("distanceKm", 770).containsEntry("matchedProvince", "da nang").containsEntry("fee", 65000).containsEntry("estimatedDistance", false);
        assertThat(shipping.quote(Map.of("city", "Unknown", "address", "Ha Noi"))).containsEntry("distanceKm", 150).containsEntry("estimatedDistance", true);
        assertThat(shipping.quote(Map.of("shippingAddress", "Hai Bà Trưng, Hà Nội"))).containsEntry("distanceKm", 5).containsEntry("fee", 30000);
        assertThatThrownBy(() -> shipping.quote(Map.of("method_code", "EXPRESS"))).isInstanceOf(ApiException.class);
    }
    @Test void allShippingPriceAndEtaBoundariesArePreserved() {
        int[] distances = {0,20,21,50,51,120,121,300,301,600,601,1000,1001};
        int[] fees = {30000,30000,35000,35000,40000,40000,45000,45000,55000,55000,65000,65000,75000};
        for (int i = 0; i < distances.length; i++) assertThat(ShippingService.fee(distances[i])).isEqualTo(fees[i]);
        int[] etaDistances = {30,31,100,101,300,301,600,601,1200,1201};
        String[] etas = {"1 ngày","1-2 ngày","1-2 ngày","2 ngày","2 ngày","2-3 ngày","2-3 ngày","3-4 ngày","3-4 ngày","4-5 ngày"};
        for (int i = 0; i < etaDistances.length; i++) assertThat(ShippingService.eta(etaDistances[i])).isEqualTo(etas[i]);
    }
    @Test void unavailableDatabaseUsesCompatibleFallback() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString())).thenThrow(new DataAccessResourceFailureException("offline"));
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenThrow(new DataAccessResourceFailureException("offline"));
        var shipping = new ShippingService(jdbc, new ObjectMapper());
        assertThat(shipping.methods()).hasSize(1);
        assertThat(shipping.methods().get(0)).containsEntry("id", null).containsEntry("code", "STANDARD");
        assertThat(shipping.quote(Map.of())).containsEntry("methodId", null).containsEntry("fee", 45000);
    }
}
