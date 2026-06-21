<template>
  <div class="fixed-overlay d-flex flex-column bg-light-gray font-sans" style="overflow-x: hidden;">
    
    <aside class="sidebar-left bg-sidebar text-white position-fixed top-0 start-0 h-100 d-flex flex-column transition-sidebar z-index-1050 shadow-lg"
           :style="{ width: '260px', transform: isNavOpen ? 'translateX(0)' : 'translateX(-100%)' }">
      
      <div class="p-4 d-flex align-items-center justify-content-center border-bottom border-secondary border-opacity-25" style="height: 72px;">
        <h3 class="fw-bolder text-uppercase m-0 tracking-wider text-white fs-4"><i class="bi bi-box-fill me-2 fs-5"></i>SHOEGROUP</h3>
      </div>

      <div class="flex-grow-1 overflow-auto py-3 px-3 list-group custom-scrollbar-dark">
        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 tracking-wide" style="font-size: 0.65rem;">Quản Trị Hệ Thống</p>
        <button @click="changeTab('dashboard')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'dashboard' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-grid-1x2-fill me-3 fs-6"></i> Tổng Quan Doanh Thu
        </button>
        
        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Mặt Hàng</p>
        <button @click="changeTab('products')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'products' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-box-seam-fill me-3 fs-6"></i> Quản Lý Sản Phẩm
        </button>
        <button @click="changeTab('categories')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'categories' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-tags-fill me-3 fs-6"></i> Nhóm Danh Mục
        </button>

        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Đối Tác & Tiếp Thị</p>
        <button @click="changeTab('discounts')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'discounts' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-ticket-perforated-fill me-3 fs-6"></i> Mã Khuyến Mãi
        </button>
        <button @click="changeTab('customers')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'customers' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-people-fill me-3 fs-6"></i> Khách Hàng (CRM)
        </button>

        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Bảo Mật</p>
        <button @click="changeTab('accounts')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'accounts' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-shield-lock-fill me-3 fs-6"></i> Quản Trị Viên
        </button>
      </div>

      <div class="p-4 bg-sidebar-darker mt-auto border-top border-secondary border-opacity-25">
        <router-link to="/" class="btn btn-outline-light rounded-3 w-100 fw-medium shadow-sm py-2">
          <i class="bi bi-box-arrow-left me-2"></i> Trở Về Cửa Hàng
        </router-link>
      </div>
    </aside>

    <main class="flex-grow-1 transition-main d-flex flex-column bg-light-gray" :style="{ marginLeft: isNavOpen ? '260px' : '0' }">
      
      <header class="d-flex justify-content-between align-items-center px-4 bg-white shadow-sm z-index-10 position-sticky top-0" style="height: 72px;">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-dark bg-light-gray" style="width: 40px; height: 40px;" @click="isNavOpen = !isNavOpen">
             <i class="bi bi-list fs-5"></i>
          </button>
          <h2 class="h5 mb-0 fw-bold text-dark d-none d-md-block tracking-wide">{{ activeTabTitle }}</h2>
        </div>
        <span class="badge bg-dark text-white rounded-pill px-3 py-2 fw-medium shadow-sm border border-secondary">
           <i class="bi bi-database-check text-success me-2"></i>Kết nối Online
        </span>
      </header>

      <div v-if="isLoading" class="d-flex flex-column justify-content-center align-items-center h-100 flex-grow-1">
          <div class="spinner-border text-dark mb-3"></div><p class="fw-medium text-secondary">Đang nạp dữ liệu từ CSDL...</p>
      </div>

      <div v-else class="p-4 flex-grow-1 overflow-auto custom-scrollbar-light">
        
        <div v-show="activeTab === 'dashboard'" class="fade-in">
          <div class="row g-4 mb-4">
            <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-dark text-white h-100 p-4 dashboard-card">
                <p class="text-white-50 fw-semibold mb-2">Tổng Doanh Thu Khách Hàng</p>
                <h3 class="fw-bold m-0">{{ formatPrice(totalRevenue) }}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-white h-100 p-4 dashboard-card">
                <p class="text-secondary fw-semibold mb-2">Sản Phẩm Trưng Bày</p>
                <h3 class="fw-bold text-dark m-0">{{ db.products.length }} <i class="bi bi-box-seam ms-1 opacity-25"></i></h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-white h-100 p-4 dashboard-card">
                <p class="text-secondary fw-semibold mb-2">Voucher Phát Hành</p>
                <h3 class="fw-bold text-dark m-0">{{ db.discounts.length }} <i class="bi bi-ticket-detailed ms-1 opacity-25"></i></h3>
              </div>
            </div>
             <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-white h-100 p-4 dashboard-card">
                <p class="text-secondary fw-semibold mb-2">Hồ Sơ Khách Hàng</p>
                <h3 class="fw-bold text-dark m-0">{{ db.customers.length }} <i class="bi bi-people ms-1 opacity-25"></i></h3>
              </div>
            </div>
          </div>
          <div class="card rounded-4 border-0 shadow-sm bg-white p-4 mt-2">
             <h5 class="fw-bold text-dark mb-4">Biểu Đồ Tăng Trưởng Doanh Thu (2026)</h5>
             <div style="height: 380px; width: 100%; position: relative;">
                <canvas id="waveChart"></canvas>
             </div>
          </div>
        </div>

        <div v-if="activeTab === 'products'" class="fade-in">
          <div v-if="!showForm.products" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Danh Sách Mặt Hàng</h5>
              <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('products')"><i class="bi bi-plus-lg me-2"></i>Thêm Mới</button>
            </div>
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Mã SP</th><th>Tên Sản Phẩm</th><th>Danh Mục</th><th class="text-end">Giá Bán</th><th class="text-center">Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="p in db.products" :key="p.id">
                  <td class="text-secondary">#{{ p.id }}</td><td class="fw-bold text-dark">{{ p.name }}</td><td class="text-secondary">{{ p.category }}</td>
                  <td class="fw-bold text-dark text-end">{{ formatPrice(p.price) }}</td>
                  <td class="text-center"><span class="badge" :class="p.active ? 'bg-success' : 'bg-secondary'">{{ p.active ? 'Đang bán' : 'Tạm ẩn' }}</span></td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border text-dark me-2 rounded-3 px-3" @click="openForm('products', p)"><i class="bi bi-pencil-square"></i> Sửa</button>
                    <button class="btn btn-sm btn-danger rounded-3 px-3" @click="deleteItem('products', p.id)"><i class="bi bi-trash"></i> Xóa</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-5 mx-auto" style="max-width: 600px;">
            <h5 class="fw-bold border-bottom pb-3 mb-4 text-center">{{ editId ? 'Cập Nhật Sản Phẩm' : 'Khai Báo Sản Phẩm Mới' }}</h5>
            <form @submit.prevent="saveForm('products')">
              <div class="mb-3"><label class="form-label text-secondary small fw-bold text-uppercase">Tên Sản Phẩm</label><input v-model="formData.name" type="text" class="form-control form-control-lg rounded-3" required></div>
              <div class="row mb-3">
                 <div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Giá Bán (VNĐ)</label><input v-model="formData.price" type="number" class="form-control form-control-lg rounded-3" required min="0"></div>
                 <div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Trạng thái</label><select v-model="formData.active" class="form-select form-select-lg rounded-3"><option :value="true">Đang bán</option><option :value="false">Tạm ẩn</option></select></div>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light border rounded-3 px-4 fw-medium" @click="showForm.products = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5 fw-bold">Lưu Dữ Liệu</button></div>
            </form>
          </div>
        </div>

        <div v-else-if="activeTab === 'categories'" class="fade-in">
          <div v-if="!showForm.categories" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden mx-auto" style="max-width: 800px;">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Quản Lý Phân Loại Nhóm</h5>
              <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('categories')"><i class="bi bi-plus-lg me-2"></i>Tạo Danh Mục</button>
            </div>
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Mã Nhóm</th><th>Tên Danh Mục</th><th class="text-center">Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="c in db.categories" :key="c.id">
                  <td class="text-secondary">#{{ c.id }}</td><td class="fw-bold text-dark">{{ c.name }}</td>
                  <td class="text-center"><span class="badge" :class="c.active ? 'bg-success' : 'bg-secondary'">{{ c.active ? 'Hoạt động' : 'Tạm ẩn' }}</span></td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border text-dark me-2 rounded-3 px-3" @click="openForm('categories', c)"><i class="bi bi-pencil-square"></i> Sửa</button>
                    <button class="btn btn-sm btn-danger rounded-3 px-3" @click="deleteItem('categories', c.id)"><i class="bi bi-trash"></i> Xóa</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-5 mx-auto" style="max-width: 500px;">
             <h5 class="fw-bold border-bottom pb-3 mb-4 text-center">{{ editId ? 'Sửa Tên Danh Mục' : 'Tạo Danh Mục Mới' }}</h5>
             <form @submit.prevent="saveForm('categories')">
               <div class="mb-4"><label class="form-label text-secondary small fw-bold text-uppercase">Tên Danh Mục</label><input v-model="formData.name" type="text" class="form-control form-control-lg rounded-3" required></div>
               <div class="mb-4"><label class="form-label text-secondary small fw-bold text-uppercase">Trạng thái</label><select v-model="formData.active" class="form-select form-select-lg rounded-3"><option :value="true">Hoạt động</option><option :value="false">Tạm ẩn</option></select></div>
               <div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light border rounded-3 px-4 fw-medium" @click="showForm.categories = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5 fw-bold">Lưu Lại</button></div>
             </form>
          </div>
        </div>

        <div v-else-if="activeTab === 'discounts'" class="fade-in">
          <div v-if="!showForm.discounts" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
             <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Sổ Quản Lý Voucher</h5>
              <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('discounts')"><i class="bi bi-plus-lg me-2"></i>Tạo Mã Mới</button>
            </div>
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Mã Voucher</th><th class="text-center">Chiết Khấu</th><th class="text-center">Số Lượng Đã Dùng</th><th>Hết hạn</th><th class="text-center">Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
              <tbody>
                <tr v-for="d in db.discounts" :key="d.id">
                  <td class="fw-bolder text-dark tracking-wide"><i class="bi bi-ticket-detailed me-2 text-secondary"></i> {{ d.code }}</td>
                  <td class="text-center fw-bold text-danger fs-6">-{{ d.percent }}%</td>
                  <td class="text-center">{{ d.used }} / {{ d.limit }}</td>
                  <td class="text-secondary">{{ d.expiry }}</td>
                  <td class="text-center"><span class="badge" :class="d.active ? 'bg-success' : 'bg-secondary'">{{ d.active ? 'Đang bật' : 'Đã khóa' }}</span></td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border text-dark me-2 rounded-3 px-3" @click="openForm('discounts', d)"><i class="bi bi-pencil-square"></i> Sửa</button>
                    <button class="btn btn-sm btn-danger rounded-3 px-3" @click="deleteItem('discounts', d.id)"><i class="bi bi-trash"></i> Xóa</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-5 mx-auto" style="max-width: 600px;">
             <h5 class="fw-bold border-bottom pb-3 mb-4 text-center">{{ editId ? 'Sửa Mã Khuyến Mãi' : 'Phát Hành Mã Giảm Giá' }}</h5>
             <form @submit.prevent="saveForm('discounts')">
               <div class="mb-4"><label class="form-label text-secondary small fw-bold text-uppercase">Mã Voucher (Viết liền in hoa)</label><input v-model="formData.code" type="text" class="form-control form-control-lg rounded-3 text-uppercase fw-bold" required></div>
               <div class="row mb-4">
                 <div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Mức giảm (%)</label><input v-model="formData.percent" type="number" min="1" max="100" class="form-control form-control-lg rounded-3" required></div>
                 <div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Giới hạn số lượt</label><input v-model="formData.limit" type="number" class="form-control form-control-lg rounded-3" required min="1"></div>
               </div>
               <div class="row mb-4">
                 <div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Ngày hết hạn</label><input v-model="formData.expiry" type="date" class="form-control form-control-lg rounded-3" required></div>
                 <div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Trạng thái phát hành</label><select v-model="formData.active" class="form-select form-select-lg rounded-3"><option :value="true">Bật</option><option :value="false">Tắt</option></select></div>
               </div>
               <div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light border rounded-3 px-4 fw-medium" @click="showForm.discounts = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5 fw-bold">Lưu Mã</button></div>
             </form>
          </div>
        </div>

        <div v-else-if="activeTab === 'customers'" class="fade-in card rounded-4 border-0 shadow-sm bg-white mx-auto" style="max-width: 900px;">
           <div class="card-header bg-white border-bottom py-3 px-4"><h5 class="mb-0 fw-semibold fs-6">Hồ Sơ Quan Hệ Khách Hàng (CRM)</h5></div>
           <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Định Danh KH</th><th>Họ & Tên</th><th>Số Điện Thoại</th><th class="text-end pe-4">Tổng Đã Chi Tiêu (LTV)</th></tr></thead>
              <tbody>
                <tr v-for="cus in db.customers" :key="cus.id">
                  <td class="text-secondary fw-medium">#CUS-00{{ cus.id }}</td>
                  <td class="fw-bold text-dark">{{ cus.name }}</td>
                  <td><i class="bi bi-telephone text-secondary me-2"></i>{{ cus.phone || 'Trống' }}</td>
                  <td class="text-end fw-bold text-success pe-4">{{ formatPrice(cus.spent) }}</td>
                </tr>
              </tbody>
            </table>
        </div>

        <div v-else-if="activeTab === 'accounts'" class="fade-in card rounded-4 border-0 shadow-sm bg-white mx-auto" style="max-width: 900px;">
           <div class="card-header bg-white border-bottom py-3 px-4"><h5 class="mb-0 fw-semibold fs-6">Tài Khoản Quản Trị Hệ Thống</h5></div>
           <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Email Đăng Nhập</th><th>Tên Nhân Sự</th><th class="text-center pe-4">Quyền Hạn Bảng Điều Khiển</th></tr></thead>
              <tbody>
                <tr v-for="acc in db.accounts" :key="acc.username">
                  <td class="fw-bold text-dark">{{ acc.username }}</td><td class="text-secondary">{{ acc.name }}</td>
                  <td class="text-center pe-4"><span class="badge bg-dark text-white rounded-pill px-3">Quản Trị Viên (CEO)</span></td>
                </tr>
              </tbody>
            </table>
        </div>

      </div>
    </main>

    <div v-if="confirmModal.isOpen" class="custom-modal-overlay d-flex align-items-center justify-content-center z-index-2000">
      <div class="card rounded-4 border-0 shadow-lg bg-white p-4 text-center fade-in-scale mx-3" style="max-width: 380px; width: 100%;">
        <div class="mb-3 text-danger"><i class="bi bi-exclamation-circle fs-1"></i></div>
        <h5 class="fw-bold text-dark mb-2 tracking-wide fs-5">Cảnh Báo Xóa</h5>
        <p class="text-secondary small mb-4 px-2" style="line-height: 1.5;">Dữ liệu sẽ bị xóa vĩnh viễn khỏi CSDL SQL Server và không thể khôi phục. Bạn chắc chắn chứ?</p>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-light border rounded-3 fw-medium px-4 text-dark small" @click="confirmModal.isOpen = false">Hủy Bỏ</button>
          <button class="btn btn-danger rounded-3 fw-medium px-4 small" @click="executeConfirm">Tiến Hành Xóa</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import Chart from 'chart.js/auto'

const isNavOpen = ref(true)
const activeTab = ref('dashboard') 
const isLoading = ref(true) 

const menuTitles = {
  'dashboard': 'Báo Cáo Tổng Quan Cửa Hàng',
  'products': 'Quản Lý Sản Phẩm Kinh Doanh',
  'categories': 'Danh Mục Mặt Hàng',
  'discounts': 'Chiến Dịch Mã Giảm Giá',
  'customers': 'Quản Trị Khách Hàng (CRM)',
  'accounts': 'Thiết Lập Bảo Mật & Phân Quyền'
}
const activeTabTitle = computed(() => menuTitles[activeTab.value] || '')

const db = reactive({ products: [], categories: [], discounts: [], customers: [], accounts: [], chartData: [] })
const showForm = reactive({ products: false, categories: false, discounts: false })
const formData = ref({})
const editId = ref(null)

const totalRevenue = computed(() => db.customers.reduce((sum, cus) => sum + (Number(cus.spent) || 0), 0))

const changeTab = async (tabId) => {
  activeTab.value = tabId; showForm.products = false; showForm.categories = false; showForm.discounts = false;
  if (window.innerWidth < 992) isNavOpen.value = false;
  
  // Vẽ biểu đồ khi vào trang Dashboard
  if (tabId === 'dashboard') { await nextTick(); renderWaveChart(); }
}

const fetchAllData = async () => {
  isLoading.value = true;
  try {
    const api = (url) => fetch(url).then(r => r.ok ? r.json() : []).catch(() => []);
    
    // Tải song song tất cả các bảng
    const [p, c, d, cus, acc, ch] = await Promise.all([
       api('http://localhost:5000/api/products'), api('http://localhost:5000/api/categories'),
       api('http://localhost:5000/api/discounts'), api('http://localhost:5000/api/customers'),
       api('http://localhost:5000/api/accounts'), api('http://localhost:5000/api/chart-data')
    ]);
    
    db.products = p; db.categories = c; db.discounts = d; db.customers = cus; db.accounts = acc; db.chartData = ch;
    
    if(activeTab.value === 'dashboard') { await nextTick(); renderWaveChart(); }
  } catch (error) { console.error("Lỗi Fetch Data", error); } 
  finally { isLoading.value = false; }
}
onMounted(() => fetchAllData())

// ================= THUẬT TOÁN VẼ BIỂU ĐỒ SÓNG CỰC ĐẸP =================
let chartInstance = null;
const renderWaveChart = () => {
  const ctx = document.getElementById('waveChart');
  if(!ctx) return;
  if(chartInstance) chartInstance.destroy();
  
  // Tạo hiệu ứng Gradient lan tỏa từ Đen nhạt xuống Trắng
  let gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)'); 
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  // Biến đổi dữ liệu SQL thành dữ liệu Vẽ đồ thị
  let labels = db.chartData.length > 0 ? db.chartData.map(d => `Tháng ${d.month}`) : ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'];
  let dataPoints = db.chartData.length > 0 ? db.chartData.map(d => d.total) : [2500000, 3200000, 4500000, 2500000, 3200000, 4500000];

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels, 
      datasets: [{
        label: 'Doanh thu (VNĐ)',
        data: dataPoints,
        borderColor: '#000', borderWidth: 3, 
        tension: 0.4, // Con số ma thuật tạo ra "Sóng"
        fill: true, backgroundColor: gradient, pointBackgroundColor: '#fff', pointBorderColor: '#000', pointRadius: 5
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  })
}

// ================= HÀM XỬ LÝ LƯU (POST/PUT) VÀ XÓA =================
const openForm = (type, item = null) => {
  editId.value = item ? item.id : null;
  formData.value = item ? { ...item } : (type === 'products' ? { name: '', price: 0, active: true } : type === 'categories' ? { name: '', active: true } : { code: '', percent: 10, limit: 100, expiry: '', active: true });
  showForm[type] = true;
}

const saveForm = async (type) => {
  const method = editId.value ? 'PUT' : 'POST';
  const url = `http://localhost:5000/api/${type}${editId.value ? `/${editId.value}` : ''}`;
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData.value) });
  showForm[type] = false; fetchAllData();
}

const confirmModal = reactive({ isOpen: false, onConfirmCallback: null })
const executeConfirm = () => { if (confirmModal.onConfirmCallback) confirmModal.onConfirmCallback(); confirmModal.isOpen = false }

const deleteItem = (type, id) => {
  confirmModal.onConfirmCallback = async () => {
     await fetch(`http://localhost:5000/api/${type}/${id}`, { method: 'DELETE' });
     fetchAllData();
  };
  confirmModal.isOpen = true; // Mở Modal Cảnh báo lên
}

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
</script>

<style scoped>
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.font-sans { font-family: 'Inter', sans-serif; }
.bg-light-gray { background-color: #f3f4f6; }
.bg-sidebar { background-color: #000000; }
.bg-sidebar-darker { background-color: #111111; } 
.tracking-wider { letter-spacing: 1.5px; }
.tracking-wide { letter-spacing: 0.5px; }
.fixed-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; }
.transition-main { transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.transition-sidebar { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.z-index-2000 { z-index: 2000; }
.z-index-1050 { z-index: 1050; }
.z-index-10 { z-index: 10; }
.custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); z-index: 2000; }
.fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-in-scale { animation: fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.dashboard-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.dashboard-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.06) !important; }
.custom-nav-item { transition: all 0.2s ease; color: rgba(255, 255, 255, 0.6) !important; padding: 12px 16px; font-size: 0.85rem; }
.custom-nav-item:hover { color: #fff !important; background-color: rgba(255, 255, 255, 0.06) !important; }
.active-nav { background-color: #ffffff !important; color: #000 !important; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.active-nav i { color: #000 !important; }
.form-control:focus, .form-select:focus { border-color: #000; box-shadow: 0 0 0 0.15rem rgba(0, 0, 0, 0.15); }
::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar-light::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
</style>