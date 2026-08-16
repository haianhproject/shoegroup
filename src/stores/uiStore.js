import { reactive } from "vue";

/* =====================================================================
   uiStore - global UI state
   - Centered notifications (toasts shown in the middle of the screen)
   - Sakura petal controller (spawning on/off; residue keeps falling)
   - Promo modal visibility
   ===================================================================== */

export const uiState = reactive({
  // Centered notifications
  notifications: [],
  // Sakura petals: when spawning=false, existing petals keep falling then stop
  sakuraSpawning: true,
  // Promo modal
  promoOpen: false,
});

let notifyId = 0;

/**
 * Show a centered notification.
 * type: 'success' | 'error' | 'info' | 'warning'
 */
export const notify = (payload) => {
  const item = {
    id: ++notifyId,
    type: payload.type || "info",
    title: payload.title || "",
    message: payload.message || "",
    duration: payload.duration ?? 3200,
  };
  uiState.notifications.push(item);
  if (item.duration > 0) {
    setTimeout(() => dismissNotify(item.id), item.duration);
  }
  return item.id;
};

export const dismissNotify = (id) => {
  const i = uiState.notifications.findIndex((n) => n.id === id);
  if (i !== -1) uiState.notifications.splice(i, 1);
};

/* ---- Sakura control ---- */
export const startSakura = () => { uiState.sakuraSpawning = true; };
// Stop spawning new petals; the remaining ones finish their fall ("tàn dư rơi đến hết").
export const stopSakura = () => { uiState.sakuraSpawning = false; };

/* ---- Promo modal ---- */
const PROMO_KEY = "sg_promo_hidden_until";

export const openPromo = () => { uiState.promoOpen = true; startSakura(); };

// Mở popup trừ khi khách đã chọn "không hiển thị lại trong 24h" và còn hiệu lực.
export const maybeOpenPromo = () => {
  try {
    const until = Number(localStorage.getItem(PROMO_KEY) || 0);
    if (until && Date.now() < until) return;
  } catch (e) { /* ignore */ }
  openPromo();
};

// Đóng popup. Nếu hide24h = true thì ẩn trong 24 giờ.
export const closePromo = (hide24h = false) => {
  uiState.promoOpen = false;
  stopSakura();
  if (hide24h) {
    try { localStorage.setItem(PROMO_KEY, String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e) { /* ignore */ }
  }
};
