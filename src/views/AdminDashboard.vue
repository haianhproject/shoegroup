<template>
  <div class="fixed-overlay d-flex flex-column bg-light-gray font-sans" style="overflow-x: hidden;">
    
    <aside class="sidebar-left bg-sidebar text-white position-fixed top-0 start-0 h-100 d-flex flex-column transition-sidebar z-index-1050 shadow-lg"
           :style="{ width: '260px', transform: isNavOpen ? 'translateX(0)' : 'translateX(-100%)' }">
      <div class="p-4 d-flex align-items-center justify-content-center border-bottom border-secondary border-opacity-25" style="height: 72px;">
        <h3 class="fw-bolder text-uppercase m-0 tracking-wider text-white fs-4"><i class="bi bi-box-fill me-2 fs-5"></i>SHOEGROUP</h3>
      </div>

      <div class="flex-grow-1 overflow-auto py-3 px-3 list-group custom-scrollbar-dark">
        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 tracking-wide" style="font-size: 0.65rem;">Quản Trị Hệ Thống</p>
        <button @click="changeTab('dashboard')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'dashboard' ? 'active-nav' : 'text-light bg-transparent'"><i class="bi bi-grid-1x2-fill me-3 fs-6"></i> Tổng Quan Doanh Thu</button>
        
        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Mặt Hàng & Giao Dịch</p>
        <button @click="changeTab('orders')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item d-flex justify-content-between align-items-center" :class="activeTab === 'orders' ? 'active-nav' : 'text-light bg-transparent'">
          <span><i class="bi bi-cart-check-fill me-3 fs-6"></i> Quản Lý Đơn Hàng</span>
          <span v-if="pendingOrdersCount > 0" class="badge bg-danger rounded-pill shadow-sm">{{ pendingOrdersCount }}</span>
        </button>
        <button @click="changeTab('products')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'products' ? 'active-nav' : 'text-light bg-transparent'"><i class="bi bi-box-seam-fill me-3 fs-6"></i> Quản Lý Sản Phẩm</button>
        <button @click="changeTab('categories')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'categories' ? 'active-nav' : 'text-light bg-transparent'"><i class="bi bi-tags-fill me-3 fs-6"></i> Nhóm Danh Mục</button>

        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Đối Tác & Tiếp Thị</p>
        <button @click="changeTab('discounts')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'discounts' ? 'active-nav' : 'text-light bg-transparent'"><i class="bi bi-ticket-perforated-fill me-3 fs-6"></i> Mã Khuyến Mãi</button>
        <button @click="changeTab('customers')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'customers' ? 'active-nav' : 'text-light bg-transparent'"><i class="bi bi-people-fill me-3 fs-6"></i> Khách Hàng (CRM)</button>

        <p class="text-white-50 fw-semibold text-uppercase px-2 mb-2 mt-4 tracking-wide" style="font-size: 0.65rem;">Bảo Mật</p>
        <button @click="changeTab('accounts')" class="list-group-item border-0 mb-1 rounded-3 fw-medium custom-nav-item" :class="activeTab === 'accounts' ? 'active-nav' : 'text-light bg-transparent'"><i class="bi bi-shield-lock-fill me-3 fs-6"></i> Quản Lý Tài Khoản</button>
      </div>

      <div class="p-4 bg-sidebar-darker mt-auto border-top border-secondary border-opacity-25">
        <button @click="handleLogout" class="btn btn-danger rounded-3 w-100 fw-bold shadow-sm py-2 d-flex align-items-center justify-content-center"><i class="bi bi-box-arrow-right me-2"></i> Đăng Xuất</button>
      </div>
    </aside>

    <main class="flex-grow-1 transition-main d-flex flex-column bg-light-gray" :style="{ marginLeft: isNavOpen ? '260px' : '0' }">
      <header class="d-flex justify-content-between align-items-center px-4 bg-white shadow-sm z-index-10 position-sticky top-0" style="height: 72px;">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light border-0 rounded-circle d-flex align-items-center justify-content-center text-dark bg-light-gray" style="width: 40px; height: 40px;" @click="isNavOpen = !isNavOpen"><i class="bi bi-list fs-5"></i></button>
          <h2 class="h5 mb-0 fw-bold text-dark d-none d-md-block tracking-wide">{{ activeTabTitle }}</h2>
        </div>
        <div class="d-flex align-items-center gap-2">
           <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold border" style="width: 40px; height: 40px;">{{ getDisplayName.charAt(0).toUpperCase() }}</div>
           <span class="fw-bold text-dark d-none d-sm-block">Xin chào, {{ getDisplayName }}</span>
        </div>
      </header>

      <div v-if="isLoading" class="d-flex flex-column justify-content-center align-items-center h-100 flex-grow-1">
          <div class="spinner-border text-dark mb-3"></div><p class="fw-medium text-secondary">Đang nạp dữ liệu từ CSDL...</p>
      </div>

      <div v-else class="p-4 flex-grow-1 overflow-auto custom-scrollbar-light">
        
        <div v-if="activeTab === 'dashboard'" class="fade-in">
          <div class="row g-4 mb-4">
            <div class="col-md-3"><div class="card rounded-4 border-0 shadow-sm bg-dark text-white h-100 p-4 dashboard-card"><p class="text-white-50 fw-semibold mb-2">Doanh Thu (Hoàn thành)</p><h3 class="fw-bold m-0 text-success">{{ formatPrice(totalRevenue) }}</h3></div></div>
            <div class="col-md-3"><div class="card rounded-4 border-0 shadow-sm bg-white h-100 p-4 dashboard-card"><p class="text-secondary fw-semibold mb-2">Đơn Chờ Xác Nhận</p><h3 class="fw-bold text-danger m-0">{{ pendingOrdersCount }} <i class="bi bi-bell ms-1 text-muted opacity-50"></i></h3></div></div>
            <div class="col-md-3"><div class="card rounded-4 border-0 shadow-sm bg-white h-100 p-4 dashboard-card"><p class="text-secondary fw-semibold mb-2">Sản Phẩm Trưng Bày</p><h3 class="fw-bold text-dark m-0">{{ db.products.length }} <i class="bi bi-box-seam ms-1 text-muted opacity-50"></i></h3></div></div>
            <div class="col-md-3"><div class="card rounded-4 border-0 shadow-sm bg-white h-100 p-4 dashboard-card"><p class="text-secondary fw-semibold mb-2">Hồ Sơ Khách Hàng</p><h3 class="fw-bold text-dark m-0">{{ db.customers.length }} <i class="bi bi-people ms-1 text-muted opacity-50"></i></h3></div></div>
          </div>
          <div class="card rounded-4 border-0 shadow-sm bg-white p-4 mt-2">
             <h5 class="fw-bold text-dark mb-4">Biểu Đồ Doanh Thu (Chỉ tính đơn Giao thành công)</h5>
             <div style="height: 380px; width: 100%; position: relative;"><canvas id="waveChart"></canvas></div>
          </div>
        </div>

        <div v-else-if="activeTab === 'orders'" class="fade-in">
           <div class="mx-auto" style="max-width: 1100px;">
             
             <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
               <h5 class="mb-0 fw-bold fs-5 text-dark">Danh Sách Đơn Hàng</h5>
               <div class="d-flex gap-2">
                 <select v-model="filterOrderStatus" class="form-select border-0 shadow-sm rounded-3 fw-medium" style="width: 200px;">
                   <option value="">Tất cả trạng thái</option>
                   <option value="Chờ xác nhận">Chờ xác nhận</option>
                   <option value="Đã xác nhận">Đã xác nhận</option>
                   <option value="Đang vận chuyển">Đang vận chuyển</option>
                   <option value="Đã giao hàng thành công">Đã giao hàng thành công</option>
                   <option value="Đã hủy">Đã hủy</option>
                 </select>
                 <input v-model="searchQuery.orders" type="text" class="form-control border-0 shadow-sm rounded-3" placeholder="Tìm Mã Đơn / Tên Khách..." style="width: 250px;">
               </div>
             </div>

             <div v-if="filteredOrders.length === 0" class="text-center py-5 text-secondary">Không tìm thấy đơn hàng nào.</div>
             
             <div v-for="ord in filteredOrders" :key="ord.id" class="card rounded-4 border-0 shadow-sm mb-4 bg-white overflow-hidden order-card">
               
               <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                 <div class="d-flex align-items-center gap-3">
                   <span class="fw-bold text-dark fs-5">Mã đơn: #ORD-{{ ord.id }}</span>
                   <span class="text-secondary small fw-medium"><i class="bi bi-clock me-1"></i> Đặt lúc: {{ ord.date }}</span>
                 </div>
                 <span class="badge px-3 py-2 rounded-pill fs-6" :class="getStatusBadgeClass(ord.status)">{{ ord.status }}</span>
               </div>

               <div class="card-body p-0">
                 <div class="row g-0">
                   <div class="col-md-7 p-4 border-end">
                     <h6 class="fw-bold mb-3 text-secondary text-uppercase" style="font-size: 0.8rem;">Sản phẩm đặt mua</h6>
                     
                     <div v-if="!ord.products || ord.products.length === 0" class="text-secondary small fst-italic mb-3">
                        Đơn hàng không có chi tiết sản phẩm. (Có thể do bạn tạo chay từ CSDL)
                     </div>
                     <template v-else>
                        <div v-for="(prod, idx) in (ord.isExpanded ? ord.products : ord.products.slice(0, 1))" :key="idx" class="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom border-light">
                          <img :src="prod?.image || 'https://via.placeholder.com/80?text=Shoe'" class="rounded-3 object-fit-cover shadow-sm border bg-white" style="width: 80px; height: 80px;">
                          <div class="flex-grow-1">
                             <h6 class="fw-bold text-dark mb-1">{{ prod?.name || 'Sản phẩm giày' }}</h6>
                             <p class="text-secondary small mb-0">Phân loại: Size <span class="fw-bold text-dark">{{ prod?.size || '42' }}</span></p>
                          </div>
                          <div class="text-end">
                             <p class="text-secondary small mb-0">x{{ prod?.quantity || 1 }}</p>
                             <p class="fw-bold text-dark mb-0">{{ formatPrice(prod?.price) }}</p>
                          </div>
                        </div>
                        
                        <div v-if="!ord.isExpanded && ord.products.length > 1" class="text-center">
                           <button class="btn btn-sm btn-light text-primary fw-medium rounded-pill px-3" @click="ord.isExpanded = true">
                              Xem thêm {{ ord.products.length - 1 }} sản phẩm khác <i class="bi bi-chevron-down"></i>
                           </button>
                        </div>
                        <div v-if="ord.isExpanded && ord.products.length > 1" class="text-center">
                           <button class="btn btn-sm btn-light text-secondary fw-medium rounded-pill px-3" @click="ord.isExpanded = false">
                              Thu gọn <i class="bi bi-chevron-up"></i>
                           </button>
                        </div>
                     </template>
                   </div>
                   
                   <div class="col-md-5 p-4 bg-light-gray bg-opacity-50 d-flex flex-column">
                      <h6 class="fw-bold mb-3 text-secondary text-uppercase" style="font-size: 0.8rem;">Khách hàng & Giao hàng</h6>
                      <p class="fw-bold text-dark mb-1 fs-6"><i class="bi bi-person-circle me-2 text-secondary"></i> {{ ord.customer_name }}</p>
                      <p class="text-dark small mb-2"><i class="bi bi-telephone-fill me-2 text-secondary"></i> {{ ord.customer_phone || 'Chưa cập nhật SĐT' }}</p>
                      
                      <p class="text-secondary small mb-3 lh-base" :class="{'text-truncate': !ord.isExpanded}" style="max-height: 45px;"><i class="bi bi-geo-alt-fill me-2 text-secondary"></i> {{ ord.customer_address }}</p>
                      
                      <div v-if="ord.status === 'Đã hủy' && ord.cancel_reason" class="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 mb-3">
                         <p class="fw-bold text-danger m-0 small"><i class="bi bi-exclamation-triangle-fill me-1"></i> Lý do hủy:</p>
                         <p class="text-danger small m-0 mt-1">{{ ord.cancel_reason }}</p>
                      </div>
                      
                      <div class="mt-auto border-top pt-3">
                         <div class="d-flex justify-content-between align-items-center">
                            <span class="text-secondary small fw-bold text-uppercase">Tổng thanh toán:</span>
                            <span class="fw-bold text-success fs-4">{{ formatPrice(ord.total) }}</span>
                         </div>
                      </div>
                   </div>
                 </div>
               </div>

               <div class="card-footer bg-white border-top py-3 px-4 d-flex justify-content-end gap-2 align-items-center">
                  <button v-if="['Chờ xác nhận', 'Đã xác nhận'].includes(ord.status)" 
                          class="btn btn-outline-danger fw-bold rounded-3 px-4 me-auto"
                          @click="openCancelModal(ord)">
                     <i class="bi bi-x-circle me-1"></i> Hủy Đơn Hàng
                  </button>
                  
                  <button v-if="getNextAction(ord.status)" 
                          class="btn fw-bold rounded-3 px-5 shadow-sm text-white"
                          :class="getNextAction(ord.status).color"
                          @click="processOrderFlow(ord.id, getNextAction(ord.status).next)">
                     {{ getNextAction(ord.status).text }} <i class="bi bi-arrow-right-short ms-1 fs-5"></i>
                  </button>
                  
                  <span v-if="ord.status === 'Đã giao hàng thành công'" class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i> Giao dịch hoàn tất</span>
                  <span v-if="ord.status === 'Đã hủy'" class="text-danger fw-bold"><i class="bi bi-x-circle-fill me-1"></i> Đã hủy đơn</span>
               </div>

             </div>
           </div>
        </div>

        <div v-else-if="activeTab === 'products'" class="fade-in">
          <div v-if="!showForm.products" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div class="d-flex gap-2 align-items-center">
                <input v-model="searchQuery.products" type="text" class="form-control form-control-sm rounded-pill px-3" placeholder="Tìm tên sản phẩm..." style="width: 200px;">
                <select v-model.number="filterCategory" class="form-select form-select-sm rounded-pill px-3" style="width: 150px;">
                  <option value="">Tất cả danh mục</option>
                  <option v-for="c in db.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('products')"><i class="bi bi-plus-lg me-2"></i>Thêm SP Mới</button>
            </div>
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary">
                <tr><th>Mã SP</th><th class="text-center">Hình Ảnh</th><th>Tên Sản Phẩm</th><th>Danh Mục</th><th class="text-end">Giá Bán</th><th class="text-center">Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr>
              </thead>
              <tbody>
                <tr v-if="filteredProducts.length === 0"><td colspan="7" class="text-center py-4 text-secondary">Không tìm thấy sản phẩm phù hợp</td></tr>
                <tr v-for="p in filteredProducts" :key="p.id">
                  <td class="text-secondary fw-bold">#{{ p.id }}</td>
                  <td class="text-center">
                    <div v-if="!p.image_url" class="bg-light border rounded-3 d-flex align-items-center justify-content-center text-secondary fw-bold mx-auto" style="width: 45px; height: 45px; font-size: 0.65rem;">TRỐNG</div>
                    <img v-else :src="p.image_url" @error="e => e.target.style.display='none'" class="rounded-3 object-fit-cover border shadow-sm bg-white mx-auto" style="width: 45px; height: 45px;" alt="sp">
                  </td>
                  <td class="fw-bold text-dark">{{ p.name }}</td><td class="text-secondary">{{ p.category }}</td>
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
          
          <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-5 mx-auto" style="max-width: 700px;">
            <h5 class="fw-bold border-bottom pb-3 mb-4 text-center">{{ editId ? 'Cập Nhật Sản Phẩm' : 'Thêm Sản Phẩm Mới' }}</h5>
            <form @submit.prevent="saveForm('products')">
              <div class="mb-3"><label class="form-label text-secondary small fw-bold">Tên Sản Phẩm</label><input v-model="formData.name" type="text" class="form-control form-control-lg rounded-3" required></div>
              <div class="mb-4 bg-light p-3 rounded-4 border">
                 <label class="form-label text-dark fw-bold mb-2"><i class="bi bi-image me-1"></i> Tải ảnh lên hoặc Dán Link URL</label>
                 <input type="file" @change="handleFileUpload" class="form-control bg-white mb-2" accept="image/*">
                 <div class="text-center text-secondary small fw-bold mb-2">- HOẶC DÁN LINK ẢNH VÀO ĐÂY -</div>
                 <input v-model="formData.image_url" type="text" class="form-control bg-white" placeholder="Bỏ trống nếu đã tải file ảnh lên...">
                 <div v-if="formData.image_url" class="mt-3 text-center position-relative d-inline-block">
                    <img :src="formData.image_url" class="rounded-3 object-fit-cover shadow-sm border bg-white" style="width: 120px; height: 120px;" alt="Preview">
                    <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 translate-middle rounded-circle shadow" @click="formData.image_url = ''"><i class="bi bi-x"></i></button>
                 </div>
              </div>
              <div class="row mb-3">
                 <div class="col-12 col-md-4"><label class="form-label text-secondary small fw-bold">Giá Bán (VNĐ)</label><input v-model="formData.price" type="number" class="form-control form-control-lg rounded-3" required min="0"></div>
                 <div class="col-12 col-md-4"><label class="form-label text-secondary small fw-bold">Chọn Danh mục</label>
                    <select v-model.number="formData.category_id" class="form-select form-select-lg rounded-3" required>
                      <option v-for="c in db.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                 </div>
                 <div class="col-12 col-md-4"><label class="form-label text-secondary small fw-bold">Trạng thái</label>
                    <select v-model="formData.active" class="form-select form-select-lg rounded-3">
                      <option :value="true">Đang bán</option>
                      <option :value="false">Tạm ẩn</option>
                    </select>
                 </div>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light border rounded-3 px-4 fw-medium" @click="showForm.products = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5 fw-bold">Lưu Dữ Liệu</button></div>
            </form>
          </div>
        </div>

        <div v-else-if="activeTab === 'categories'" class="fade-in">
          <div v-if="!showForm.categories" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden mx-auto" style="max-width: 900px;">
            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <input v-model="searchQuery.categories" type="text" class="form-control form-control-sm rounded-pill px-3" placeholder="Tìm kiếm danh mục..." style="width: 250px;">
              <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('categories')"><i class="bi bi-plus-lg me-2"></i>Tạo Danh Mục</button>
            </div>
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Mã Nhóm</th><th>Tên Danh Mục</th><th class="text-center">Số lượng SP</th><th class="text-center">Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
              <tbody>
                <tr v-if="filteredCategories.length === 0"><td colspan="5" class="text-center py-4 text-secondary">Không tìm thấy danh mục phù hợp</td></tr>
                <tr v-for="c in filteredCategories" :key="c.id">
                  <td class="text-secondary fw-bold">#{{ c.id }}</td><td class="fw-bold text-dark">{{ c.name }}</td>
                  <td class="text-center fw-medium">{{ getProductCount(c.id) }} sản phẩm</td>
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
          <div v-if="!showForm.discounts" class="card rounded-4 border-0 shadow-sm bg-white overflow-hidden mx-auto" style="max-width: 1000px;">
             <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <input v-model="searchQuery.discounts" type="text" class="form-control form-control-sm rounded-pill px-3" placeholder="Tìm mã voucher..." style="width: 250px;">
              <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('discounts')"><i class="bi bi-plus-lg me-2"></i>Tạo Mã Mới</button>
            </div>
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light text-secondary"><tr><th>Mã Voucher</th><th class="text-center">Chiết Khấu</th><th class="text-center">Số Lượng Đã Dùng</th><th>Hết hạn</th><th class="text-center">Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
              <tbody>
                <tr v-if="filteredDiscounts.length === 0"><td colspan="6" class="text-center py-4 text-secondary">Không tìm thấy mã khuyến mãi phù hợp</td></tr>
                <tr v-for="d in filteredDiscounts" :key="d.id">
                  <td class="fw-bolder text-dark tracking-wide"><i class="bi bi-ticket-detailed me-2 text-secondary"></i> {{ d.code }}</td>
                  <td class="text-center fw-bold text-danger fs-6">-{{ d.percent }}%</td><td class="text-center">{{ d.used }} / {{ d.limit }}</td>
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
               <div class="row mb-4"><div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Mức giảm (%)</label><input v-model="formData.percent" type="number" min="1" max="100" class="form-control form-control-lg rounded-3" required></div><div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Giới hạn số lượt</label><input v-model="formData.limit" type="number" class="form-control form-control-lg rounded-3" required min="1"></div></div>
               <div class="row mb-4"><div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Ngày hết hạn</label><input v-model="formData.expiry" type="date" class="form-control form-control-lg rounded-3" required></div><div class="col-6"><label class="form-label text-secondary small fw-bold text-uppercase">Trạng thái phát hành</label><select v-model="formData.active" class="form-select form-select-lg rounded-3"><option :value="true">Bật</option><option :value="false">Tắt</option></select></div></div>
               <div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light border rounded-3 px-4 fw-medium" @click="showForm.discounts = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5 fw-bold">Lưu Mã</button></div>
             </form>
          </div>
        </div>

        <div v-else-if="activeTab === 'customers'" class="fade-in">
           <div class="card rounded-4 border-0 shadow-sm bg-white mx-auto" style="max-width: 1000px;">
             <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
               <h5 class="mb-0 fw-semibold fs-6">Hồ Sơ Quan Hệ Khách Hàng (CRM)</h5>
               <input v-model="searchQuery.customers" type="text" class="form-control form-control-sm rounded-pill px-3" placeholder="Tìm Tên / SĐT..." style="width: 250px;">
             </div>
             <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary"><tr><th>Định Danh KH</th><th>Họ & Tên</th><th>Số Điện Thoại</th><th>Hạng TV</th><th class="text-end">Chi Tiêu Thực Tế</th><th class="text-end pe-4">Hành động</th></tr></thead>
                <tbody>
                  <tr v-if="filteredCustomers.length === 0"><td colspan="6" class="text-center py-4 text-secondary">Không tìm thấy khách hàng nào</td></tr>
                  <tr v-for="cus in filteredCustomers" :key="cus.id">
                    <td class="text-secondary fw-medium">#CUS-00{{ cus.id }}</td>
                    <td class="fw-bold text-dark">{{ cus.name }}</td>
                    <td><i class="bi bi-telephone text-secondary me-2"></i>{{ cus.phone || 'Trống' }}</td>
                    <td><span class="badge rounded-pill" :class="getRank(cus.spent).bg + ' ' + getRank(cus.spent).color">{{ getRank(cus.spent).name }}</span></td>
                    <td class="text-end fw-bold text-success">{{ formatPrice(cus.spent) }}</td>
                    <td class="text-end pe-4"><button class="btn btn-sm btn-outline-dark rounded-3 px-3" @click="viewCustomerDetails(cus)">Xem Lịch Sử</button></td>
                  </tr>
                </tbody>
              </table>
           </div>
        </div>

        <div v-else-if="activeTab === 'accounts'" class="fade-in">
           <div v-if="!showForm.accounts" class="card rounded-4 border-0 shadow-sm bg-white mx-auto" style="max-width: 900px;">
             <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
               <input v-model="searchQuery.accounts" type="text" class="form-control form-control-sm rounded-pill px-3" placeholder="Tìm Email / Tên..." style="width: 250px;">
               <button class="btn btn-dark rounded-3 px-4 shadow-sm fw-medium" @click="openForm('accounts')"><i class="bi bi-plus-lg me-2"></i>Thêm Tài Khoản</button>
             </div>
             <table class="table table-hover align-middle mb-0">
                <thead class="table-light text-secondary"><tr><th>Email Đăng Nhập</th><th>Tên Chủ Tài Khoản</th><th class="text-center">Phân Quyền</th><th class="text-end pe-4">Hành động</th></tr></thead>
                <tbody>
                  <tr v-if="filteredAccounts.length === 0"><td colspan="4" class="text-center py-4 text-secondary">Không tìm thấy tài khoản nào</td></tr>
                  <tr v-for="acc in filteredAccounts" :key="acc.id">
                    <td class="fw-bold text-dark">{{ acc.username }}</td>
                    <td class="text-secondary">{{ cleanName(acc.name) }}</td>
                    <td class="text-center">
                       <span class="badge rounded-pill px-3" :class="Number(acc.role_id) === 1 ? 'bg-dark text-white' : 'bg-light text-dark border'">
                          {{ Number(acc.role_id) === 1 ? 'Quản Trị Viên (Admin)' : 'Khách Hàng' }}
                       </span>
                    </td>
                    <td class="text-end pe-4">
                      <button class="btn btn-sm btn-light border text-dark me-2 rounded-3 px-3" @click="openForm('accounts', acc)"><i class="bi bi-pencil-square"></i> Sửa</button>
                      <button v-if="acc.username !== currentUser?.email" class="btn btn-sm btn-danger rounded-3 px-3" @click="deleteItem('accounts', acc.id)"><i class="bi bi-trash"></i> Xóa</button>
                      <span v-else class="badge bg-light text-secondary border px-2 py-1" style="font-size: 0.7rem;">Đang dùng</span>
                    </td>
                  </tr>
                </tbody>
              </table>
           </div>
           <div v-else class="card rounded-4 border-0 shadow-sm bg-white p-5 mx-auto" style="max-width: 600px;">
             <h5 class="fw-bold border-bottom pb-3 mb-4 text-center">{{ editId ? 'Sửa Quyền Tài Khoản' : 'Thêm Tài Khoản Mới' }}</h5>
             <form @submit.prevent="saveForm('accounts')">
               <div class="mb-3"><label class="form-label text-secondary small fw-bold">Tên Chủ Tài Khoản</label><input v-model="formData.name" type="text" class="form-control form-control-lg rounded-3" required></div>
               <div class="mb-3"><label class="form-label text-secondary small fw-bold">Email Đăng Nhập</label><input v-model="formData.username" type="email" class="form-control form-control-lg rounded-3" required :disabled="!!editId"></div>
               <div v-if="!editId" class="mb-3"><label class="form-label text-secondary small fw-bold">Mật khẩu ban đầu</label><input v-model="formData.password" type="password" class="form-control form-control-lg rounded-3" required></div>
               <div class="mb-4">
                  <label class="form-label text-secondary small fw-bold">Cấp Phân Quyền</label>
                  <select v-model.number="formData.role_id" class="form-select form-select-lg rounded-3">
                     <option :value="1">Quản Trị Viên (Admin)</option>
                     <option :value="2">Khách Hàng</option>
                  </select>
               </div>
               <div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light border rounded-3 px-4 fw-medium" @click="showForm.accounts = false">Hủy</button><button type="submit" class="btn btn-dark rounded-3 px-5 fw-bold">Lưu Tài Khoản</button></div>
             </form>
          </div>
        </div>

      </div>
    </main>

    <div v-if="selectedCustomer" class="custom-modal-overlay d-flex align-items-center justify-content-center z-index-2000" @click.self="selectedCustomer = null">
      <div class="card rounded-4 border-0 shadow-lg bg-white p-4 fade-in-scale mx-3" style="max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto;">
         <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
            <div>
              <h5 class="fw-bold m-0 fs-5">{{ selectedCustomer.name }}</h5>
              <p class="text-secondary small m-0"><i class="bi bi-telephone me-1"></i> {{ selectedCustomer.phone || 'Chưa cập nhật' }} | Hạng: <span class="fw-bold" :class="getRank(selectedCustomer.spent).color">{{ getRank(selectedCustomer.spent).name }}</span></p>
            </div>
            <button class="btn btn-light rounded-circle" @click="selectedCustomer = null"><i class="bi bi-x-lg"></i></button>
         </div>
         <h6 class="fw-bold mb-3">Lịch Sử Mua Hàng</h6>
         <div v-if="customerOrders.length === 0" class="text-center py-4 text-secondary">Khách hàng chưa có đơn hàng nào.</div>
         <div v-else class="list-group">
            <div v-for="order in customerOrders" :key="order.id" class="list-group-item border-0 bg-light mb-3 rounded-4 p-4 shadow-sm">
               <div class="d-flex justify-content-between align-items-center mb-3">
                 <span class="fw-bold text-dark fs-6"><i class="bi bi-receipt text-secondary me-2"></i>Mã Đơn: #ORD-{{ order.id }}</span>
                 <span class="badge px-3 py-2 rounded-pill" :class="getStatusBadgeClass(order.status)">{{ order.status }}</span>
               </div>
               <div class="d-flex justify-content-between align-items-end">
                 <span class="text-secondary small"><i class="bi bi-calendar-event me-1"></i> Ngày đặt hàng: <span class="text-dark fw-medium">{{ order.date }}</span></span>
                 <div class="text-end">
                    <span class="text-secondary small d-block mb-1">Tổng thanh toán:</span>
                    <span class="fw-bold text-success fs-5">{{ formatPrice(order.total) }}</span>
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>

    <div v-if="cancelModal.isOpen" class="custom-modal-overlay d-flex align-items-center justify-content-center z-index-2000" @click.self="cancelModal.isOpen = false">
      <div class="card rounded-4 border-0 shadow-lg bg-white p-4 fade-in-scale mx-3" style="max-width: 400px; width: 100%;">
        <div class="mb-3 text-danger text-center"><i class="bi bi-x-circle fs-1"></i></div>
        <h5 class="fw-bold text-dark mb-3 text-center fs-5">Xác Nhận Hủy Đơn</h5>
        <label class="form-label small fw-bold text-secondary">Vui lòng nhập lý do hủy đơn (Bắt buộc):</label>
        <textarea v-model="cancelModal.reason" class="form-control rounded-3 mb-4 bg-light border-0 shadow-sm" rows="3" placeholder="Ví dụ: Hết hàng, Sai thông tin..."></textarea>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-light border rounded-3 fw-medium px-4 text-dark" @click="cancelModal.isOpen = false">Đóng</button>
          <button class="btn btn-danger rounded-3 fw-bold px-4" :disabled="!cancelModal.reason.trim()" @click="submitCancelOrder">Xác Nhận Hủy</button>
        </div>
      </div>
    </div>

    <div v-if="confirmModal.isOpen" class="custom-modal-overlay d-flex align-items-center justify-content-center z-index-2000">
      <div class="card rounded-4 border-0 shadow-lg bg-white p-4 text-center fade-in-scale mx-3" style="max-width: 380px; width: 100%;">
        <div class="mb-3 text-danger"><i class="bi bi-exclamation-circle fs-1"></i></div>
        <h5 class="fw-bold text-dark mb-2 tracking-wide fs-5">Xác Nhận Xóa</h5>
        <p class="text-secondary small mb-4 px-2" style="line-height: 1.5;">Hành động này sẽ xóa dữ liệu vĩnh viễn khỏi hệ thống. Bạn có chắc chắn không?</p>
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
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { currentUser, logout } from '../stores/authStore'

const router = useRouter()
const isNavOpen = ref(true)
const activeTab = ref('orders') 
const isLoading = ref(true) 

const menuTitles = {
  'dashboard': 'Báo Cáo Tổng Quan Cửa Hàng',
  'orders': 'Xét Duyệt & Quản Lý Đơn Hàng',
  'products': 'Quản Lý Sản Phẩm Kinh Doanh',
  'categories': 'Danh Mục Mặt Hàng',
  'discounts': 'Chiến Dịch Mã Giảm Giá',
  'customers': 'Quản Trị Khách Hàng (CRM)',
  'accounts': 'Quản Lý Tài Khoản Hệ Thống'
}
const activeTabTitle = computed(() => menuTitles[activeTab.value] || '')

const cleanName = (name) => {
  if (!name) return 'Người dùng mới';
  return String(name).replace(/\s*\(CEO\)/gi, '').trim();
}

const getDisplayName = computed(() => {
  let name = currentUser.value?.full_name || 'Admin';
  return cleanName(name);
})

const db = reactive({ orders: [], products: [], categories: [], discounts: [], customers: [], accounts: [], chartData: [] })
const showForm = reactive({ products: false, categories: false, discounts: false, accounts: false })
const formData = ref({})
const editId = ref(null)

const searchQuery = reactive({ orders: '', products: '', categories: '', discounts: '', customers: '', accounts: '' })
const filterCategory = ref('')
const filterOrderStatus = ref('')

// QUẢN LÝ MÀU SẮC TRẠNG THÁI ĐƠN HÀNG
const getStatusBadgeClass = (status) => {
  if (status === 'Chờ xác nhận') return 'bg-warning text-dark';
  if (status === 'Đã xác nhận') return 'bg-primary text-white';
  if (status === 'Đang vận chuyển') return 'bg-info text-white';
  if (status === 'Đã giao hàng thành công') return 'bg-success text-white';
  if (status === 'Đã hủy') return 'bg-danger text-white';
  return 'bg-secondary text-white';
}

// LOGIC TUẦN TỰ ĐƠN HÀNG (CẤM NHẢY CÓC)
const getNextAction = (status) => {
  if(status === 'Chờ xác nhận') return { text: 'Duyệt Đơn Hàng', next: 'Đã xác nhận', color: 'btn-dark' };
  if(status === 'Đã xác nhận') return { text: 'Giao Vận Chuyển', next: 'Đang vận chuyển', color: 'btn-primary' };
  if(status === 'Đang vận chuyển') return { text: 'Xác Nhận Đã Giao', next: 'Đã giao hàng thành công', color: 'btn-success' };
  return null; 
}

const processOrderFlow = async (id, nextStatus) => {
  try {
    await fetch(`http://localhost:5000/api/orders/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus, reason: '' })
    });
    fetchAllData();
  } catch(e) { console.error(e) }
}

const cancelModal = reactive({ isOpen: false, orderId: null, reason: '' })
const openCancelModal = (ord) => { cancelModal.orderId = ord.id; cancelModal.reason = ''; cancelModal.isOpen = true; }
const submitCancelOrder = async () => {
   if(!cancelModal.reason.trim()) return;
   try {
    await fetch(`http://localhost:5000/api/orders/${cancelModal.orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Đã hủy', reason: cancelModal.reason })
    });
    cancelModal.isOpen = false; fetchAllData();
  } catch(e) { console.error(e) }
}

// LỌC TÌM KIẾM
const filteredOrders = computed(() => {
  if (!Array.isArray(db.orders)) return [];
  return db.orders.filter(o => {
    const searchStr = (searchQuery.orders || '').toLowerCase();
    const matchSearch = String(o.id).includes(searchStr) || (o.customer_name || '').toLowerCase().includes(searchStr) || (o.customer_phone || '').includes(searchStr);
    const matchStatus = filterOrderStatus.value === '' || o.status === filterOrderStatus.value;
    return matchSearch && matchStatus;
  });
});

const filteredProducts = computed(() => {
  if (!Array.isArray(db.products)) return [];
  return db.products.filter(p => {
    const searchStr = (searchQuery.products || '').toLowerCase();
    const matchName = (p.name || '').toLowerCase().includes(searchStr);
    const matchCat = filterCategory.value === '' || Number(p.category_id) === Number(filterCategory.value);
    return matchName && matchCat;
  });
});

const filteredCategories = computed(() => {
  if (!Array.isArray(db.categories)) return [];
  return db.categories.filter(c => (c.name || '').toLowerCase().includes((searchQuery.categories || '').toLowerCase()));
});

const filteredDiscounts = computed(() => {
  if (!Array.isArray(db.discounts)) return [];
  return db.discounts.filter(d => (d.code || '').toLowerCase().includes((searchQuery.discounts || '').toLowerCase()));
});

const filteredCustomers = computed(() => {
  if (!Array.isArray(db.customers)) return [];
  return db.customers.filter(c => {
    const searchStr = (searchQuery.customers || '').toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(searchStr);
    const phoneMatch = (c.phone || '').includes(searchStr);
    return nameMatch || phoneMatch;
  });
});

const filteredAccounts = computed(() => {
  if (!Array.isArray(db.accounts)) return [];
  return db.accounts.filter(a => {
    const searchStr = (searchQuery.accounts || '').toLowerCase();
    const nameMatch = (a.name || '').toLowerCase().includes(searchStr);
    const userMatch = (a.username || '').toLowerCase().includes(searchStr);
    return nameMatch || userMatch;
  });
});

const getProductCount = (catId) => {
   if (!Array.isArray(db.products)) return 0;
   return db.products.filter(p => p.category_id == catId).length;
}

const totalRevenue = computed(() => {
   if (!Array.isArray(db.customers)) return 0;
   return db.customers.reduce((sum, cus) => sum + (Number(cus.spent) || 0), 0);
})

const pendingOrdersCount = computed(() => {
   if (!Array.isArray(db.orders)) return 0;
   return db.orders.filter(o => o.status === 'Chờ xác nhận').length;
});

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    formData.value.image_url = e.target.result; 
  };
  reader.readAsDataURL(file);
}

const getRank = (spent) => {
  const val = Number(spent) || 0;
  if (val >= 10000000) return { name: 'Kim Cương', color: 'text-info', bg: 'bg-info-subtle' }
  if (val >= 5000000) return { name: 'Vàng', color: 'text-warning', bg: 'bg-warning-subtle' }
  if (val >= 2000000) return { name: 'Bạc', color: 'text-secondary', bg: 'bg-secondary-subtle' }
  return { name: 'Thành Viên', color: 'text-dark', bg: 'bg-light border' }
}

const selectedCustomer = ref(null)
const customerOrders = ref([])

const viewCustomerDetails = async (cus) => {
  selectedCustomer.value = cus;
  try {
    const res = await fetch(`http://localhost:5000/api/customers/${cus.id}/orders`);
    const data = await res.json();
    customerOrders.value = Array.isArray(data) ? data : [];
  } catch (e) { console.error(e) }
}

const handleLogout = () => { logout(); router.push('/login'); }

const changeTab = async (tabId) => {
  activeTab.value = tabId; 
  Object.keys(showForm).forEach(k => showForm[k] = false);
  if (window.innerWidth < 992) isNavOpen.value = false;
  if (tabId === 'dashboard') { await nextTick(); renderWaveChart(); }
}

const fetchAllData = async () => {
  isLoading.value = true;
  try {
    const api = async (url) => {
       try { 
         const res = await fetch(url);
         const data = await res.json();
         if (data.error) { console.error(`Lỗi API ${url}:`, data.error); return []; }
         return Array.isArray(data) ? data : [];
       } catch { return []; }
    };
    
    const [o, p, c, d, cus, acc, ch] = await Promise.all([
       api('http://localhost:5000/api/orders'), api('http://localhost:5000/api/products'), api('http://localhost:5000/api/categories'),
       api('http://localhost:5000/api/discounts'), api('http://localhost:5000/api/customers'), api('http://localhost:5000/api/accounts'), api('http://localhost:5000/api/chart-data')
    ]);

    // BẢO VỆ MẢNG DỮ LIỆU ĐỂ TRÁNH LỖI UNDEFINED CỦA VUE
    db.orders = Array.isArray(o) ? o.map(item => ({ 
       ...item, 
       customer_name: item.customer_name || 'Khách vãng lai', 
       customer_phone: item.customer_phone || '', 
       isExpanded: false,
       products: Array.isArray(item.products) ? item.products : []
    })) : [];
    
    db.products = p.map(item => ({ id: item.id || item.ProductID, name: item.name || item.ProductName || '', price: item.price !== undefined ? item.price : (item.BasePrice || 0), category_id: item.category_id || item.CategoryID || 1, category: item.category || item.CategoryName || 'Không xác định', image_url: item.image_url || item.ImageURL || '', active: item.active !== undefined ? item.active : (item.IsActive !== undefined ? item.IsActive : true) }));
    db.categories = c.map(item => ({ id: item.id || item.CategoryID, name: item.name || item.CategoryName || '', active: item.active !== undefined ? item.active : (item.IsActive !== undefined ? item.IsActive : true) }));
    db.accounts = acc.map(item => ({ id: item.id || item.UserID, username: item.username || item.Email || '', name: cleanName(item.name || item.FullName || ''), role_id: Number(item.role_id !== undefined ? item.role_id : (item.RoleID !== undefined ? item.RoleID : 2)) }));
    db.discounts = d.map(item => ({ id: item.id || item.CouponID, code: item.code || item.CouponCode || '', percent: item.percent || item.DiscountPercent || 0, limit: item.limit || item.UsageLimit || 0, used: item.used || item.UsedCount || 0, expiry: item.expiry || item.ExpiryDate ? String(item.expiry || item.ExpiryDate).split('T')[0] : '', active: item.active !== undefined ? item.active : (item.IsActive !== undefined ? item.IsActive : true) }));
    db.customers = cus.map(item => ({ id: item.id || item.UserID, name: item.name || item.FullName || '', phone: item.phone || item.Phone || '', spent: item.spent || item.TotalSpent || item.TotalAmount || 0 }));
    db.chartData = ch;
    
    if(activeTab.value === 'dashboard') { await nextTick(); renderWaveChart(); }
  } catch (error) { console.error("Lỗi Fetch Data", error); } 
  finally { isLoading.value = false; }
}

onMounted(() => fetchAllData())

let chartInstance = null;
const renderWaveChart = () => {
  const ctx = document.getElementById('waveChart');
  if(!ctx) return;
  if(chartInstance) chartInstance.destroy();
  
  let gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)'); 
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  let labels = db.chartData.length > 0 ? db.chartData.map(d => `Tháng ${d.month}`) : ['Chưa có dữ liệu'];
  let dataPoints = db.chartData.length > 0 ? db.chartData.map(d => d.total) : [0];

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels, 
      datasets: [{ label: 'Doanh thu (VNĐ)', data: dataPoints, borderColor: '#000', borderWidth: 3, tension: 0.4, fill: true, backgroundColor: gradient, pointBackgroundColor: '#fff', pointBorderColor: '#000', pointRadius: 5 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  })
}

const openForm = (type, item = null) => {
  editId.value = item ? item.id : null;
  if(type === 'products') formData.value = item ? { ...item } : { name: '', price: 0, category_id: db.categories[0]?.id || 1, image_url: '', active: true };
  if(type === 'categories') formData.value = item ? { ...item } : { name: '', active: true };
  if(type === 'discounts') { let exp = item && item.expiry ? item.expiry : ''; formData.value = item ? { ...item, expiry: exp } : { code: '', percent: 10, limit: 100, expiry: '', active: true }; }
  if(type === 'accounts') { formData.value = item ? { id: item.id, username: item.username, name: item.name, role_id: Number(item.role_id) } : { username: '', name: '', password: '', role_id: 2 }; }
  showForm[type] = true;
}

const saveForm = async (type) => {
  try {
    const method = editId.value ? 'PUT' : 'POST';
    const url = `http://localhost:5000/api/${type}${editId.value ? '/' + editId.value : ''}`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData.value) });
    const data = await res.json();
    if(data.error) { alert("Lỗi từ Server SQL: \n" + data.error); return; }
    showForm[type] = false; fetchAllData();
  } catch(e) { alert("Lỗi kết nối! Vui lòng khởi động lại Server Node.js"); }
}

const confirmModal = reactive({ isOpen: false, onConfirmCallback: null })
const executeConfirm = () => { if (confirmModal.onConfirmCallback) confirmModal.onConfirmCallback(); confirmModal.isOpen = false }

const deleteItem = (type, id) => {
  confirmModal.onConfirmCallback = async () => { await fetch(`http://localhost:5000/api/${type}/${id}`, { method: 'DELETE' }); fetchAllData(); };
  confirmModal.isOpen = true; 
}

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + ' ₫'
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
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.fade-in-scale { animation: fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.dashboard-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.dashboard-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.06) !important; }
.custom-nav-item { transition: all 0.2s ease; color: rgba(255, 255, 255, 0.6) !important; padding: 12px 16px; font-size: 0.85rem; }
.custom-nav-item:hover { color: #fff !important; background-color: rgba(255, 255, 255, 0.06) !important; }
.active-nav { background-color: #ffffff !important; color: #000 !important; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.active-nav i { color: #000 !important; }
.form-control:focus, .form-select:focus, textarea:focus { border-color: #000; box-shadow: 0 0 0 0.15rem rgba(0, 0, 0, 0.15); }
::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar-light::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }

/* CSS Thẻ Đơn Hàng Shopee Style */
.order-card { transition: all 0.2s ease; border: 1px solid rgba(0,0,0,0.05) !important; }
.order-card:hover { box-shadow: 0 .5rem 1rem rgba(0,0,0,.08)!important; }
.hover-danger:hover { background-color: #dc3545 !important; color: white !important; }
</style>