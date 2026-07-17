<template>
  <div class="admin-container">
    <h2>Quản Lý Sản Phẩm (Giao diện Admin)</h2>
    <div class="header-actions">
      <!-- Thêm sự kiện @click để mở form -->
      <button class="btn-add" @click="openAddModal">+ Thêm sản phẩm mới</button>
    </div>

    <!-- Bảng danh sách sản phẩm -->
    <table class="product-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Hình ảnh</th>
          <th>Tên sản phẩm</th>
          <th>Thương hiệu</th>
          <th>Danh mục</th>
          <th>Giá bán</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in displayProducts" :key="item.id_product">
          <td>#{{ item.id_product }}</td>
          <td>
            <img :src="item.image_url" alt="shoe" class="shoe-img" />
          </td>
          <td><strong>{{ item.product_name }}</strong></td>
          <td>{{ item.brand_name }}</td>
          <td>{{ item.category_name }}</td>
          <td class="price">${{ Number(item.price).toFixed(2) }}</td>
          <td>
            <button class="btn-edit">Sửa</button>
            <button class="btn-delete">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Khung Popup (Modal) Thêm Sản Phẩm -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Thêm Giày Mới</h3>
        
        <div class="form-group">
          <label>Tên sản phẩm:</label>
          <input type="text" v-model="newProduct.product_name" placeholder="VD: Nike Air Force 1" />
        </div>

        <div class="form-group">
          <label>Link hình ảnh (URL):</label>
          <input type="text" v-model="newProduct.image_url" placeholder="Dán link ảnh vào đây" />
        </div>

        <div class="form-group">
          <label>Giá bán ($):</label>
          <input type="number" v-model="newProduct.price" placeholder="VD: 150" />
        </div>

        <div class="form-group row">
          <div class="col">
            <label>Thương hiệu:</label>
            <select v-model="newProduct.id_brand">
              <option v-for="brand in brands" :key="brand.id_brand" :value="brand.id_brand">
                {{ brand.brand_name }}
              </option>
            </select>
          </div>
          <div class="col">
            <label>Danh mục:</label>
            <select v-model="newProduct.id_category">
              <option v-for="cat in categories" :key="cat.id_category" :value="cat.id_category">
                {{ cat.category_name }}
              </option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="closeModal">Hủy</button>
          <button class="btn-save" @click="saveNewProduct">Lưu Sản Phẩm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// --- DỮ LIỆU ---
const brands = [
  { id_brand: 1, brand_name: "Nike" },
  { id_brand: 2, brand_name: "Adidas" },
  { id_brand: 3, brand_name: "Puma" }
];

const categories = [
  { id_category: 1, category_name: "Running" },
  { id_category: 2, category_name: "Sneakers" },
  { id_category: 3, category_name: "Basketball" }
];

const products = ref([
  { id_product: 1, id_brand: 1, id_category: 1, product_name: "Nike Air Zoom Pegasus 39", price: 120.00, image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80" },
  { id_product: 2, id_brand: 2, id_category: 2, product_name: "Adidas Ultraboost 22", price: 190.00, image_url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80" },
  { id_product: 3, id_brand: 3, id_category: 2, product_name: "Puma RS-X3", price: 110.00, image_url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80" },
  { id_product: 4, id_brand: 1, id_category: 3, product_name: "Nike Lebron 19", price: 200.00, image_url: "https://images.unsplash.com/photo-1552346154-21d32810baa3?w=500&q=80" }
]);

// --- LOGIC HIỂN THỊ ---
const displayProducts = computed(() => {
  return products.value.map(p => {
    const brand = brands.find(b => b.id_brand === p.id_brand);
    const category = categories.find(c => c.id_category === p.id_category);
    return {
      ...p,
      brand_name: brand ? brand.brand_name : 'Unknown',
      category_name: category ? category.category_name : 'Unknown'
    };
  });
});

// --- LOGIC THÊM SẢN PHẨM MỚI ---
const showModal = ref(false); // Trạng thái ẩn/hiện popup

// Biến lưu trữ dữ liệu người dùng nhập vào
const newProduct = ref({
  product_name: '',
  image_url: '',
  price: 0,
  id_brand: 1,
  id_category: 1
});

// Mở popup
const openAddModal = () => {
  // Xóa trắng form trước khi mở
  newProduct.value = { product_name: '', image_url: '', price: 0, id_brand: 1, id_category: 1 };
  showModal.value = true;
};

// Đóng popup
const closeModal = () => {
  showModal.value = false;
};

// Lưu sản phẩm
const saveNewProduct = () => {
  if (!newProduct.value.product_name) {
    alert("Vui lòng nhập tên sản phẩm!"); // Tạm dùng alert để báo lỗi cho nhanh
    return;
  }
  
  // Tạo ID mới (lấy ID lớn nhất hiện tại + 1)
  const newId = products.value.length > 0 ? Math.max(...products.value.map(p => p.id_product)) + 1 : 1;
  
  // Đẩy sản phẩm mới vào danh sách
  products.value.push({
    id_product: newId,
    id_brand: newProduct.value.id_brand,
    id_category: newProduct.value.id_category,
    product_name: newProduct.value.product_name,
    price: Number(newProduct.value.price),
    image_url: newProduct.value.image_url || 'https://via.placeholder.com/150' // Ảnh mặc định nếu không nhập link
  });

  closeModal(); // Đóng form sau khi lưu xong
};
</script>

<style scoped>
.admin-container {
  padding: 20px;
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
}
.header-actions { margin-bottom: 20px; display: flex; justify-content: flex-end; }
.btn-add { background-color: #000; color: white; padding: 10px 20px; border: none; cursor: pointer; font-weight: bold; border-radius: 4px;}
.product-table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.product-table th, .product-table td { padding: 15px; text-align: left; border-bottom: 1px solid #ddd; }
.product-table th { background-color: #f8f9fa; font-weight: bold; }
.shoe-img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
.price { font-weight: bold; color: #d9534f; }
.btn-edit, .btn-delete { padding: 5px 10px; margin-right: 5px; border: none; cursor: pointer; color: white; border-radius: 3px;}
.btn-edit { background-color: #f0ad4e; }
.btn-delete { background-color: #d9534f; }

/* --- CSS CHOM POPUP THÊM SẢN PHẨM --- */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white; padding: 30px; border-radius: 8px; width: 500px; max-width: 90%;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.modal-content h3 { margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;}
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;}
.form-group input, .form-group select {
  width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;
}
.row { display: flex; gap: 15px; }
.col { flex: 1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
.btn-cancel { padding: 10px 15px; background: #ccc; border: none; border-radius: 4px; cursor: pointer; }
.btn-save { padding: 10px 15px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;}
</style>