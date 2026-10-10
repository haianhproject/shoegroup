
<!-- Mục đích: Trang quản lý tài khoản, vai trò và trạng thái khóa/mở của người dùng. -->
<!-- Trang: Quản lý tài khoản -->

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import {
  db,
  openForm,
  getRoleBadgeClass,
  roleName,
  toggleAccountLock,
  apiWrite,
} from '../adminStore'
import { currentUser } from '../../../stores/authStore'

const search = ref('')
const roleMsg = ref('')
const roleMsgOk = ref(true)
const savingId = ref(null)

let messageTimer = null

const activeAdminCount = computed(() => {
  return (db.accounts || []).filter((account) => {
    return Number(account.role_id) === 1 && account.active !== false
  }).length
})

const currentUserId = computed(() => {
  const user = currentUser?.value
  const id = Number(user?.id_user ?? user?.id ?? user?.UserID)
  return Number.isInteger(id) && id > 0 ? id : null
})

function canToggleAccountLock(account) {
  if (!account) return false

  // Tài khoản không phải quản trị viên có thể khóa/mở khóa.
  if (Number(account.role_id) !== 1) return true

  // Có thể mở khóa quản trị viên đang bị khóa.
  if (account.active === false) return true

  // Không cho khóa quản trị viên cuối cùng hoặc chính tài khoản đang đăng nhập.
  return (
    activeAdminCount.value >= 2 &&
    Number(account.id) !== currentUserId.value
  )
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()

  return (db.accounts || []).filter((account) => {
    return (
      !q ||
      (account.name || '').toLowerCase().includes(q) ||
      (account.username || '').toLowerCase().includes(q) ||
      (account.email || '').toLowerCase().includes(q)
    )
  })
})

const sections = computed(() => {
  const list = filtered.value

  const admins = list.filter(
    (account) => Number(account.role_id) === 1
  )

  const employees = list.filter(
    (account) => Number(account.role_id) === 3
  )

  const customers = list.filter(
    (account) => Number(account.role_id) === 2
  )

  const others = list.filter((account) => {
    return ![1, 2, 3].includes(Number(account.role_id))
  })

  const result = [
    {
      key: 'admin',
      title: 'Quản trị viên',
      icon: 'icon-shield-lock',
      rows: admins,
    },
    {
      key: 'employee',
      title: 'Nhân viên',
      icon: 'icon-person-badge',
      rows: employees,
    },
    {
      key: 'customer',
      title: 'Khách hàng',
      icon: 'icon-people',
      rows: customers,
    },
  ]

  if (others.length) {
    result.push({
      key: 'other',
      title: 'Vai trò khác',
      icon: 'icon-question-circle',
      rows: others,
    })
  }

  return result
})

async function changeRole(account, value) {
  const newRole = Number(value)

  if (!account || Number(account.role_id) === newRole) return
  if (![1, 2, 3].includes(newRole)) return

  const previousRole = account.role_id

  // Cập nhật giao diện trước, sau đó gọi API.
  account.role_id = newRole
  savingId.value = account.id

  try {
    const response = await apiWrite('/accounts/' + account.id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role_id: newRole,
      }),
    })

    if (!response.ok) {
      throw new Error(
        response.data?.message || 'Không thể cập nhật vai trò.'
      )
    }

    roleMsgOk.value = true
    roleMsg.value =
      'Đã đổi vai trò của ' +
      (account.name || account.username || 'tài khoản') +
      ' thành ' +
      roleName(newRole)
  } catch (error) {
    // Khôi phục vai trò cũ nếu cập nhật thất bại.
    account.role_id = previousRole
    roleMsgOk.value = false
    roleMsg.value = 'Không thể cập nhật vai trò. Vui lòng thử lại.'
  } finally {
    savingId.value = null

    if (messageTimer) {
      clearTimeout(messageTimer)
    }

    messageTimer = setTimeout(() => {
      roleMsg.value = ''
    }, 3500)
  }
}

onBeforeUnmount(() => {
  if (messageTimer) {
    clearTimeout(messageTimer)
  }
})
</script>

<template>
  <div class="fade-in accounts-page">
    <!-- Tiêu đề -->
    <div class="page-header">
      <div>
        <h5 class="page-title">Quản Lý Tài Khoản</h5>
        <p class="page-description">
          Quản lý thông tin, vai trò và trạng thái tài khoản người dùng.
        </p>
      </div>

      <button
        type="button"
        @click="openForm('accounts')"
        class="btn btn-dark btn-sm add-button"
      >
        <i class="icon icon-person-plus"></i>
        <span>Thêm tài khoản</span>
      </button>
    </div>

    <!-- Tìm kiếm -->
    <div class="toolbar">
      <div class="search-box">
        <i class="icon icon-search search-icon" aria-hidden="true"></i>

        <input
          v-model="search"
          type="search"
          class="sg-input search-input"
          placeholder="Tìm theo tên, tên đăng nhập hoặc email..."
          aria-label="Tìm tài khoản theo tên, tên đăng nhập hoặc email"
        />

        <button
          v-if="search"
          type="button"
          class="clear-search"
          @click="search = ''"
          aria-label="Xóa nội dung tìm kiếm"
          title="Xóa tìm kiếm"
        >
          <i class="icon icon-x-lg"></i>
        </button>
      </div>

      <div class="search-result">
        Tìm thấy <strong>{{ filtered.length }}</strong> tài khoản
      </div>
    </div>

    <!-- Thông báo cập nhật vai trò -->
    <div
      v-if="roleMsg"
      class="role-message"
      :class="roleMsgOk ? 'message-success' : 'message-error'"
      role="status"
      aria-live="polite"
    >
      <i
        class="icon"
        :class="roleMsgOk ? 'icon-check-circle' : 'icon-exclamation-circle'"
      ></i>
      <span>{{ roleMsg }}</span>
    </div>

    <!-- Nhóm tài khoản -->
    <section
      v-for="section in sections"
      :key="section.key"
      class="account-section"
    >
      <div class="section-heading">
        <div class="section-title-wrap">
          <i
            :class="['icon', section.icon, 'section-icon']"
            aria-hidden="true"
          ></i>

          <h6 class="section-title">
            {{ section.title }}
          </h6>

          <span class="section-count">
            {{ section.rows.length }}
          </span>
        </div>
      </div>

      <div class="account-card">
        <div class="table-responsive">
          <table class="table align-middle mb-0 accounts-table">
            <thead>
              <tr>
                <th scope="col" class="account-column">Tài khoản</th>
                <th scope="col">Email</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" class="text-end action-column">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="account in section.rows"
                :key="account.id"
              >
                <!-- Thông tin tài khoản -->
                <td class="account-column">
                  <div class="account-info">
                    <div class="account-avatar">
                      {{
                        (account.name || account.username || '?')
                          .charAt(0)
                          .toUpperCase()
                      }}
                    </div>

                    <div class="account-details">
                      <p class="account-name">
                        {{ account.name || account.username || 'Chưa có tên' }}
                      </p>

                      <p class="account-username">
                        @{{ account.username || 'chưa-có-tên-đăng-nhập' }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Email -->
                <td>
                  <span class="account-email">
                    {{ account.email || 'Chưa cập nhật' }}
                  </span>
                </td>

                <!-- Vai trò -->
                <td>
                  <span
                    class="role-badge"
                    :class="getRoleBadgeClass(account.role_id)"
                  >
                    {{ roleName(account.role_id) }}
                  </span>
                </td>

                <!-- Trạng thái -->
                <td>
                  <span
                    class="status-badge"
                    :class="
                      account.active !== false
                        ? 'status-active'
                        : 'status-inactive'
                    "
                  >
                    <span
                      class="status-dot"
                      :class="
                        account.active !== false
                          ? 'dot-active'
                          : 'dot-inactive'
                      "
                    ></span>

                    {{
                      account.active !== false
                        ? 'Hoạt động'
                        : 'Không hoạt động'
                    }}
                  </span>
                </td>

                <!-- Thao tác -->
                <td class="text-end action-column">
                  <div class="action-buttons">
                    <button
                      type="button"
                      @click="openForm('accounts', account)"
                      class="btn btn-sm btn-light border edit-button"
                      :aria-label="
                        'Chỉnh sửa tài khoản ' +
                        (account.name || account.username)
                      "
                      title="Chỉnh sửa tài khoản"
                    >
                      <i class="icon icon-pencil" aria-hidden="true"></i>
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      v-if="canToggleAccountLock(account)"
                      type="button"
                      @click="toggleAccountLock(account)"
                      class="btn btn-sm btn-light border lock-button"
                      :class="
                        account.active !== false
                          ? 'lock-active'
                          : 'lock-inactive'
                      "
                      :aria-label="
                        (account.active !== false
                          ? 'Khóa tài khoản '
                          : 'Mở khóa tài khoản ') +
                        (account.name || account.username)
                      "
                      :title="
                        account.active !== false
                          ? 'Khóa tài khoản'
                          : 'Mở khóa tài khoản'
                      "
                    >
                      <i
                        class="icon"
                        :class="
                          account.active !== false
                            ? 'icon-lock'
                            : 'icon-check-circle'
                        "
                        aria-hidden="true"
                      ></i>

                      <span>
                        {{
                          account.active !== false
                            ? 'Khóa tài khoản'
                            : 'Mở khóa'
                        }}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Không có dữ liệu trong nhóm -->
              <tr v-if="!section.rows.length">
                <td colspan="5" class="empty-cell">
                  <div class="empty-content">
                    <i class="icon icon-people empty-icon"></i>

                    <p>
                      {{
                        search.trim()
                          ? 'Không tìm thấy tài khoản phù hợp trong nhóm này.'
                          : 'Chưa có tài khoản trong nhóm này.'
                      }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Tổng thể */
.accounts-page {
  width: 100%;
  color: #1f2937;
}

/* Tiêu đề */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 6px;
  color: #111827;
  font-size: 1.3rem;
  font-weight: 700;
}

.page-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Nút thêm */
.add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 9px 15px;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.add-button i {
  font-size: 15px;
}

/* Thanh tìm kiếm */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 22px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 460px);
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: #ffffff;
}

.search-box:focus-within {
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgb(107 114 128 / 12%);
}

.search-icon {
  flex-shrink: 0;
  color: #6b7280;
  font-size: 16px;
}

.search-input {
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  box-shadow: none;
}

.search-input:focus {
  outline: none;
  box-shadow: none;
}

.clear-search {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: #f3f4f6;
  color: #4b5563;
  cursor: pointer;
}

.search-result {
  color: #6b7280;
  font-size: 0.875rem;
}

.search-result strong {
  color: #111827;
}

/* Thông báo */
.role-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.role-message i {
  margin-top: 2px;
}

.message-success {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.message-error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

/* Nhóm tài khoản */
.account-section {
  margin-bottom: 24px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon {
  color: #4b5563;
  font-size: 18px;
}

.section-title {
  margin: 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 700;
}

.section-count {
  display: inline-flex;
  min-width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 700;
}

/* Bảng tài khoản */
.account-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #ffffff;
}

.accounts-table {
  width: 100%;
  border-collapse: collapse;
}

.accounts-table thead th {
  padding: 14px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #4b5563;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.accounts-table tbody td {
  padding-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f1f3;
  vertical-align: middle;
}

.accounts-table tbody tr:last-child td {
  border-bottom: none;
}

.accounts-table tbody tr:hover:not(:last-child) {
  background: #fafafa;
}

.account-column {
  padding-left: 16px !important;
}

.action-column {
  padding-right: 16px !important;
}

/* Thông tin người dùng */
.account-info {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 190px;
}

.account-avatar {
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #111827;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
}

.account-details {
  min-width: 0;
}

.account-name {
  margin: 0 0 4px;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.account-username {
  margin: 0;
  color: #6b7280;
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}

.account-email {
  color: #4b5563;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

/* Vai trò */
.role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

/* Trạng thái */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-inactive {
  background: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.dot-active {
  background: #16a34a;
}

.dot-inactive {
  background: #dc2626;
}

/* Các nút thao tác */
.action-buttons {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.action-buttons .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

/* Nút chỉnh sửa */
.edit-button {
  border-color: #d1d5db;
  background: #ffffff;
  color: #374151;
}

.edit-button:hover {
  border-color: #9ca3af;
  background: #f3f4f6;
  color: #111827;
}

.edit-button i {
  font-size: 14px;
}

/* Nút khóa / mở khóa */
.lock-button {
  border-color: #d1d5db;
  background: #ffffff;
}

.lock-active {
  color: #b91c1c;
}

.lock-active:hover {
  border-color: #fecaca;
  background: #fef2f2;
}

.lock-inactive {
  border-color: #bbf7d0 !important;
  color: #15803d;
}

.lock-inactive:hover {
  background: #f0fdf4;
}

/* Trạng thái không có dữ liệu */
.empty-cell {
  padding: 0 !important;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 16px;
  color: #6b7280;
  text-align: center;
}

.empty-icon {
  margin-bottom: 10px;
  color: #9ca3af;
  font-size: 28px;
}

.empty-content p {
  margin: 0;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 900px) {
  .accounts-table {
    min-width: 850px;
  }
}

@media (max-width: 767px) {
  .page-header {
    align-items: stretch;
  }

  .page-header > .add-button {
    width: 100%;
  }

  .toolbar {
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .search-result {
    align-self: flex-end;
  }

  .accounts-table thead th,
  .accounts-table tbody td {
    padding: 10px;
  }

  .account-column {
    padding-left: 12px !important;
  }

  .action-column {
    padding-right: 12px !important;
  }

  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons .btn {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.15rem;
  }

  .page-description {
    font-size: 0.85rem;
  }

  .section-title {
    font-size: 0.9rem;
  }
}
</style>
