<!-- Trang: Khách Hàng (CRM) -->
<script setup>
import { customerSearch, filteredCustomers, getRank, formatPrice, formatDate, viewCustomerDetails, customerModal, closeCustomerDetails, getOrderStatusPill } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="flex bg-white rounded-2 shadow-sm mb-4" style="max-width:320px;"><span class="flex items-center bg-white border-0"><i class="icon icon-search text-gray-600"></i></span><input v-model="customerSearch" type="text" class="sg-input border-0" placeholder="Tìm khách hàng..."></div>
    <div class="grid grid-cols-12 gap-3">
      <div v-for="cus in filteredCustomers" :key="cus.id" class="col-span-12 md:col-span-6 xl:col-span-4">
        <div class="bg-white p-4 h-full" style="border-radius:4px;">
          <div class="flex items-center gap-3 mb-3">
            <div class="bg-gray-900 text-white flex items-center justify-center font-bold text-lg" style="width:44px;height:44px;border-radius:4px;flex-shrink:0;" v-text="(cus.name || '?').charAt(0).toUpperCase()"></div>
            <div class="grow"><h6 class="font-bold mb-0 text-gray-900" v-text="cus.name"></h6><p class="text-gray-600 text-sm mb-0" v-text="cus.phone"></p></div>
            <span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="getRank(cus.spent).class" v-text="getRank(cus.spent).label"></span>
          </div>
          <div class="flex justify-between items-center bg-light-gray p-2 px-3 mb-3" style="border-radius:3px;"><span class="text-gray-600 text-sm">Tổng chi tiêu</span><span class="font-extrabold text-gray-900" v-text="formatPrice(cus.spent)"></span></div>
          <button @click="viewCustomerDetails(cus)" class="btn btn-sm btn-outline-dark w-full" style="border-radius:4px;"><i class="icon icon-eye mr-1"></i> Xem chi tiết</button>
        </div>
      </div>
    </div>

    <!-- MODAL Chi tiết khách hàng + lịch sử đơn + ảnh sản phẩm -->
    <div v-if="customerModal.open" class="custom-modal-overlay" @click.self="closeCustomerDetails()">
      <div class="custom-modal-box fade-in-scale" style="max-width:760px;">
        <div class="p-4 border-b flex justify-between items-center">
          <h6 class="font-bold mb-0 text-gray-900"><i class="icon icon-person-vcard mr-2"></i>Chi tiết khách hàng</h6>
          <button @click="closeCustomerDetails()" class="btn btn-sm btn-light border-0"><i class="icon icon-x-lg"></i></button>
        </div>
        <div class="p-4" style="max-height:72vh;overflow:auto;">
          <div v-if="customerModal.customer" class="flex items-center gap-3 mb-3">
            <div class="rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xl" style="width:60px;height:60px;" v-text="(customerModal.customer.name || '?').charAt(0).toUpperCase()"></div>
            <div class="grow">
              <h5 class="font-bold mb-0 text-gray-900" v-text="customerModal.customer.name"></h5>
              <p class="text-gray-600 text-sm mb-0"><i class="icon icon-telephone mr-1"></i><span v-text="customerModal.customer.phone || '—'"></span></p>
              <p v-if="customerModal.customer.email" class="text-gray-600 text-sm mb-0"><i class="icon icon-envelope mr-1"></i><span v-text="customerModal.customer.email"></span></p>
              <p v-if="customerModal.customer.address" class="text-gray-600 text-sm mb-0"><i class="icon icon-geo-alt mr-1"></i><span v-text="customerModal.customer.address"></span></p>
              <span v-if="customerModal.customer.source" class="badge rounded-1 bg-gray-100 text-gray-600 border mt-1" v-text="'Nguồn: ' + customerModal.customer.source"></span>
            </div>
            <span class="badge self-start" style="border-radius:2px;font-size:0.72rem;" :class="getRank(customerModal.customer.spent).class" v-text="getRank(customerModal.customer.spent).label"></span>
          </div>

          <div class="grid grid-cols-12 gap-2 mb-4">
            <div class="col-span-6"><div class="bg-light-gray rounded-2 p-3 text-center"><div class="text-gray-600 uppercase" style="font-size:0.68rem;">Tổng chi tiêu</div><div class="font-extrabold text-gray-900 text-lg" v-text="formatPrice(customerModal.customer ? customerModal.customer.spent : 0)"></div></div></div>
            <div class="col-span-6"><div class="bg-light-gray rounded-2 p-3 text-center"><div class="text-gray-600 uppercase" style="font-size:0.68rem;">Số đơn hàng</div><div class="font-extrabold text-gray-900 text-lg" v-text="customerModal.orders.length"></div></div></div>
          </div>

          <h6 class="font-bold text-gray-900 mb-2"><i class="icon icon-bag-check mr-2"></i>Lịch sử đơn hàng</h6>
          <div v-if="customerModal.orders.length === 0" class="text-center text-gray-600 py-4 text-sm border rounded-2">Khách chưa có đơn hàng nào.</div>
          <div v-for="o in customerModal.orders" :key="o.id" class="border rounded-2 p-3 mb-2">
            <div class="flex justify-between items-center mb-2">
              <div>
                <span class="font-bold text-gray-900" v-text="'#' + o.id"></span>
                <span class="text-gray-600 text-sm ml-2" v-text="formatDate(o.date)"></span>
              </div>
              <span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="getOrderStatusPill(o).cls" v-text="getOrderStatusPill(o).label"></span>
            </div>
            <div v-for="(p, i) in o.products" :key="i" class="flex items-center gap-2 py-1">
              <img :src="p.image || 'https://via.placeholder.com/48'" class="rounded-2 border" style="width:48px;height:48px;object-fit:cover;" @error="$event.target.src='https://via.placeholder.com/48'">
              <div class="grow">
                <p class="text-sm font-medium mb-0 text-gray-900 text-truncate" v-text="p.name"></p>
                <p class="text-gray-600 mb-0" style="font-size:0.72rem;" v-text="[p.color, p.size].filter(Boolean).join(' · ') + ' · SL ' + p.quantity"></p>
              </div>
              <span class="text-sm font-medium text-gray-900" v-text="formatPrice(p.price)"></span>
            </div>
            <div v-if="o.products.length === 0" class="text-gray-600 text-sm">Không có chi tiết sản phẩm.</div>
            <div class="flex justify-between border-t pt-2 mt-1">
              <span class="text-gray-600 text-sm">Tổng đơn</span>
              <span class="font-bold text-gray-900" v-text="formatPrice(o.total)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
