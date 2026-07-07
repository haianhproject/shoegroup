<!-- Trang: Quản Lý Tài Khoản -->
<script setup>
import { accountSearch, filteredAccounts, openForm, getRoleBadgeClass, roleName, deleteItem } from '../adminStore'
</script>

<template>
  <div class="fade-in">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div class="input-group bg-white rounded-3 shadow-sm" style="max-width:320px;"><span class="input-group-text bg-white border-0"><i class="bi bi-search text-secondary"></i></span><input v-model="accountSearch" type="text" class="form-control border-0" placeholder="Tìm tài khoản..."></div>
      <button @click="openForm('accounts')" class="btn btn-dark btn-sm rounded-3 fw-bold shadow-sm px-3"><i class="bi bi-person-plus me-1"></i> Thêm Tài Khoản</button>
    </div>
    <div class="bg-white rounded-4 shadow-sm overflow-hidden"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr class="text-secondary small text-uppercase"><th class="ps-4">Tài Khoản</th><th>Email</th><th>Vai Trò</th><th>Trạng Thái</th><th class="text-end pe-4">Hành Động</th></tr></thead>
      <tbody><tr v-for="a in filteredAccounts" :key="a.id">
        <td class="ps-4"><div class="d-flex align-items-center gap-2"><div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;" v-text="(a.name || a.username || '?').charAt(0).toUpperCase()"></div><div><p class="fw-medium mb-0 text-dark small" v-text="a.name || a.username"></p><p class="text-secondary mb-0" style="font-size:0.75rem;" v-text="'@' + a.username"></p></div></div></td>
        <td class="small" v-text="a.email"></td>
        <td><span class="badge rounded-pill" :class="getRoleBadgeClass(a.role_id)" v-text="roleName(a.role_id)"></span></td>
        <td><span class="badge rounded-pill" :class="a.active !== false ? 'badge-active' : 'bg-secondary-subtle text-secondary'" v-text="a.active !== false ? 'Hoạt động' : 'Khóa'"></span></td>
        <td class="text-end pe-4"><button @click="openForm('accounts', a)" class="btn btn-sm btn-light border rounded-3 me-1"><i class="bi bi-pencil"></i></button><button @click="deleteItem('accounts', a.id, a.username)" class="btn btn-sm btn-light border rounded-3 text-danger"><i class="bi bi-trash"></i></button></td>
      </tr></tbody>
    </table></div></div>
  </div>
</template>
