import { reactive, computed } from 'vue';

const STORAGE_KEY = 'shoegroup_compare_ids';

const getInitialIds = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const compareState = reactive({
  compareIds: getInitialIds()
});

export const compareCount = computed(() => compareState.compareIds.length);

export const addToCompare = (productId) => {
  const id = Number(productId);
  if (compareState.compareIds.includes(id)) return;
  if (compareState.compareIds.length >= 4) {
    alert('Bạn chỉ có thể so sánh tối đa 4 sản phẩm cùng lúc.');
    return;
  }
  compareState.compareIds.push(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compareState.compareIds));
};

export const removeFromCompare = (productId) => {
  const id = Number(productId);
  compareState.compareIds = compareState.compareIds.filter(item => item !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compareState.compareIds));
};

export const clearCompare = () => {
  compareState.compareIds = [];
  localStorage.removeItem(STORAGE_KEY);
};

export const isInCompare = (productId) => {
  return compareState.compareIds.includes(Number(productId));
};