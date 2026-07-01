<script setup>
import { computed, ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, logout } from '../stores/authStore'
import { formatCurrency } from '../stores/cartStore'

const router = useRouter()
const selectedOrder = ref(null)
const orders = ref([])
const isLoading = ref(true)

// Biến quản lý trạng thái của Popup Hủy Đơn Hàng
const cancelModal = reactive({
  isOpen: false,
  orderId: null,
  reason: ''
})

const displayName = computed(() => currentUser.value?.full_name || currentUser.value?.name || 'Khách hàng')

const handleLogout = () => {
  logout()
  router.push('/login')
}

// Bấm vào "Chi tiết" để xem chi tiết đơn hàng
const openOrder = (order) => {
  selectedOrder.value = order
}

// Tải lịch sử đơn hàng từ API
const fetchUserOrders = async () => {
  if(!currentUser.value) return;
  isLoading.value = true;
  try {
    const res = await fetch(`http://localhost:5000/api/orders`);
    const data = await res.json();
    const userId = currentUser.value.id_user || currentUser.value.id;
    orders.value = data.filter(o => o.user_id === userId);
    
    // Nếu Popup chi tiết đang mở, cập nhật lại thông tin mới nhất cho nó (ví dụ khi vừa bấm hủy xong)
    if (selectedOrder.value) {
      selectedOrder.value = orders.value.find(o => o.id === selectedOrder.value.id);
    }
  } catch (error) {
    console.error("Lỗi lấy lịch sử đơn hàng:", error);
  } finally {
    isLoading.value = false;
  }
}

// Hàm lấy màu sắc Badge cho từng Trạng thái
const getStatusBadge = (status) => {
  if (status === 'Đã hủy') return 'bg-danger text-white';
  if (status === 'Đã giao hàng thành công') return 'bg-success text-white';
  if (status === 'Đang vận chuyển') return 'bg-info text-white';
  if (status === 'Đã xác nhận') return 'bg-primary text-white';
  return 'bg-warning text-dark';
}

// Mở Popup yêu cầu nhập lý do hủy đơn
const openCancelModal = (orderId) => {
  cancelModal.orderId = orderId;
  cancelModal.reason = '';
  cancelModal.isOpen = true;
}

// Hàm xử lý gửi yêu cầu HỦY ĐƠN HÀNG xuống CSDL
const submitCancelOrder = async () => {
  if (!cancelModal.reason.trim()) {
    alert("Vui lòng nhập lý do hủy đơn hàng!");
    return;
  }
  
  try {
    // Gọi API của server để đổi trạng thái thành "Đã hủy" và lưu CancelReason
    const response = await fetch(`http://localhost:5000/api/orders/${cancelModal.orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Đã hủy',
        reason: cancelModal.reason
      })
    });
    
    const data = await response.json();
    if (data.success) {
      alert("Hủy đơn hàng thành công!");
      cancelModal.isOpen = false;
      fetchUserOrders(); // Tải lại danh sách đơn hàng để cập nhật trạng thái ngay lập tức
    } else {
      alert("Lỗi máy chủ: " + data.message);
    }
  } catch (e) {
    console.error(e);
    alert("Không thể kết nối đến máy chủ.");
  }
}

onMounted(() => {
  if (!currentUser.value) {
    router.push('/login')
  } else {
    fetchUserOrders()
  }
})
</script>

<template>
  <div class="container-fluid px-4 py-5 bg-light min-vh-100 position-relative">
    <div class="container">
      <h1 class="fw-bold mb-4 fs-2">Tài Khoản</h1>
      <div class="row g-4">
        
        <!-- Sidebar Menu -->
        <div class="col-md-4 col-lg-3">
          <div class="d-flex flex-column gap-2 bg-white rounded-4 p-3 shadow-sm">
            <div class="px-3 py-2">
              <p class="small text-secondary mb-1">Xin chào</p>
              <h6 class="fw-bold mb-0">{{ displayName }}</h6>
            </div>
            <router-link to="/account" class="btn text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 text-secondary" exact-active-class="btn-dark text-white">
              <i class="bi bi-person"></i> Hồ sơ
            </router-link>
            <router-link to="/orders" class="btn text-start border-0 fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2" exact-active-class="btn-dark text-white">
              <i class="bi bi-box"></i> Đơn hàng
            </router-link>
            <hr class="my-2 text-secondary">
            <button type="button" class="btn btn-outline-danger text-start fw-bold px-3 py-2 rounded-3 d-flex align-items-center gap-2 border-0 bg-danger-hover" @click="handleLogout">
              <i class="bi bi-box-arrow-right"></i> Đăng xuất
            </button>
          </div>
        </div>
        
        <!-- Cột Nội dung -->
        <div class="col-md-8 col-lg-9">
          <!-- Bảng Danh Sách Đơn Hàng -->
          <div class="card border-0 rounded-4 shadow-sm overflow-hidden">
            <div class="p-4 border-bottom bg-white d-flex align-items-center justify-content-between">
              <h2 class="fw-bold fs-4 m-0">Đơn hàng của bạn</h2>
              <button class="btn btn-sm btn-light border shadow-sm" @click="fetchUserOrders">
                <i class="bi bi-arrow-clockwise"></i> Làm mới
              </button>
            </div>
            
            <div v-if="isLoading" class="text-center py-5">
               <div class="spinner-border text-dark"></div>
               <p class="mt-2 text-secondary">Đang tải dữ liệu...</p>
            </div>

            <div v-else-if="orders.length === 0" class="text-center py-5 px-4">
              <i class="bi bi-receipt fs-1 text-secondary opacity-50"></i>
              <h5 class="fw-bold mt-3">Chưa có đơn hàng nào</h5>
              <p class="text-secondary mb-4">Hãy mua sắm để lấp đầy lịch sử của bạn nhé.</p>
              <router-link to="/products" class="btn btn-dark fw-bold rounded-3 px-4 py-2">
                Mua sắm ngay
              </router-link>
            </div>
            
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0 align-middle">
                <thead class="table-light text-secondary text-uppercase small bg-light">
                  <tr>
                    <th class="py-3 px-4 fw-bold text-nowrap">Mã Đơn</th>
                    <th class="py-3 px-4 fw-bold text-nowrap">Ngày Đặt</th>
                    <th class="py-3 px-4 fw-bold text-center">Trạng thái</th>
                    <th class="py-3 px-4 fw-bold text-end">Tổng tiền</th>
                    <th class="py-3 px-4 fw-bold text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in orders" :key="order.id" class="cursor-pointer" @click="openOrder(order)">
                    <td class="py-3 px-4 fw-bold text-dark">#ORD-{{ order.id }}</td>
                    <td class="py-3 px-4 text-secondary small fw-semibold">{{ order.date }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge rounded-pill fw-bold px-3 py-2 shadow-sm" :class="getStatusBadge(order.status)">
                        {{ order.status }}
                      </span>
                    </td>
                    <td class="py-3 px-4 fw-bold text-danger text-end">{{ formatCurrency(order.total) }}</td>
                    <td class="py-3 px-4 text-end" @click.stop>
                      <button class="btn btn-sm btn-outline-dark fw-bold px-3 py-1 rounded-3" @click="openOrder(order)">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Màn hình Chi tiết Đơn hàng (Hiển thị bên dưới Bảng) -->
          <div v-if="selectedOrder" class="card border-0 rounded-4 shadow-sm mt-4 overflow-hidden fade-in border border-dark">
            <div class="p-4 border-bottom bg-dark text-white d-flex justify-content-between align-items-center gap-3">
              <div>
                <h3 class="fw-bold fs-5 mb-1">Chi tiết đơn: #ORD-{{ selectedOrder.id }}</h3>
                <p class="text-white-50 mb-0 small"><i class="bi bi-clock"></i> Ngày đặt: {{ selectedOrder.date }}</p>
              </div>
              <button type="button" class="btn btn-outline-light rounded-circle btn-sm" @click="selectedOrder = null">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            
            <div class="card-body p-4">
              <div class="row g-4">
                <!-- Danh sách sản phẩm -->
                <div class="col-lg-7 border-end">
                  <h5 class="fw-bold mb-3 border-bottom pb-2">Sản phẩm đã mua</h5>
                  <div class="d-flex flex-column gap-3">
                    <div v-for="(item, idx) in selectedOrder.products" :key="idx" class="d-flex gap-3 align-items-center border rounded-3 p-3 bg-light">
                      <div class="bg-white rounded-3 overflow-hidden border flex-shrink-0" style="width: 70px; height: 70px;">
                        <img :src="item.image" :alt="item.name" class="w-100 h-100 object-fit-cover mix-blend-multiply">
                      </div>
                      <div class="flex-grow-1">
                        <h6 class="fw-bold mb-1 small">{{ item.name }}</h6>
                        <p class="text-secondary small mb-1">
                          Size {{ item.size }} | Màu {{ item.color }} | SL: x{{ item.quantity }}
                        </p>
                        <p class="fw-bold text-danger mb-0">{{ formatCurrency(item.price) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Cột thông tin Giao hàng & Tổng tiền -->
                <div class="col-lg-5">
                  <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                    <h5 class="fw-bold m-0">Thông tin Nhận hàng</h5>
                    <span class="badge rounded-pill fw-bold px-3 py-2" :class="getStatusBadge(selectedOrder.status)">
                      {{ selectedOrder.status }}
                    </span>
                  </div>
                  
                  <div class="bg-light rounded-3 p-3 mb-3 border">
                    <p class="mb-2 small"><strong><i class="bi bi-person-fill text-secondary me-1"></i> Người nhận:</strong> <span class="text-dark">{{ selectedOrder.customer_name }}</span></p>
                    <p class="mb-2 small"><strong><i class="bi bi-telephone-fill text-secondary me-1"></i> Số ĐT:</strong> <span class="text-dark">{{ selectedOrder.customer_phone || 'Chưa cập nhật' }}</span></p>
                    <p class="mb-2 small lh-base"><strong><i class="bi bi-geo-alt-fill text-secondary me-1"></i> Địa chỉ:</strong> <span class="text-dark">{{ selectedOrder.customer_address }}</span></p>
                    <p class="mb-0 small text-secondary"><strong><i class="bi bi-credit-card-fill me-1"></i> Thanh toán:</strong> {{ selectedOrder.paymentMethod || 'COD' }}</p>
                    <div v-if="selectedOrder.note" class="mt-2 p-2 bg-white border rounded small text-secondary">
                      <strong>Ghi chú:</strong> {{ selectedOrder.note }}
                    </div>
                  </div>
                  
                  <div class="d-flex justify-content-between mb-2 small text-secondary">
                    <span>Tạm tính SP</span>
                    <strong class="text-dark">{{ formatCurrency(selectedOrder.total - selectedOrder.shippingFee + selectedOrder.discount) }}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2 small text-secondary">
                    <span>Phí vận chuyển</span>
                    <strong class="text-dark">+ {{ formatCurrency(selectedOrder.shippingFee) }}</strong>
                  </div>
                  <div v-if="selectedOrder.discount > 0" class="d-flex justify-content-between mb-2 small text-success">
                    <span>Đã giảm giá</span>
                    <strong>- {{ formatCurrency(selectedOrder.discount) }}</strong>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between fs-5 fw-bold text-danger mb-4">
                    <span>Thành tiền</span>
                    <span>{{ formatCurrency(selectedOrder.total) }}</span>
                  </div>
                  
                  <!-- PHẦN XỬ LÝ NÚT HỦY / THÔNG BÁO HỦY ĐƠN HÀNG -->
                  <div v-if="selectedOrder.status === 'Đã hủy'" class="alert alert-danger p-3 small rounded-3 border-danger border-opacity-25">
                    <h6 class="fw-bold text-danger mb-1"><i class="bi bi-exclamation-triangle-fill"></i> Đơn hàng đã bị hủy</h6>
                    <span class="text-dark"><strong>Lý do:</strong> {{ selectedOrder.cancel_reason || 'Không rõ' }}</span>
                  </div>

                  <button 
                    v-if="selectedOrder.status === 'Chờ xác nhận'" 
                    class="btn btn-outline-danger w-100 fw-bold rounded-3 shadow-sm py-2"
                    @click="openCancelModal(selectedOrder.id)"
                  >
                    <i class="bi bi-x-circle me-1"></i> HỦY ĐƠN HÀNG NÀY
                  </button>
                  <p v-if="['Đã xác nhận', 'Đang vận chuyển'].includes(selectedOrder.status)" class="text-secondary small text-center fst-italic mt-2">
                    Đơn hàng đang được xử lý, không thể hủy.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
    
    <!-- MODAL POPUP: FORM NHẬP LÝ DO HỦY ĐƠN HÀNG MÀU ĐEN MỜ -->
    <div v-if="cancelModal.isOpen" class="modal-overlay d-flex align-items-center justify-content-center" @click.self="cancelModal.isOpen = false">
      <div class="card border-0 rounded-4 shadow-lg p-4 fade-in-scale" style="max-width: 400px; width: 100%;">
        <div class="text-center mb-3">
          <i class="bi bi-x-circle-fill text-danger display-4"></i>
        </div>
        <h5 class="fw-bold text-center mb-3">Xác nhận hủy đơn hàng</h5>
        <p class="text-secondary small text-center mb-3">
          Bạn có chắc chắn muốn hủy đơn hàng <strong>#ORD-{{ cancelModal.orderId }}</strong> không? Hành động này không thể hoàn tác.
        </p>
        
        <div class="mb-4">
          <label class="form-label small fw-bold text-dark">Lý do hủy (Bắt buộc):</label>
          <textarea v-model="cancelModal.reason" class="form-control bg-light rounded-3" rows="3" placeholder="Ví dụ: Đổi ý, sai địa chỉ, muốn mua thêm..."></textarea>
        </div>
        
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-light border fw-medium px-4 rounded-3" @click="cancelModal.isOpen = false">Đóng</button>
          <button class="btn btn-danger fw-bold px-4 rounded-3 shadow-sm" :disabled="!cancelModal.reason.trim()" @click="submitCancelOrder">Xác nhận Hủy</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.bg-danger-hover:hover { background-color: #f8d7da; }
.object-fit-cover { object-fit: cover; }
.mix-blend-multiply { mix-blend-mode: multiply; }
.cursor-pointer { cursor: pointer; }

.fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}

/* Khung viền mờ cho Modal Hủy đơn */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
  z-index: 2000;
}
.fade-in-scale {
  animation: fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>