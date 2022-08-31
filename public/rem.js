// designRadio：设计稿宽高比 grid：将屏幕分成几份（设计稿尺寸为 1920 * 1080，所以这里将其分成 19.2 份，以求 1rem = 100px）

; (function (win, designRadio = 16 / 9, grid = 19.2) {
  const docEl = win.document.documentElement

  function refreshRem () {
    const rect = {
      width: docEl.clientWidth,
      height: docEl.clientHeight
    }
    const screenRatio = rect.width / rect.height
    const scale = screenRatio > designRadio ? designRadio / screenRatio : 1
    const rem = (rect.width / grid * scale).toFixed(2)
    win.rem = rem
    docEl.style.fontSize = rem + 'px'
  }

  let tid = -1
  win.addEventListener('resize', function () {
    clearTimeout(tid)
    tid = setTimeout(refreshRem, 300)
  }, false)

  refreshRem()
})(window)