/**
 * interact.js
 * 仅事件监听层：鼠标跟随、卡片倾斜、横幅视差、按钮磁吸、分类指示条。
 * 不请求接口、不改动页面结构、不新增任何媒体资源。
 */

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* ---------- 分类指示条：点击与尺寸变化时平滑跟随 ---------- */

  const indicator = document.querySelector(".cat-indicator");
  const catButtons = Array.from(document.querySelectorAll(".cat-btn"));

  function syncIndicator() {
    const active = document.querySelector(".cat-btn.active");
    if (!indicator || !active) return;
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  catButtons.forEach(button => {
    button.addEventListener("click", () => requestAnimationFrame(syncIndicator));
  });

  window.addEventListener("resize", syncIndicator);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncIndicator);
  }
  requestAnimationFrame(syncIndicator);

  /* ---------- 触屏或减少动效时，不启用指针跟随 ---------- */

  if (!finePointer || reduceMotion) return;

  const grid = document.getElementById("goodsGrid");
  const banner = document.querySelector(".banner");
  const MAG_SELECTOR = ".qty-btn, .checkout-btn, .history-btn, .cat-btn, .topbar-btn";

  let activeCard = null;
  let activeMag = null;
  let pointerEvent = null;
  let frameId = null;

  function resetCard(card) {
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--spot-x", "50%");
    card.style.setProperty("--spot-y", "50%");
  }

  function resetMag(el) {
    if (!el) return;
    el.style.setProperty("--mag-x", "0px");
    el.style.setProperty("--mag-y", "0px");
  }

  function resetBanner() {
    if (!banner) return;
    banner.style.setProperty("--px", "0px");
    banner.style.setProperty("--py", "0px");
    banner.style.setProperty("--bx", "50%");
    banner.style.setProperty("--by", "50%");
  }

  function applyPointer() {
    frameId = null;
    if (!pointerEvent) return;

    const { clientX, clientY, target } = pointerEvent;
    pointerEvent = null;

    // 卡片：鼠标位置驱动轻微透视倾斜 + 光斑
    const card = target && target.closest ? target.closest(".tag-card") : null;
    if (activeCard && activeCard !== card) resetCard(activeCard);
    activeCard = card;

    if (card) {
      const rect = card.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nx = clamp((clientX - rect.left) / rect.width, 0, 1);
        const ny = clamp((clientY - rect.top) / rect.height, 0, 1);
        card.style.setProperty("--tilt-x", ((0.5 - ny) * 5).toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", ((nx - 0.5) * 5).toFixed(2) + "deg");
        card.style.setProperty("--spot-x", (nx * 100).toFixed(1) + "%");
        card.style.setProperty("--spot-y", (ny * 100).toFixed(1) + "%");
      }
    }

    // 横幅：整体视差 + 跟随光晕
    if (banner) {
      const inBanner = target && target.closest ? target.closest(".banner") : null;
      if (inBanner) {
        const rect = banner.getBoundingClientRect();
        const nx = clamp((clientX - rect.left) / rect.width, 0, 1);
        const ny = clamp((clientY - rect.top) / rect.height, 0, 1);
        banner.style.setProperty("--px", ((nx - 0.5) * 16).toFixed(1) + "px");
        banner.style.setProperty("--py", ((ny - 0.5) * 10).toFixed(1) + "px");
        banner.style.setProperty("--bx", (nx * 100).toFixed(1) + "%");
        banner.style.setProperty("--by", (ny * 100).toFixed(1) + "%");
      }
    }

    // 按钮：磁吸偏移
    const mag = target && target.closest ? target.closest(MAG_SELECTOR) : null;
    if (activeMag && activeMag !== mag) resetMag(activeMag);
    activeMag = mag;

    if (mag) {
      if (mag.disabled) {
        resetMag(mag);
        return;
      }
      const rect = mag.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dx = clamp(((clientX - rect.left) / rect.width - 0.5) * 10, -4, 4);
        const dy = clamp(((clientY - rect.top) / rect.height - 0.5) * 8, -3, 3);
        mag.style.setProperty("--mag-x", dx.toFixed(1) + "px");
        mag.style.setProperty("--mag-y", dy.toFixed(1) + "px");
      }
    }
  }

  function onPointerMove(event) {
    pointerEvent = {
      clientX: event.clientX,
      clientY: event.clientY,
      target: event.target
    };
    if (frameId === null) {
      frameId = requestAnimationFrame(applyPointer);
    }
  }

  function clearPointerState() {
    resetCard(activeCard);
    resetMag(activeMag);
    activeCard = null;
    activeMag = null;
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });

  if (grid) {
    grid.addEventListener("pointerleave", () => {
      resetCard(activeCard);
      activeCard = null;
    });
  }

  if (banner) {
    banner.addEventListener("pointerleave", resetBanner);
  }

  document.addEventListener("pointerout", event => {
    if (!event.relatedTarget) clearPointerState();
  });

  window.addEventListener("blur", clearPointerState);
})();
