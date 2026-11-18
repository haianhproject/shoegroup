// Mục đích: Giữ focus bàn phím và khóa cuộn nền trong các hộp thoại dùng chung.
const dialogs = new Map()
let originalOverflow = ''

const focusableSelector =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

export const vDialogFocus = {
  mounted(element, binding) {
    const previousFocus = document.activeElement
    if (!dialogs.size) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    element.tabIndex = -1
    const state = { close: binding.value, previousFocus }
    const onKeydown = (event) => {
      if (Array.from(dialogs.keys()).at(-1) !== element) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        state.close?.()
        return
      }
      if (event.key !== 'Tab') return

      const controls = Array.from(
        element.querySelectorAll(focusableSelector)
      ).filter(
        (control) =>
          control.getClientRects().length &&
          getComputedStyle(control).visibility !== 'hidden'
      )
      const first = controls[0] || element
      const last = controls.at(-1) || element
      if (!controls.length || !element.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    state.onKeydown = onKeydown
    dialogs.set(element, state)
    document.addEventListener('keydown', onKeydown, true)
    const initialFocusTarget =
      element.querySelector(focusableSelector) || element
    initialFocusTarget.focus({ preventScroll: true })
  },
  updated(element, binding) {
    const state = dialogs.get(element)
    if (state) state.close = binding.value
  },
  unmounted(element) {
    const state = dialogs.get(element)
    const wasTopmost = Array.from(dialogs.keys()).at(-1) === element
    document.removeEventListener('keydown', state?.onKeydown, true)
    dialogs.delete(element)
    if (!dialogs.size) document.body.style.overflow = originalOverflow
    if (!wasTopmost) return
    const remainingDialog = Array.from(dialogs.keys()).at(-1)
    const focusTarget =
      remainingDialog && !remainingDialog.contains(state?.previousFocus)
        ? remainingDialog
        : state?.previousFocus
    if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true })
  },
}
