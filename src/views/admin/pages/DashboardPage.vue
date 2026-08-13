<!-- Trang: Thống Kê Tổng Quan (chi tiết) -->
<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import Chart from 'chart.js/auto'
import {
  rangeOptions, dateRange, setRange, customRange, rangeLabel, exportReport,
  statAccounts, statProducts, statOrders, statRevenue, formatPrice, formatDate,
  trendMode, setTrendMode, buildTrendData, isLoading, ordersInRange,
  avgOrderValue, recentOrdersByDate, buildOrderStatusData, paymentRevenueSummary,
  topProductsList, lowStockList, lowStockCount, topCustomerByOrders,
  topCustomerBySpending, ratingStats
} from '../adminStore'

/* ---------- refs biểu đồ ---------- */
const trendCanvas = ref(null)
const statusCanvas = ref(null)

let trendChart = null, statusChart = null

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
/* Da bo renderTop(): bang Top san pham dung huy hieu thu hang thay cho bieu do.
   (Ham cu tham chieu topCanvas / topChart / buildTopProductsData khong ton tai -> loi runtime.) */
function renderAll() { renderTrend(); renderStatus(); }

watch([dateRange, trendMode, isLoading, () => ordersInRange.value.length], () => nextTick(renderAll))
onMounted(() => nextTick(renderAll))
onBeforeUnmount(() => { [trendChart, statusChart].forEach(c => { if (c) c.destroy() }) })
</script>

<template>
  <div class="fade-in">
    <!-- ===== Thanh phạm vi + xuất báo cáo ===== -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
      <div class="btn-group shadow-sm rounded-2 overflow-hidden bg-white">
        <button v-for="r in rangeOptions" :key="r.key" @click="setRange(r.key)" class="btn btn-sm px-3 fw-medium border-0" :class="dateRange === r.key ? 'btn-dark text-white' : 'btn-white text-secondary'" v-text="r.label"></button>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge rounded-1 bg-light text-dark border fw-medium"><i class="bi bi-calendar3 me-1"></i><span v-text="rangeLabel"></span></span>
        <button @click="exportReport" class="btn btn-dark btn-sm rounded-2 fw-bold shadow-sm px-3 d-flex align-items-center"><i class="bi bi-download me-2"></i> Xuất Báo Cáo</button>
      </div>
    </div>

    <div v-if="dateRange === 'custom'" class="d-flex flex-wrap align-items-end gap-2 mb-4 p-3 bg-white rounded-1 shadow-sm">
      <div><label class="form-label small text-secondary mb-1">Từ ngày</label><input type="date" v-model="customRange.from" class="form-control form-control-sm rounded-2"></div>
      <div><label class="form-label small text-secondary mb-1">Đến ngày</label><input type="date" v-model="customRange.to" class="form-control form-control-sm rounded-2"></div>
    </div>

    <!-- ===== 4 thẻ thống kê ===== -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded shadow-sm h-100">
          <div class="stat-icon bg-dark text-white mb-3"><i class="bi bi-people-fill"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Tài Khoản</p><h3 class="fw-bolder mb-0 text-dark" v-text="statAccounts"></h3>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded shadow-sm h-100">
          <div class="stat-icon bg-dark text-white mb-3"><i class="bi bi-box-seam-fill"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Sản Phẩm</p><h3 class="fw-bolder mb-0 text-dark" v-text="statProducts"></h3>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded shadow-sm h-100">
          <div class="stat-icon bg-dark text-white mb-3"><i class="bi bi-cart-check-fill"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Đơn Hàng</p><h3 class="fw-bolder mb-0 text-dark" v-text="statOrders"></h3>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="dashboard-card bg-white p-4 rounded shadow-sm h-100">
          <div class="stat-icon bg-dark text-white mb-3"><i class="bi bi-cash-stack"></i></div>
          <p class="text-secondary small mb-1 fw-medium">Tổng Doanh Thu</p><h3 class="fw-bolder mb-0 text-dark" v-text="formatPrice(statRevenue)"></h3>
        </div>
      </div>
    </div>

    <!-- ===== Trend đơn hàng ===== -->
    <div class="bg-white p-4 rounded-1 shadow-sm mb-4">
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
          <div class="btn-group shadow-sm rounded-2 overflow-hidden">
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
        <div class="bg-white p-4 rounded-1 shadow-sm h-100">
          <h5 class="fw-bold mb-1 text-dark">Đơn Hàng</h5>
          <p class="text-secondary small mb-4">Trạng thái, số lượng và giá trị đơn</p>
          <div class="row g-3 align-items-center">
            <div class="col-12 col-md-6">
              <p class="text-secondary small fw-medium mb-2">Đơn theo trạng thái</p>
              <div style="height: 220px;"><canvas ref="statusCanvas"></canvas></div>
            </div>
            <div class="col-12 col-md-6">
              <div class="bg-light-gray p-3 mb-3" style="border-radius:4px;">
                <p class="text-secondary small mb-1">Giá trị trung bình / đơn</p>
                <h4 class="fw-bolder text-dark mb-0" v-text="formatPrice(avgOrderValue)"></h4>
              </div>
              <p class="text-secondary small fw-medium mb-2">Đơn gần nhất</p>
              <table class="table table-sm align-middle mb-0 small">
                <thead><tr class="text-secondary"><th>Ngày</th><th class="text-end">Đơn</th></tr></thead>
                <tbody>
                  <tr v-if="recentOrdersByDate.length === 0"><td colspan="2" class="text-secondary text-center py-2">Chưa có đơn</td></tr>
                  <tr v-for="r in recentOrdersByDate" :key="r.date">
                    <td v-text="r.date"></td>
                    <td class="text-end"><span class="badge bg-light text-dark border" style="border-radius:2px;" v-text="r.count"></span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-5">
        <div class="bg-white p-4 rounded-1 shadow-sm h-100 d-flex flex-column">
          <h5 class="fw-bold mb-1 text-dark">Thanh Toán</h5>
          <p class="text-secondary small mb-4">Phân bổ doanh thu theo kênh &amp; phương thức</p>
          
          <!-- Tổng Doanh Thu Header -->
          <div class="bg-light-gray p-3 mb-4 text-center border" style="border-radius:4px;">
            <p class="text-secondary small fw-medium mb-1">Tổng Doanh Thu Lọc</p>
            <h4 class="fw-bolder text-dark mb-0" v-text="formatPrice(paymentRevenueSummary.total)"></h4>
          </div>

          <!-- Bảng chia 4 cột -->
          <div class="row g-3 flex-grow-1">
            <!-- Thanh toán tại quầy -->
            <div class="col-6 border-end border-light">
              <h6 class="fw-bold text-dark mb-3 text-center border-bottom pb-2">Tại Quầy</h6>
              <div class="mb-3">
                <p class="text-secondary small mb-1">Tiền mặt</p>
                <h6 class="fw-bold mb-0 text-dark" v-text="formatPrice(paymentRevenueSummary.posCash)"></h6>
              </div>
              <div>
                <p class="text-secondary small mb-1">Chuyển khoản</p>
                <h6 class="fw-bold mb-0 text-dark" v-text="formatPrice(paymentRevenueSummary.posTransfer)"></h6>
              </div>
            </div>
            
            <!-- Thanh toán qua web -->
            <div class="col-6">
              <h6 class="fw-bold text-dark mb-3 text-center border-bottom pb-2">Qua Web</h6>
              <div class="mb-3">
                <p class="text-secondary small mb-1">Thu hộ</p>
                <h6 class="fw-bold mb-0 text-dark" v-text="formatPrice(paymentRevenueSummary.webCod)"></h6>
              </div>
              <div>
                <p class="text-secondary small mb-1">Chuyển khoản</p>
                <h6 class="fw-bold mb-0 text-dark" v-text="formatPrice(paymentRevenueSummary.webTransfer)"></h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Sản phẩm ===== -->
    <div class="bg-white p-4 rounded-1 shadow-sm mb-4">
      <h5 class="fw-bold mb-1 text-dark">Sản Phẩm</h5>
      <p class="text-secondary small mb-4">Hiệu suất bán hàng và tình trạng tồn kho</p>
      <div class="row g-4">
        <div class="col-12 col-lg-5">
          <p class="text-secondary small fw-medium mb-2">Top sản phẩm bán chạy</p>
          <div style="max-height: 300px; overflow:auto;" class="custom-scrollbar-light">
            <table class="table table-sm align-middle mb-0 small">
              <thead><tr class="text-secondary"><th>Top</th><th>Sản phẩm</th><th>Brand</th><th class="text-end">Lượt bán</th></tr></thead>
              <tbody>
                <tr v-if="!topProductsList || topProductsList.length === 0"><td colspan="4" class="text-secondary text-center py-2">Chưa có dữ liệu</td></tr>
                <tr v-for="(p, i) in topProductsList" :key="p.name">
                  <td><span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="i === 0 ? 'bg-dark text-white' : i === 1 ? 'bg-secondary text-white' : i === 2 ? 'bg-secondary-subtle text-dark' : 'bg-light text-dark border'" v-text="'Top ' + (i + 1)"></span></td>
                  <td class="text-truncate fw-medium" style="max-width:140px;" v-text="p.name"></td>
                  <td class="text-secondary" v-text="p.brand"></td>
                  <td class="text-end fw-bold text-dark" v-text="p.quantity"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="col-12 col-lg-7">
          <p class="text-secondary small fw-medium mb-2">Sản phẩm hết hàng <span class="badge bg-dark text-white" style="border-radius:2px;" v-text="lowStockCount"></span></p>
          <div style="max-height: 300px; overflow:auto;" class="custom-scrollbar-light">
            <table class="table table-sm align-middle mb-0 small">
              <thead><tr class="text-secondary"><th>Sản phẩm</th><th>Màu</th><th class="text-end">Tồn</th></tr></thead>
              <tbody>
                <tr v-if="lowStockList.length === 0"><td colspan="3" class="text-secondary text-center py-2">Không có sản phẩm nào hết hàng.</td></tr>
                <tr v-for="v in lowStockList" :key="v.id">
                  <td class="text-truncate" style="max-width:140px;" v-text="v.product_name"></td>
                  <td class="small text-secondary" v-text="v.color"></td>
                  <td class="small text-secondary" v-text="v.size"></td>
                  <td class="text-end"><span class="badge" style="border-radius:2px;font-size:0.72rem;" :class="'bg-secondary-subtle text-dark'" v-text="'Hết hàng'"></span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
