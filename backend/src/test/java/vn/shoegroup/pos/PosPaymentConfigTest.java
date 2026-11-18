package vn.shoegroup.pos;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.shoegroup.events.AdminEvents;

class PosPaymentConfigTest {
    @Test void customerAndPosRoutesUseTheSameConfiguredMerchant() throws Exception {
        var environment = new MockEnvironment().withProperty("POS_BANK_ID", "970415")
            .withProperty("POS_BANK_NAME", "Audit bank").withProperty("POS_BANK_ACCOUNT_NO", "123456789")
            .withProperty("POS_BANK_ACCOUNT_NAME", "AUDIT SHOP");
        var mvc = MockMvcBuilders.standaloneSetup(new PosController(mock(PosCartService.class), mock(AdminEvents.class), environment)).build();
        for (String route : new String[] { "/api/payment-config", "/api/pos/payment-config" }) {
            mvc.perform(get(route)).andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.bankId").value("970415"))
                .andExpect(jsonPath("$.accountNo").value("123456789"))
                .andExpect(jsonPath("$.accountName").value("AUDIT SHOP"));
        }
    }

    @Test void unconfiguredMerchantReturnsAnEmptyAccount() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new PosController(mock(PosCartService.class), mock(AdminEvents.class), new MockEnvironment())).build();
        mvc.perform(get("/api/payment-config")).andExpect(status().isOk())
            .andExpect(jsonPath("$.configured").value(false)).andExpect(jsonPath("$.bankId").value(""))
            .andExpect(jsonPath("$.accountNo").value(""));
    }
}
