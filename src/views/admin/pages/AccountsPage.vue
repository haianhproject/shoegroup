<!-- Trang: Quan Ly Tai Khoan (hien tat ca vai tro + nut phan quyen) -->
<script setup>
import { ref, computed } from 'vue'
import { db, openForm, getRoleBadgeClass, roleName, deleteItem, apiWrite } from '../adminStore'

const search = ref('')
const roleMsg = ref('')
const roleMsgOk = ref(true)
const savingId = ref(null)

const filtered = computed(function () {
  const q = search.value.trim().toLowerCase()
  return (db.accounts || []).filter(function (a) {
    return (
      !q ||
      (a.name || '').toLowerCase().indexOf(q) !== -1 ||
      (a.username || '').toLowerCase().indexOf(q) !== -1 ||
      (a.email || '').toLowerCase().indexOf(q) !== -1
    )
  })
})

const sections = computed(function () {
  const list = filtered.value
  const admins = list.filter(function (a) { return Number(a.role_id) === 1 })
  const customers = list.filter(function (a) { return Number(a.role_id) === 2 })
  const employees = list.filter(function (a) { return Number(a.role_id) === 3 })
  const others = list.filter(function (a) {
    return Number(a.role_id) !== 1 && Number(a.role_id) !== 2 && Number(a.role_id) !== 3
  })
  const arr = [
    { key: 'admin', title: 'Quan tri vien', icon: 'bi-shield-lock', rows: admins },
    { key: 'employee', title: 'Nhan vien', icon: 'bi-person-badge', rows: employees },
    { key: 'customer', title: 'Khach hang', icon: 'bi-people', rows: customers },
  ]
  if (others.length) {
    arr.push({ key: 'other', title: 'Vai tro khac', icon: 'bi-question-circle', rows: others })
  }
  return arr
})

async function changeRole(a, value) {
  const newRole = Number(value)
  if (!a || Number(a.role_id) === newRole) return
  const prev = a.role_id
  a.role_id = newRole // cap nhat lac quan -> giao dien doi nhom ngay
  savingId.value = a.id
  try {
    const res = await apiWrite('/accounts/' + a.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: newRole }),
    })
    if (!res.ok) throw new Error(res.data?.message || 'fail')
    roleMsgOk.value = true
    roleMsg.value = 'Da doi vai tro cho ' + (a.name || a.username || 'tai khoan') + ' thanh ' + roleName(newRole)
  } catch (e) {
    a.role_id = prev // khoi phuc neu loi
    roleMsgOk.value = false
    roleMsg.value = 'Khong doi duoc vai tro. Kiem tra may chu / API /accounts.'
  }
  savingId.value = null
  setTimeout(function () { roleMsg.value = '' }, 3500)
}
</script>

<template>
  <div class="fade-in">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div class="input-group bg-white rounded-2 shadow-sm" style="max-width:320px;">
        <span class="input-group-text bg-white border-0"><i class="bi bi-search text-secondary"></i></span>
        <input v-model="search" type="text" class="form-control border-0" placeholder="Tim tai khoan...">
      </div>
      <button @click="openForm('accounts')" class="btn btn-dark btn-sm rounded-2 fw-bold shadow-sm px-3">
        <i class="bi bi-person-plus me-1"></i> Them Tai Khoan
      </button>
    </div>

    <div v-if="roleMsg" class="alert py-2 px-3 rounded-2 small mb-3"
         :class="roleMsgOk ? 'bg-light text-dark' : 'bg-danger-subtle text-danger'"
         v-text="roleMsg"></div>

    <div v-for="sec in sections" :key="sec.key" class="mb-4">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i :class="'bi ' + sec.icon + ' text-secondary'"></i>
        <h6 class="fw-bold mb-0 text-dark" v-text="sec.title"></h6>
        <span class="badge rounded-1 bg-light-gray text-dark" v-text="sec.rows.length"></span>
      </div>
      <div class="bg-white rounded-1 shadow-sm overflow-hidden">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr class="text-secondary small text-uppercase">
                <th class="ps-4">Tai Khoan</th>
                <th>Email</th>
                <th>Vai Tro</th>
                <th>Trang Thai</th>
                <th class="text-end pe-4">Hanh Dong</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in sec.rows" :key="a.id">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;" v-text="(a.name || a.username || '?').charAt(0).toUpperCase()"></div>
                    <div>
                      <p class="fw-medium mb-0 text-dark small" v-text="a.name || a.username"></p>
                      <p class="text-secondary mb-0" style="font-size:0.75rem;" v-text="'@' + (a.username || '')"></p>
                    </div>
                  </div>
                </td>
                <td class="small" v-text="a.email"></td>
                <td><span class="badge rounded-1" :class="getRoleBadgeClass(a.role_id)" v-text="roleName(a.role_id)"></span></td>
                <td><span class="badge rounded-1" :class="a.active !== false ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="a.active !== false ? 'Hoat dong' : 'Khoa'"></span></td>
                <td class="text-end pe-4">
                  <button @click="openForm('accounts', a)" class="btn btn-sm btn-light border rounded-2 me-1"><i class="bi bi-pencil"></i></button>
                  <button @click="deleteItem('accounts', a.id, a.username)" class="btn btn-sm btn-light border rounded-2 text-danger"><i class="bi bi-trash"></i></button>
                </td>
              </tr>
              <tr v-if="!sec.rows.length">
                <td colspan="5" class="text-center text-secondary small py-4">Chua co tai khoan trong nhom nay</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
