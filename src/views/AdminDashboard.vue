<template>
  <div class="fixed-overlay d-flex flex-column bg-light-gray font-sans" style="overflow-x: hidden;">
    
    <aside class="sidebar-left bg-sidebar text-white position-fixed top-0 start-0 h-100 d-flex flex-column transition-sidebar z-index-1050 shadow-sm"
           :style="{ width: '260px', transform: isNavOpen ? 'translateX(0)' : 'translateX(-100%)' }">
      
      <div class="p-4 d-flex align-items-center justify-content-center border-bottom border-light border-opacity-10" style="height: 72px;">
        <h3 class="fw-bolder text-uppercase m-0 tracking-wider text-white fs-4">
          <i class="bi bi-box-fill me-2 fs-5"></i>SHOEGROUP
        </h3>
      </div>

      <div class="flex-grow-1 overflow-auto py-3 px-3 list-group custom-scrollbar-dark">
        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 tracking-wide" style="font-size: 0.65rem;">Hệ thống</p>
        <button @click="changeTab('dashboard')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'dashboard' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-grid-1x2-fill me-3 fs-6"></i> Tổng Quan
        </button>
        
        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Hàng Hóa & Kho</p>
        <button @click="changeTab('products')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'products' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-bag-check-fill me-3 fs-6"></i> Quản Lý Sản Phẩm
        </button>
        <button @click="changeTab('categories')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'categories' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-tags-fill me-3 fs-6"></i> Loại Sản Phẩm
        </button>
        <button @click="changeTab('inventory')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'inventory' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-box-seam-fill me-3 fs-6"></i> Lịch Sử Nhập Kho
        </button>

        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Thương Mại</p>
        <button @click="changeTab('orders')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'orders' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-receipt-cutoff me-3 fs-6"></i> Điều Phối Đơn Hàng
        </button>
        <button @click="changeTab('discounts')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'discounts' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-ticket-perforated-fill me-3 fs-6"></i> Mã Giảm Giá
        </button>

        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Đối Tác & Bảo Mật</p>
        <button @click="changeTab('customers')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'customers' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-people-fill me-3 fs-6"></i> Khách Hàng (CRM)
        </button>
        <button @click="changeTab('accounts')" class="list-group-item list-group-item-action border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex align-items-center" :class="activeTab === 'accounts' ? 'active-nav' : 'text-light bg-transparent'">
          <i class="bi bi-shield-lock-fill me-3 fs-6"></i> Phân Quyền
        </button>
      </div>

      <div class="p-4 bg-sidebar-darker mt-auto border-top border-light border-opacity-10">
        <div class="d-flex align-items-center mb-4">
          <div class="bg-white text-dark rounded-circle d-flex justify-content-center align-items-center fw-bolder shadow-sm me-3" style="width: 42px; height: 42px; font-size: 1rem;">
            HA
          </div>
          <div class="overflow-hidden">
            <p class="mb-0 fw-semibold text-truncate text-white" style="font-size: 0.9rem;">Hải Anh</p>
            <small class="text-white-50" style="font-size: 0.75rem;">Giám đốc vận hành</small>
          </div>
        </div>
        <router-link to="/" class="btn btn-outline-light rounded-3 w-100 fw-medium shadow-sm py-2" style="font-size: 0.85rem; border-color: rgba(255,255,255,0.2);">
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
        <div class="d-flex align-items-center gap-3">
           <span class="badge bg-dark text-white rounded-pill px-3 py-2 fw-medium border shadow-sm">
             <i class="bi bi-circle-fill text-success me-2" style="font-size: 0.5rem;"></i>Hệ thống Trực tuyến
           </span>
        </div>
      </header>

      <div class="p-4 flex-grow-1 overflow-auto custom-scrollbar-light">
        
        <div v-if="activeTab === 'dashboard'" class="fade-in">
          <div class="row g-4 mb-4">
            <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-white h-100 dashboard-card p-2">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <p class="text-secondary fw-semibold mb-0" style="font-size: 0.85rem;">Doanh Thu Thực Tế</p>
                    <div class="bg-light text-dark rounded-circle d-flex align-items-center justify-content-center border" style="width: 36px; height: 36px;">
                      <i class="bi bi-cash-stack"></i>
                    </div>
                  </div>
                  <h3 class="fw-bold text-dark mb-0">{{ formatPrice(db.orders.reduce((sum, o) => o.status === 'Đã giao' ? sum + o.total : sum, 0)) }}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-dark text-white h-100 dashboard-card p-2">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <p class="text-white-50 fw-semibold mb-0" style="font-size: 0.85rem;">Đơn Chờ Xử Lý</p>
                    <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                      <i class="bi bi-cart-exclamation"></i>
                    </div>
                  </div>
                  <h3 class="fw-bold mb-0 text-white">{{ db.orders.filter(o => o.status === 'Chờ xử lý').length }} Đơn</h3>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-white h-100 dashboard-card p-2">
                <div class="card-body d-flex flex-column">
                   <div class="d-flex justify-content-between align-items-start mb-3">
                    <p class="text-secondary fw-semibold mb-0" style="font-size: 0.85rem;">Tổng Sản Phẩm</p>
                    <div class="bg-light text-dark rounded-circle d-flex align-items-center justify-content-center border" style="width: 36px; height: 36px;">
                      <i class="bi bi-box2"></i>
                    </div>
                  </div>
                  <h3 class="fw-bold text-dark mb-0">{{ db.products.length }} Mẫu</h3>
                </div>
              </div>
            </div>
             <div class="col-md-3">
              <div class="card rounded-4 border-0 shadow-sm bg-white h-100 dashboard-card p-2">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <p class="text-secondary fw-semibold mb-0" style="font-size: 0.85rem;">Khách Hàng (CRM)</p>
                    <div class="bg-light text-dark rounded-circle d-flex align-items-center justify-content-center border" style="width: 36px; height: 36px;">
                      <i class="bi bi-people"></i>
                    </div>
                  </div>
                  <h3 class="fw-bold text-dark mb-0">{{ db.customers.length }}</h3>
                </div>
              </div>
            </div>
          </div>
          <div class="card rounded-4 border-0 shadow-sm bg-white p-5 d-flex align-items-center justify-content-center" style="min-height: 350px;">
             <div class="text-center text-muted">
                <i class="bi bi-bar-chart-line display-1 opacity-25 mb-3"></i>
                <p class="fw-medium mb-0 small text-uppercase tracking-wide">Khu vực nhúng biểu đồ phân tích tăng trưởng</p>
             </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'products'" class="fade-in">
          <div v-if="!showProductForm" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Danh Sách Mặt Hàng</h5>
              <button class="btn btn-dark rounded-3 fw-medium px-4 shadow-sm" style="font-size: 0.85rem;" @click="openForm('product')"><i class="bi bi-plus-lg me-2"></i>Thêm Mới</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Mã SP</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Tên Sản Phẩm</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Phân Loại</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Giá Bán</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Trạng Thái</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Hành Động</th>
                  </tr>
                </thead>
                <tbody class="border-top-0" style="font-size: 0.9rem;">
                  <tr v-if="db.products.length === 0"><td colspan="6" class="py-5 text-center text-muted">Dữ liệu trống.</td></tr>
                  <tr v-for="prod in db.products" :key="prod.id">
                    <td class="py-3 px-4 text-secondary">#{{ prod.id }}</td>
                    <td class="py-3 px-4 fw-medium text-dark">{{ prod.name }}</td>
                    <td class="py-3 px-4 text-secondary">{{ prod.category }}</td>
                    <td class="py-3 px-4 text-dark fw-bold text-end">{{ formatPrice(prod.price) }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge rounded-pill px-3 py-2 fw-medium border" :class="prod.status === 'Đang bán' ? 'bg-dark text-white' : 'bg-light text-secondary'">{{ prod.status }}</span>
                    </td>
                    <td class="py-3 px-4 text-end">
                      <button class="btn btn-sm btn-light text-dark border rounded-3 me-2 px-3" @click="openForm('product', prod)"><i class="bi bi-pencil-square"></i></button>
                      <button class="btn btn-sm btn-light text-danger border rounded-3 px-3" @click="deleteItem('products', prod.id)"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-0 mx-auto fade-in" style="max-width: 800px;">
            <div class="bg-white p-4 border-bottom d-flex justify-content-between align-items-center">
              <h5 class="fw-semibold text-dark m-0">{{ formState === 'edit' ? 'Cập Nhật Sản Phẩm' : 'Khai Báo Sản Phẩm Mới' }}</h5>
            </div>
            <div class="p-4">
              <form @submit.prevent="saveForm('product')">
                <div class="mb-4">
                  <label class="form-label fw-medium text-secondary small text-uppercase">Tên sản phẩm <span class="text-danger">*</span></label>
                  <input v-model="productForm.name" type="text" class="form-control form-control-lg rounded-3 fs-6" required placeholder="Nhập tên giày...">
                </div>
                <div class="row mb-4 g-4">
                  <div class="col-md-6">
                    <label class="form-label fw-medium text-secondary small text-uppercase">Loại Sản Phẩm</label>
                    <select v-model="productForm.category" class="form-select rounded-3">
                      <option v-for="c in db.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-medium text-secondary small text-uppercase">Trạng thái hiển thị</label>
                    <select v-model="productForm.status" class="form-select rounded-3">
                      <option value="Đang bán">Đang bán</option>
                      <option value="Tạm ẩn">Tạm ẩn</option>
                    </select>
                  </div>
                </div>
                <div class="mb-4">
                  <label class="form-label fw-medium text-secondary small text-uppercase">Giá bán dự kiến (VNĐ) <span class="text-danger">*</span></label>
                  <input v-model="productForm.price" type="number" class="form-control rounded-3" required min="0" step="1000">
                </div>
                <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button type="button" class="btn btn-light border rounded-3 fw-medium px-4 text-dark" @click="showProductForm = false">Hủy Bỏ</button>
                  <button type="submit" class="btn btn-dark rounded-3 fw-medium px-5">Lưu Thay Đổi</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'categories'" class="fade-in">
          <div v-if="!showCategoryForm" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden mx-auto" style="max-width: 900px;">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Nhóm Cấu Trúc Sản Phẩm</h5>
              <button class="btn btn-dark rounded-3 fw-medium px-4 shadow-sm" style="font-size: 0.85rem;" @click="openForm('category')"><i class="bi bi-plus-lg me-2"></i>Tạo Danh Mục</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Mã Nhóm</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Tên Loại Sản Phẩm</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Số Mặt Hàng</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Tình Trạng</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Hành Động</th>
                  </tr>
                </thead>
                <tbody class="border-top-0" style="font-size: 0.9rem;">
                  <tr v-for="cat in db.categories" :key="cat.id">
                    <td class="py-3 px-4 text-secondary">{{ cat.id }}</td>
                    <td class="py-3 px-4 fw-bold text-dark">{{ cat.name }}</td>
                    <td class="py-3 px-4 text-center fw-medium text-secondary">
                       {{ db.products.filter(p => p.category === cat.name).length }} sản phẩm
                    </td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge rounded-pill px-3 py-2 fw-medium border" :class="cat.status === 'Hoạt động' ? 'bg-dark text-white' : 'bg-light text-secondary'">{{ cat.status }}</span>
                    </td>
                    <td class="py-3 px-4 text-end">
                      <button class="btn btn-sm btn-light text-dark border rounded-3 me-2 px-3" @click="openForm('category', cat)"><i class="bi bi-pencil-square"></i></button>
                      <button class="btn btn-sm btn-light text-danger border rounded-3 px-3" @click="deleteItem('categories', cat.id)"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-0 mx-auto fade-in" style="max-width: 600px;">
             <div class="bg-white p-4 border-bottom"><h5 class="fw-semibold text-dark m-0">{{ formState === 'edit' ? 'Sửa Tên Danh Mục' : 'Tạo Danh Mục Mới' }}</h5></div>
             <div class="p-4">
                <form @submit.prevent="saveForm('category')">
                  <div class="mb-4">
                    <label class="form-label fw-medium text-secondary small text-uppercase">Tên Phân Loại Nhóm</label>
                    <input v-model="categoryForm.name" type="text" class="form-control rounded-3" required placeholder="VD: Giày Thể Thao">
                  </div>
                  <div class="mb-4">
                    <label class="form-label fw-medium text-secondary small text-uppercase">Trạng thái áp dụng</label>
                    <select v-model="categoryForm.status" class="form-select rounded-3">
                      <option value="Hoạt động">Hoạt động (Cho phép chọn)</option>
                      <option value="Tạm ẩn">Tạm ẩn</option>
                    </select>
                  </div>
                  <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top"><button type="button" class="btn btn-light rounded-3 px-4 border" @click="showCategoryForm = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-4">Lưu Danh Mục</button></div>
                </form>
             </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'inventory'" class="fade-in">
          <div class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
             <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Sổ Quản Lý Phiếu Nhập (Receipts)</h5>
              <button class="btn btn-outline-dark rounded-3 fw-medium px-4 shadow-sm" style="font-size: 0.85rem;" @click="triggerConfirm('Thông báo', 'Tính năng tạo phiếu nhập chi tiết đang được mở khóa.', null)"><i class="bi bi-file-earmark-plus me-2"></i>Tạo Phiếu Nhập</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Mã Phiếu Nhập</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Nhà Cung Cấp (Supplier)</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Ngày Yêu Cầu</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Tổng Trị Giá Giao Dịch</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Thanh Toán / Kế Toán</th>
                  </tr>
                </thead>
                <tbody class="border-top-0" style="font-size: 0.9rem;">
                  <tr v-for="inv in db.inventory" :key="inv.id">
                    <td class="py-3 px-4 text-secondary fw-medium">#{{ inv.id }}</td>
                    <td class="py-3 px-4 fw-bold text-dark">{{ inv.supplier }}</td>
                    <td class="py-3 px-4 text-secondary">{{ inv.date }}</td>
                    <td class="py-3 px-4 text-dark fw-bold text-end">{{ formatPrice(inv.total) }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge rounded-pill px-3 py-2 fw-medium border" :class="inv.status === 'Đã thanh toán' ? 'bg-dark text-white border-dark' : 'bg-light text-dark'">{{ inv.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'orders'" class="fade-in">
          <div class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom py-3 px-4">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Điều Phối Đơn Hàng Bán Lẻ</h5>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Mã ĐH</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Khách Hàng</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Thanh Toán</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Tổng Thu</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Tình Trạng (Đổi Nhãn)</th>
                  </tr>
                </thead>
                <tbody style="font-size: 0.9rem;">
                  <tr v-for="order in db.orders" :key="order.id">
                    <td class="py-3 px-4 fw-bold text-dark">#{{ order.id }}</td>
                    <td class="py-3 px-4">
                       <span class="d-block text-dark fw-medium">{{ order.customer }}</span>
                       <small class="text-secondary" style="font-size: 0.75rem;"><i class="bi bi-calendar-event me-1"></i>{{ order.date }}</small>
                    </td>
                    <td class="py-3 px-4 text-center">
                       <span class="badge bg-light text-dark border px-2 py-1"><i class="bi bi-credit-card me-1"></i>{{ order.payment }}</span>
                    </td>
                    <td class="py-3 px-4 fw-bold text-dark text-end">{{ formatPrice(order.total) }}</td>
                    <td class="py-3 px-4 d-flex justify-content-end">
                      <select v-model="order.status" class="form-select form-select-sm rounded-3 shadow-none border fw-medium" 
                              :class="{'text-dark': order.status==='Chờ xử lý', 'bg-dark text-white border-dark': order.status==='Đang giao', 'text-success': order.status==='Đã giao', 'text-danger': order.status==='Đã hủy'}" style="width: 140px; font-size: 0.85rem;">
                        <option value="Chờ xử lý" class="bg-white text-dark">Chờ xử lý</option>
                        <option value="Đang giao" class="bg-white text-dark">Đang giao</option>
                        <option value="Đã giao" class="bg-white text-dark">Đã giao</option>
                        <option value="Đã hủy" class="bg-white text-dark">Đã hủy</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'discounts'" class="fade-in">
          <div v-if="!showDiscountForm" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
             <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Quản Trị Voucher / Coupon</h5>
              <button class="btn btn-dark rounded-3 fw-medium px-4 shadow-sm" style="font-size: 0.85rem;" @click="openForm('discount')"><i class="bi bi-plus-lg me-2"></i>Tạo Mã Nhập</button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Mã CODE</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Giá Trị Giảm</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Lượt Đã Dùng</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Hạn Sử Dụng</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Kích Hoạt (On/Off)</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Hành Động</th>
                  </tr>
                </thead>
                <tbody class="border-top-0" style="font-size: 0.9rem;">
                  <tr v-if="db.discounts.length === 0"><td colspan="6" class="py-5 text-center text-muted">Chưa có mã giảm giá.</td></tr>
                  <tr v-for="disc in db.discounts" :key="disc.id">
                    <td class="py-3 px-4 text-dark fw-bolder tracking-wide"><i class="bi bi-ticket-detailed me-2 text-secondary"></i>{{ disc.code }}</td>
                    <td class="py-3 px-4 fw-bold text-dark text-center fs-6">-{{ disc.value }}%</td>
                    <td class="py-3 px-4 text-center">
                       <span class="fw-medium text-dark">{{ disc.used }}</span> <span class="text-secondary small">/ {{ disc.limit }}</span>
                    </td>
                    <td class="py-3 px-4 text-secondary text-center">{{ disc.expiry }}</td>
                    <td class="py-3 px-4 text-center">
                      <div class="form-check form-switch d-flex justify-content-center m-0">
                        <input class="form-check-input border-secondary fs-5" type="checkbox" v-model="disc.active" :class="disc.active ? 'bg-dark border-dark' : ''" style="cursor: pointer;">
                      </div>
                    </td>
                    <td class="py-3 px-4 text-end">
                      <button class="btn btn-sm btn-light border text-danger rounded-3 px-3 fw-medium" @click="deleteItem('discounts', disc.id)">Xóa</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-0 mx-auto fade-in" style="max-width: 600px;">
             <div class="bg-white p-4 border-bottom"><h5 class="fw-semibold text-dark m-0">Phát Hành Mã Giảm Giá</h5></div>
             <div class="p-4">
                <form @submit.prevent="saveForm('discount')">
                  <div class="mb-4">
                    <label class="form-label fw-medium text-secondary small text-uppercase">Mã Voucher (Viết liền, không dấu)</label>
                    <input v-model="discountForm.code" type="text" class="form-control rounded-3 text-uppercase fw-bold" required placeholder="VD: SUMMER26">
                  </div>
                  <div class="row mb-4 g-3">
                    <div class="col-md-6">
                       <label class="form-label fw-medium text-secondary small text-uppercase">Mức giảm theo %</label>
                       <div class="input-group">
                         <input v-model="discountForm.value" type="number" min="1" max="100" class="form-control rounded-start-3" required>
                         <span class="input-group-text rounded-end-3 bg-light border">%</span>
                       </div>
                    </div>
                    <div class="col-md-6">
                       <label class="form-label fw-medium text-secondary small text-uppercase">Giới hạn số lượt dùng</label>
                       <input v-model="discountForm.limit" type="number" class="form-control rounded-3" required min="1">
                    </div>
                  </div>
                  <div class="mb-4">
                     <label class="form-label fw-medium text-secondary small text-uppercase">Ngày hết hạn</label>
                     <input v-model="discountForm.expiry" type="date" class="form-control rounded-3" required>
                  </div>
                  <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top"><button type="button" class="btn btn-light rounded-3 px-4 border text-dark" @click="showDiscountForm = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5">Phát Hành Mã</button></div>
                </form>
             </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'customers'" class="fade-in">
          <div class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom py-3 px-4">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Hồ Sơ Quan Hệ Khách Hàng (CRM)</h5>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Định Danh KH</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Thông Tin Liên Hệ</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Số Đơn Hoàn Tất</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Chi Tiêu Vòng Đời (LTV)</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Phân Hạng Tự Động</th>
                  </tr>
                </thead>
                <tbody class="border-top-0" style="font-size: 0.9rem;">
                  <tr v-for="cus in db.customers" :key="cus.id">
                    <td class="py-3 px-4 text-dark fw-bold">{{ cus.id }}</td>
                    <td class="py-3 px-4">
                      <div class="fw-bold text-dark">{{ cus.name }}</div>
                      <small class="text-secondary"><i class="bi bi-telephone me-1"></i>{{ cus.phone }}</small>
                    </td>
                    <td class="py-3 px-4 text-center fw-medium text-dark">{{ cus.orders }}</td>
                    <td class="py-3 px-4 fw-bold text-dark text-end">{{ formatPrice(cus.spent) }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge rounded-pill px-3 py-1 fw-bold" 
                            :class="{'bg-dark text-white': cus.rank==='Vàng', 'bg-secondary text-white': cus.rank==='Bạc', 'bg-light text-dark border': cus.rank==='Đồng'}">
                        {{ cus.rank }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'accounts'" class="fade-in">
          <div class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 class="mb-0 fw-semibold text-dark fs-6">Danh Sách Nhân Sự & Cấp Quyền</h5>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary">
                  <tr style="font-size: 0.85rem;">
                    <th class="py-3 px-4 border-0 fw-semibold">Nhân Sự</th>
                    <th class="py-3 px-4 border-0 fw-semibold">Tài Khoản Truy Cập</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Vai Trò (Role)</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-center">Trạng Thái Hệ Thống</th>
                    <th class="py-3 px-4 border-0 fw-semibold text-end">Bảo Mật</th>
                  </tr>
                </thead>
                <tbody class="border-top-0" style="font-size: 0.9rem;">
                  <tr v-for="acc in db.accounts" :key="acc.username">
                    <td class="py-3 px-4 fw-bold text-dark">{{ acc.name }}</td>
                    <td class="py-3 px-4 text-secondary">@{{ acc.username }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge bg-light text-dark border px-2 py-1 fw-medium">{{ acc.role }}</span>
                    </td>
                    <td class="py-3 px-4 text-center">
                      <span class="badge rounded-pill px-3 py-1 fw-medium border" :class="acc.active ? 'bg-light text-dark border-secondary' : 'bg-dark text-white'">
                        {{ acc.active ? 'Hoạt động' : 'Đã bị khóa' }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-end">
                      <button v-if="acc.role !== 'Giám Đốc'" class="btn btn-sm rounded-3 fw-medium px-3 border transition-all" 
                              :class="acc.active ? 'btn-light text-danger' : 'btn-dark text-white'"
                              @click="toggleAccountLock(acc)">
                        <i :class="acc.active ? 'bi bi-lock' : 'bi bi-unlock'"></i> {{ acc.active ? 'Khóa Quyền' : 'Mở Khóa Lại' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
    
    <div v-if="confirmModal.isOpen" class="custom-modal-overlay d-flex align-items-center justify-content-center z-index-2000">
      <div class="card rounded-4 border-0 shadow-lg bg-white p-4 text-center fade-in-scale mx-3" style="max-width: 380px; width: 100%;">
        <div class="mb-3 text-dark">
          <i class="bi bi-exclamation-circle fs-1"></i>
        </div>
        <h5 class="fw-bold text-dark mb-2 tracking-wide fs-5">{{ confirmModal.title }}</h5>
        <p class="text-secondary small mb-4 px-2" style="line-height: 1.5;">{{ confirmModal.message }}</p>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-light border rounded-3 fw-medium px-4 text-dark small" @click="confirmModal.isOpen = false">Hủy Thao Tác</button>
          <button class="btn btn-dark rounded-3 fw-medium px-4 small" @click="executeConfirm">Tiếp Tục</button>
        </div>
      </div>
    </div>

    <div v-if="isNavOpen" class="mobile-overlay d-lg-none" @click="isNavOpen = false"></div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const isNavOpen = ref(true)
const activeTab = ref('dashboard') 

// ĐỊNH HÌNH TIÊU ĐỀ BREADCRUMB
const menuTitles = {
  'dashboard': 'Báo Cáo Tổng Quan Doanh Nghiệp',
  'products': 'Danh Mục Hàng Hóa & Giá Bán',
  'categories': 'Cấu Trúc Phân Loại Sản Phẩm',
  'inventory': 'Chuỗi Cung Ứng & Lịch Sử Nhập Kho',
  'orders': 'Điều Phối & Theo Dõi Đơn Hàng',
  'discounts': 'Chiến Dịch Khuyến Mãi (Vouchers)',
  'customers': 'Quản Trị Quan Hệ Khách Hàng (CRM)',
  'accounts': 'Thiết Lập Phân Quyền Bảo Mật'
}
const activeTabTitle = computed(() => menuTitles[activeTab.value] || '')

const changeTab = (tabId) => {
  activeTab.value = tabId
  showProductForm.value = false; showCategoryForm.value = false; showDiscountForm.value = false;
  if (window.innerWidth < 992) isNavOpen.value = false
}

// ==========================================
// CƠ SỞ DỮ LIỆU MOCK (BUSINESS LOGIC)
// ==========================================
const db = reactive({
  products: [
    { id: '1001', name: 'Nike Air Force 1 All White', category: 'Giày Sneaker', price: 2650000, status: 'Đang bán' },
    { id: '1002', name: 'Adidas Ultraboost Light 23', category: 'Giày Chạy Bộ', price: 3400000, status: 'Đang bán' },
    { id: '1003', name: 'Vans Old Skool Classic Black', category: 'Giày Sneaker', price: 1450000, status: 'Tạm ẩn' }
  ],
  categories: [
    { id: 'CAT-01', name: 'Giày Sneaker', status: 'Hoạt động' }, 
    { id: 'CAT-02', name: 'Giày Chạy Bộ', status: 'Hoạt động' },
    { id: 'CAT-03', name: 'Giày Lười', status: 'Tạm ẩn' }
  ],
  inventory: [
    { id: 'RC-1045', supplier: 'Tổng Kho Phân Phối Nike VN', date: '10/06/2026', total: 150000000, status: 'Đã thanh toán' },
    { id: 'RC-1046', supplier: 'Xưởng Sản Xuất Á Châu', date: '12/06/2026', total: 45500000, status: 'Công nợ' }
  ],
  orders: [
    { id: 'ORD-901', customer: 'Nguyễn Văn Hải', date: '15/06/2026', total: 2650000, payment: 'Tiền mặt (COD)', status: 'Chờ xử lý' },
    { id: 'ORD-902', customer: 'Trần Thị Thu', date: '15/06/2026', total: 6800000, payment: 'Chuyển khoản', status: 'Đang giao' },
    { id: 'ORD-903', customer: 'Lê Hoàng Minh', date: '14/06/2026', total: 1450000, payment: 'Chuyển khoản', status: 'Đã giao' }
  ],
  discounts: [
    { id: 'D-01', code: 'SUMMER26', value: 15, used: 45, limit: 100, expiry: '30/06/2026', active: true },
    { id: 'D-02', code: 'FLASH50', value: 50, used: 50, limit: 50, expiry: '01/06/2026', active: false }
  ],
  customers: [
    { id: 'CUS-001', name: 'Nguyễn Văn Hải', phone: '0901234567', orders: 12, spent: 24500000, rank: 'Vàng' },
    { id: 'CUS-002', name: 'Trần Thị Thu', phone: '0987654321', orders: 4, spent: 6800000, rank: 'Bạc' },
    { id: 'CUS-003', name: 'Đoàn Nhật Nam', phone: '0912345678', orders: 1, spent: 1250000, rank: 'Đồng' }
  ],
  accounts: [
    { username: 'haianh.ceo', name: 'Hải Anh', role: 'Giám Đốc', active: true },
    { username: 'hieu.kho', name: 'Minh Hiếu', role: 'Thủ Kho', active: true },
    { username: 'son.sales', name: 'Quốc Sơn', role: 'Bán Hàng', active: false }
  ]
})

// ==========================================
// TRẠNG THÁI MODAL XÁC NHẬN (Thay alert/confirm)
// ==========================================
const confirmModal = reactive({ isOpen: false, title: '', message: '', onConfirmCallback: null })
const triggerConfirm = (title, message, callback) => {
  confirmModal.title = title; confirmModal.message = message; confirmModal.onConfirmCallback = callback; confirmModal.isOpen = true
}
const executeConfirm = () => { if (confirmModal.onConfirmCallback) confirmModal.onConfirmCallback(); confirmModal.isOpen = false }

// ==========================================
// QUẢN LÝ ĐA FORM (Sản Phẩm, Danh Mục, Khuyến Mãi)
// ==========================================
const formState = ref('add') 
const showProductForm = ref(false); const showCategoryForm = ref(false); const showDiscountForm = ref(false);

const productForm = ref({ id: '', name: '', category: 'Giày Sneaker', price: 0, status: 'Đang bán' })
const categoryForm = ref({ id: '', name: '', status: 'Hoạt động' })
const discountForm = ref({ id: '', code: '', value: 0, limit: 100, expiry: '', active: true })

const openForm = (type, data = null) => {
  formState.value = data ? 'edit' : 'add'
  if (type === 'product') { productForm.value = data ? { ...data } : { id: '', name: '', category: db.categories[0]?.name, price: 0, status: 'Đang bán' }; showProductForm.value = true }
  if (type === 'category') { categoryForm.value = data ? { ...data } : { id: '', name: '', status: 'Hoạt động' }; showCategoryForm.value = true }
  if (type === 'discount') { discountForm.value = data ? { ...data } : { id: '', code: '', value: 0, limit: 100, expiry: '' }; showDiscountForm.value = true }
}

const saveForm = (type) => {
  let targetArr = type === 'product' ? db.products : type === 'category' ? db.categories : db.discounts
  let formRef = type === 'product' ? productForm.value : type === 'category' ? categoryForm.value : discountForm.value
  
  if (formState.value === 'edit') {
    const idx = targetArr.findIndex(item => item.id === formRef.id)
    if (idx !== -1) targetArr[idx] = { ...formRef }
  } else {
    let prefix = type === 'product' ? '' : type === 'category' ? 'CAT-' : 'D-'
    let newItem = { ...formRef, id: prefix + Math.floor(Math.random() * 9000 + 1000) }
    if(type === 'discount') { newItem.used = 0; newItem.active = true }
    targetArr.unshift(newItem)
  }
  showProductForm.value = false; showCategoryForm.value = false; showDiscountForm.value = false;
}

// XÓA DỮ LIỆU CHUNG KÈM MODAL
const deleteItem = (collection, id) => {
  triggerConfirm('Bảo Mật Dữ Liệu', `Hệ thống sẽ xóa vĩnh viễn dữ liệu ID [${id}]. Bạn có chắc chắn thực hiện thao tác này?`, 
    () => { db[collection] = db[collection].filter(p => p.id !== id) }
  )
}

// KHÓA TÀI KHOẢN KÈM MODAL
const toggleAccountLock = (acc) => {
  if(acc.active) {
    triggerConfirm('Khóa Quyền Truy Cập', `Tài khoản [${acc.username}] sẽ bị từ chối truy cập vào hệ thống ngay lập tức. Xác nhận khóa?`, () => { acc.active = false })
  } else {
    acc.active = true
  }
}

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
</script>

<style scoped>
/* =======================================
   STYLE DOANH NGHIỆP: MODERN CORPORATE
   ======================================= */
/* Tự động tải bộ Icon Bootstrap cho dự án */
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.font-sans { font-family: 'Inter', sans-serif; }
.bg-light-gray { background-color: #f3f4f6; }
.line-height-md { line-height: 1.6; }

/* Palette Màu Thanh Bên (Đen Thuần) */
.bg-sidebar { background-color: #000000; }
.bg-sidebar-darker { background-color: #111111; } 

.tracking-wider { letter-spacing: 1.5px; }
.tracking-wide { letter-spacing: 0.5px; }

/* Layout App */
.fixed-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; }
.transition-main { transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.transition-sidebar { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.z-index-2000 { z-index: 2000; }
.z-index-1050 { z-index: 1050; }
.z-index-10 { z-index: 10; }

/* Overlay Làm mờ Focus */
.mobile-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.3); z-index: 1045; backdrop-filter: blur(2px); }
.custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); }

/* Chuyển động Animation Mềm */
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

.fade-in-scale { animation: fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* Tùy chỉnh Các khối Card */
.dashboard-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.dashboard-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.06) !important; }

/* Menu Trái Hover */
.custom-nav-item { transition: all 0.2s ease; color: rgba(255, 255, 255, 0.6) !important; padding: 12px 16px; font-size: 0.85rem; }
.custom-nav-item:hover { color: #fff !important; background-color: rgba(255, 255, 255, 0.06) !important; }
.active-nav { background-color: #ffffff !important; color: #000 !important; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.active-nav i { color: #000 !important; }

/* Input Focus */
.form-control:focus, .form-select:focus { border-color: #000; box-shadow: 0 0 0 0.15rem rgba(0, 0, 0, 0.15); }

/* Nút gạt Tắt bật (Toggle) */
.form-switch .form-check-input:checked { background-color: #000; border-color: #000; }

/* Thiết kế Scrollbar ẩn tinh tế */
::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar-light::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
</style>