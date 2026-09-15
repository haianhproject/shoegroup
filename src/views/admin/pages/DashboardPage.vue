<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import AdminIcon from '../components/AdminIcon.vue'
import {
  rangeOptions, dateRange, setRange, customRange, rangeLabel, exportReport,
  statAccounts, statProducts, statOrders, statRevenue, formatPrice,
  trendMode, setTrendMode, buildTrendData, isLoading, ordersInRange,
  avgOrderValue, recentOrdersByDate, buildOrderStatusData, paymentRevenueSummary,
  topProductsList, lowStockList, lowStockCount
} from '../adminStore'

const trendCanvas = ref(null)
const statusCanvas = ref(null)
let trendChart = null, statusChart = null
const chartFont = { family: "'Be Vietnam Pro', sans-serif", size: 11 }

function renderTrend() {
  if (!trendCanvas.value) return
  const { labels, data, avg } = buildTrendData()
  if (trendChart) trendChart.destroy()
  trendChart = new Chart(trendCanvas.value, {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Đơn hàng', data, backgroundColor: '#242424', hoverBackgroundColor: '#D4001A', borderRadius: 5, maxBarThickness: 34 },
        { type: 'line', label: 'TB 3 kỳ trước', data: avg, borderColor: '#D4001A', backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 2, pointBackgroundColor: '#D4001A' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#0E0E0E', padding: 12, cornerRadius: 8, titleFont: chartFont, bodyFont: chartFont }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#777', font: chartFont, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: { beginAtZero: true, border: { display: false }, grid: { color: '#f0f0f2' }, ticks: { precision: 0, color: '#777', font: chartFont, padding: 8 } }
      }
    }
  })
}

function renderStatus() {
  if (!statusCanvas.value) return
  const { labels, data, colors } = buildOrderStatusData()
  if (statusChart) statusChart.destroy()
  statusChart = new Chart(statusCanvas.value, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 7, boxHeight: 7, usePointStyle: true, padding: 14, color: '#61616b', font: { ...chartFont, size: 10 } } },
        tooltip: { backgroundColor: '#0E0E0E', padding: 10, cornerRadius: 8, titleFont: chartFont, bodyFont: chartFont }
      }
    }
  })
}

function renderAll() { renderTrend(); renderStatus() }
watch([dateRange, trendMode, isLoading, ordersInRange], () => nextTick(renderAll), { deep: true })
onMounted(() => nextTick(renderAll))
onBeforeUnmount(() => { [trendChart, statusChart].forEach(chart => chart?.destroy()) })
</script>

<template>
  <div class="overview" :aria-busy="isLoading">
    <header class="overview-intro">
      <div>
        <p class="overview-eyebrow">Báo cáo cửa hàng</p>
        <h1>Hiệu quả kinh doanh</h1>
        <p class="overview-description">Theo dõi doanh thu, đơn hàng và hoạt động của cửa hàng.</p>
      </div>
      <button type="button" class="overview-export" @click="exportReport">
        <AdminIcon name="download" /> Xuất báo cáo
      </button>
    </header>

    <section class="overview-filters" aria-label="Phạm vi báo cáo">
      <div class="overview-segments" role="group" aria-label="Chọn khoảng thời gian">
        <button v-for="range in rangeOptions" :key="range.key" type="button" :class="{ 'is-active': dateRange === range.key }" :aria-pressed="dateRange === range.key" @click="setRange(range.key)">{{ range.label }}</button>
      </div>
      <span class="overview-range"><AdminIcon name="calendar" />{{ rangeLabel }}</span>
    </section>

    <div v-if="dateRange === 'custom'" class="overview-custom-range">
      <div><label for="overview-date-from">Từ ngày</label><input id="overview-date-from" v-model="customRange.from" type="date"></div>
      <span class="overview-date-divider" aria-hidden="true">—</span>
      <div><label for="overview-date-to">Đến ngày</label><input id="overview-date-to" v-model="customRange.to" type="date"></div>
    </div>
    <p v-if="isLoading" class="overview-loading" role="status">Đang cập nhật dữ liệu báo cáo…</p>

    <section class="overview-stats" aria-label="Chỉ số tổng quan">
      <article class="overview-stat">
        <div class="overview-stat-heading"><span>Tổng tài khoản</span><span class="overview-stat-icon"><AdminIcon name="people" /></span></div>
        <strong class="overview-stat-value">{{ statAccounts }}</strong>
        <p>Tài khoản trên hệ thống</p>
      </article>
      <article class="overview-stat">
        <div class="overview-stat-heading"><span>Tổng sản phẩm</span><span class="overview-stat-icon"><AdminIcon name="box" /></span></div>
        <strong class="overview-stat-value">{{ statProducts }}</strong>
        <p>Sản phẩm trong danh mục</p>
      </article>
      <article class="overview-stat">
        <div class="overview-stat-heading"><span>Tổng đơn hàng</span><span class="overview-stat-icon"><AdminIcon name="collection" /></span></div>
        <strong class="overview-stat-value">{{ statOrders }}</strong>
        <p>Trong khoảng thời gian đã chọn</p>
      </article>
      <article class="overview-stat overview-stat-revenue">
        <div class="overview-stat-heading"><span>Doanh thu ghi nhận</span><span class="overview-stat-icon"><AdminIcon name="payment" /></span></div>
        <strong class="overview-stat-value overview-currency">{{ formatPrice(statRevenue) }}</strong>
        <p>Trong khoảng thời gian đã chọn</p>
      </article>
    </section>

    <div class="overview-chart-grid">
      <section class="overview-panel overview-trend">
        <div class="overview-panel-heading">
          <div><h2>Xu hướng đơn hàng</h2><p>Số lượng đơn và trung bình 3 kỳ trước</p></div>
          <div class="overview-segments overview-segments-small" role="group" aria-label="Đơn vị biểu đồ">
            <button type="button" :class="{ 'is-active': trendMode === 'day' }" :aria-pressed="trendMode === 'day'" @click="setTrendMode('day')">Ngày</button>
            <button type="button" :class="{ 'is-active': trendMode === 'month' }" :aria-pressed="trendMode === 'month'" @click="setTrendMode('month')">Tháng</button>
          </div>
        </div>
        <div class="overview-legend"><span><i class="overview-legend-bar"></i>Đơn hàng</span><span><i class="overview-legend-line"></i>TB 3 kỳ trước</span></div>
        <div class="overview-chart overview-trend-chart">
          <canvas ref="trendCanvas" role="img" :aria-label="'Biểu đồ xu hướng đơn hàng — ' + rangeLabel"></canvas>
          <div v-if="!isLoading && !statOrders" class="overview-chart-empty"><AdminIcon name="chart" /><strong>Chưa có đơn hàng</strong><p>Chọn khoảng thời gian khác để xem báo cáo.</p></div>
        </div>
      </section>
      <section class="overview-panel overview-order-status">
        <div class="overview-panel-heading"><div><h2>Trạng thái đơn hàng</h2><p>Phân bổ trong thời gian đã chọn</p></div></div>
        <div class="overview-chart overview-status-chart">
          <canvas ref="statusCanvas" role="img" :aria-label="'Biểu đồ trạng thái của ' + statOrders + ' đơn hàng'"></canvas>
          <div v-if="!isLoading && !statOrders" class="overview-chart-empty"><span class="overview-empty-ring" aria-hidden="true"></span><strong>Chưa có dữ liệu</strong><p>Trạng thái sẽ hiển thị khi có đơn hàng.</p></div>
        </div>
        <div class="overview-average"><span>Giá trị trung bình / đơn</span><strong>{{ formatPrice(avgOrderValue) }}</strong></div>
      </section>
    </div>

    <div class="overview-details-grid">
      <section class="overview-panel overview-recent">
        <div class="overview-panel-heading"><div><h2>Đơn hàng theo ngày</h2><p>5 ngày có đơn gần nhất trong kỳ</p></div><span class="overview-panel-icon"><AdminIcon name="calendar" /></span></div>
        <div class="overview-table-wrap">
          <table class="overview-table">
            <thead><tr><th scope="col">Ngày đặt hàng</th><th scope="col" class="overview-align-right">Số đơn</th></tr></thead>
            <tbody>
              <tr v-if="!recentOrdersByDate.length"><td colspan="2"><div class="overview-empty"><AdminIcon name="collection" /><strong>{{ isLoading ? 'Đang tải đơn hàng…' : 'Chưa có đơn hàng trong kỳ' }}</strong><p>Danh sách sẽ xuất hiện khi có đơn mới.</p></div></td></tr>
              <tr v-for="row in recentOrdersByDate" :key="row.date"><td>{{ row.date.split('-').reverse().join('/') }}</td><td class="overview-align-right"><span class="overview-count">{{ row.count }}</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="overview-panel overview-payments">
        <div class="overview-panel-heading"><div><h2>Doanh thu theo thanh toán</h2><p>Phân bổ theo kênh bán và phương thức thanh toán</p></div><span class="overview-panel-icon"><AdminIcon name="payment" /></span></div>
        <div class="overview-payment-total"><span>Tổng doanh thu trong kỳ</span><strong>{{ formatPrice(paymentRevenueSummary.total) }}</strong></div>
        <div class="overview-payment-channels">
          <div class="overview-payment-channel">
            <h3><AdminIcon name="shop" />Tại cửa hàng</h3>
            <dl><div><dt>Tiền mặt</dt><dd>{{ formatPrice(paymentRevenueSummary.posCash) }}</dd></div><div><dt>Chuyển khoản</dt><dd>{{ formatPrice(paymentRevenueSummary.posTransfer) }}</dd></div></dl>
          </div>
          <div class="overview-payment-channel">
            <h3><AdminIcon name="globe" />Trên website</h3>
            <dl><div><dt>Thu hộ (COD)</dt><dd>{{ formatPrice(paymentRevenueSummary.webCod) }}</dd></div><div><dt>Chuyển khoản</dt><dd>{{ formatPrice(paymentRevenueSummary.webTransfer) }}</dd></div></dl>
          </div>
        </div>
      </section>
    </div>

    <div class="overview-products-grid">
      <section class="overview-panel overview-products">
        <div class="overview-panel-heading"><div><h2>Sản phẩm bán chạy</h2><p>Xếp hạng theo số lượng bán trong kỳ</p></div><span class="overview-neutral-tag">Top 10</span></div>
        <div class="overview-table-wrap overview-table-scroll">
          <table class="overview-table">
            <thead><tr><th scope="col">Hạng</th><th scope="col">Sản phẩm</th><th scope="col">Thương hiệu</th><th scope="col" class="overview-align-right">Đã bán</th></tr></thead>
            <tbody>
              <tr v-if="!topProductsList?.length"><td colspan="4"><div class="overview-empty"><AdminIcon name="box" /><strong>{{ isLoading ? 'Đang tải sản phẩm…' : 'Chưa có sản phẩm bán ra' }}</strong><p>Dữ liệu bán hàng sẽ được cập nhật tại đây.</p></div></td></tr>
              <tr v-for="(product, index) in topProductsList" :key="product.name"><td><span class="overview-rank" :class="{ 'is-first': index === 0 }">{{ String(index + 1).padStart(2, '0') }}</span></td><td class="overview-product-name" :title="product.name">{{ product.name }}</td><td class="overview-muted">{{ product.brand }}</td><td class="overview-align-right overview-quantity">{{ product.quantity }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="overview-panel overview-inventory">
        <div class="overview-panel-heading"><div><h2>Sản phẩm hết hàng <span class="overview-stock-count" :class="{ 'has-alert': lowStockCount > 0 }">{{ lowStockCount }}</span></h2><p>Biến thể cần bổ sung hàng trong kho hiện tại</p></div></div>
        <div class="overview-table-wrap overview-table-scroll">
          <table class="overview-table">
            <thead><tr><th scope="col">Sản phẩm</th><th scope="col">Màu sắc</th><th scope="col">Kích cỡ</th><th scope="col" class="overview-align-right">Trạng thái</th></tr></thead>
            <tbody>
              <tr v-if="!lowStockList.length"><td colspan="4"><div class="overview-empty"><AdminIcon name="box" /><strong>{{ isLoading ? 'Đang kiểm tra tồn kho…' : 'Không có sản phẩm hết hàng' }}</strong><p>Các biến thể hết hàng sẽ được liệt kê tại đây.</p></div></td></tr>
              <tr v-for="variant in lowStockList" :key="variant.id"><td class="overview-product-name" :title="variant.product_name">{{ variant.product_name }}</td><td class="overview-muted">{{ variant.color }}</td><td class="overview-muted">{{ variant.size }}</td><td class="overview-align-right"><span class="overview-stock-label">Hết hàng</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.overview { display: flex; flex-direction: column; gap: 24px; color: #0e0e0e; font-family: 'Be Vietnam Pro', sans-serif; }
.overview button, .overview input { font: inherit; }
.overview :deep(svg) { width: 18px; height: 18px; flex-shrink: 0; }
.overview button { cursor: pointer; }
.overview button:focus-visible, .overview input:focus-visible { outline: 3px solid #d4001a40; outline-offset: 3px; }
.overview-intro { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.overview-eyebrow { margin: 0 0 8px; color: #d4001a; font-size: 10px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
.overview-intro h1 { margin: 0; font-size: clamp(24px, 2.25vw, 32px); font-weight: 700; line-height: 1.3; letter-spacing: -.045em; }
.overview-description { margin: 9px 0 0; color: #777780; font-size: 12px; line-height: 1.7; }
.overview-export { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 17px; border: 1px solid #0e0e0e; border-radius: 8px; background: #0e0e0e; color: white; font-size: 12px !important; font-weight: 600 !important; transition: background .15s; }
.overview-export:hover { background: #333; }
.overview-filters { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.overview-segments { display: flex; align-items: center; gap: 3px; padding: 4px; border: 1px solid #e6e6e9; border-radius: 9px; background: #ededf0; }
.overview-segments button { flex-shrink: 0; padding: 9px 15px; border: 0; border-radius: 6px; background: transparent; color: #72727c; font-size: 11px; font-weight: 500; white-space: nowrap; transition: color .15s, background .15s; }
.overview-segments button:hover { color: #0e0e0e; background: #ffffff80; }
.overview-segments button.is-active { color: #0e0e0e; background: #fff; box-shadow: 0 1px 3px #0000000c; font-weight: 600; }
.overview-range { display: inline-flex; align-items: center; gap: 8px; color: #777780; font-size: 11px; }
.overview-range :deep(svg) { font-size: 14px; }
.overview-custom-range { display: flex; align-items: end; gap: 14px; padding: 16px 20px; border: 1px solid #e7e7eb; border-radius: 10px; background: #fff; }
.overview-custom-range label { display: block; margin-bottom: 7px; color: #61616b; font-size: 11px; font-weight: 500; }
.overview-custom-range input { min-width: 170px; padding: 9px 12px; border: 1px solid #dedee3; border-radius: 6px; background: white; color: #222; font-size: 12px; }
.overview-date-divider { padding-bottom: 9px; color: #999; }
.overview-loading { margin: -10px 0; color: #777780; font-size: 12px; }
.overview-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.overview-stat { min-width: 0; padding: 22px; border: 1px solid #e7e7eb; border-radius: 12px; background: #fff; }
.overview-stat-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #64646e; font-size: 11px; font-weight: 500; }
.overview-stat-icon { display: inline-flex; flex-shrink: 0; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 8px; background: #f5f5f7; color: #393940; font-size: 15px; }
.overview-stat-value { display: block; margin-top: 14px; font-size: 31px; line-height: 1.25; font-weight: 700; letter-spacing: -.055em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.overview-stat p { margin: 11px 0 0; color: #93939b; font-size: 10px; line-height: 1.5; }
.overview-stat-revenue { background: #0e0e0e; border-color: #0e0e0e; color: #fff; }
.overview-stat-revenue .overview-stat-heading { color: #d4d4d8; }
.overview-stat-revenue .overview-stat-icon { background: #ffffff12; color: #fff; }
.overview-stat-revenue p { color: #a4a4ab; }
.overview-currency { font-size: clamp(21px, 1.85vw, 29px); line-height: 1.48; letter-spacing: -.05em; }
.overview-chart-grid { display: grid; grid-template-columns: minmax(0, 1.9fr) minmax(300px, 1fr); gap: 20px; }
.overview-panel { min-width: 0; overflow: hidden; padding: 23px; border: 1px solid #e7e7eb; border-radius: 12px; background: #fff; }
.overview-panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.overview-panel-heading h2 { margin: 0; color: #0e0e0e; font-size: 14px; font-weight: 650; letter-spacing: -.025em; line-height: 1.55; }
.overview-panel-heading p { margin: 5px 0 0; color: #909099; font-size: 10px; line-height: 1.65; }
.overview-panel-icon { color: #a0a0a8; font-size: 17px; }
.overview-segments-small { gap: 0; padding: 3px; border-color: #eeeef1; background: #f5f5f7; }
.overview-segments-small button { padding: 6px 11px; font-size: 10px; }
.overview-legend { display: flex; flex-wrap: wrap; gap: 20px; margin: 0 0 18px; color: #777780; font-size: 10px; }
.overview-legend > span { display: inline-flex; align-items: center; gap: 7px; }
.overview-legend-bar { width: 8px; height: 8px; border-radius: 2px; background: #242424; }
.overview-legend-line { width: 13px; height: 2px; background: #d4001a; }
.overview-chart { position: relative; min-width: 0; }
.overview-trend-chart { height: 285px; }
.overview-order-status { display: flex; flex-direction: column; }
.overview-status-chart { flex: 1; min-height: 235px; height: 250px; }
.overview-chart-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 20px; background: #ffffffed; text-align: center; }
.overview-chart-empty > :deep(svg) { width: 30px; height: 30px; margin-bottom: 6px; color: #b3b3bb; }
.overview-chart-empty strong { color: #5e5e69; font-size: 12px; font-weight: 500; }
.overview-chart-empty p { margin: 0; color: #9999a2; font-size: 10px; line-height: 1.7; }
.overview-empty-ring { width: 90px; height: 90px; margin-bottom: 12px; border: 13px solid #f0f0f3; border-radius: 50%; }
.overview-average { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 19px; padding-top: 17px; border-top: 1px solid #efeff2; }
.overview-average span { color: #82828d; font-size: 10px; }
.overview-average strong { font-size: 15px; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.overview-details-grid { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(0, 1.9fr); gap: 20px; }
.overview-payment-total { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 19px 20px; border: 1px solid #ebebef; border-radius: 8px; background: #f8f8fa; }
.overview-payment-total > span { color: #71717b; font-size: 11px; }
.overview-payment-total strong { font-size: 24px; font-weight: 650; letter-spacing: -.055em; font-variant-numeric: tabular-nums; }
.overview-payment-channels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 25px; margin-top: 23px; }
.overview-payment-channel + .overview-payment-channel { padding-left: 25px; border-left: 1px solid #ececf0; }
.overview-payment-channel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 18px; font-size: 11px; font-weight: 600; }
.overview-payment-channel h3 :deep(svg) { color: #95959f; font-size: 15px; }
.overview-payment-channel dl { display: flex; flex-direction: column; gap: 15px; margin: 0; }
.overview-payment-channel dl > div { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 7px; }
.overview-payment-channel dt { color: #8b8b95; font-size: 10px; font-weight: 400; }
.overview-payment-channel dd { margin: 0; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.overview-products-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.overview-neutral-tag { flex-shrink: 0; padding: 5px 8px; border: 1px solid #e9e9ed; border-radius: 5px; background: #fafafa; color: #777780; font-size: 9px; }
.overview-table-wrap { overflow-x: auto; margin: 0 -23px -23px; }
.overview-table-scroll { max-height: 350px; scrollbar-width: thin; scrollbar-color: #d9d9df transparent; }
.overview-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.overview-table th { position: sticky; top: 0; z-index: 1; padding: 12px 13px; border-top: 1px solid #efeff2; border-bottom: 1px solid #efeff2; background: #fafafb; color: #858590; font-size: 9px; font-weight: 500; text-align: left; white-space: nowrap; }
.overview-table td { padding: 13px; border-bottom: 1px solid #f0f0f3; color: #43434e; vertical-align: middle; }
.overview-table th:first-child, .overview-table td:first-child { padding-left: 23px; }
.overview-table th:last-child, .overview-table td:last-child { padding-right: 23px; }
.overview-table tbody tr:last-child td { border-bottom: 0; }
.overview-table tbody tr:hover { background: #fcfcfd; }
.overview-table .overview-align-right { text-align: right; }
.overview-count { display: inline-flex; min-width: 25px; min-height: 23px; justify-content: center; align-items: center; padding: 3px 7px; border-radius: 5px; background: #f3f3f6; color: #42424b; font-size: 10px; font-weight: 600; }
.overview-rank { display: inline-flex; align-items: center; justify-content: center; width: 27px; height: 27px; border-radius: 6px; background: #f4f4f6; color: #92929c; font-size: 10px; font-weight: 600; }
.overview-rank.is-first { background: #0e0e0e; color: #fff; }
.overview-product-name { min-width: 125px; max-width: 200px; font-weight: 500; line-height: 1.65; }
.overview-table .overview-muted { color: #92929c; }
.overview-table .overview-quantity { color: #17171d; font-weight: 650; font-variant-numeric: tabular-nums; }
.overview-stock-count { display: inline-flex; align-items: center; justify-content: center; min-width: 21px; min-height: 21px; margin-left: 7px; padding: 2px 6px; border-radius: 5px; background: #f1f1f4; color: #85858e; font-size: 10px; vertical-align: middle; }
.overview-stock-count.has-alert { background: #fff0f2; color: #d4001a; }
.overview-stock-label { display: inline-block; padding: 4px 7px; border: 1px solid #f5d8dd; border-radius: 5px; background: #fff5f6; color: #c90019; font-size: 9px; font-weight: 500; white-space: nowrap; }
.overview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; min-height: 164px; padding: 20px 6px; text-align: center; }
.overview-empty > :deep(svg) { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; padding: 11px; margin-bottom: 3px; border-radius: 11px; background: #f6f6f8; color: #adadb6; font-size: 19px; }
.overview-empty strong { color: #666671; font-size: 11px; font-weight: 500; }
.overview-empty p { margin: 0; color: #a0a0a9; font-size: 10px; line-height: 1.7; }
@media (min-width: 1600px) {
  .overview-currency { font-size: 29px; }
}
@media (max-width: 1199px) {
  .overview-stat { padding: 18px; }
  .overview-stats { gap: 12px; }
  .overview-stat-heading { font-size: 10px; }
  .overview-stat-icon { width: 29px; height: 29px; font-size: 13px; }
  .overview-chart-grid { grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr); }
  .overview-details-grid { grid-template-columns: minmax(240px, 1fr) minmax(0, 1.5fr); }
  .overview-payment-total { align-items: flex-start; flex-direction: column; gap: 7px; }
  .overview-payment-channels { gap: 16px; }
  .overview-payment-channel + .overview-payment-channel { padding-left: 16px; }
}
@media (max-width: 991px) {
  .overview-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-stat { padding: 20px; }
  .overview-currency { font-size: 27px; }
  .overview-chart-grid, .overview-details-grid, .overview-products-grid { grid-template-columns: minmax(0, 1fr); }
  .overview-status-chart { flex: none; height: 250px; }
  .overview-payment-total { flex-direction: row; align-items: center; }
}
@media (max-width: 575px) {
  .overview { gap: 18px; }
  .overview-intro { align-items: flex-start; flex-direction: column; gap: 16px; }
  .overview-intro h1 { font-size: 25px; }
  .overview-description { max-width: 310px; font-size: 11px; }
  .overview-export { width: 100%; padding: 11px 15px; }
  .overview-filters { flex-direction: column; align-items: stretch; gap: 10px; }
  .overview-segments { overflow-x: auto; }
  .overview-filters .overview-segments button { flex: 1; padding: 9px 7px; font-size: 10px; }
  .overview-range { padding-left: 3px; font-size: 10px; }
  .overview-custom-range { align-items: stretch; gap: 10px; padding: 14px; }
  .overview-custom-range > div { flex: 1; min-width: 0; }
  .overview-custom-range input { width: 100%; min-width: 0; padding: 8px 5px; font-size: 10px; }
  .overview-date-divider { display: none; }
  .overview-stats { gap: 10px; }
  .overview-stat { padding: 14px; }
  .overview-stat-heading { align-items: flex-start; flex-direction: column-reverse; gap: 12px; font-size: 10px; }
  .overview-stat-value { margin-top: 10px; font-size: 27px; }
  .overview-currency { font-size: 20px; line-height: 1.65; }
  .overview-stat p { font-size: 9px; }
  .overview-panel { padding: 18px; border-radius: 10px; }
  .overview-panel-heading { gap: 10px; margin-bottom: 17px; }
  .overview-panel-heading h2 { font-size: 13px; }
  .overview-panel-heading p { font-size: 9px; }
  .overview-segments-small button { padding: 6px 9px; font-size: 9px; }
  .overview-trend-chart { height: 240px; }
  .overview-table-wrap { margin: 0 -18px -18px; }
  .overview-table th:first-child, .overview-table td:first-child { padding-left: 18px; }
  .overview-table th:last-child, .overview-table td:last-child { padding-right: 18px; }
  .overview-table td { font-size: 10px; }
  .overview-payment-total { align-items: flex-start; flex-direction: column; padding: 15px; }
  .overview-payment-total strong { font-size: 22px; }
  .overview-payment-channel dl > div { align-items: flex-start; flex-direction: column; gap: 5px; }
  .overview-payment-channel dd { font-size: 11px; }
}
</style>
