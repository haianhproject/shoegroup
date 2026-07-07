<!-- Trang: Thống Kê Tổng Quan (chi tiết) -->
<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import Chart from 'chart.js/auto'
import {
  rangeOptions, dateRange, setRange, customRange, rangeLabel, exportReport,
  statAccounts, statProducts, statOrders, statRevenue, formatPrice, formatDate,
  trendMode, setTrendMode, buildTrendData, isLoading, ordersInRange,
  avgOrderValue, recentOrdersByDate, buildOrderStatusData, buildPaymentMethodData,
  buildTopProductsData, inventoryByColor, lowStockList, topCustomerByOrders,
  topCustomerBySpending, ratingStats
} from '../adminStore'

/* ---------- refs biểu đồ ---------- */
const trendCanvas = ref(null)
const statusCanvas = ref(null)
const payCanvas = ref(null)
const topCanvas = ref(null)
let trendChart = null, statusChart = null, payChart = null, topChart = null

const starRows = computed(() => {
  const d = ratingStats.value.dist
  const total = ratingStats.value.count || 1
  return [5, 4, 3, 2, 1].map(star => ({ star, count: d[star], pct: Math.round((d[star] / total) * 100) }))
})

function renderTrend() {
  if (!trendCanvas.value) return
  const { labels, data, avg } = buildTrendData()
  if (trendChart) trendChart.destroy()
  trendChart = new Chart(trendCanvas.value, {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Đơn hàng', data, backgroundColor: 'rgba(99,102,241,0.55)', borderRadius: 6, maxBarThickness: 46 },
        { type: 'line', label: 'TB 3 kỳ trước', data: avg, borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#f59e0b' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  })
}
function renderStatus() {
  if (!statusCanvas.value) return
  const { labels, data, colors } = buildOrderStatusData()
  if (statusChart) statusChart.destroy()
  statusChart = new Chart(statusCanvas.value, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
  })
}
function renderPay() {
  if (!payCanvas.value) return
  const { labels, data } = buildPaymentMethodData()
  if (payChart) payChart.destroy()
  payChart = new Chart(payCanvas.value, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Số đơn', data, backgroundColor: '#10b981', borderRadius: 6, maxBarThickness: 54 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  })
}
function renderTop() {
  if (!topCanvas.value) return
  const { labels, product, brand } = buildTopProductsData()
  if (topChart) topChart.destroy()
  topChart = new Chart(topCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Sản phẩm', data: product, backgroundColor: '#6366f1', borderRadius: 5, maxBarThickness: 22 },
        { label: 'Brand', data: brand, backgroundColor: '#f59e0b', borderRadius: 5, maxBarThickness: 22 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  })
}
function renderAll() { renderTrend(); renderStatus(); renderPay(); renderTop() }

watch([dateRange, trendMode, isLoading, () => ordersInRange.value.length], () => nextTick(renderAll))
onMounted(() => nextTick(renderAll))
onBeforeUnmount(() => { [trendChart, statusChart, payChart, topChart].forEach(c => { if (c) c.destroy() }) })
</script>

<template>
  <div class="fade-in">
    <!-- ===== Thanh phạm vi + xuất báo cáo ===== -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
      <div class="btn-group shadow-sm rounded-3 overflow-hidden bg-white">
        <button v-for="r in rangeOptions" :key="r.key" @click="setRange(r.key)" class="btn btn-sm px-3 fw-medium border-0" :class="dateRange === r.key ? 'btn-dark text-white' : 'btn-white text-secondary'" v-text="r.label"></button>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge rounded-pill bg-light text-dark border fw-medium"><i class="bi bi-calendar3 me-1"></i><span v-text="rangeLabel"></span></span>
        <button @click="exportReport" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3 d-flex align-items-center"><i class="bi bi-download me-2"></i> Xuất Báo Cáo</button>
      </div>
    </div>

    <div v-if="dateRange === 'custom'" class="d-flex flex-wrap align-items-end gap-2 mb-4 p-3 bg-white rounded-4 shadow-sm">
      <div><label class="form-label small text-secondary mb-1">Từ ngày</label><input type="date" v-model="customRange.from" class="form-control form-control-sm rounded-3"></div>
      <div><label class="form-label small text-secondary mb-1">Đến ngày</label><input type="date" v-model="customRange.to" class="form-control form-control-sm rounded-3"></div>
    </div>

    <!-- ===== 4 thẻ thống kê ===== -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded-4 shadow-sm h-100">
          <div class="stat-icon bg-dark text-white mb-3"><i class="bi bi-people-fill"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Tài Khoản</p><h3 class="fw-bolder mb-0 text-dark" v-text="statAccounts"></h3>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded-4 shadow-sm h-100">
          <div class="stat-icon bg-dark text-white mb-3"><i class="bi bi-box-seam-fill"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Sản Phẩm</p><h3 class="fw-bolder mb-0 text-dark" v-text="statProducts"></h3>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded-4 shadow-sm h-100">
          <div class="stat-icon bg-primary text-white mb-3"><i class="bi bi-cart-check-fill"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Đơn Hàng</p><h3 class="fw-bolder mb-0 text-dark" v-text="statOrders"></h3>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded-4 shadow-sm h-100">
          <div class="stat-icon bg-success text-white mb-3"><i class="bi bi-cash-stack"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Doanh Thu</p><h3 class="fw-bolder mb-0 text-dark" v-text="formatPrice(statRevenue)"></h3>
        </div>
      </div>
    </div>

    <!-- ===== Trend đơn hàng ===== -->
    <div class="bg-white p-4 rounded-4 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Trend Đơn Hàng</h5>
          <p class="text-secondary small mb-0">Số lượng đơn hàng và xu hướng biến động — <span v-text="rangeLabel"></span></p>
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center gap-3 small text-secondary">
            <span><span class="legend-dot" style="background:#6366f1;"></span> Đơn hàng</span>
            <span><span class="legend-dot" style="background:#f59e0b;"></span> TB 3 kỳ trước</span>
          </div>
          <div class="btn-group shadow-sm rounded-3 overflow-hidden">
            <button @click="setTrendMode('day')" class="btn btn-sm px-3 border-0" :class="trendMode === 'day' ? 'btn-dark text-white' : 'btn-white text-secondary'">Ngày</button>
            <button @click="setTrendMode('month')" class="btn btn-sm px-3 border-0" :class="trendMode === 'month' ? 'btn-dark text-white' : 'btn-white text-secondary'">Tháng</button>
          </div>
        </div>
      </div>
      <div style="height: 320px;"><canvas ref="trendCanvas"></canvas></div>
    </div>

    <!-- ===== Đơn hàng + Thanh toán ===== -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-xl-7">
        <div class="bg-white p-4 rounded-4 shadow-sm h-100">
          <h5 class="fw-bold mb-1 text-dark">Đơn Hàng</h5>
          <p class="text-secondary small mb-4">Trạng thái, số lượng và giá trị đơn</p>
          <div class="row g-3 align-items-center">
            <div class="col-12 col-md-6">
              <p class="text-secondary small fw-medium mb-2">Đơn theo trạng thái</p>
              <div style="height: 220px;"><canvas ref="statusCanvas"></canvas></div>
            </div>
            <div class="col-12 col-md-6">
              <div class="bg-light-gray rounded-3 p-3 mb-3">
                <p class="text-secondary small mb-1">Giá trị trung bình / đơn</p>
                <h4 class="fw-bolder text-primary mb-0" v-text="formatPrice(avgOrderValue)"></h4>
              </div>
              <p class="text-secondary small fw-medium mb-2">Đơn gần nhất</p>
              <table class="table table-sm align-middle mb-0 small">
                <thead><tr class="text-secondary"><th>Ngày</th><th class="text-end">Đơn</th></tr></thead>
                <tbody>
                  <tr v-if="recentOrdersByDate.length === 0"><td colspan="2" class="text-secondary text-center py-2">Chưa có đơn</td></tr>
                  <tr v-for="r in recentOrdersByDate" :key="r.date">
                    <td v-text="r.date"></td>
                    <td class="text-end"><span class="badge rounded-pill bg-light text-dark border" v-text="r.count"></span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-5">
        <div class="bg-white p-4 rounded-4 shadow-sm h-100">
          <h5 class="fw-bold mb-1 text-dark">Thanh Toán</h5>
          <p class="text-secondary small mb-4">Phương thức &amp; trạng thái</p>
          <p class="text-secondary small fw-medium mb-2">Phương thức thanh toán</p>
          <div style="height: 240px;"><canvas ref="payCanvas"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ===== Sản phẩm ===== -->
    <div class="bg-white p-4 rounded-4 shadow-sm mb-4">
      <h5 class="fw-bold mb-1 text-dark">Sản Phẩm</h5>
      <p class="text-secondary small mb-4">Hiệu suất bán hàng và tình trạng tồn kho</p>
      <div class="row g-4">
        <div class="col-12 col-lg-5">
          <p class="text-secondary small fw-medium mb-2">Top sản phẩm &amp; brand bán chạy</p>
          <div style="height: 300px;"><canvas ref="topCanvas"></canvas></div>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <p class="text-secondary small fw-medium mb-2">Tồn kho theo màu</p>
          <div style="max-height: 300px; overflow:auto;" class="custom-scrollbar-light pe-1">
            <div v-for="c in inventoryByColor" :key="c.color" class="d-flex align-items-center justify-content-between py-1 border-bottom">
              <span class="d-flex align-items-center gap-2 small"><span class="color-dot" :style="{ background: c.hex }"></span><span v-text="c.color"></span></span>
              <span class="badge rounded-pill bg-light text-dark border" v-text="c.total"></span>
            </div>
            <div v-if="inventoryByColor.length === 0" class="text-secondary small py-2">Chưa có dữ liệu tồn kho.</div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <p class="text-secondary small fw-medium mb-2">Sản phẩm sắp hết hàng <span class="badge rounded-pill bg-danger" v-text="lowStockList.length"></span></p>
          <div style="max-height: 300px; overflow:auto;" class="custom-scrollbar-light">
            <table class="table table-sm align-middle mb-0 small">
              <thead><tr class="text-secondary"><th>Sản phẩm</th><th>Màu</th><th class="text-end">Tồn</th></tr></thead>
              <tbody>
                <tr v-if="lowStockList.length === 0"><td colspan="3" class="text-secondary text-center py-2">Kho đang ổn định.</td></tr>
                <tr v-for="v in lowStockList" :key="v.id">
                  <td class="text-truncate" style="max-width:140px;" v-text="v.product_name"></td>
                  <td class="small text-secondary" v-text="v.color"></td>
                  <td class="text-end"><span class="badge rounded-pill bg-warning text-dark" v-text="v.stock"></span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Khách hàng + Đánh giá ===== -->
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="bg-white p-4 rounded-4 shadow-sm h-100">
          <h5 class="fw-bold mb-1 text-dark">Khách Hàng</h5>
          <p class="text-secondary small mb-4">Thói quen mua hàng và khách nổi bật</p>
          <div class="d-flex align-items-center justify-content-between bg-light-gray rounded-3 p-3 mb-3">
            <div class="d-flex align-items-center gap-3">
              <div class="stat-icon bg-primary text-white"><i class="bi bi-bag-heart-fill"></i></div>
              <div><p class="text-secondary small mb-0">Mua nhiều nhất</p><h6 class="fw-bold mb-0 text-dark" v-text="topCustomerByOrders ? topCustomerByOrders.name : '—'"></h6></div>
            </div>
            <span class="badge rounded-pill bg-primary" v-text="(topCustomerByOrders ? topCustomerByOrders.count : 0) + ' đơn'"></span>
          </div>
          <div class="d-flex align-items-center justify-content-between bg-light-gray rounded-3 p-3">
            <div class="d-flex align-items-center gap-3">
              <div class="stat-icon bg-success text-white"><i class="bi bi-gem"></i></div>
              <div><p class="text-secondary small mb-0">Chi tiêu nhiều nhất</p><h6 class="fw-bold mb-0 text-dark" v-text="topCustomerBySpending ? topCustomerBySpending.name : '—'"></h6></div>
            </div>
            <span class="badge rounded-pill bg-success" v-text="formatPrice(topCustomerBySpending ? topCustomerBySpending.spent : 0)"></span>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="bg-white p-4 rounded-4 shadow-sm h-100">
          <h5 class="fw-bold mb-1 text-dark">Đánh Giá Sản Phẩm</h5>
          <p class="text-secondary small mb-4">Mức độ hài lòng và phân bố số sao</p>
          <div v-if="ratingStats.count === 0" class="text-center text-secondary py-4"><i class="bi bi-star fs-3 d-block mb-2"></i>Chưa có đánh giá nào.</div>
          <div v-else class="row g-3 align-items-center">
            <div class="col-5 text-center border-end">
              <h1 class="fw-bolder text-dark mb-0 display-5" v-text="ratingStats.avg"></h1>
              <div class="text-warning mb-1"><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-half"></i></div>
              <p class="text-secondary small mb-1">Rating trung bình</p>
              <p class="small mb-0"><span class="text-secondary">Tốt nhất:</span> <span class="fw-bold text-dark" v-text="ratingStats.best || '—'"></span></p>
            </div>
            <div class="col-7">
              <div v-for="row in starRows" :key="row.star" class="d-flex align-items-center gap-2 mb-1">
                <span class="small text-secondary" style="width:24px;" v-text="row.star + '★'"></span>
                <div class="progress flex-grow-1" style="height:8px;"><div class="progress-bar bg-warning" :style="{ width: row.pct + '%' }"></div></div>
                <span class="small text-secondary" style="width:24px;" v-text="row.count"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
